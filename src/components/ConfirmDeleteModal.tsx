import React from 'react';
import { Trash2, X } from 'lucide-react';
import { LoadingButtonContent } from './LoadingButtonContent';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  /** Single primary OK button (same chrome as delete dialog). */
  okOnly?: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Shared delete confirmation — same design as customs-record delete. */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  subtitle = 'Potvrdenie pred odstránením',
  message,
  confirmLabel = 'Áno, vymazať',
  okOnly = false,
  isLoading = false,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-950">
            <div className="font-medium">{message}</div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          {!okOnly && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-200 font-medium transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Zrušiť
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-xs disabled:cursor-not-allowed"
          >
            {okOnly ? (
              <span>{confirmLabel}</span>
            ) : (
              <LoadingButtonContent loading={isLoading} kind="delete">
                <Trash2 className="w-4 h-4" />
                <span>{confirmLabel}</span>
              </LoadingButtonContent>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
