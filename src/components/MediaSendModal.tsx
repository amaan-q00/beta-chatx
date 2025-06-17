import React, { useRef, useState, useEffect } from 'react';
import { FaTimes, FaLock, FaRegImage, FaCheck, FaUpload } from 'react-icons/fa';

export function MediaSendModal({ open, onClose, onSend, loading, progress, error }: {
  open: boolean;
  onClose: () => void;
  onSend: (file: File, oneTime: boolean) => void;
  loading?: boolean;
  progress?: number;
  error?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [oneTime, setOneTime] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f && f.type.startsWith('image')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreview(null);
      setOneTime(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative bg-neutral-900 rounded-lg p-6 w-[90vw] max-w-md flex flex-col items-center shadow-lg">
        <button
          className="absolute top-2 right-2 text-white text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>
        <div className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
          <FaUpload /> Send Image
        </div>
        <input
          type="file"
          ref={fileRef}
          className="hidden"
          accept="image/*"
          onChange={e => handleFile(e.target.files?.[0] || null)}
        />
        <button
          className="flex items-center gap-2 px-4 py-2 rounded bg-neutral-800 hover:bg-blue-700 text-white mb-3"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
        >
          {file ? <FaCheck /> : <FaUpload />} {file ? 'Change File' : 'Choose File'}
        </button>
        {file && (
          <div className="w-full flex flex-col items-center mb-2">
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <span>{file.name}</span>
              <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              <span><FaRegImage /></span>
            </div>
            {preview && (
              <img src={preview} alt="preview" className="max-w-[200px] max-h-[120px] mt-2 rounded shadow" />
            )}
          </div>
        )}
        <label className="flex items-center gap-2 text-neutral-200 mb-4 cursor-pointer select-none">
          <input type="checkbox" checked={oneTime} onChange={e => setOneTime(e.target.checked)} />
          <FaLock className={oneTime ? 'text-yellow-400' : 'text-neutral-500'} /> One-time view
        </label>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        {loading && (
          <div className="w-full bg-neutral-800 rounded h-2 mb-2 overflow-hidden">
            <div className="bg-blue-600 h-2 transition-all" style={{ width: `${progress || 0}%` }} />
          </div>
        )}
        <div className="flex gap-3 mt-2">
          <button
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50"
            disabled={!file || loading}
            onClick={() => file && onSend(file, oneTime)}
          >
            <FaUpload /> Send
          </button>
          <button
            className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-800 text-white"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 