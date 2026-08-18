import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

const REPORT_PAID_PIN = '860525';

interface ReportPaidPinModalProps {
  isOpen: boolean;
  /** Error from the parent (e.g. save failed) shown alongside the wrong-PIN error. */
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/** Small PIN confirmation popup — same design language as ConfirmDeleteModal. */
export const ReportPaidPinModal: React.FC<ReportPaidPinModalProps> = ({
  isOpen,
  errorMessage,
  onCancel,
  onConfirm,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setPin('');
    setError(false);
    onCancel();
  };

  const handleSubmit = async () => {
    if (pin !== REPORT_PAID_PIN) {
      setError(true);
      return;
    }
    setPin('');
    setError(false);
    await onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Potvrdenie PIN kódom</h3>
              <p className="text-[11px] text-slate-400">Označenie mesiaca ako VYPLATENÉ</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
              Zadajte PIN kód
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
            />
            {error && (
              <p className="mt-2 text-[11px] font-semibold text-red-600">Nesprávny PIN kód. Skúste to znova.</p>
            )}
            {!error && errorMessage && (
              <p className="mt-2 text-[11px] font-semibold text-red-600">{errorMessage}</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-200 font-medium transition-colors cursor-pointer text-xs"
          >
            Zrušiť
          </button>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
