import React, { useState } from 'react';
import { Folder, Upload, FileText, Download, Trash2, Search, File, CheckCircle } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  category: string;
  size: string;
  date: string;
}

const INITIAL_FILES: FileItem[] = [
  { id: '1', name: 'Colne_vyhlasenie_2026_07.pdf', category: 'Colné vyhlásenia', size: '1.2 MB', date: '28. 07. 2026' },
  { id: '2', name: 'Faktury_Klienti_Jul2026.xlsx', category: 'Faktúry', size: '450 KB', date: '26. 07. 2026' },
  { id: '3', name: 'CMR_Doprava_Petertrans.pdf', category: 'Dopravné doklady', size: '2.4 MB', date: '25. 07. 2026' },
  { id: '4', name: 'Podklady_GETLINK_UK_EU.pdf', category: 'Colné vyhlásenia', size: '890 KB', date: '20. 07. 2026' },
];

export const SuboryView: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>(INITIAL_FILES);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'ALL' || f.category === category;
    return matchesSearch && matchesCat;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFile = e.target.files[0];
      const item: FileItem = {
        id: 'f-' + Date.now(),
        name: newFile.name,
        category: 'Colné vyhlásenia',
        size: (newFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        date: new Date().toLocaleDateString('sk-SK'),
      };
      setFiles([item, ...files]);
      setUploadMessage(`Súbor "${newFile.name}" bol úspešne pridaný!`);
      setTimeout(() => setUploadMessage(null), 4000);
    }
  };

  const handleDelete = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 text-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" /> SÚBORY & DOKUMENTY COLNICE
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Správa nahraných colných vyhlásení, faktúr, dokladov a podkladov.
          </p>
        </div>

        <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 shadow-xs transition-colors">
          <Upload className="w-4 h-4" /> NAHRAŤ NOVÝ SÚBOR
          <input type="file" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {uploadMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" /> {uploadMessage}
        </div>
      )}

      {/* Search & Categories */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Hľadať súbor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {['ALL', 'Colné vyhlásenia', 'Faktúry', 'Dopravné doklady'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                category === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'Všetky' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* File Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3">Názov súboru</th>
              <th className="p-3">Kategória</th>
              <th className="p-3">Veľkosť</th>
              <th className="p-3">Dátum nahratia</th>
              <th className="p-3 text-right">Akcia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Žiadne súbory neboli nájdené.
                </td>
              </tr>
            ) : (
              filteredFiles.map(file => (
                <tr key={file.id} className="hover:bg-slate-50">
                  <td className="p-3 flex items-center gap-2 font-semibold text-slate-900">
                    <FileText className="w-4 h-4 text-blue-600" /> {file.name}
                  </td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                      {file.category}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{file.size}</td>
                  <td className="p-3 text-slate-500">{file.date}</td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => alert(`Sťahovanie súboru ${file.name}...`)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      title="Stiahnuť"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      title="Vymazať"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
