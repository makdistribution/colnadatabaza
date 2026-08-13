import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { appApi } from '../lib/appApi';

export type VatEoriRegion = 'GB' | 'EU';

type CheckerKind = 'vat' | 'eori';

type CheckerStatus =
  | 'VALID'
  | 'INVALID'
  | 'SERVICE UNAVAILABLE'
  | 'RATE LIMIT REACHED'
  | 'FORMAT ERROR'
  | 'CONFIG ERROR';

interface CheckerResult {
  status?: CheckerStatus;
  number?: string;
  companyName?: string;
  companyAddress?: string;
  country?: string;
  error?: string;
  detailsUnavailable?: boolean;
}

interface CheckerPanelProps {
  title: string;
  inputLabel: string;
  inputPlaceholder?: string;
  kind: CheckerKind;
  region: VatEoriRegion;
}

const GB_EORI_PRIVACY_TITLE = 'EORI registration details not available';
const GB_EORI_PRIVACY_BODY =
  'The business this number is registered to has not consented to their name and address being shared.';

/** Multi-line ADDRESS block — continuation lines align under the address value, not under the label. */
const AddressLines: React.FC<{ address: string }> = ({ address }) => {
  const lines = address
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <div className="flex items-start text-left leading-snug">
      <span className="shrink-0">ADDRESS:&nbsp;</span>
      <span className="min-w-0">
        {lines.map((line, index) => (
          <span key={`${index}-${line}`} className="block">
            {line}
          </span>
        ))}
      </span>
    </div>
  );
};

/** Single VAT or EORI checker block. */
const CheckerPanel: React.FC<CheckerPanelProps> = ({
  title,
  inputLabel,
  inputPlaceholder = '',
  kind,
  region,
}) => {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<CheckerResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  const handleReset = () => {
    requestSeq.current += 1;
    setValue('');
    setResult(null);
    setErrorMessage(null);
    setLoading(false);
  };

  const handleVerify = async () => {
    if (loading) return;
    const seq = ++requestSeq.current;
    setResult(null);
    setErrorMessage(null);
    setLoading(true);
    try {
      const response =
        kind === 'vat'
          ? await appApi.checkVatNumber(value, region)
          : await appApi.checkEoriNumber(value, region);
      if (seq !== requestSeq.current) return;
      const next = response.result;
      setResult({
        status: next.status,
        number: next.number,
        companyName: next.companyName,
        companyAddress: next.companyAddress,
        country: next.country,
        error: next.error,
        detailsUnavailable: next.detailsUnavailable,
      });
      if (
        next.status === 'SERVICE UNAVAILABLE' ||
        next.status === 'RATE LIMIT REACHED' ||
        next.status === 'FORMAT ERROR' ||
        next.status === 'CONFIG ERROR'
      ) {
        setErrorMessage(next.error || next.status);
      }
    } catch {
      if (seq !== requestSeq.current) return;
      setResult({ status: 'SERVICE UNAVAILABLE' });
      setErrorMessage('SERVICE UNAVAILABLE');
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
      }
    }
  };

  const hasResultContent =
    Boolean(result?.status) ||
    Boolean(result?.number) ||
    Boolean(result?.companyName) ||
    Boolean(result?.companyAddress) ||
    Boolean(result?.country) ||
    Boolean(result?.detailsUnavailable) ||
    Boolean(errorMessage);

  const statusLabel: CheckerStatus | null =
    result?.status || (errorMessage ? 'SERVICE UNAVAILABLE' : null);

  const statusClass =
    statusLabel === 'VALID'
      ? 'text-green-700'
      : statusLabel === 'INVALID'
        ? 'text-red-700'
        : 'text-amber-700';

  const showPrivacyNotice =
    kind === 'eori' &&
    region === 'GB' &&
    statusLabel === 'VALID' &&
    Boolean(result?.detailsUnavailable);

  const showCompanyBlock =
    statusLabel === 'VALID' &&
    !showPrivacyNotice &&
    (Boolean(result?.companyName) || Boolean(result?.companyAddress) || Boolean(result?.country));

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
            disabled={loading}
            className="flex-1 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-60"
          />
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                void handleVerify();
              }}
              disabled={loading}
              className="bg-[#1a65ff] hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'LOADING…' : 'OVERIŤ'}
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

      <div className="bg-white border border-slate-200 rounded-md px-3 py-2.5 h-40 overflow-y-auto text-xs text-slate-900 text-left leading-snug">
        {loading && <p className="font-semibold text-slate-600">LOADING…</p>}
        {!loading && hasResultContent && (
          <div className="space-y-0">
            {statusLabel && <p className={`font-bold ${statusClass}`}>{statusLabel}</p>}
            {(statusLabel === 'FORMAT ERROR' || statusLabel === 'CONFIG ERROR') &&
              result?.error &&
              result.error !== statusLabel && <p className="text-slate-700">{result.error}</p>}
            {statusLabel === 'RATE LIMIT REACHED' && (
              <p className="text-slate-700">Skúste to prosím neskôr.</p>
            )}

            {showPrivacyNotice && (
              <>
                <p>{GB_EORI_PRIVACY_TITLE}</p>
                <p>{GB_EORI_PRIVACY_BODY}</p>
              </>
            )}

            {!showPrivacyNotice && result?.number && (
              <p>
                {kind === 'vat' ? 'VAT NUMBER' : 'EORI NUMBER'}: {result.number}
              </p>
            )}

            {showCompanyBlock && result?.companyName && <p>COMPANY: {result.companyName}</p>}
            {showCompanyBlock && result?.companyAddress && (
              <AddressLines address={result.companyAddress} />
            )}
            {showCompanyBlock && result?.country && <p>COUNTRY: {result.country}</p>}
          </div>
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

/** GB or EU VAT/EORI checker modal. */
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
            kind="vat"
            region={region}
          />
          <CheckerPanel
            key={`${region}-eori-${isOpen}`}
            title={eoriTitle}
            inputLabel="EORI NUMBER"
            inputPlaceholder="Zadajte EORI číslo"
            kind="eori"
            region={region}
          />
        </div>
      </div>
    </div>
  );
};
