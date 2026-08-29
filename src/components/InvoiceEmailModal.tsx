import React, { useEffect, useState } from 'react';
import { Mail, Paperclip, Send, X } from 'lucide-react';
import { EmailRichTextEditor, plainTextToEmailHtml } from './EmailRichTextEditor';
import { LoadingButtonContent } from './LoadingButtonContent';
import { appApi } from '../lib/appApi';
import {
  CUSTOMER_INVOICE_EMAIL_BODY,
  CUSTOMER_INVOICE_FROM,
  buildCustomerInvoiceSubject,
} from '../server/brevoClient';

interface InvoiceEmailModalProps {
  isOpen: boolean;
  directoryEmails: string[];
  invoiceNumber: string;
  recordDate?: string;
  attachmentName?: string;
  invoicePdfPath?: string | null;
  isSending: boolean;
  sendError?: string | null;
  onCancel: () => void;
  onSend: (payload: {
    htmlBody: string;
    fromEmail: string;
    toEmails: string[];
    ccEmails?: string[];
    bccEmail: string;
    invoicePdfPath?: string | null;
  }) => void;
}

const parseEmailList = (value: string): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of String(value || '').split(/[,;\n]+/)) {
    const email = part.trim();
    if (!email || !email.includes('@')) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(email);
  }
  return result;
};

const joinEmails = (emails: string[]) => emails.filter(Boolean).join(', ');

const inputClass =
  'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-60 disabled:bg-slate-50';

const labelClass = 'block text-slate-700 font-bold mb-0.5 text-[11px] uppercase';

/** Compose-and-send customer invoice email — same chrome as other app modals. */
export const InvoiceEmailModal: React.FC<InvoiceEmailModalProps> = ({
  isOpen,
  directoryEmails,
  invoiceNumber,
  recordDate,
  attachmentName,
  invoicePdfPath,
  isSending,
  sendError,
  onCancel,
  onSend,
}) => {
  const [fromEmail, setFromEmail] = useState(CUSTOMER_INVOICE_FROM);
  const [toEmailsText, setToEmailsText] = useState('');
  const [ccEmailsText, setCcEmailsText] = useState('');
  const [bccEmail, setBccEmail] = useState(CUSTOMER_INVOICE_FROM);
  const [htmlBody, setHtmlBody] = useState('');
  const [signatureHtml, setSignatureHtml] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const directoryEmailsKey = directoryEmails.join('|').toLowerCase();

  useEffect(() => {
    if (!isOpen) return;

    setFromEmail(CUSTOMER_INVOICE_FROM);
    setToEmailsText(joinEmails(directoryEmails));
    setCcEmailsText('');
    setBccEmail(CUSTOMER_INVOICE_FROM);
    setHtmlBody(plainTextToEmailHtml(CUSTOMER_INVOICE_EMAIL_BODY));
    setSignatureHtml('');
    setLocalError(null);
    setSignatureError(null);

    let cancelled = false;
    void (async () => {
      try {
        const result = await appApi.getEmailSignature();
        if (cancelled) return;
        const html = String(result.html || '').trim();
        setSignatureHtml(html);
        if (html) {
          setHtmlBody(`${plainTextToEmailHtml(CUSTOMER_INVOICE_EMAIL_BODY)}${html}`);
        }
      } catch {
        if (!cancelled) setSignatureHtml('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, directoryEmailsKey]);

  if (!isOpen) return null;

  const subject = buildCustomerInvoiceSubject(invoiceNumber);

  const handleSaveSignature = async (html: string) => {
    setSignatureError(null);
    try {
      const result = await appApi.saveEmailSignature(html);
      setSignatureHtml(result.html);
    } catch (err) {
      setSignatureError(err instanceof Error ? err.message : 'Uloženie podpisu zlyhalo.');
    }
  };

  const handleSend = () => {
    if (isSending) return;
    const toEmails = parseEmailList(toEmailsText);
    const ccEmails = parseEmailList(ccEmailsText);
    const from = fromEmail.trim();
    const bcc = bccEmail.trim();

    if (!from.includes('@')) {
      setLocalError('Zadajte platný odosielateľ (FROM).');
      return;
    }
    if (toEmails.length === 0) {
      setLocalError('Zadajte aspoň jedného príjemcu (TO). Email musí byť v adresári alebo zadaný ručne.');
      return;
    }
    if (!String(htmlBody || '').trim()) {
      setLocalError('Text emailu je prázdny.');
      return;
    }

    setLocalError(null);
    onSend({
      htmlBody,
      fromEmail: from,
      toEmails,
      ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
      bccEmail: bcc,
      invoicePdfPath,
    });
  };

  const errorText = localError || sendError;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-tight">ODOSLAŤ FA EMAIL</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {invoiceNumber ? `Faktúra č. ${invoiceNumber}` : 'Faktúra'}
                {recordDate ? ` · ${recordDate}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1 min-h-0 text-xs">
          <div>
            <label className={labelClass}>From</label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              disabled={isSending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input
              type="text"
              value={toEmailsText}
              onChange={(e) => setToEmailsText(e.target.value)}
              disabled={isSending}
              placeholder="email@firma.sk, dalsi@firma.sk"
              className={inputClass}
            />
            {directoryEmails.length === 0 && (
              <p className="mt-1 text-[11px] font-semibold text-amber-700">
                Email zákazníka sa nenašiel v adresári. Doplňte ho ručne alebo v ADRESÁR ZÁKAZNÍKOV.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Cc</label>
            <input
              type="text"
              value={ccEmailsText}
              onChange={(e) => setCcEmailsText(e.target.value)}
              disabled={isSending}
              placeholder="voliteľné"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Bcc</label>
            <input
              type="email"
              value={bccEmail}
              onChange={(e) => setBccEmail(e.target.value)}
              disabled={isSending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Predmet</label>
            <input type="text" value={subject} readOnly className={`${inputClass} bg-slate-50 read-only:cursor-default`} />
          </div>
          {attachmentName ? (
            <div className="flex items-center gap-1.5 text-slate-700">
              <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-semibold truncate">{attachmentName}</span>
            </div>
          ) : null}

          <div>
            <label className={labelClass}>Text emailu</label>
            <EmailRichTextEditor
              valueHtml={htmlBody}
              onChangeHtml={setHtmlBody}
              onSaveSignature={handleSaveSignature}
              signatureHtml={signatureHtml}
              disabled={isSending}
            />
            {signatureError && (
              <p className="mt-1.5 text-[11px] font-semibold text-red-600">{signatureError}</p>
            )}
          </div>

          {errorText && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-950 font-medium">
              {errorText}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-200 font-medium transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zrušiť
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="bg-[#1a65ff] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
          >
            <LoadingButtonContent loading={isSending} kind="send">
              <Send className="w-4 h-4" />
              <span>Odoslať</span>
            </LoadingButtonContent>
          </button>
        </div>
      </div>
    </div>
  );
};
