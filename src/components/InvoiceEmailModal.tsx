import React, { useEffect, useState } from 'react';
import { Mail, X, Paperclip } from 'lucide-react';
import { LoadingButtonContent } from './LoadingButtonContent';
import { EmailRichTextEditor } from './EmailRichTextEditor';
import {
  CUSTOMER_INVOICE_FROM,
  buildCustomerInvoiceSubject,
} from '../server/brevoClient';
import { appApi } from '../lib/appApi';

interface InvoiceEmailModalProps {
  isOpen: boolean;
  toEmail: string;
  invoiceNumber: string;
  attachmentName: string;
  isSending?: boolean;
  sendError?: string | null;
  onCancel: () => void;
  /** Sends email with current HTML body and editable address fields. */
  onSend: (payload: {
    htmlBody: string;
    fromEmail: string;
    toEmail: string;
    bccEmail: string;
  }) => void;
}

/** Compose / confirm customer invoice email before Brevo send. */
export const InvoiceEmailModal: React.FC<InvoiceEmailModalProps> = ({
  isOpen,
  toEmail,
  invoiceNumber,
  attachmentName,
  isSending = false,
  sendError = null,
  onCancel,
  onSend,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [bodyHtml, setBodyHtml] = useState('');
  const [signatureHtml, setSignatureHtml] = useState('');
  const [signatureStatus, setSignatureStatus] = useState<string | null>(null);
  const [fromEmail, setFromEmail] = useState(CUSTOMER_INVOICE_FROM);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [bccEmail, setBccEmail] = useState(CUSTOMER_INVOICE_FROM);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    setSignatureStatus(null);
    setFromEmail(CUSTOMER_INVOICE_FROM);
    setRecipientEmail(toEmail);
    setBccEmail(CUSTOMER_INVOICE_FROM);

    void (async () => {
      try {
        const result = await appApi.getEmailSignature();
        if (cancelled) return;
        const signature = String(result.html || '').trim();
        setSignatureHtml(signature);
        setBodyHtml(signature);
      } catch {
        if (cancelled) return;
        setSignatureHtml('');
        setBodyHtml('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, toEmail]);

  if (!isOpen) return null;

  const subject = buildCustomerInvoiceSubject(invoiceNumber);

  const handleSend = () => {
    setError(null);
    if (!fromEmail.trim()) {
      setError('Chýba odosielateľ (FROM).');
      return;
    }
    if (!recipientEmail.trim()) {
      setError('Email zákazníka sa nenašiel v adresári.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Chýba číslo faktúry.');
      return;
    }
    if (!attachmentName.trim()) {
      setError('Chýba príloha faktúry.');
      return;
    }
    const html = bodyHtml.trim();
    if (!html) {
      setError('Email nemá obsah.');
      return;
    }
    onSend({
      htmlBody: html,
      fromEmail: fromEmail.trim(),
      toEmail: recipientEmail.trim(),
      bccEmail: bccEmail.trim(),
    });
  };

  const handleSaveSignature = async (html: string) => {
    setSignatureStatus(null);
    try {
      await appApi.saveEmailSignature(html);
      setSignatureHtml(html);
      setSignatureStatus('Podpis bol trvalo uložený.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uloženie podpisu zlyhalo.');
    }
  };

  const emailFieldClass =
    'w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">ODOSLAŤ FAKTÚRU EMAILOM</h3>
              <p className="text-[11px] text-slate-400">Odoslanie cez Brevo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">FROM</label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              disabled={isSending}
              className={emailFieldClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">TO</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={isSending}
                className={emailFieldClass}
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">BCC</label>
              <input
                type="email"
                value={bccEmail}
                onChange={(e) => setBccEmail(e.target.value)}
                disabled={isSending}
                className={emailFieldClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">SUBJECT</label>
            <input
              type="text"
              readOnly
              value={subject}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none read-only:cursor-default"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">EMAIL BODY</label>
            <EmailRichTextEditor
              valueHtml={bodyHtml}
              onChangeHtml={setBodyHtml}
              onSaveSignature={handleSaveSignature}
              signatureHtml={signatureHtml}
              disabled={isSending}
            />
            {signatureStatus && (
              <p className="mt-1 text-[11px] text-emerald-700 font-medium">{signatureStatus}</p>
            )}
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">ATTACHMENT</label>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-md px-2.5 py-2 text-slate-900">
              <Paperclip className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="font-mono text-[11px] break-all">{attachmentName}</span>
            </div>
          </div>
          {(error || sendError) && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md px-2.5 py-2 font-medium">
              {error || sendError}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="bg-[#1a65ff] hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LoadingButtonContent loading={isSending} kind="send">
              <Mail className="w-4 h-4" />
              <span>ODOSLAŤ EMAIL</span>
            </LoadingButtonContent>
          </button>
        </div>
      </div>
    </div>
  );
};
