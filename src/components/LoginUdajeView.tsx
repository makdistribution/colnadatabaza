import React, { useState } from 'react';
import { LoginRecord } from '../types';
import { Key, ExternalLink, Eye, EyeOff, Copy, Check, Plus, Trash2, Edit3, ShieldCheck, X, Save } from 'lucide-react';

interface LoginUdajeViewProps {
  records: LoginRecord[];
  onSaveRecord: (record: LoginRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const LoginUdajeView: React.FC<LoginUdajeViewProps> = ({
  records,
  onSaveRecord,
  onDeleteRecord
}) => {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit / Add Modal State
  const [editingRecord, setEditingRecord] = useState<LoginRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = (defaultCat: 'I' | 'II') => {
    setEditingRecord({
      id: Date.now().toString(),
      sluzba: '',
      odkaz: '',
      prihlasenie: '',
      heslo: '',
      kategoria: defaultCat,
      poznamka: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: LoginRecord) => {
    setEditingRecord({ ...record });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!editingRecord.sluzba.trim()) return;
    onSaveRecord(editingRecord);
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const cat1 = records.filter(r => r.kategoria === 'I');
  const cat2 = records.filter(r => r.kategoria === 'II');

  return (
    <div className="space-y-6 my-4">
      {/* Banner */}
      <div className="bg-white border-2 border-slate-500 p-4 rounded-xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase">
              PRIHLASOVACIE ÚDAJE (LOGIN ÚDAJE I & II)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('I')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Pridať prístup
          </button>
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full font-mono font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Zašifrované v relácii
          </span>
        </div>
      </div>

      {/* Category I Table */}
      <div className="bg-white border-2 border-slate-500 rounded-xl shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b-2 border-slate-600 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="p-1 bg-blue-100 rounded text-blue-700">💻</span> PRIHLASOVACIE ÚDAJE - SKUPINA I (COLNÉ PORTÁLY)
          </h3>
          <button
            onClick={() => handleOpenAdd('I')}
            className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Pridať do Skupiny I
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#dae3ed] text-black uppercase font-bold tracking-wider border-b-2 border-slate-400 text-[16px]">
                <th className="p-2.5 w-16 text-center border-r-2 border-slate-400">Akcia</th>
                <th className="p-2.5 min-w-[150px] border-r-2 border-slate-400">Služba / Portál</th>
                <th className="p-2.5 min-w-[200px] border-r-2 border-slate-400">Web Odkaz</th>
                <th className="p-2.5 min-w-[180px] border-r-2 border-slate-400">Prihlasovacie Meno</th>
                <th className="p-2.5 min-w-[200px] border-r-2 border-slate-400">Heslo</th>
                <th className="p-2.5 min-w-[140px]">Poznámka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-mono text-xs text-slate-800">
              {cat1.map((r, idx) => {
                const isPassShown = !!visiblePasswords[r.id];
                return (
                  <tr key={r.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                    <td className="p-2 text-center border-r-2 border-slate-400">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                          title="Upraviť záznam"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Naozaj chcete vymazať prístup pre "${r.sluzba}"?`)) {
                              onDeleteRecord(r.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Vymazať"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 font-bold font-sans text-slate-900 border-r-2 border-slate-400">
                      {r.sluzba}
                    </td>
                    <td className="p-2.5 border-r-2 border-slate-400">
                      <a
                        href={r.odkaz.startsWith('http') ? r.odkaz : `https://${r.odkaz}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800 flex items-center gap-1 max-w-[220px] truncate font-normal"
                      >
                        <span>{r.odkaz}</span>
                        <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                      </a>
                    </td>
                    <td className="p-2.5 border-r-2 border-slate-400 text-slate-800 font-medium">
                      {r.prihlasenie.includes('@') ? (
                        <a href={`mailto:${r.prihlasenie}`} className="text-blue-600 underline hover:text-blue-800 font-bold">
                          {r.prihlasenie}
                        </a>
                      ) : (
                        r.prihlasenie
                      )}
                    </td>
                    <td className="p-2.5 border-r-2 border-slate-400 text-slate-800">
                      {r.heslo === '-' ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <div className="flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-300">
                          <span className="font-mono text-slate-900 font-bold tracking-wider inline-block w-[11rem] truncate tabular-nums">
                            {isPassShown ? r.heslo : '••••••••••••'}
                          </span>
                          <div className="flex items-center gap-1 font-sans shrink-0">
                            <button
                              onClick={() => togglePassword(r.id)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              title={isPassShown ? 'Skryť heslo' : 'Zobraziť heslo'}
                            >
                              {isPassShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopy(r.heslo, r.id)}
                              className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                              title="Kopírovať heslo"
                            >
                              {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 font-sans text-slate-600 text-[11px]">{r.poznamka}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category II Table */}
      <div className="bg-white border-2 border-slate-500 rounded-xl shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b-2 border-slate-600 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="p-1 bg-emerald-100 rounded text-emerald-700">📌</span> PRIHLASOVACIE ÚDAJE - SKUPINA II (WEBOVÉ STRÁNKY & EDITORY)
          </h3>
          <button
            onClick={() => handleOpenAdd('II')}
            className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Pridať do Skupiny II
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#dae3ed] text-black uppercase font-bold tracking-wider border-b-2 border-slate-600 text-[16px]">
                <th className="p-2.5 w-16 text-center border-r-2 border-slate-400">Akcia</th>
                <th className="p-2.5 min-w-[150px] border-r-2 border-slate-400">Služba / Nástroj</th>
                <th className="p-2.5 min-w-[220px] border-r-2 border-slate-400">Odkaz / Web</th>
                <th className="p-2.5 min-w-[180px] border-r-2 border-slate-400">Prihlasovacie Meno</th>
                <th className="p-2.5 min-w-[200px] border-r-2 border-slate-400">Heslo</th>
                <th className="p-2.5 min-w-[140px]">Poznámka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-mono text-xs text-slate-800">
              {cat2.map((r, idx) => {
                const isPassShown = !!visiblePasswords[r.id];
                return (
                  <tr key={r.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                    <td className="p-2 text-center border-r-2 border-slate-400">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                          title="Upraviť záznam"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Naozaj chcete vymazať prístup pre "${r.sluzba}"?`)) {
                              onDeleteRecord(r.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Vymazať"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 font-bold font-sans text-slate-900 border-r-2 border-slate-400">
                      {r.sluzba}
                    </td>
                    <td className="p-2.5 border-r-2 border-slate-400">
                      <a
                        href={r.odkaz.startsWith('http') ? r.odkaz : `https://${r.odkaz}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800 flex items-center gap-1 max-w-[240px] truncate font-normal"
                      >
                        <span>{r.odkaz}</span>
                        <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                      </a>
                    </td>
                    <td className="p-2.5 border-r-2 border-slate-400 text-slate-800 font-medium">
                      {r.prihlasenie.includes('@') ? (
                        <a href={`mailto:${r.prihlasenie}`} className="text-blue-600 underline hover:text-blue-800 font-normal">
                          {r.prihlasenie}
                        </a>
                      ) : (
                        r.prihlasenie
                      )}
                    </td>
                    <td className="p-2.5 border-r-2 border-slate-400 text-slate-800">
                      {r.heslo === '-' ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <div className="flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-300">
                          <span className="font-mono text-slate-900 font-bold tracking-wider inline-block w-[11rem] truncate tabular-nums">
                            {isPassShown ? r.heslo : '••••••••••••'}
                          </span>
                          <div className="flex items-center gap-1 font-sans shrink-0">
                            <button
                              onClick={() => togglePassword(r.id)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              title={isPassShown ? 'Skryť heslo' : 'Zobraziť heslo'}
                            >
                              {isPassShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopy(r.heslo, r.id)}
                              className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                              title="Kopírovať heslo"
                            >
                              {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 font-sans text-slate-600 text-[11px]">{r.poznamka}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Login Record Modal */}
      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border-2 border-slate-400 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-100 px-5 py-3.5 border-b-2 border-slate-400 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                {records.some(r => r.id === editingRecord.id) ? 'Upraviť prihlasovací údaj' : 'Pridať nový prihlasovací údaj'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Skupina / Kategória</label>
                <select
                  value={editingRecord.kategoria}
                  onChange={(e) => setEditingRecord({ ...editingRecord, kategoria: e.target.value as 'I' | 'II' })}
                  className="w-full text-xs font-bold text-slate-900 p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                >
                  <option value="I">Skupina I - Colné portály (Getlink, Colnica...)</option>
                  <option value="II">Skupina II - Webové stránky & Editory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Služba / Portál *</label>
                <input
                  type="text"
                  required
                  value={editingRecord.sluzba}
                  onChange={(e) => setEditingRecord({ ...editingRecord, sluzba: e.target.value })}
                  placeholder="napr. GETLINK PORTÁL"
                  className="w-full text-xs font-bold text-slate-900 p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Web Odkaz (URL)</label>
                <input
                  type="text"
                  value={editingRecord.odkaz}
                  onChange={(e) => setEditingRecord({ ...editingRecord, odkaz: e.target.value })}
                  placeholder="napr. account.getlinkgroup.com"
                  className="w-full text-xs text-blue-600 underline p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prihlasovacie Meno / Email</label>
                <input
                  type="text"
                  value={editingRecord.prihlasenie}
                  onChange={(e) => setEditingRecord({ ...editingRecord, prihlasenie: e.target.value })}
                  placeholder="napr. mak@distribution.sk"
                  className={`w-full text-xs p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none ${
                    editingRecord.prihlasenie.includes('@')
                      ? 'text-blue-600 underline'
                      : 'text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Heslo</label>
                <input
                  type="text"
                  value={editingRecord.heslo}
                  onChange={(e) => setEditingRecord({ ...editingRecord, heslo: e.target.value })}
                  placeholder="napr. Heslo123!"
                  className="w-full text-xs font-mono font-bold text-slate-900 p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Poznámka</label>
                <input
                  type="text"
                  value={editingRecord.poznamka || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, poznamka: e.target.value })}
                  placeholder="Voliteľná poznámka..."
                  className="w-full text-xs text-slate-900 p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" /> ULOŽIŤ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
