import React, { useState } from 'react';
import { CennikRecord } from '../types';
import { Tag, Plus, Edit3, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface CennikViewProps {
  records: CennikRecord[];
  onSaveRecord: (record: CennikRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const CennikView: React.FC<CennikViewProps> = ({
  records,
  onSaveRecord,
  onDeleteRecord,
}) => {
  const [editingRecord, setEditingRecord] = useState<CennikRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CennikRecord | null>(null);
  const [editField, setEditField] = useState<'both' | 'import' | 'export'>('both');

  const handleAddNew = () => {
    setEditField('both');
    setEditingRecord({
      id: 'cennik-' + Date.now(),
      importText: '',
      exportText: '',
    });
  };

  const handleEditRow = (record: CennikRecord, field: 'both' | 'import' | 'export' = 'both') => {
    setEditField(field);
    setEditingRecord({ ...record });
  };

  const handleDeleteRow = (record: CennikRecord) => {
    setDeleteTarget(record);
  };

  return (
    <div className="bg-white border-2 border-slate-500 rounded-xl shadow-xs overflow-hidden my-4">
      {/* Title Header */}
      <div className="bg-slate-50 px-5 py-3.5 border-b-2 border-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Tag className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase">
            CENNÍK
          </h2>
        </div>

        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Pridať do cenníka
        </button>
      </div>

      {/* Pricing Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#dae3ed] text-black uppercase font-bold tracking-wider border-b-2 border-slate-600 text-[16px]">
              <th className="p-2.5 w-20 text-center border-r-2 border-slate-400 text-black text-[16px]">
                AKCIA
              </th>
              <th className="p-2.5 min-w-[300px] border-r-2 border-slate-400 text-black text-[16px]">
                IMPORT (UK ➔ EU)
              </th>
              <th className="p-2.5 w-20 text-center border-r-2 border-slate-400 text-black text-[16px]">
                AKCIA
              </th>
              <th className="p-2.5 min-w-[300px] text-black text-[16px]">
                EXPORT (EU ➔ UK)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-sans text-xs text-slate-800">
            {records.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                  Cenník je prázdny. Kliknite na &quot;Pridať do cenníka&quot; pre vytvorenie záznamu.
                </td>
              </tr>
            ) : (
              records.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`transition-colors hover:bg-blue-50/40 ${
                    idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                  }`}
                >
                  {/* Action Import */}
                  <td className="p-3 text-center border-r-2 border-slate-400 align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleEditRow(r, 'import')}
                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 cursor-pointer"
                        title="Upraviť IMPORT"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(r)}
                        className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 cursor-pointer"
                        title="Vymazať riadok"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Import Text */}
                  <td className="p-3.5 text-slate-900 leading-relaxed font-medium border-r-2 border-slate-400 align-middle bg-[#fdfdfa]/60">
                    <div className="whitespace-pre-wrap">{r.importText || <span className="text-slate-300 italic">—</span>}</div>
                  </td>

                  {/* Action Export */}
                  <td className="p-3 text-center border-r-2 border-slate-400 align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleEditRow(r, 'export')}
                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 cursor-pointer"
                        title="Upraviť EXPORT"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(r)}
                        className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 cursor-pointer"
                        title="Vymazať riadok"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Export Text */}
                  <td className="p-3.5 text-slate-900 leading-relaxed font-medium align-middle">
                    <div className="whitespace-pre-wrap">{r.exportText || <span className="text-slate-300 italic">—</span>}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="VYMAZAŤ POLOŽKU CENNÍKA"
        message={
          <>
            Naozaj chcete vymazať túto položku z cenníka? Túto akciu nie je možné vrátiť späť.
          </>
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDeleteRecord(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      {/* Edit / Add Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2.5 uppercase">
              {records.some((rec) => rec.id === editingRecord.id)
                ? 'ÚPRAVA POLOŽKY CENNÍKA'
                : 'NOVÁ POLOŽKA CENNÍKA'}
            </h3>

            <div className="space-y-3.5 text-xs">
              {(editField === 'both' || editField === 'import') && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">
                    IMPORT (UK ➔ EU)
                  </label>
                  <textarea
                    rows={4}
                    value={editingRecord.importText}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, importText: e.target.value })
                    }
                    placeholder="Zadajte popis a ceny pre IMPORT (UK ➔ EU)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {(editField === 'both' || editField === 'export') && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">
                    EXPORT (EU ➔ UK)
                  </label>
                  <textarea
                    rows={4}
                    value={editingRecord.exportText}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, exportText: e.target.value })
                    }
                    placeholder="Zadajte popis a ceny pre EXPORT (EU ➔ UK)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs cursor-pointer"
              >
                Zrušiť
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveRecord(editingRecord);
                  setEditingRecord(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                ULOŽIŤ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
