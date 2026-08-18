import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { appApi } from '../lib/appApi';

interface VatEoriSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchErrorCode =
  | 'NO RESULTS'
  | 'API ERROR'
  | 'RATE LIMIT'
  | 'INVALID API KEY'
  | 'SERVICE UNAVAILABLE'
  | 'CONFIG ERROR'
  | 'VALIDATION ERROR';

type EoriNumberRow = {
  Number?: string;
  Name?: string;
  Address?: string;
  Valid?: boolean;
};

type SearchResultRow = {
  ID?: string | number;
  Score?: number;
  CC?: string;
  Status?: string;
  Number?: string;
  Name?: string;
  Address?: string | string[];
  EoriNumbers?: EoriNumberRow[];
};

const formatAddress = (address: string | string[] | undefined): string => {
  if (!address) return '';
  if (Array.isArray(address)) {
    return address
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .join('\n');
  }
  return String(address).trim();
};

const formatValid = (value: boolean | undefined): string => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
};

/**
 * Company-name VAT/EORI search popup.
 * Calls VAT-Search via server-side /api/app (Bearer key never reaches the browser).
 */
export const VatEoriSearchModal: React.FC<VatEoriSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [cutoffScore, setCutoffScore] = useState('1');
  const [livecheck, setLivecheck] = useState(true);
  const [results, setResults] = useState<SearchResultRow[]>([]);
  const [errorCode, setErrorCode] = useState<SearchErrorCode | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  if (!isOpen) return null;

  const handleReset = () => {
    requestSeq.current += 1;
    setCompanyName('');
    setAddress('');
    setCountryCode('');
    setCutoffScore('1');
    setLivecheck(true);
    setResults([]);
    setErrorCode(null);
    setErrorDetail(null);
    setLoading(false);
  };

  const handleSearch = async () => {
    if (loading) return;
    const seq = ++requestSeq.current;
    setResults([]);
    setErrorCode(null);
    setErrorDetail(null);
    setLoading(true);
    try {
      const response = await appApi.searchVatEori({
        companyName,
        address,
        countryCode,
        cutoffScore,
        livecheck,
      });
      if (seq !== requestSeq.current) return;
      const next = response.result;
      if (!next.ok) {
        setResults([]);
        setErrorCode(next.errorCode || 'API ERROR');
        setErrorDetail(next.error || next.errorCode || 'API ERROR');
        return;
      }
      setResults(next.results || []);
      setErrorCode(null);
      setErrorDetail(null);
    } catch {
      if (seq !== requestSeq.current) return;
      setResults([]);
      setErrorCode('SERVICE UNAVAILABLE');
      setErrorDetail('SERVICE UNAVAILABLE');
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
      }
    }
  };

  const hasTable = !loading && results.length > 0;
  const showError = !loading && Boolean(errorCode);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
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

        <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
          <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
                  COMPANY NAME
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
                  ADDRESS
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
                  COUNTRY CODE
                </label>
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
                  CUTOFF SCORE
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={cutoffScore}
                  onChange={(e) => setCutoffScore(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 text-slate-700 font-semibold text-[11px] uppercase cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={livecheck}
                    onChange={(e) => setLivecheck(e.target.checked)}
                    disabled={loading}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  LIVE CHECK
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleSearch();
                }}
                disabled={loading}
                className="bg-[#1a65ff] hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'VYHĽADÁVAM...' : 'VYHĽADAŤ'}
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

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="max-h-72 overflow-auto">
              {loading && (
                <p className="px-3 py-2.5 text-xs font-semibold text-slate-600">VYHĽADÁVAM...</p>
              )}

              {showError && (
                <div className="px-3 py-2.5 text-xs text-amber-800 space-y-0.5">
                  <p className="font-bold">{errorCode}</p>
                  {errorDetail && errorDetail !== errorCode && <p>{errorDetail}</p>}
                </div>
              )}

              {hasTable && (
                <table className="w-full text-left text-[11px] text-slate-900 border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-2.5 py-2 font-bold uppercase border-b border-slate-200 whitespace-nowrap">
                        Name
                      </th>
                      <th className="px-2.5 py-2 font-bold uppercase border-b border-slate-200 whitespace-nowrap">
                        Number
                      </th>
                      <th className="px-2.5 py-2 font-bold uppercase border-b border-slate-200 whitespace-nowrap">
                        CC
                      </th>
                      <th className="px-2.5 py-2 font-bold uppercase border-b border-slate-200 whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-2.5 py-2 font-bold uppercase border-b border-slate-200 whitespace-nowrap">
                        Address
                      </th>
                      <th className="px-2.5 py-2 font-bold uppercase border-b border-slate-200 whitespace-nowrap">
                        EoriNumbers
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, index) => {
                      const addressText = formatAddress(row.Address);
                      const eoriList = Array.isArray(row.EoriNumbers) ? row.EoriNumbers : [];
                      return (
                        <tr
                          key={`${row.ID ?? row.Number ?? 'row'}-${index}`}
                          className="align-top border-b border-slate-100 last:border-b-0"
                        >
                          <td className="px-2.5 py-2 whitespace-pre-wrap">{row.Name || ''}</td>
                          <td className="px-2.5 py-2 font-mono whitespace-nowrap">
                            {row.Number || ''}
                          </td>
                          <td className="px-2.5 py-2 uppercase whitespace-nowrap">
                            {row.CC || ''}
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{row.Status || ''}</td>
                          <td className="px-2.5 py-2 whitespace-pre-wrap min-w-[8rem]">
                            {addressText}
                          </td>
                          <td className="px-2.5 py-2 min-w-[12rem]">
                            {eoriList.length === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <div className="space-y-2">
                                {eoriList.map((eori, eoriIndex) => (
                                  <div
                                    key={`${eori.Number ?? 'eori'}-${eoriIndex}`}
                                    className="border border-slate-100 rounded-md bg-slate-50/80 px-2 py-1.5 space-y-0.5"
                                  >
                                    <p>
                                      <span className="font-semibold">Number:</span>{' '}
                                      <span className="font-mono">{eori.Number || ''}</span>
                                    </p>
                                    <p>
                                      <span className="font-semibold">Name:</span> {eori.Name || ''}
                                    </p>
                                    <p className="whitespace-pre-wrap">
                                      <span className="font-semibold">Address:</span>{' '}
                                      {eori.Address || ''}
                                    </p>
                                    <p>
                                      <span className="font-semibold">Valid:</span>{' '}
                                      {formatValid(eori.Valid)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
