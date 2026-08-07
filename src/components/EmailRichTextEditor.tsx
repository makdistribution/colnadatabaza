import React, { useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  PenLine,
  Save,
} from 'lucide-react';

interface EmailRichTextEditorProps {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  onSaveSignature: (html: string) => void | Promise<void>;
  signatureHtml: string;
  disabled?: boolean;
}

const runCommand = (command: string, value?: string) => {
  document.execCommand(command, false, value);
};

/** Lightweight contentEditable email body editor (formatting + images + signature). */
export const EmailRichTextEditor: React.FC<EmailRichTextEditorProps> = ({
  valueHtml,
  onChangeHtml,
  onSaveSignature,
  signatureHtml,
  disabled = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (syncingRef.current) return;
    if (el.innerHTML !== valueHtml) {
      el.innerHTML = valueHtml;
    }
  }, [valueHtml]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    syncingRef.current = true;
    onChangeHtml(el.innerHTML);
    queueMicrotask(() => {
      syncingRef.current = false;
    });
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const handleToolbar = (command: string, value?: string) => {
    if (disabled) return;
    focusEditor();
    runCommand(command, value);
    emitChange();
  };

  const handleLink = () => {
    if (disabled) return;
    const url = window.prompt('Zadajte URL odkazu:', 'https://');
    if (!url) return;
    handleToolbar('createLink', url);
  };

  const handleImageFile = (file: File | null | undefined) => {
    if (!file || disabled) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      focusEditor();
      runCommand('insertImage', dataUrl);
      emitChange();
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = () => {
    if (disabled) return;
    const selection = window.getSelection();
    const selectedHtml = (() => {
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return '';
      const range = selection.getRangeAt(0);
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      return container.innerHTML.trim();
    })();

    const htmlToSave = selectedHtml || (editorRef.current?.innerHTML || '').trim();
    if (!htmlToSave) {
      window.alert('Najprv vytvorte alebo označte text/obrázky podpisu.');
      return;
    }
    if (!selectedHtml) {
      const ok = window.confirm(
        'Nie je označený výber. Uložiť celý obsah emailu ako podpis?',
      );
      if (!ok) return;
    }
    void onSaveSignature(htmlToSave);
  };

  const btnClass =
    'inline-flex items-center justify-center h-7 min-w-7 px-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-200 bg-slate-50">
        <button type="button" className={btnClass} title="Tučné" disabled={disabled} onClick={() => handleToolbar('bold')}>
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btnClass} title="Kurzíva" disabled={disabled} onClick={() => handleToolbar('italic')}>
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btnClass} title="Podčiarknuté" disabled={disabled} onClick={() => handleToolbar('underline')}>
          <Underline className="w-3.5 h-3.5" />
        </button>
        <label className={`${btnClass} cursor-pointer`} title="Farba textu">
          <input
            type="color"
            disabled={disabled}
            className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer disabled:cursor-not-allowed"
            onChange={(e) => handleToolbar('foreColor', e.target.value)}
          />
        </label>
        <button type="button" className={btnClass} title="Zarovnať vľavo" disabled={disabled} onClick={() => handleToolbar('justifyLeft')}>
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btnClass} title="Zarovnať na stred" disabled={disabled} onClick={() => handleToolbar('justifyCenter')}>
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btnClass} title="Zarovnať vpravo" disabled={disabled} onClick={() => handleToolbar('justifyRight')}>
          <AlignRight className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btnClass} title="Odrážky" disabled={disabled} onClick={() => handleToolbar('insertUnorderedList')}>
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btnClass} title="Číslovaný zoznam" disabled={disabled} onClick={() => handleToolbar('insertOrderedList')}>
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btnClass} title="Odkaz" disabled={disabled} onClick={handleLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className={btnClass}
          title="Vložiť obrázok"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleImageFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button type="button" className={btnClass} title="Späť" disabled={disabled} onClick={() => handleToolbar('undo')}>
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btnClass} title="Znova" disabled={disabled} onClick={() => handleToolbar('redo')}>
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className={`${btnClass} gap-1 text-[10px] font-semibold px-2`}
          title="Vložiť uložený podpis"
          disabled={disabled || !signatureHtml}
          onClick={() => {
            if (!signatureHtml) return;
            focusEditor();
            runCommand('insertHTML', signatureHtml);
            emitChange();
          }}
        >
          <PenLine className="w-3.5 h-3.5" />
          Vložiť podpis
        </button>
        <button
          type="button"
          className={`${btnClass} gap-1 text-[10px] font-semibold px-2`}
          title="Uložiť označený obsah ako trvalý podpis"
          disabled={disabled}
          onClick={handleSaveSignature}
        >
          <Save className="w-3.5 h-3.5" />
          Uložiť podpis
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        className="min-h-[180px] max-h-[320px] overflow-y-auto px-2.5 py-2 text-[12px] text-slate-900 leading-relaxed outline-none prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto"
      />
    </div>
  );
};

export const plainTextToEmailHtml = (text: string) =>
  text
    .split('\n')
    .map((line) => (line ? `<div>${line}</div>` : '<div><br></div>'))
    .join('');
