import React from 'react';

export type LoadingButtonKind = 'save' | 'send' | 'delete' | 'refresh' | 'upload';

const LOADING_COPY: Record<LoadingButtonKind, { emoji: string; text: string }> = {
  save: { emoji: '💾', text: 'Ukladám...' },
  send: { emoji: '📤', text: 'Odosielam...' },
  delete: { emoji: '🗑️', text: 'Mažem...' },
  refresh: { emoji: '🔄', text: 'Obnovujem...' },
  upload: { emoji: '📄', text: 'Nahrávam...' },
};

interface LoadingButtonContentProps {
  loading: boolean;
  kind: LoadingButtonKind;
  children: React.ReactNode;
  className?: string;
  /** When true, show only the spinner while loading (no emoji / loading text). */
  spinnerOnly?: boolean;
}

/**
 * Keeps idle button size: idle content stays in layout (invisible while loading),
 * loading label is overlaid so the control does not resize.
 */
export const LoadingButtonContent: React.FC<LoadingButtonContentProps> = ({
  loading,
  kind,
  children,
  className = '',
  spinnerOnly = false,
}) => {
  const copy = LOADING_COPY[kind];
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <span
        className={`inline-flex items-center justify-center gap-1.5 ${loading ? 'invisible' : ''}`}
        aria-hidden={loading}
      >
        {children}
      </span>
      {loading && (
        <span
          className="absolute inset-0 inline-flex items-center justify-center gap-1 whitespace-nowrap"
          aria-live="polite"
        >
          {spinnerOnly ? (
            <span className="btn-loading-spinner" aria-hidden="true">
              ⟳
            </span>
          ) : (
            <>
              <span aria-hidden="true">{copy.emoji}</span>
              <span className="btn-loading-spinner" aria-hidden="true">
                ⟳
              </span>
              <span>{copy.text}</span>
            </>
          )}
        </span>
      )}
    </span>
  );
};
