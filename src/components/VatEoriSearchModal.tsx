import React from 'react';
import { X } from 'lucide-react';

interface VatEoriSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Placeholder for VAT/EORI company-name search — UI shell only. */
export const VatEoriSearchModal: React.FC<VatEoriSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <img src="/uk1.png" alt="" className="w-6 h-6 object-contain shrink-0" />
            <img src="/eu1.png" alt="" className="w-6 h-6 object-contain shrink-0" />
            <h3 className="font-bold text-base leading-none whitespace-nowrap">
              VAT/EORI no. SEARCH{' '}
              <span className="font-normal text-[11px] text-slate-400">(by company name)</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 min-h-[160px]" />
        </div>
      </div>
    </div>
  );
};
