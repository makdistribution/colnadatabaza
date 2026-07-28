import React, { useState, useEffect } from 'react';
import { ColnaRecord } from '../types';
import { X, Save, AlertTriangle, Bell, Calendar, Truck, DollarSign, FileCheck } from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<ColnaRecord>) => void;
  initialRecord?: ColnaRecord | null;
  customerList: string[];
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  customerList
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

  useEffect(() => {
    if (initialRecord) {
      setFormData({ ...initialRecord });
    } else {
      setFormData({
        zakaznik: customerList[0] || 'Petertransporte',
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
    }
  }, [initialRecord, isOpen, customerList]);

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
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
            <h3 
              className="font-bold text-slate-900 tracking-tight uppercase px-2 py-0.5"
              style={{
                borderRadius: '8px',
                borderWidth: '5px',
                borderColor: '#e33a3a',
                borderStyle: 'solid',
                fontSize: '15px',
                fontFamily: 'system-ui, sans-serif'
              }}
            >
              {initialRecord ? 'ÚPRAVA ZÁZNAMU COLNICE' : 'NOVÝ ZÁZNAM'}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1 rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> ULOŽIŤ
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-2.5 text-xs overflow-y-auto">
          
          {/* Row 1: Customer & Flags */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-slate-700 font-bold mb-0.5 text-[11px] uppercase">
                ZÁKAZNÍK *
              </label>
              <select
                value={formData.zakaznik}
                onChange={(e) => setFormData({ ...formData, zakaznik: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 font-semibold text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                required
              >
                {customerList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Iný zákazník">+ Pridať nového zákazníka</option>
              </select>
            </div>

            <div className="flex items-center gap-4 pt-3 sm:pt-4">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isNew}
                  onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 bg-white border-slate-300"
                />
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  NEW
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.bell}
                  onChange={(e) => setFormData({ ...formData, bell: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-0 w-3.5 h-3.5 bg-white border-slate-300"
                />
                <span className="flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                  <Bell className="w-3 h-3 text-amber-600" /> UPOZORNENIE
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.alert}
                  onChange={(e) => setFormData({ ...formData, alert: e.target.checked })}
                  className="rounded text-red-500 focus:ring-0 w-3.5 h-3.5 bg-white border-slate-300"
                />
                <span className="flex items-center gap-1 text-red-700 font-semibold text-[11px]">
                  <AlertTriangle className="w-3 h-3 text-red-600" /> URGENT
                </span>
              </label>
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
                type="text"
                value={formData.spz || ''}
                onChange={(e) => setFormData({ ...formData, spz: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
                REF. NA FA.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="space-y-1.5">
              <label className="block text-blue-900 font-bold text-[11px] uppercase tracking-wide">
                TRASA UK ➔ EU (Kliknutím zvolte)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
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

            <div className="space-y-1.5">
              <label className="block text-emerald-900 font-bold text-[11px] uppercase tracking-wide">
                TRASA EU ➔ UK (Kliknutím zvolte)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
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
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Poplatky & Zisk
              </h4>
              <div className="bg-emerald-100 border border-emerald-300 px-3 py-0.5 rounded-md flex items-center gap-2">
                <span className="font-bold text-emerald-900 text-[11px]">VYPOČÍTANÝ ZISK:</span>
                <span className="text-xs font-black font-mono text-emerald-700">{calculatedProfit.toFixed(2)} €</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-600 font-medium mb-0.5 text-[11px]">
                  FA OD UK AGENT (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.faOdUkAgent ?? 0}
                  onChange={(e) => setFormData({ ...formData, faOdUkAgent: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-0.5 text-[11px]">
                  FA OD EU AGENT (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.faOdEuAgent ?? 0}
                  onChange={(e) => setFormData({ ...formData, faOdEuAgent: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-blue-900 font-bold mb-0.5 text-[11px]">
                  FA. ➔ KLIENT (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.faKlient ?? 0}
                  onChange={(e) => setFormData({ ...formData, faKlient: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-blue-400 rounded-md px-2.5 py-1 text-blue-900 font-bold font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Invoice Info, Payment & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
                ČÍSLO FAKTÚRY
              </label>
              <input
                type="text"
                value={formData.cisloFa || ''}
                onChange={(e) => setFormData({ ...formData, cisloFa: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
                DÁTUM SPLATNOSTI
              </label>
              <input
                type="date"
                value={formData.splatna || ''}
                onChange={(e) => setFormData({ ...formData, splatna: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
                INTERNÁ POZNÁMKA
              </label>
              <input
                type="text"
                value={formData.intPoznamka || ''}
                onChange={(e) => setFormData({ ...formData, intPoznamka: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Row 6: Payment checkbox */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold text-xs">
              <input
                type="checkbox"
                checked={formData.zaplatena}
                onChange={(e) => setFormData({ ...formData, zaplatena: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
              />
              <span className={formData.zaplatena ? 'text-emerald-700' : 'text-slate-600'}>
                FAKTÚRA ZAPLATENÁ
              </span>
            </label>

            {formData.zaplatena && (
              <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <FileCheck className="w-3 h-3 text-emerald-600" /> UHRADENÉ
              </span>
            )}
          </div>

        </form>

        {/* Bottom Action Footer */}
        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-8 py-2 rounded-md shadow-xs flex items-center justify-center cursor-pointer transition-colors"
          >
            ULOŽIŤ
          </button>
        </div>

      </div>
    </div>
  );
};
