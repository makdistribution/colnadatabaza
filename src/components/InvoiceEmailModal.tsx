import React, { useEffect, useState, useRef } from 'react';
import { Mail, X, ChevronDown } from 'lucide-react';
import { LoadingButtonContent } from './LoadingButtonContent';
import { EmailRichTextEditor } from './EmailRichTextEditor';
import {
  CUSTOMER_INVOICE_FROM,
  buildCustomerInvoiceSubject,
} from '../server/brevoClient';
import { appApi } from '../lib/appApi';

interface InvoiceEmailModalProps {
  isOpen: boolean;
  /** Saved emails for the current customer (EMAIL 1–3), in directory order. */
  /** Date when the record was created (datumColnice). */
  recordDate?: string;
  directoryEmails: string[];
  invoiceNumber: string;
  attachmentName: string;
  isSending?: boolean;
  sendError?: string | null;
  onCancel: () => void;
  /** Sends email with current HTML body and editable address fields. */
  onSend: (payload: {
    htmlBody: string;
    fromEmail: string;
    toEmails: string[];
    ccEmails?: string[];
    bccEmail: string;
  }) => void;
}

const normalizeEmail = (value: string) => String(value || '').trim();

const isValidEmail = (value: string) => {
  const email = normalizeEmail(value);
  return Boolean(email) && email.includes('@') && !email.includes(' ');
};

const uniqueEmails = (emails: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of emails) {
    const email = normalizeEmail(raw);
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(email);
  }
  return result;
};

/** Compose / confirm customer invoice email before Brevo send. */
/** Format date string to DD. MM. YYYY */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  // Handle YYYY-MM-DD
  const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (parts) return `${parts[3]}. ${parts[2]}. ${parts[1]}`;
  // Handle DD. MM. YYYY already formatted
  if (/\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/.test(dateStr)) return dateStr;
  return dateStr;
};

