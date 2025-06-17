import React from 'react';
import { Message } from '../utils/useSocket';
import { getAvatarColor, getInitials } from '../utils/avatar';
import { FaLock, FaEyeSlash, FaRegImage, FaExclamationTriangle } from 'react-icons/fa';

export function MessageItem({ message, viewerId, onMediaClick, allowViewExpired }: {
  message: Message;
  viewerId: string;
  onMediaClick: (msg: Message) => void;
  allowViewExpired?: boolean;
}) {
  const isOwn = message.sender === viewerId;
  const avatarColor = getAvatarColor(message.username || 'Anon');
  const initials = getInitials(message.username || 'Anon');
  const viewed = message.oneTime && message.viewedBy?.includes(viewerId);

  // One-time media expired
  if (message.type === 'media' && message.oneTime && viewed && !allowViewExpired) {
    return (
      <div className={`flex items-center gap-2 group w-full max-w-[95vw] ${isOwn ? 'flex-row-reverse' : ''}`}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold opacity-60"
          style={{ background: avatarColor }}
        >
          {initials}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-neutral-300 truncate max-w-[120px] md:max-w-[200px]">{message.username}</span>
            <span className="text-[10px] text-neutral-500">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div 
            className="relative mt-1 w-full max-w-xs min-w-[120px] min-h-[60px] max-h-[100px] rounded-2xl overflow-hidden shadow cursor-pointer"
            onClick={() => onMediaClick(message)}
          >
            {/* Hidden image with no src to prevent preview/download */}
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center">
              <FaEyeSlash className="text-2xl mb-2 text-neutral-700" />
              <span className="text-xs text-neutral-300">Media expired</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Media message (image only)
  if (message.type === 'media') {
    if (message.mediaType?.startsWith('image')) {
      return (
        <div className={`flex items-end gap-2 w-full max-w-[95vw] ${isOwn ? 'flex-row-reverse' : ''}`}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow"
            style={{ background: avatarColor }}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-neutral-300 truncate max-w-[120px] md:max-w-[200px]">{message.username}</span>
              <span className="text-[10px] text-neutral-500">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button
              className={`relative flex items-center gap-2 px-4 py-2 rounded-2xl shadow-lg border-2 ${isOwn ? 'border-blue-700' : 'border-neutral-700'} bg-gradient-to-br from-neutral-800 to-neutral-900 hover:scale-105 transition-transform mt-1 w-full max-w-xs`}
              onClick={() => onMediaClick(message)}
              disabled={message.oneTime && viewed && !allowViewExpired}
              title={message.oneTime ? 'One-time view' : 'Media'}
            >
              <FaRegImage className="text-xl text-blue-400" />
              <span className="truncate flex-1 text-left">{message.filename}</span>
              <span className="text-xs text-neutral-400">{(message.content.length / 1024 / 1024).toFixed(2)} MB</span>
              {message.oneTime && !viewed && (
                <span className="ml-2 flex items-center gap-1 text-xs text-yellow-400"><FaLock />1x</span>
              )}
              {message.oneTime && viewed && !allowViewExpired && (
                <span className="ml-2 flex items-center gap-1 text-xs text-neutral-500"><FaEyeSlash />Expired</span>
              )}
            </button>
          </div>
        </div>
      );
    } else {
      // Unsupported media type (should not happen, but fallback)
      return (
        <div className={`flex items-end gap-2 w-full max-w-[95vw] ${isOwn ? 'flex-row-reverse' : ''}`}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow"
            style={{ background: avatarColor }}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-neutral-300 truncate max-w-[120px] md:max-w-[200px]">{message.username}</span>
              <span className="text-[10px] text-neutral-500">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="relative flex items-center gap-2 px-4 py-2 rounded-2xl shadow-lg border-2 border-red-700 bg-gradient-to-br from-neutral-800 to-neutral-900 mt-1 w-full max-w-xs text-red-400">
              <FaExclamationTriangle className="text-xl" />
              <span>Unsupported media type</span>
            </div>
          </div>
        </div>
      );
    }
  }

  // Text message
  return (
    <div className={`flex items-end gap-2 w-full max-w-[95vw] ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow"
        style={{ background: avatarColor }}
      >
        {initials}
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-neutral-300 truncate max-w-[120px] md:max-w-[200px]">{message.username}</span>
          <span className="text-[10px] text-neutral-500">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className={`px-4 py-2 rounded-2xl shadow max-w-[80vw] break-words mt-1 ${isOwn ? 'bg-gradient-to-br from-blue-800 to-blue-600 text-white' : 'bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-100'}`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
} 