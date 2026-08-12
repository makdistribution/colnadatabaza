import React, { useState } from 'react';
import { AdresaRecord } from '../types';
import { Plus, Trash2, Edit3, Building2, Save, X, Phone, Mail, MapPin } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const ALL_EUROPEAN_COUNTRIES = [
  { code: 'SR', name: 'Slovenská republika (SR)' },
  { code: 'ČR', name: 'Česká republika (ČR)' },
  { code: 'UK', name: 'Spojené kráľovstvo (UK)' },
  { code: 'DE', name: 'Nemecko (DE)' },
  { code: 'PL', name: 'Poľsko (PL)' },
  { code: 'AT', name: 'Rakúsko (AT)' },
  { code: 'HU', name: 'Maďarsko (HU)' },
  { code: 'IT', name: 'Taliansko (IT)' },
  { code: 'FR', name: 'Francúzsko (FR)' },
  { code: 'ES', name: 'Španielsko (ES)' },
  { code: 'NL', name: 'Holandsko (NL)' },
  { code: 'BE', name: 'Belgicko (BE)' },
  { code: 'CH', name: 'Švajčiarsko (CH)' },
  { code: 'RO', name: 'Rumunsko (RO)' },
  { code: 'BG', name: 'Bulharsko (BG)' },
  { code: 'HR', name: 'Chorvátsko (HR)' },
  { code: 'SI', name: 'Slovinsko (SI)' },
  { code: 'SE', name: 'Švédsko (SE)' },
  { code: 'DK', name: 'Dánsko (DK)' },
  { code: 'FI', name: 'Fínsko (FI)' },
  { code: 'NO', name: 'Nórsko (NO)' },
  { code: 'PT', name: 'Portugalsko (PT)' },
  { code: 'IE', name: 'Írsko (IE)' },
  { code: 'GR', name: 'Grécko (GR)' },
  { code: 'TR', name: 'Turecko (TR)' },
  { code: 'UA', name: 'Ukrajina (UA)' },
  { code: 'LT', name: 'Litva (LT)' },
  { code: 'LV', name: 'Lotyšsko (LV)' },
  { code: 'EE', name: 'Estónsko (EE)' },
  { code: 'AL', name: 'Albánsko (AL)' },
  { code: 'AD', name: 'Andorra (AD)' },
  { code: 'AM', name: 'Arménsko (AM)' },
  { code: 'AZ', name: 'Azerbajdžan (AZ)' },
  { code: 'BY', name: 'Bielorusko (BY)' },
  { code: 'BA', name: 'Bosna a Hercegovina (BA)' },
  { code: 'CY', name: 'Cyprus (CY)' },
  { code: 'GE', name: 'Gruzínsko (GE)' },
  { code: 'IS', name: 'Island (IS)' },
  { code: 'XK', name: 'Kosovo (XK)' },
  { code: 'LI', name: 'Lichtenštajnsko (LI)' },
  { code: 'LU', name: 'Luxembursko (LU)' },
  { code: 'MK', name: 'Severné Macedónsko (MK)' },
  { code: 'MT', name: 'Malta (MT)' },
  { code: 'MD', name: 'Moldavsko (MD)' },
  { code: 'MC', name: 'Monako (MC)' },
  { code: 'ME', name: 'Čierna Hora (ME)' },
  { code: 'SM', name: 'San Maríno (SM)' },
  { code: 'RS', name: 'Srbsko (RS)' },
  { code: 'VA', name: 'Vatikán (VA)' },
];

interface AdresyViewProps {
  records: AdresaRecord[];
  onSaveRecord: (record: AdresaRecord) => void;
  onDeleteRecord: (id: string) => void;
  /** Global header search — sole search for this page. */
  searchTerm?: string;
}

