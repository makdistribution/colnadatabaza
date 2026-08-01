import React, { useState, useRef } from 'react';
import { Folder, Upload, FileText, Download, Trash2, CheckCircle, Save } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  note: string;
  size: string;
  date: string;
  fileDataUrl?: string;
}

export const SuboryView: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSaveFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Prosím vyberte súbor na nahrátie.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const newFileItem: FileItem = {
        id: 'f-' + Date.now(),
        name: selectedFile.name,
        note: note.trim(),
        size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        date: new Date().toLocaleDateString('sk-SK'),
        fileDataUrl: reader.result as string,
      };

      setFiles((prev) => [newFileItem, ...prev]);
      setUploadMessage(`Súbor "${selectedFile.name}" bol úspešne uložený!`);
      setSelectedFile(null);
      setNote('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadMessage(null), 4000);
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Naozaj chcete vymazať tento súbor?')) {
      setFiles(files.filter((f) => f.id !== id));
    }
  };

  const handleDownload = (file: FileItem) => {
    if (file.fileDataUrl) {
      const link = document.createElement('a');
      link.href = file.fileDataUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Stiahnutie súboru ${file.name}`);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-400 rounded-xl shadow-xs overflow-hidden my-4">
      {/* Title Header */}
      <div className="bg-slate-50 px-5 py-3.5 border-b-2 border-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Folder className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            SÚBORY & DOKUMENTY COLNICE
          </h2>
        </div>
        <span className="text-xs font-mono font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
          Uložené súbory: {files.length}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Upload & Note Form */}
        <form onSubmit={handleSaveFile} className="bg-slate-50 p-4 border border-slate-300 rounded-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-blue-600" /> NAHRAŤ NOVÝ SÚBOR A PRIDAŤ POZNÁMKU
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* File Input */}
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  id="subor-input"
                />
                <label
                  htmlFor="subor-input"
                  className="bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs flex items-center gap-2 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>{selectedFile ? 'Zmeniť súbor' : 'Vybrať súbor z počítača'}</span>
                </label>
                {selectedFile && (
                  <span className="text-xs font-mono text-slate-700 truncate max-w-[200px]">
                    {selectedFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Note Input */}
            <div className="flex-2 min-w-[250px]">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Poznámka k súboru
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Napr. Colné vyhlásenie k faktúre č. 2026001..."
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Save Button */}
            <div className="self-end">
              <button
                type="submit"
                disabled={!selectedFile}
                className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                  selectedFile
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                <Save className="w-4 h-4" /> ULOŽIŤ
              </button>
            </div>
          </div>
        </form>

        {uploadMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> {uploadMessage}
          </div>
        )}

        {/* Files Table */}
        <div className="overflow-x-auto border-2 border-slate-400 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#dae3ed] text-black uppercase font-bold tracking-wider border-b-2 border-slate-400 text-[16px] leading-[21.333px]" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <th className="p-2.5 min-w-[200px] border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">NÁZOV SÚBORU</th>
                <th className="p-2.5 min-w-[250px] border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">POZNÁMKA</th>
                <th className="p-2.5 min-w-[100px] border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">VEĽKOSŤ</th>
                <th className="p-2.5 min-w-[110px] border-r-2 border-slate-400 text-black font-bold text-[16px] leading-[21.333px]">DÁTUM</th>
                <th className="p-2.5 w-24 text-center text-black font-bold text-[16px] leading-[21.333px]">AKCIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-sans text-xs text-slate-800">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    Zatiaľ neboli nahraté žiadne súbory.
                  </td>
                </tr>
              ) : (
                files.map((file, idx) => (
                  <tr key={file.id} className={`hover:bg-blue-50/50 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                    <td className="p-2.5 font-bold text-slate-900 border-r-2 border-slate-400">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{file.name}</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-slate-700 border-r-2 border-slate-400">
                      {file.note || <span className="text-slate-400 italic">Bez poznámky</span>}
                    </td>
                    <td className="p-2.5 font-mono text-slate-600 border-r-2 border-slate-400">
                      {file.size}
                    </td>
                    <td className="p-2.5 font-mono text-slate-600 border-r-2 border-slate-400">
                      {file.date}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                          title="Stiahnuť súbor"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          title="Vymazať súbor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
