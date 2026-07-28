import React, { useState } from 'react';
import { InfoFaRecord } from '../types';
import { BookOpen, AlertCircle, HelpCircle, Plus, Edit3, Trash2, Check, FileText } from 'lucide-react';

interface InfoFaViewProps {
  records: InfoFaRecord[];
  onSaveRecord: (record: InfoFaRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const InfoFaView: React.FC<InfoFaViewProps> = ({
  records,
  onSaveRecord,
  onDeleteRecord
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState<InfoFaRecord | null>(null);

  const filtered = records.filter(r =>
    !searchTerm ||
    r.nazov.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.popis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border-2 border-slate-400 rounded-xl shadow-xs overflow-hidden my-4">
      
      {/* Title Header */}
      <div className="bg-slate-50 px-5 py-3.5 border-b-2 border-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            INFO K FAKTURÁCII (AKO VYSTAVIŤ FA)
          </h2>
        </div>

        <button
          onClick={() => setEditingRecord({ id: 'info-' + Date.now(), nazov: 'NOVÉ POKYNY', popis: '', doleziteAlert: false })}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Pridať pokyn
        </button>
      </div>

      {/* Guidelines Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-black uppercase font-bold tracking-wider border-b-2 border-slate-400 text-[16px]">
              <th className="p-2.5 w-16 text-center border-r-2 border-slate-400 text-black text-[16px]">Akcia</th>
              <th className="p-2.5 min-w-[200px] border-r-2 border-slate-400 text-black text-[16px]">Pravidlo / Typ</th>
              <th className="p-2.5 min-w-[400px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-sans text-xs text-slate-800">
            {filtered.map((r, idx) => (
              <tr key={r.id} className={`transition-colors hover:bg-blue-50/50 ${r.doleziteAlert ? 'bg-amber-50/60' : idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                <td className="p-3 text-center border-r-2 border-slate-400">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setEditingRecord({ ...r })}
                      className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 cursor-pointer"
                      title="Upraviť pokyn"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="p-3 font-bold text-slate-900 border-r-2 border-slate-400">
                  <div className="flex items-center gap-2">
                    {r.doleziteAlert ? (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{r.nazov}</span>
                  </div>
                </td>
                <td className="p-3 text-slate-700 leading-relaxed font-medium">
                  {r.popis.includes('mak@distribution.sk') ? (
                    <span>
                      {r.popis.split('mak@distribution.sk').map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <a
                              href="mailto:mak@distribution.sk"
                              className="text-blue-600 underline hover:text-blue-800 font-bold"
                            >
                              mak@distribution.sk
                            </a>
                          )}
                        </React.Fragment>
                      ))}
                    </span>
                  ) : (
                    r.popis
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick copyable invoice template box */}
      <div className="bg-slate-50 p-4 border-t-2 border-slate-400 space-y-2">
        <h4 className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
          <FileText className="w-4 h-4 text-blue-600" /> Vzorový Text Pre Fakturanta
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-white border-2 border-slate-400 p-3 rounded-lg shadow-2xs space-y-1">
            <div className="font-bold text-blue-700">UK ➔ EU Preprava</div>
            <p className="font-mono text-slate-800 select-all bg-slate-50 p-2.5 rounded-md text-[11px] border border-slate-300">
              Fakturujeme Vám poplatok za sprostredkovanie col. konania pri preprave z UK zo dňa [DÁTUM] / ŠPZ: [ŠPZ]
            </p>
          </div>

          <div className="bg-white border-2 border-slate-400 p-3 rounded-lg shadow-2xs space-y-1">
            <div className="font-bold text-emerald-700">EU ➔ UK Preprava</div>
            <p className="font-mono text-slate-800 select-all bg-slate-50 p-2.5 rounded-md text-[11px] border border-slate-300">
              Fakturujeme Vám poplatok za sprostredkovanie col. konania pri preprave do UK zo dňa [DÁTUM] / ŠPZ: [ŠPZ]
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2.5">
              ÚPRAVA FAKTURAČNÉHO POKYNU
            </h3>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">NÁZOV</label>
                <input
                  type="text"
                  value={editingRecord.nazov}
                  onChange={(e) => setEditingRecord({ ...editingRecord, nazov: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">POPIS / DETAIL</label>
                <textarea
                  rows={4}
                  value={editingRecord.popis}
                  onChange={(e) => setEditingRecord({ ...editingRecord, popis: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-slate-800 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingRecord.doleziteAlert}
                  onChange={(e) => setEditingRecord({ ...editingRecord, doleziteAlert: e.target.checked })}
                  className="rounded text-amber-600 w-4 h-4"
                />
                <span className="text-amber-700">Označiť ako dôležité / Upozornenie</span>
              </label>
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs"
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  onSaveRecord(editingRecord);
                  setEditingRecord(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Uložiť
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
