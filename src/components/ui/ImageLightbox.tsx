import { useCallback, useEffect, useState } from 'react';

export type LightboxImage = {
  url: string;
  filename?: string;
  alt?: string;
};

export function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const current = images[index];

  useEffect(() => {
    setZoom(1);
  }, [index]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const changeZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(4, Math.max(1, Number((z + delta).toFixed(2)))));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < images.length - 1) onIndexChange(index + 1);
      if (e.key === '+' || e.key === '=') changeZoom(0.25);
      if (e.key === '-') changeZoom(-0.25);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeZoom, images.length, index, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[rgba(8,18,32,0.92)] backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={current.alt || current.filename || 'Image preview'}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{current.filename || current.alt || ''}</p>
          {images.length > 1 && (
            <p className="text-xs text-white/70">
              {index + 1} / {images.length}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => changeZoom(-0.25)}
            disabled={zoom <= 1}
            className="w-9 h-9 rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-40 transition-colors"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => changeZoom(0.25)}
            disabled={zoom >= 4}
            className="w-9 h-9 rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-40 transition-colors"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="px-3 h-9 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-bold transition-colors"
          >
            100%
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-white/20 hover:bg-white/10 text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 min-h-0 overflow-auto flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          e.preventDefault();
          changeZoom(e.deltaY > 0 ? -0.15 : 0.15);
        }}
      >
        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/60 transition-colors z-10"
            aria-label="Previous image"
          >
            ‹
          </button>
        )}

        <img
          src={current.url}
          alt={current.alt || current.filename || ''}
          loading="lazy"
          decoding="async"
          draggable={false}
          onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2.5))}
          className="select-none transition-transform duration-200 ease-out cursor-zoom-in"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            maxHeight: zoom === 1 ? 'calc(100vh - 96px)' : undefined,
            maxWidth: zoom === 1 ? 'min(95vw, 1200px)' : undefined,
          }}
        />

        {index < images.length - 1 && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            className="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/60 transition-colors z-10"
            aria-label="Next image"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