export const InvoiceEmailModal: React.FC<InvoiceEmailModalProps> = ({
  isOpen,
  directoryEmails,
  invoiceNumber,
  recordDate,
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
  const [selectedToEmails, setSelectedToEmails] = useState<string[]>([]);
  const [selectedCcEmails, setSelectedCcEmails] = useState<string[]>([]);
  const [bccEmail, setBccEmail] = useState(CUSTOMER_INVOICE_FROM);
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false);
  const ccDropdownRef = useRef<HTMLDivElement>(null);

  const savedEmails = uniqueEmails(directoryEmails);
  const directoryEmailsKey = savedEmails.join('\n');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    setSignatureStatus(null);
    setFromEmail(CUSTOMER_INVOICE_FROM);
    setBccEmail(CUSTOMER_INVOICE_FROM);
    // EMAIL 1 is ALWAYS the default in TO
    const initial = directoryEmailsKey ? directoryEmailsKey.split('\n') : [];
    setSelectedToEmails(initial[0] ? [initial[0]] : []);
    setSelectedCcEmails([]);
    setCcDropdownOpen(false);

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
  }, [isOpen, directoryEmailsKey]);

  // Close CC dropdown when clicking outside
  useEffect(() => {
    if (!ccDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ccDropdownRef.current && !ccDropdownRef.current.contains(e.target as Node)) {
        setCcDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ccDropdownOpen]);

  if (!isOpen) return null;

  const subject = buildCustomerInvoiceSubject(invoiceNumber);

  const removeToRecipient = (email: string) => {
    const key = normalizeEmail(email).toLowerCase();
    setSelectedToEmails((prev) => prev.filter((item) => item.toLowerCase() !== key));
  };

  const removeCcRecipient = (email: string) => {
    const key = normalizeEmail(email).toLowerCase();
    setSelectedCcEmails((prev) => prev.filter((item) => item.toLowerCase() !== key));
  };

  const addCcRecipient = (email: string) => {
    const normalized = normalizeEmail(email);
    if (!normalized || !isValidEmail(normalized)) return;
    setSelectedCcEmails((prev) => uniqueEmails([...prev, normalized]));
  };

  // Available emails for CC dropdown (not already in CC)
  const availableCcEmails = savedEmails.filter(
    (email) => !selectedCcEmails.some((cc) => cc.toLowerCase() === email.toLowerCase()),
  );

  const handleSend = () => {
    setError(null);
    if (!fromEmail.trim()) {
      setError('Chýba odosielateľ (FROM).');
      return;
    }
    const recipients = uniqueEmails(selectedToEmails);
    if (recipients.length === 0) {
      setError('Zadajte aspoň jednu emailovú adresu príjemcu (TO).');
      return;
    }
    if (recipients.some((email) => !isValidEmail(email))) {
      setError('Niektorá emailová adresa príjemcu (TO) nie je platná.');
      return;
    }
    const ccRecipients = uniqueEmails(selectedCcEmails);
    if (ccRecipients.some((email) => !isValidEmail(email))) {
      setError('Niektorá emailová adresa v kópii (CC) nie je platná.');
      return;
    }
    if (bccEmail.trim() && !isValidEmail(bccEmail.trim())) {
      setError('Emailová adresa v skrytej kópii (BCC) nie je platná.');
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
      toEmails: recipients,
      ccEmails: ccRecipients.length > 0 ? ccRecipients : undefined,
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

  /** Chip for TO / CC recipients */
  const EmailChip: React.FC<{
    email: string;
    onRemove: () => void;
    variant?: 'to' | 'cc';
  }> = ({ email, onRemove, variant = 'to' }) => (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
        variant === 'to'
          ? 'bg-blue-600 text-white'
          : 'bg-blue-600 text-white'
      }`}
    >
      {email}
      <button
        type="button"
        disabled={isSending}
        onClick={onRemove}
        className="text-white/80 hover:text-white disabled:opacity-50 cursor-pointer ml-0.5"
        aria-label={`Odstrániť ${email}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">

        {/* ─── HEADER ─── */}
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

        {/* ─── BODY ─── */}
        <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1 min-h-0">

          {/* FROM (ODOSIELATEĽ) */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1 text-[11px] uppercase tracking-wide">
              FROM (ODOSIELATEĽ)
            </label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              disabled={isSending}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-[12px] outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* TO (PRÍJEMCA)  +  BCC (SKRYTÁ KÓPIA) — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* TO */}
            <div>
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] uppercase tracking-wide">
                TO (PRÍJEMCA)
              </label>
              <div className="bg-white border border-slate-300 rounded-md px-2 py-1.5 min-h-[36px] flex flex-wrap items-center gap-1.5">
                {selectedToEmails.length === 0 ? (
                  <span className="text-slate-400 text-[11px] py-0.5">Žiadny príjemca</span>
                ) : (
                  selectedToEmails.map((email) => (
                    <EmailChip
                      key={email.toLowerCase()}
                      email={email}
                      variant="to"
                      onRemove={() => removeToRecipient(email)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* BCC */}
            <div>
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] uppercase tracking-wide">
                BCC (SKRYTÁ KÓPIA)
              </label>
              <input
                type="email"
                value={bccEmail}
                onChange={(e) => setBccEmail(e.target.value)}
                disabled={isSending}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-[12px] outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* CC (KÓPIA) — click to pick from address book */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1 text-[11px] uppercase tracking-wide">
              CC (KÓPIA)
            </label>
            <div
              ref={ccDropdownRef}
              className="relative"
            >
              <div
                className="bg-white border border-slate-300 rounded-md px-2 py-1.5 min-h-[36px] flex flex-wrap items-center gap-1.5 cursor-pointer"
                onClick={() => {
                  if (!isSending && availableCcEmails.length > 0) {
                    setCcDropdownOpen((prev) => !prev);
                  }
                }}
              >
                {selectedCcEmails.length === 0 && (
                  <span className="text-slate-400 text-[11px] py-0.5 flex items-center gap-1">
                    Kliknite pre pridanie príjemcu do kópie
                    {availableCcEmails.length > 0 && <ChevronDown className="w-3 h-3" />}
                  </span>
                )}
                {selectedCcEmails.map((email) => (
                  <EmailChip
                    key={email.toLowerCase()}
                    email={email}
                    variant="cc"
                    onRemove={() => removeCcRecipient(email)}
                  />
                ))}
                {selectedCcEmails.length > 0 && availableCcEmails.length > 0 && (
                  <span className="text-slate-400 text-[11px] py-0.5 flex items-center gap-0.5 ml-1">
                    <ChevronDown className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Dropdown list */}
              {ccDropdownOpen && availableCcEmails.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg z-50 py-1 max-h-[160px] overflow-y-auto">
                  {availableCcEmails.map((email, index) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => {
                        addCcRecipient(email);
                        setCcDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-slate-800 hover:bg-blue-50 hover:text-blue-700 cursor-pointer font-medium"
                    >
                      {email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SUBJECT */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1 text-[11px] uppercase tracking-wide">
              SUBJECT
            </label>
            <input
              type="text"
              readOnly
              value={subject}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 text-[12px] outline-none read-only:cursor-default"
            />
          </div>

          {/* EMAIL BODY */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1 text-[11px] uppercase tracking-wide">
              EMAIL BODY
            </label>
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

          {/* Error messages */}
          {(error || sendError) && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md px-2.5 py-2 font-medium text-[11px]">
              {error || sendError}
            </div>
          )}
        </div>

        {/* ─── FOOTER ─── */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">* Emailové adresy zákazníka sa preberajú z adresára.</span>
            {recordDate && (
              <span className="text-[10px] text-slate-400">Záznam pridaný: {formatDate(recordDate)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-60"
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
