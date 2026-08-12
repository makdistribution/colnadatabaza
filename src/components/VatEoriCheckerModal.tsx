import React, { useState } from 'react';
import { X } from 'lucide-react';

export type VatEoriRegion = 'GB' | 'EU';

interface CheckerResult {
  status?: string;
  number?: string;
  companyName?: string;
  companyAddress?: string;
}

interface CheckerPanelProps {
  title: string;
  inputLabel: string;
  inputPlaceholder?: string;
}

/** Single VAT or EORI checker block — UI only; no API yet. */
const CheckerPanel: React.FC<CheckerPanelProps> = ({
  title,
  inputLabel,
  inputPlaceholder = '',
}) => {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<CheckerResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReset = () => {
    setValue('');
    setResult(null);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleVerify = () => {
    // Future: call backend API. Do not invent results now.
    // Clear any previous result so a later API response cannot leave stale data.
    setResult(null);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const hasResultContent =
    Boolean(result?.status) ||
    Boolean(result?.number) ||
    Boolean(result?.companyName) ||
    Boolean(result?.companyAddress) ||
    Boolean(statusMessage) ||
    Boolean(errorMessage);

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 space-y-3">
      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h4>

      <div>
        <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
          {inputLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={inputPlaceholder}
            className="flex-1 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          />
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleVerify}
              className="bg-[#1a65ff] hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
            >
              OVERIŤ
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors border border-slate-200"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md px-3 py-2.5 min-h-[96px] text-xs text-slate-700 space-y-1">
        {hasResultContent && (
          <>
            {statusMessage && (
              <p className="font-semibold text-slate-800">{statusMessage}</p>
            )}
            {errorMessage && (
              <p className="font-semibold text-red-700">{errorMessage}</p>
            )}
            {result?.status && (
              <p>
                <span className="font-semibold text-slate-600">Stav:</span> {result.status}
              </p>
            )}
            {result?.number && (
              <p>
                <span className="font-semibold text-slate-600">Číslo:</span> {result.number}
              </p>
            )}
            {result?.companyName && (
              <p>
                <span className="font-semibold text-slate-600">Názov firmy:</span>{' '}
                {result.companyName}
              </p>
            )}
            {result?.companyAddress && (
              <p>
                <span className="font-semibold text-slate-600">Adresa:</span>{' '}
                {result.companyAddress}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface VatEoriCheckerModalProps {
  isOpen: boolean;
  region: VatEoriRegion;
  onClose: () => void;
}

/** GB or EU VAT/EORI checker modal — prepared for future API, no requests yet. */
export const VatEoriCheckerModal: React.FC<VatEoriCheckerModalProps> = ({
  isOpen,
  region,
  onClose,
}) => {
  if (!isOpen) return null;

  const flagSrc = region === 'GB' ? '/uk1.png' : '/eu1.png';
  const modalTitle = 'VAT/EORI CHECKER';
  const vatTitle = `${region} VAT no. CHECKER`;
  const eoriTitle = `${region} EORI no. CHECKER`;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <img src={flagSrc} alt="" className="w-6 h-6 object-contain shrink-0" />
            <h3 className="font-bold text-base leading-none">{modalTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <CheckerPanel
            key={`${region}-vat-${isOpen}`}
            title={vatTitle}
            inputLabel="VAT NUMBER"
            inputPlaceholder="Zadajte VAT číslo"
          />
          <CheckerPanel
            key={`${region}-eori-${isOpen}`}
            title={eoriTitle}
            inputLabel="EORI NUMBER"
            inputPlaceholder="Zadajte EORI číslo"
          />
        </div>
      </div>
    </div>
  );
};
