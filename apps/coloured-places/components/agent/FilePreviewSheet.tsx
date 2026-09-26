'use client';

import { useEffect, useState } from 'react';
import { X, Download, FileQuestion, Music } from 'lucide-react';
import type { AttachedFile } from '@/lib/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Inner preview renderers ─────────────────────────────────────────────────

function NoPreview({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
        <FileQuestion size={28} className="text-white/20" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/50">{label}</p>
        {sub && <p className="text-xs text-white/25 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function PreviewBody({
  file,
  url,
  textContent,
  textLoading,
  textError,
}: {
  file: AttachedFile;
  url?: string;
  textContent: string | null;
  textLoading: boolean;
  textError: boolean;
}) {
  switch (file.kind) {
    case 'image':
      if (!url) return <NoPreview label="Image source not available" />;
      return (
        <div className="flex items-center justify-center bg-black/40 min-h-[200px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={file.name}
            className="max-w-full object-contain"
            style={{ maxHeight: '55dvh' }}
          />
        </div>
      );

    case 'video':
      if (!url) return <NoPreview label="Video source not available" />;
      return (
        <div className="bg-black p-3">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={url}
            controls
            playsInline
            className="w-full rounded-xl"
            style={{ maxHeight: '55dvh' }}
          />
        </div>
      );

    case 'audio':
      if (!url) return <NoPreview label="Audio source not available" />;
      return (
        <div className="flex flex-col items-center gap-6 px-6 py-10">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <Music size={32} className="text-white/25" />
          </div>
          <p className="text-sm font-medium text-white/60 text-center max-w-[260px] break-words">
            {file.name}
          </p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={url} controls className="w-full" />
        </div>
      );

    case 'pdf':
      if (!url) return <NoPreview label="PDF source not available" />;
      return (
        <embed
          src={url}
          type="application/pdf"
          className="w-full"
          style={{ height: '55dvh' }}
        />
      );

    case 'text':
      if (textError) return <NoPreview label="Could not read file content" />;
      if (textLoading || textContent === null) {
        return (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-5 h-5 rounded-full border-2 border-white/20 animate-spin"
              style={{ borderTopColor: 'rgba(255,255,255,0.6)' }}
            />
          </div>
        );
      }
      return (
        <pre
          className="p-5 text-xs text-white/60 font-mono leading-relaxed whitespace-pre-wrap break-words overflow-auto scrollbar-none"
          style={{ maxHeight: '55dvh' }}
        >
          {textContent.length > 50_000
            ? `${textContent.slice(0, 50_000)}\n\n… (truncated — showing 50 KB of ${formatSize(textContent.length)})`
            : textContent}
        </pre>
      );

    case 'archive':
      return (
        <NoPreview
          label="Archive files cannot be previewed"
          sub="Download to inspect the contents"
        />
      );

    case 'document':
      return (
        <NoPreview
          label="Office documents cannot be previewed inline"
          sub="Download to open in your desktop app"
        />
      );

    default:
      return (
        <NoPreview
          label="This file type cannot be previewed"
          sub={file.mimeType || 'Unknown type'}
        />
      );
  }
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

interface Props {
  file: AttachedFile;
  onClose: () => void;
}

export function FilePreviewSheet({ file, onClose }: Props) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);
  const url = file.objectUrl ?? file.fileRef;

  // Load text file content when sheet opens for a text file
  useEffect(() => {
    if (file.kind !== 'text' || !url) return;
    setTextLoading(true);
    setTextContent(null);
    setTextError(false);
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) { setTextContent(t); setTextLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setTextError(true); setTextLoading(false); }
      });
    return () => { cancelled = true; };
  }, [file, url]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Translucent backdrop — tap to dismiss */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel — slides up from bottom */}
      <div
        className="relative flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: '#1c1c1e',
          maxHeight: '88dvh',
          paddingBottom: 'max(16px, var(--sab))',
        }}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header: file name + meta + close */}
        <div className="flex-shrink-0 flex items-start gap-3 px-5 py-3 border-b border-white/[0.07]">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-snug break-all">{file.name}</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {formatSize(file.size)}{file.mimeType ? ` · ${file.mimeType}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/16 flex items-center justify-center transition-colors"
            aria-label="Close preview"
          >
            <X size={14} className="text-white/70" />
          </button>
        </div>

        {/* Preview content — scrollable */}
        <div className="flex-1 overflow-auto min-h-0">
          <PreviewBody
            file={file}
            url={url}
            textContent={textContent}
            textLoading={textLoading}
            textError={textError}
          />
        </div>

        {/* Download footer */}
        {url && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-white/[0.07]">
            <a
              href={url}
              download={file.name}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.11] text-sm font-semibold text-white/70 hover:text-white transition-all"
            >
              <Download size={14} />
              <span>Download</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