export const AdresyView: React.FC<AdresyViewProps> = ({
  records,
  onSaveRecord,
  onDeleteRecord,
  searchTerm = '',
}) => {
  const [editingRecord, setEditingRecord] = useState<AdresaRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdresaRecord | null>(null);

  const needle = searchTerm.trim().toLowerCase();
  const filtered = records.filter((r) => {
    if (!needle) return true;
    return (
      r.nazovFirmy.toLowerCase().includes(needle) ||
      (r.skratka || '').toLowerCase().includes(needle) ||
      (r.registrovanaAdresa || '').toLowerCase().includes(needle) ||
      (r.krajina || '').toLowerCase().includes(needle) ||
      r.ico.toLowerCase().includes(needle) ||
      (r.dic || '').toLowerCase().includes(needle) ||
      r.icDph.toLowerCase().includes(needle) ||
      (r.telefonneCislo || '').toLowerCase().includes(needle) ||
      r.email.toLowerCase().includes(needle) ||
      (r.email2 || '').toLowerCase().includes(needle) ||
      (r.email3 || '').toLowerCase().includes(needle) ||
      (r.poznamka || '').toLowerCase().includes(needle)
    );
  });

  const handleOpenAdd = () => {
    setEditingRecord({
      id: 'adr-' + Date.now(),
      pC: `0${records.length + 1}.`,
      nazovFirmy: '',
      skratka: '',
      registrovanaAdresa: '',
      krajina: 'SR',
      ico: '',
      dic: '',
      icDph: '',
      telefonneCislo: '',
      email: '',
      email2: '',
      email3: '',
      poznamka: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: AdresaRecord) => {
    setEditingRecord({
      ...rec,
      email2: rec.email2 || '',
      email3: rec.email3 || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord && editingRecord.nazovFirmy.trim() && (editingRecord.skratka || '').trim()) {
      onSaveRecord({
        ...editingRecord,
        skratka: editingRecord.skratka.trim(),
        nazovFirmy: editingRecord.nazovFirmy.trim(),
      });
      setIsModalOpen(false);
      setEditingRecord(null);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-500 rounded-xl shadow-xs overflow-hidden my-4">
      
      {/* Title Header */}
      <div className="bg-slate-50 px-5 py-3.5 border-b-2 border-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            ADRESÁR ZÁKAZNÍKOV (ADRESY)
          </h2>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
            {records.length} firiem
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Pridať firmu
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#dae3ed] text-black uppercase font-bold tracking-wider border-b-2 border-slate-600 text-[16px] leading-[21.333px]" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <th className="p-2.5 w-14 text-center border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">AKCIA</th>
              <th className="p-2.5 w-12 text-center border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">P.Č.</th>
              <th className="p-2.5 border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">NÁZOV FIRMY</th>
              <th className="p-2.5 border-r-2 border-slate-400 text-center text-black font-bold text-[16px] leading-[21.333px]">SKRATKA</th>
              <th className="p-2.5 border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">REGISTROVANÁ ADRESA</th>
              <th className="p-2.5 w-14 border-r-2 border-slate-400 text-center text-black font-bold text-[16px] leading-[21.333px]">KRAJINA</th>
              <th className="p-2.5 border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">IČO</th>
              <th className="p-2.5 border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">DIČ</th>
              <th className="p-2.5 border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">IČ DPH</th>
              <th className="p-2.5 border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">TELEFÓNNE ČÍSLO</th>
              <th className="p-2.5 border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">E-MAIL</th>
              <th className="p-2.5 text-black font-bold text-[16px] leading-[21.333px]">POZNÁMKA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-sans text-xs text-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400">
                  Žiadne firmy v adresári.
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => {
                const pcFormatted = String(idx + 1).padStart(2, '0');
                return (
                <tr key={r.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                  <td className="p-2 text-center border-r-2 border-slate-400">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 cursor-pointer"
                        title="Upraviť"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 cursor-pointer"
                        title="Vymazať"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 font-mono text-slate-700 font-bold border-r-2 border-slate-400 text-center">{pcFormatted}</td>
                  <td className="p-2 font-bold text-slate-900 border-r-2 border-slate-400">{r.nazovFirmy}</td>
                  <td className="p-2 font-semibold text-slate-900 border-r-2 border-slate-400">{r.skratka}</td>
                  <td className="p-2 text-slate-700 border-r-2 border-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {r.registrovanaAdresa}
                    </div>
                  </td>
                  <td className="p-2 text-center border-r-2 border-slate-400">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold text-[11px]">
                      {r.krajina}
                    </span>
                  </td>
                  <td className="p-2 font-mono text-slate-700 border-r-2 border-slate-400">{r.ico}</td>
                  <td className="p-2 font-mono text-slate-700 border-r-2 border-slate-400">{r.dic}</td>
                  <td className="p-2 font-mono text-slate-700 border-r-2 border-slate-400">{r.icDph}</td>
                  <td className="p-2 text-slate-700 border-r-2 border-slate-400">
                    {r.telefonneCislo && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {r.telefonneCislo}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-slate-700 border-r-2 border-slate-400">
                    <div className="space-y-0.5">
                      {r.email && (
                        <a href={`mailto:${r.email}`} className="text-blue-600 underline hover:text-blue-800 flex items-center gap-1.5 font-normal">
                          <Mail className="w-3 h-3 text-blue-500" /> {r.email}
                        </a>
                      )}
                      {r.email2 && (
                        <a href={`mailto:${r.email2}`} className="text-blue-600 underline hover:text-blue-800 flex items-center gap-1.5 font-normal">
                          <Mail className="w-3 h-3 text-blue-500" /> {r.email2}
                        </a>
                      )}
                      {r.email3 && (
                        <a href={`mailto:${r.email3}`} className="text-blue-600 underline hover:text-blue-800 flex items-center gap-1.5 font-normal">
                          <Mail className="w-3 h-3 text-blue-500" /> {r.email3}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-slate-500 text-[11px]">{r.poznamka}</td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingRecord.nazovFirmy ? 'ÚPRAVA FIRMY' : 'NOVÁ FIRMA DO ADRESÁRA'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">PORADOVÉ ČÍSLO</label>
                  <input
                    type="text"
                    value={editingRecord.pC}
                    onChange={(e) => setEditingRecord({ ...editingRecord, pC: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">KRAJINA</label>
                  <select
                    value={editingRecord.krajina}
                    onChange={(e) => setEditingRecord({ ...editingRecord, krajina: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {ALL_EUROPEAN_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">NÁZOV FIRMY *</label>
                <input
                  type="text"
                  required
                  value={editingRecord.nazovFirmy}
                  onChange={(e) => setEditingRecord({ ...editingRecord, nazovFirmy: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">SKRATKA *</label>
                <input
                  type="text"
                  required
                  value={editingRecord.skratka || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, skratka: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="napr. PETER TRANSPORTE"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">REGISTROVANÁ ADRESA</label>
                <input
                  type="text"
                  value={editingRecord.registrovanaAdresa}
                  onChange={(e) => setEditingRecord({ ...editingRecord, registrovanaAdresa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">IČO</label>
                  <input
                    type="text"
                    value={editingRecord.ico}
                    onChange={(e) => setEditingRecord({ ...editingRecord, ico: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">DIČ</label>
                  <input
                    type="text"
                    value={editingRecord.dic}
                    onChange={(e) => setEditingRecord({ ...editingRecord, dic: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">IČ DPH</label>
                  <input
                    type="text"
                    value={editingRecord.icDph}
                    onChange={(e) => setEditingRecord({ ...editingRecord, icDph: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">TELEFÓNNE ČÍSLO</label>
                  <input
                    type="text"
                    value={editingRecord.telefonneCislo}
                    onChange={(e) => setEditingRecord({ ...editingRecord, telefonneCislo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">EMAIL 1</label>
                  <input
                    type="email"
                    value={editingRecord.email}
                    onChange={(e) => setEditingRecord({ ...editingRecord, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">EMAIL 2</label>
                  <input
                    type="email"
                    value={editingRecord.email2 || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, email2: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">EMAIL 3</label>
                  <input
                    type="email"
                    value={editingRecord.email3 || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, email3: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">POZNÁMKA</label>
                <input
                  type="text"
                  value={editingRecord.poznamka}
                  onChange={(e) => setEditingRecord({ ...editingRecord, poznamka: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition-colors"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" /> ULOŽIŤ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="VYMAZAŤ FIRMU"
        message={
          <>
            Naozaj chcete vymazať{' '}
            <strong className="font-bold text-red-900">{deleteTarget?.nazovFirmy}</strong>
            ? Túto akciu nie je možné vrátiť späť.
          </>
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDeleteRecord(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

    </div>
  );
};
