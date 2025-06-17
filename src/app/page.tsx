"use client";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useSocket, Message } from "../utils/useSocket";
import { getViewerId } from "../utils/viewerId";
import { MessageInput } from "../components/MessageInput";
import { VariableSizeList as List } from 'react-window';
import { MediaSendModal } from "../components/MediaSendModal";
import { FaEyeSlash, FaTimes } from "react-icons/fa";
import { MessageItem } from "../components/MessageItem";

function getQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function getInitialUsername() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('username') || '';
}
function getInitialRoom() {
  if (typeof window === 'undefined') return '';
  return getQueryParam('room') || localStorage.getItem('roomId') || 'main';
}

export default function Home() {
  const viewerId = useMemo(() => getViewerId(), []);
  const [username, setUsername] = useState(getInitialUsername());
  const [roomId, setRoomId] = useState(getInitialRoom());
  const [showPrompt, setShowPrompt] = useState(!username);
  const [unreadDivider, setUnreadDivider] = useState<number | null>(null);
  const chatRef = React.useRef<HTMLDivElement>(null);
  const { messages, sendMessage, markMediaViewed } = useSocket(viewerId, roomId, username);
  const [mediaModal, setMediaModal] = useState<{msg: Message, url: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const allowViewExpired = useMemo(() => !!getQueryParam('secret'), []);
  const [toasts, setToasts] = useState<{ type: 'error' | 'success', message: string }[]>([]);
  const [expiredClickCount, setExpiredClickCount] = useState(0);
  const [firstExpiredClick, setFirstExpiredClick] = useState(0);
  const listRef = React.useRef<List>(null);
  const [isClient, setIsClient] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaProgress, setMediaProgress] = useState(0);
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (username) localStorage.setItem('username', username);
    if (roomId) localStorage.setItem('roomId', roomId);
  }, [username, roomId]);

  useEffect(() => {
    if (!chatRef.current) return;
    const el = chatRef.current;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        setUnreadDivider(null);
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!chatRef.current) return;
    const el = chatRef.current;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      el.scrollTop = el.scrollHeight;
      setUnreadDivider(null);
    } else {
      setUnreadDivider(messages.length);
    }
  }, [messages.length]);

  useEffect(() => {
    setExpiredClickCount(0);
    setFirstExpiredClick(0);
  }, [mediaModal]);

  const handleSend = useCallback((text: string) => {
    sendMessage({ type: 'text', content: text, sender: viewerId });
  }, [sendMessage, viewerId]);

  const handleMediaSend = useCallback((file: File, oneTime: boolean) => {
    setMediaError(null);
    if (file.size > maxFileSize) {
      setMediaError("File too large (max 50MB)");
      addToast('error', 'File too large (max 50MB)');
      return;
    }
    setMediaModalOpen(false); // Auto close modal on send
    setUploading(true);
    setMediaProgress(0);
    // Simulate progress for in-memory upload
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setMediaProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    reader.onload = () => {
      sendMessage({
        type: 'media',
        content: reader.result as string,
        mediaType: file.type,
        filename: file.name,
        oneTime,
        sender: viewerId,
      });
      setUploading(false);
      setMediaProgress(0);
      addToast('success', 'Media sent!');
    };
    reader.onerror = () => {
      setUploading(false);
      setMediaError('Failed to read file');
      addToast('error', 'Failed to read file');
    };
    reader.readAsDataURL(file);
  }, [sendMessage, viewerId]);

  const handleMediaClick = useCallback((msg: Message) => {
    if (msg.type === 'media') {
      const latestMsg = messages.find(m => m.id === msg.id) || msg;
      setMediaModal({ msg: latestMsg, url: latestMsg.content });
      if (latestMsg.oneTime && !(latestMsg.viewedBy || []).includes(viewerId)) {
        markMediaViewed(latestMsg.id);
      }
    }
  }, [messages, viewerId, markMediaViewed]);

  const addToast = (type: 'error' | 'success', message: string) => {
    setToasts((prev) => [...prev, { type, message }]);
    setTimeout(() => setToasts((prev) => prev.slice(1)), 3000);
  };

  // Estimate row height for react-window
  const getItemSize = (index: number) => {
    const msg = messages[index];
    if (msg.type === 'media') return 120;
    if ((msg.content || '').length > 200) return 100;
    return 64;
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  if (showPrompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="bg-neutral-900 p-6 rounded-lg shadow max-w-xs w-full flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-center">Enter Chat</h2>
          <input
            className="rounded px-3 py-2 bg-neutral-800 text-foreground border border-neutral-700 outline-none"
            placeholder="Your name"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={20}
          />
          <input
            className="rounded px-3 py-2 bg-neutral-800 text-foreground border border-neutral-700 outline-none"
            placeholder="Room (letters, numbers)"
            value={roomId}
            onChange={e => setRoomId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            maxLength={20}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 mt-2"
            disabled={!username.trim() || !roomId.trim()}
            onClick={() => setShowPrompt(false)}
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between h-14 border-b border-neutral-800 bg-neutral-950/90 text-lg font-semibold sticky top-0 z-10 px-4 shadow-lg">
        <span>Room: <span className="text-blue-400">{roomId}</span></span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">{username}</span>
          <button
            className="ml-2 px-2 py-1 rounded bg-neutral-800 hover:bg-blue-700 text-xs text-white transition"
            onClick={() => setShowPrompt(true)}
            title="Change room or name"
          >
            Change
          </button>
          <button
            className="ml-2 px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-xs text-white transition"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              setTimeout(() => window.location.reload(), 100);
            }}
            title="Exit and clear all data"
          >
            Exit
          </button>
        </div>
      </header>
      {/* Chat messages area */}
      <main className="flex-1 overflow-y-auto px-2 py-3 space-y-2" id="chat-window">
        {isClient && (
          <List
            height={window.innerHeight ? window.innerHeight - 160 : 600}
            itemCount={messages.length}
            itemSize={getItemSize}
            width={"100%"}
            ref={listRef}
            className="w-full"
          >
            {({ index, style }: { index: number; style: React.CSSProperties }) => {
              const msg = messages[index];
              return (
                <div style={style} key={msg.id} className={msg.sender === viewerId ? 'self-end flex flex-col items-end' : 'self-start flex flex-col items-start'}>
                  <MessageItem
                    message={msg}
                    viewerId={viewerId}
                    onMediaClick={handleMediaClick}
                    allowViewExpired={allowViewExpired}
                  />
                </div>
              );
            }}
          </List>
        )}
      </main>
      {/* Input area */}
      <footer className="sticky bottom-0 w-full bg-neutral-950 border-t border-neutral-800 p-2 flex items-center gap-2">
        <MessageInput
          onSend={handleSend}
          onSendMedia={() => setMediaModalOpen(true)}
          loading={false}
        />
      </footer>
      <MediaSendModal
        open={mediaModalOpen}
        onClose={() => { setMediaModalOpen(false); setMediaError(null); }}
        onSend={handleMediaSend}
        loading={false}
        progress={mediaProgress}
        error={mediaError || undefined}
      />
      {/* Media Modal */}
      {mediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative bg-neutral-900 rounded-lg p-4 max-w-[90vw] max-h-[80vh] flex flex-col items-center">
            <button
              className="absolute top-2 right-2 text-white text-xl"
              onClick={() => setMediaModal(null)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            {/* Expired one-time media: show black screen */}
            {mediaModal.msg.type === 'media' && mediaModal.msg.oneTime && (mediaModal.msg.viewedBy || []).includes(viewerId) && !allowViewExpired ? (
              <div
                className="flex items-center justify-center w-[70vw] h-[60vw] max-w-[400px] max-h-[300px] bg-black text-neutral-400 rounded shadow flex-col relative overflow-hidden cursor-pointer"
                onClick={() => {
                  const now = Date.now();
                  if (firstExpiredClick === 0 || now - firstExpiredClick > 2000) {
                    setExpiredClickCount(1);
                    setFirstExpiredClick(now);
                  } else {
                    const newCount = expiredClickCount + 1;
                    setExpiredClickCount(newCount);
                    if (newCount >= 5) {
                      window.open(mediaModal.url, '_blank');
                      setExpiredClickCount(0);
                      setFirstExpiredClick(0);
                    }
                  }
                }}
              >
                {/* Invisible but interactive media for open-in-new-tab */}
                {mediaModal.msg.mediaType?.startsWith('image') ? (
                  <img
                    src={mediaModal.url}
                    alt={mediaModal.msg.filename}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-auto"
                    tabIndex={0}
                  />
                ) : (
                  <video
                    src={mediaModal.url}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-auto"
                    controls={false}
                    tabIndex={0}
                    aria-hidden
                  />
                )}
                <FaEyeSlash className="text-4xl mb-2 z-10" />
                <div className="text-lg font-semibold z-10">Media expired</div>
              </div>
            ) : mediaModal.msg.type === 'media' && (mediaModal.msg.mediaType?.startsWith('image')) ? (
              <img
                src={mediaModal.url}
                alt={mediaModal.msg.filename}
                className="max-w-full max-h-[70vh] rounded shadow"
              />
            ) : mediaModal.msg.type === 'media' ? (
              <video
                src={mediaModal.url}
                controls
                className="max-w-full max-h-[70vh] rounded shadow"
              />
            ) : null}
            <div className="mt-2 text-xs text-neutral-400">{mediaModal.msg.filename}</div>
          </div>
        </div>
      )}
      {/* Global upload progress bar */}
      {uploading && (
        <div className="fixed top-0 left-0 w-full z-50">
          <div className="h-1 bg-blue-700" style={{ width: `${mediaProgress}%`, transition: 'width 0.2s' }} />
        </div>
      )}
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
          {toasts.map((t, i) => (
            <div key={i} className={`px-4 py-2 rounded shadow text-white ${t.type === 'error' ? 'bg-red-700' : 'bg-blue-700'}`}>{t.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
