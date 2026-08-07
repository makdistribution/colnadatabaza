import React, { useEffect, useMemo, useState } from 'react';
import { LoginRecord } from '../types';
import {
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  Lock,
  Unlock,
  FileText,
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface LoginUdajeViewProps {
  records: LoginRecord[];
  searchTerm?: string;
  onSaveRecord: (record: LoginRecord) => void;
  onDeleteRecord: (id: string) => void;
  onReorderRecords: (order: { I: string[]; II: string[] }) => Promise<void>;
}

type LoginCategory = 'I' | 'II';

export const LoginUdajeView: React.FC<LoginUdajeViewProps> = ({
  records,
  searchTerm = '',
  onSaveRecord,
  onDeleteRecord,
  onReorderRecords,
}) => {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<LoginRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LoginRecord | null>(null);

  const [unlockedI, setUnlockedI] = useState(false);
  const [unlockedII, setUnlockedII] = useState(false);
  const [draftOrderI, setDraftOrderI] = useState<string[]>([]);
  const [draftOrderII, setDraftOrderII] = useState<string[]>([]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const matchesSearch = (record: LoginRecord) => {
    if (!searchTerm) return true;
    const needle = searchTerm.toLowerCase();
    return (
      record.sluzba.toLowerCase().includes(needle) ||
      record.odkaz.toLowerCase().includes(needle) ||
      record.prihlasenie.toLowerCase().includes(needle) ||
      (record.poznamka || '').toLowerCase().includes(needle) ||
      record.kategoria.toLowerCase().includes(needle)
    );
  };

  const visibleRecords = useMemo(() => records.filter(matchesSearch), [records, searchTerm]);
  const cat1Source = useMemo(
    () => visibleRecords.filter((r) => r.kategoria === 'I'),
    [visibleRecords],
  );
  const cat2Source = useMemo(
    () => visibleRecords.filter((r) => r.kategoria === 'II'),
    [visibleRecords],
  );

  useEffect(() => {
    if (!unlockedI) {
      setDraftOrderI(cat1Source.map((r) => r.id));
    }
  }, [cat1Source, unlockedI]);

  useEffect(() => {
    if (!unlockedII) {
      setDraftOrderII(cat2Source.map((r) => r.id));
    }
  }, [cat2Source, unlockedII]);

  const cat1 = useMemo(() => {
    const byId = new Map(cat1Source.map((r) => [r.id, r]));
    return draftOrderI.map((id) => byId.get(id)).filter(Boolean) as LoginRecord[];
  }, [cat1Source, draftOrderI]);

  const cat2 = useMemo(() => {
    const byId = new Map(cat2Source.map((r) => [r.id, r]));
    return draftOrderII.map((id) => byId.get(id)).filter(Boolean) as LoginRecord[];
  }, [cat2Source, draftOrderII]);

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = (defaultCat: LoginCategory) => {
    setEditingRecord({
      id: Date.now().toString(),
      sluzba: '',
      odkaz: '',
      prihlasenie: '',
      heslo: '',
      kategoria: defaultCat,
      poznamka: '',
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

  const moveIdWithin = (ids: string[], fromId: string, toId: string) => {
    if (fromId === toId) return ids;
    const next = [...ids];
    const fromIndex = next.indexOf(fromId);
    const toIndex = next.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return ids;
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, fromId);
    return next;
  };

  const handleToggleLock = async (category: LoginCategory) => {
    if (searchTerm.trim() || isSavingOrder) return;

    const orderI = unlockedI || category === 'I'
      ? draftOrderI
      : records.filter((r) => r.kategoria === 'I').map((r) => r.id);
    const orderII = unlockedII || category === 'II'
      ? draftOrderII
      : records.filter((r) => r.kategoria === 'II').map((r) => r.id);

    if (category === 'I') {
      if (!unlockedI) {
        setDraftOrderI(cat1Source.map((r) => r.id));
        setUnlockedI(true);
        return;
      }
      setIsSavingOrder(true);
      try {
        await onReorderRecords({ I: orderI, II: orderII });
        setUnlockedI(false);
      } finally {
        setIsSavingOrder(false);
      }
      return;
    }

    if (!unlockedII) {
      setDraftOrderII(cat2Source.map((r) => r.id));
      setUnlockedII(true);
      return;
    }
    setIsSavingOrder(true);
    try {
      await onReorderRecords({ I: orderI, II: orderII });
      setUnlockedII(false);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const renderPasswordCell = (r: LoginRecord) => {
    const isPassShown = !!visiblePasswords[r.id];
    if (r.heslo === '-') {
      return <span className="text-slate-400">-</span>;
    }
    return (
      <div className="flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-300">
        <span className="font-mono text-slate-900 font-bold tracking-wider inline-block w-[11rem] truncate tabular-nums">
          {isPassShown ? r.heslo : '••••••••••••'}
        </span>
        <div className="flex items-center gap-1 font-sans shrink-0">
          <button
            type="button"
            onClick={() => togglePassword(r.id)}
            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
            title={isPassShown ? 'Skryť heslo' : 'Zobraziť heslo'}
          >
            {isPassShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => handleCopy(r.heslo, r.id)}
            className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
            title="Kopírovať heslo"
          >
            {copiedId === r.id ? (
              <img src="/yes.png" alt="Skopírované" className="h-3.5 w-3.5 object-contain" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderTable = (
    category: LoginCategory,
    rows: LoginRecord[],
    unlocked: boolean,
    serviceHeader: string,
    linkHeader: string,
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-[#dae3ed] text-black uppercase font-bold tracking-wider border-b-2 border-slate-400 text-[16px]">
            <th className="p-2.5 w-[4.5rem] text-center border-r-2 border-slate-400">
              <span className="inline-flex items-center justify-center gap-1.5">
                Akcia
                <button
                  type="button"
                  onClick={() => handleToggleLock(category)}
                  disabled={Boolean(searchTerm.trim()) || isSavingOrder}
                  className={`inline-flex items-center justify-center rounded p-0.5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                    unlocked
                      ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title={
                    searchTerm.trim()
                      ? 'Zrušte vyhľadávanie pre zmenu poradia'
                      : unlocked
                        ? 'Uložiť poradie a zamknúť'
                        : 'Odomknúť pre zmenu poradia'
                  }
                >
                  {unlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                </button>
              </span>
            </th>
            <th className="p-2.5 min-w-[150px] border-r-2 border-slate-400">{serviceHeader}</th>
            <th className="p-2.5 min-w-[200px] border-r-2 border-slate-400">{linkHeader}</th>
            <th className="p-2.5 min-w-[180px] border-r-2 border-slate-400">Prihlasovacie Meno</th>
            <th className="p-2.5 min-w-[200px] border-r-2 border-slate-400">Heslo</th>
            <th className="p-2.5 min-w-[140px]">Poznámka</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300 font-mono text-xs text-slate-800">
          {rows.map((r, idx) => {
            const isDragging = draggingId === r.id;
            const isDropTarget = dragOverId === r.id && unlocked;
            return (
              <tr
                key={r.id}
                draggable={unlocked}
                onDragStart={(e) => {
                  if (!unlocked) return;
                  setDraggingId(r.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', r.id);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverId(null);
                }}
                onDragOver={(e) => {
                  if (!unlocked) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverId !== r.id) setDragOverId(r.id);
                }}
                onDrop={(e) => {
                  if (!unlocked) return;
                  e.preventDefault();
                  const fromId = e.dataTransfer.getData('text/plain') || draggingId;
                  if (!fromId) return;
                  if (category === 'I') {
                    setDraftOrderI((prev) => moveIdWithin(prev, fromId, r.id));
                  } else {
                    setDraftOrderII((prev) => moveIdWithin(prev, fromId, r.id));
                  }
                  setDragOverId(null);
                  setDraggingId(null);
                }}
                className={`transition-colors ${
                  unlocked ? 'cursor-grab active:cursor-grabbing' : 'hover:bg-blue-50/50'
                } ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'} ${
                  isDragging ? 'opacity-60' : ''
                } ${isDropTarget ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : ''}`}
              >
                <td className="p-2 text-center border-r-2 border-slate-400">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(r)}
                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                      title="Upraviť záznam"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 cursor-pointer"
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
                    className="text-blue-600 underline hover:text-blue-800 break-all whitespace-normal font-normal"
                  >
                    {r.odkaz}
                    <ExternalLink className="inline-block w-3 h-3 text-blue-500 ml-1 align-text-bottom" />
                  </a>
                </td>
                <td className="p-2.5 border-r-2 border-slate-400 text-slate-800 font-medium">
                  {r.prihlasenie.includes('@') ? (
                    <a
                      href={`mailto:${r.prihlasenie}`}
                      className={`text-blue-600 underline hover:text-blue-800 ${
                        category === 'I' ? 'font-bold' : 'font-normal'
                      }`}
                    >
                      {r.prihlasenie}
                    </a>
                  ) : (
                    r.prihlasenie
                  )}
                </td>
                <td className="p-2.5 border-r-2 border-slate-400 text-slate-800">
                  {renderPasswordCell(r)}
                </td>
                <td className="p-2.5 font-sans text-slate-600 text-[11px]">{r.poznamka}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="my-4">
      <div className="bg-white border-2 border-slate-500 rounded-xl shadow-xs p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase truncate">
              PRIHLASOVACIE ÚDAJE (LOGIN ÚDAJE I & II)
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAdd('I')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Pridať prístup
            </button>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full font-mono font-bold flex items-center gap-1.5">
              <img src="/yes.png" alt="" className="h-3.5 w-3.5 object-contain" /> Zašifrované v relácii
            </span>
          </div>
        </div>

        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2 min-w-0">
              <span className="p-1 bg-blue-100 rounded text-blue-700 shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </span>
              <span className="truncate">PRIHLASOVACIE ÚDAJE - SKUPINA I (COLNÉ PORTÁLY)</span>
            </h3>
            <button
              type="button"
              onClick={() => handleOpenAdd('I')}
              className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Pridať do Skupiny I
            </button>
          </div>
          {renderTable('I', cat1, unlockedI, 'Služba / Portál', 'Web Odkaz')}
        </div>

        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2 min-w-0">
              <span className="p-1 bg-emerald-100 rounded text-emerald-700 shrink-0">
                <Key className="w-3.5 h-3.5" />
              </span>
              <span className="truncate">
                PRIHLASOVACIE ÚDAJE - SKUPINA II (WEBOVÉ STRÁNKY & EDITORY)
              </span>
            </h3>
            <button
              type="button"
              onClick={() => handleOpenAdd('II')}
              className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Pridať do Skupiny II
            </button>
          </div>
          {renderTable('II', cat2, unlockedII, 'Služba / Nástroj', 'Odkaz / Web')}
        </div>
      </div>

      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border-2 border-slate-400 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-100 px-5 py-3.5 border-b-2 border-slate-400 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                {records.some((r) => r.id === editingRecord.id)
                  ? 'Upraviť prihlasovací údaj'
                  : 'Pridať nový prihlasovací údaj'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Skupina / Kategória
                </label>
                <select
                  value={editingRecord.kategoria}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      kategoria: e.target.value as LoginCategory,
                    })
                  }
                  className="w-full text-xs font-bold text-slate-900 p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                >
                  <option value="I">SKUPINA I – Colné portály</option>
                  <option value="II">Skupina II - Webové stránky & Editory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Služba / Portál *
                </label>
                <input
                  type="text"
                  required
                  value={editingRecord.sluzba}
                  onChange={(e) => setEditingRecord({ ...editingRecord, sluzba: e.target.value })}
                  className="w-full text-xs font-bold text-slate-900 p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Web Odkaz (URL)
                </label>
                <input
                  type="text"
                  value={editingRecord.odkaz}
                  onChange={(e) => setEditingRecord({ ...editingRecord, odkaz: e.target.value })}
                  className="w-full text-xs text-blue-600 underline p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prihlasovacie Meno / Email
                </label>
                <input
                  type="text"
                  value={editingRecord.prihlasenie}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, prihlasenie: e.target.value })
                  }
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
                  className="w-full text-xs font-mono font-bold text-slate-900 p-2.5 rounded-lg border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Poznámka
                </label>
                <input
                  type="text"
                  value={editingRecord.poznamka || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, poznamka: e.target.value })}
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

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="VYMAZAŤ PRÍSTUP"
        message={
          <>
            Naozaj chcete vymazať{' '}
            <strong className="font-bold text-red-900">
              prístup pre &quot;{deleteTarget?.sluzba}&quot;
            </strong>
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
