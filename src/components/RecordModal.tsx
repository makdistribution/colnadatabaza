import React, { useState, useEffect, useRef } from 'react';
import { ColnaRecord } from '../types';
import { X, Save, AlertTriangle, Bell, Calendar, Truck, DollarSign, FileCheck, Upload } from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<ColnaRecord>) => void;
  initialRecord?: ColnaRecord | null;
  customerList: string[];
  readOnly?: boolean;
  defaultDate?: string;
}

interface AmountInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}

const AmountInput: React.FC<AmountInputProps> = ({ value, onChange, className }) => {
  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (!focused) {
      setDisplayValue(value === 0 || value == null ? '0.00' : value.toFixed(2));
    }
  }, [value, focused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    if (!value || value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
      e.target.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
      setDisplayValue(e.target.value);
      const parsed = parseFloat(raw);
      onChange(isNaN(parsed) ? 0 : parsed);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const raw = displayValue.replace(',', '.');
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed === 0) {
      onChange(0);
      setDisplayValue('0.00');
    } else {
      onChange(parsed);
      setDisplayValue(parsed.toFixed(2));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? displayValue : (value === 0 || value == null ? '0.00' : value.toFixed(2))}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
};

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  customerList,
  readOnly = false,
  defaultDate,
}) => {
  const [formData, setFormData] = useState<Partial<ColnaRecord>>({
    zakaznik: 'Petertransporte',
    isNew: true,
    bell: false,
    alert: false,
    datumColnice: new Date().toISOString().split('T')[0],
    spz: '',
    refNaFa: '',
    ukToEu: '',
    euToUk: '',
    faOdUkAgent: 0,
    faOdEuAgent: 0,
    faKlient: 0,
    intPoznamka: '',
    cisloFa: '',
    splatna: '',
    zaplatena: false,
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isInvoiceDragActive, setIsInvoiceDragActive] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const spzInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialRecord) {
      setFormData({ ...initialRecord });
    } else {
      setFormData({
        zakaznik: customerList[0] || 'Petertransporte',
        isNew: true,
        bell: false,
        alert: false,
        datumColnice: defaultDate || new Date().toISOString().split('T')[0],
        spz: '',
        refNaFa: '',
        ukToEu: '',
        euToUk: '',
        faOdUkAgent: 0,
        faOdEuAgent: 0,
        faKlient: 0,
        intPoznamka: '',
        cisloFa: '',
        splatna: '',
        zaplatena: false,
      });
    }
  }, [initialRecord, isOpen, customerList, defaultDate]);

  useEffect(() => {
    if (isOpen) {
      setInvoiceFile(null);
      setIsInvoiceDragActive(false);
    }
  }, [isOpen]);

  // Helper state toggles for UK/EU route selection
  const isUkZaclenieSelected = !!(formData.ukToEu && formData.ukToEu.includes('zaclenie v UK'));
  const isEuVyclenieSelected = !!(formData.ukToEu && formData.ukToEu.includes('vyclenie v EU'));

  const toggleUkZaclenie = () => {
    const nextUk = !isUkZaclenieSelected;
    const nextEu = isEuVyclenieSelected;
    let newStr = '';
    if (nextUk && nextEu) newStr = 'zaclenie v UK; vyclenie v EU';
    else if (nextUk) newStr = 'zaclenie v UK';
    else if (nextEu) newStr = 'vyclenie v EU';
    setFormData(prev => ({ ...prev, ukToEu: newStr }));
  };

  const toggleEuVyclenie = () => {
    const nextUk = isUkZaclenieSelected;
    const nextEu = !isEuVyclenieSelected;
    let newStr = '';
    if (nextUk && nextEu) newStr = 'zaclenie v UK; vyclenie v EU';
    else if (nextUk) newStr = 'zaclenie v UK';
    else if (nextEu) newStr = 'vyclenie v EU';
    setFormData(prev => ({ ...prev, ukToEu: newStr }));
  };

  const isEuZaclenieSelected = !!(formData.euToUk && formData.euToUk.includes('zaclenie v EU'));
  const isUkVyclenieSelected = !!(formData.euToUk && formData.euToUk.includes('vyclenie v UK'));

  const toggleEuZaclenie = () => {
    const nextEu = !isEuZaclenieSelected;
    const nextUk = isUkVyclenieSelected;
    let newStr = '';
    if (nextEu && nextUk) newStr = 'zaclenie v EU; vyclenie v UK';
    else if (nextEu) newStr = 'zaclenie v EU';
    else if (nextUk) newStr = 'vyclenie v UK';
    setFormData(prev => ({ ...prev, euToUk: newStr }));
  };

  const toggleUkVyclenie = () => {
    const nextEu = isEuZaclenieSelected;
    const nextUk = !isUkVyclenieSelected;
    let newStr = '';
    if (nextEu && nextUk) newStr = 'zaclenie v EU; vyclenie v UK';
    else if (nextEu) newStr = 'zaclenie v EU';
    else if (nextUk) newStr = 'vyclenie v UK';
    setFormData(prev => ({ ...prev, euToUk: newStr }));
  };

  const selectInvoiceFile = (file?: File) => {
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      setInvoiceFile(file);
    }
  };

  const handleSpzChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectionStart = e.currentTarget.selectionStart;
    const selectionEnd = e.currentTarget.selectionEnd;
    const uppercaseValue = e.currentTarget.value.toUpperCase();
    setFormData(prev => ({ ...prev, spz: uppercaseValue }));
    requestAnimationFrame(() => {
      if (spzInputRef.current && selectionStart !== null && selectionEnd !== null) {
        spzInputRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  };

  if (!isOpen) return null;

  // Auto calculate profit
  const calculatedProfit = (Number(formData.faKlient) || 0) - (Number(formData.faOdUkAgent) || 0) - (Number(formData.faOdEuAgent) || 0);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave({
      ...formData,
      zisk: calculatedProfit,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-4xl my-auto text-slate-800 overflow-hidden flex flex-col max-h-[98vh]">
        
        {/* Modal Header */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 
              className="font-bold text-slate-900 tracking-tight uppercase px-3 py-1"
              style={{
                borderRadius: '8px',
                borderWidth: '4px',
                borderColor: initialRecord && !readOnly ? '#e33a3a' : '#1e10d0',
                borderStyle: 'solid',
                fontSize: '15px',
                fontFamily: 'system-ui, sans-serif'
              }}
            >
              {readOnly ? 'NÁHĽAD ZÁZNAMU COLNICE' : initialRecord ? 'ÚPRAVA ZÁZNAMU COLNICE' : 'NOVÝ ZÁZNAM'}
            </h3>
          </div>
          
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 text-xs overflow-y-auto">
          <fieldset disabled={readOnly} className="space-y-3">
          
          {/* Row 1: Customer & Flags */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px] uppercase">
                ZÁKAZNÍK *
              </label>
              <select
                value={formData.zakaznik}
                onChange={(e) => setFormData({ ...formData, zakaznik: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 font-semibold text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                required
              >
                {customerList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Iný zákazník">+ Pridať nového zákazníka</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 self-end pb-1 w-[235.3125px] shrink-0">
              {!initialRecord || readOnly ? (
                <>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.isNew}
                      onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 bg-white border-slate-300 shrink-0"
                    />
                    <img src="/new1.png" alt="NEW" className="h-6.5 w-auto object-contain shrink-0" title="Nové colné konanie v evidencii" />
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 ml-1">
                    <input
                      type="checkbox"
                      checked={formData.bell}
                      onChange={(e) => setFormData({ ...formData, bell: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 bg-white border-slate-300 shrink-0"
                    />
                    <img src="/mail.png" alt="Mail" className="h-6.5 w-auto object-contain shrink-0" />
                    <span className="text-slate-600 font-medium text-[12px] whitespace-nowrap">
                      Odoslať na fakturáciu
                    </span>
                  </label>
                </>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 -mb-[2px] mt-0 ml-0 pt-0">
                  <input
                    type="checkbox"
                    checked={formData.alert}
                    onChange={(e) => setFormData({ ...formData, alert: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0 w-4 h-4 bg-white border-slate-300 shrink-0 self-center -mb-[1px]"
                  />
                  <img src="/edit.png" alt="Edit" className="h-7 w-auto object-contain shrink-0 self-center -mt-[4px]" />
                  <span className="text-slate-600 font-medium text-[12px] leading-tight self-center mt-0">
                    Zaznamenať zmenu a <img src="/mail.png" alt="Mail" className="h-4.5 w-auto inline-block align-middle mx-0.5" /><br />upozornenie o zmene
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Row 2: Transport & Direction Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" /> DÁTUM COLNICE
              </label>
              <input
                type="date"
                value={formData.datumColnice || ''}
                onChange={(e) => setFormData({ ...formData, datumColnice: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-600" /> ŠPZ VOZIDLA
              </label>
              <input
                ref={spzInputRef}
                type="text"
                value={formData.spz || ''}
                onChange={handleSpzChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
                REFERENCIA NA FAKTÚRU
              </label>
              <input
                type="text"
                value={formData.refNaFa || ''}
                onChange={(e) => setFormData({ ...formData, refNaFa: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Row 3: UK/EU Direction Statuses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-teal-900 font-bold text-[11px] uppercase tracking-wide">
                TRASA <img src="/uk1.png" alt="UK" className="inline-block w-5 h-5 object-contain" /> ➔ <img src="/eu1.png" alt="EU" className="inline-block w-5 h-5 object-contain" />
              </label>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={toggleUkZaclenie}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer border transition-all flex items-center gap-1.5 ${
                    isUkZaclenieSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <span>{isUkZaclenieSelected ? '✓' : '＋'}</span> zaclenie v UK
                </button>

                <button
                  type="button"
                  onClick={toggleEuVyclenie}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer border transition-all flex items-center gap-1.5 ${
                    isEuVyclenieSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <span>{isEuVyclenieSelected ? '✓' : '＋'}</span> vyclenie v EU
                </button>
              </div>
            </div>

            <div className="bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-teal-900 font-bold text-[11px] uppercase tracking-wide">
                TRASA <img src="/eu1.png" alt="EU" className="inline-block w-5 h-5 object-contain" /> ➔ <img src="/uk1.png" alt="UK" className="inline-block w-5 h-5 object-contain" />
              </label>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={toggleEuZaclenie}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer border transition-all flex items-center gap-1.5 ${
                    isEuZaclenieSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <span>{isEuZaclenieSelected ? '✓' : '＋'}</span> zaclenie v EU
                </button>

                <button
                  type="button"
                  onClick={toggleUkVyclenie}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer border transition-all flex items-center gap-1.5 ${
                    isUkVyclenieSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <span>{isUkVyclenieSelected ? '✓' : '＋'}</span> vyclenie v UK
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Financial Amounts & Live Calculated Profit */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-1 uppercase text-[11px] tracking-wider">
                Poplatky & Zisk
              </h4>
              <div className="bg-emerald-100 border border-emerald-300 px-3 py-0.5 rounded-md flex items-center gap-2">
                <span className="font-bold text-emerald-900 text-[11px]">VYPOČÍTANÝ ZISK:</span>
                <span className="text-xs font-black font-mono text-emerald-700 -mt-[2px]">{calculatedProfit.toFixed(2)} €</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-600 font-medium mb-0.5 text-[11px]">
                  FA OD UK AGENT (€)
                </label>
                <AmountInput
                  value={formData.faOdUkAgent ?? 0}
                  onChange={(val) => setFormData(prev => ({ ...prev, faOdUkAgent: val }))}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-0.5 text-[11px]">
                  FA OD EU AGENT (€)
                </label>
                <AmountInput
                  value={formData.faOdEuAgent ?? 0}
                  onChange={(val) => setFormData(prev => ({ ...prev, faOdEuAgent: val }))}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-blue-900 font-bold mb-0.5 text-[11px]">
                  FA ➔ KLIENT (€)
                </label>
                <AmountInput
                  value={formData.faKlient ?? 0}
                  onChange={(val) => setFormData(prev => ({ ...prev, faKlient: val }))}
                  className="w-full bg-white border border-blue-400 rounded-md px-2.5 py-1 text-blue-900 font-bold font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Invoice Info & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-[0.9fr_1.1fr_1.4fr_1fr] gap-2.5 items-center">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase tracking-wide">
                ČÍSLO FAKTÚRY
              </label>
              <input
                type="text"
                value={formData.cisloFa || ''}
                onChange={(e) => setFormData({ ...formData, cisloFa: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase tracking-wide">
                DÁTUM SPLATNOSTI
              </label>
              <input
                type="date"
                value={formData.splatna || ''}
                onChange={(e) => setFormData({ ...formData, splatna: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <input
                ref={invoiceInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => selectInvoiceFile(e.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => invoiceInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsInvoiceDragActive(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setIsInvoiceDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsInvoiceDragActive(false);
                  selectInvoiceFile(e.dataTransfer.files?.[0]);
                }}
                className={`relative order-2 flex-1 h-[84px] rounded-xl border cursor-pointer transition-colors ${
                  isInvoiceDragActive
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-blue-400 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <Upload className="absolute left-1/2 top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 text-blue-600" />
                {invoiceFile && (
                  <span className="absolute bottom-1 left-2 right-2 block text-center text-blue-700 font-semibold text-[9px] truncate">
                    {invoiceFile.name}
                  </span>
                )}
              </button>
              <span className="order-1 w-[68px] shrink-0 translate-x-[3mm] text-slate-500 font-semibold text-[11px] uppercase leading-tight">
                NAHRAJ VYSTAVENÚ FAKTÚRU
              </span>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 h-[34px] font-bold text-slate-700 text-[11px] uppercase hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.zaplatena}
                  onChange={(e) => setFormData({ ...formData, zaplatena: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span className={formData.zaplatena ? 'text-emerald-700 font-extrabold' : 'text-slate-700'}>
                  FAKTÚRA ZAPLATENÁ
                </span>
              </label>
            </div>
          </div>

          {/* Row 6: Internal Note (Full width) */}
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase tracking-wide">
              INTERNÁ POZNÁMKA
            </label>
            <input
              type="text"
              value={formData.intPoznamka || ''}
              onChange={(e) => setFormData({ ...formData, intPoznamka: e.target.value })}
              className={`w-full bg-slate-50 ${
                initialRecord && !readOnly
                  ? 'border-2 border-red-500 focus:ring-red-500'
                  : 'border border-slate-200 focus:ring-blue-500'
              } h-[30px] rounded-md px-2.5 py-1.5 text-slate-900 focus:ring-1 outline-none`}
            />
          </div>

          </fieldset>
        </form>

        {/* Bottom Action Footer */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={readOnly}
            className="bg-[#1a65ff] hover:bg-blue-700 text-white font-bold text-xs px-10 py-2 rounded-lg shadow-md flex items-center justify-center cursor-pointer transition-colors uppercase tracking-wider"
          >
            ULOŽIŤ
          </button>
        </div>

      </div>
    </div>
  );
};
