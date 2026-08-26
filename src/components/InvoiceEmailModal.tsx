import React, { useEffect, useState } from 'react';
import { Mail, Plus, X, Paperclip } from 'lucide-react';
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
export const InvoiceEmailModal: React.FC<InvoiceEmailModalProps> = ({
  isOpen,
  directoryEmails,
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
  const [selectedToEmails, setSelectedToEmails] = useState<string[]>([]);
  const [selectedCcEmails, setSelectedCcEmails] = useState<string[]>([]);
  const [manualToEmail, setManualToEmail] = useState('');
  const [manualCcEmail, setManualCcEmail] = useState('');
  const [bccEmail, setBccEmail] = useState(CUSTOMER_INVOICE_FROM);

  const savedEmails = uniqueEmails(directoryEmails);
  const directoryEmailsKey = savedEmails.join('\n');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    setSignatureStatus(null);
    setFromEmail(CUSTOMER_INVOICE_FROM);
    setManualToEmail('');
    setManualCcEmail('');
    setBccEmail(CUSTOMER_INVOICE_FROM);
    // EMAIL 1 is ALWAYS the default in TO
    const initial = directoryEmailsKey ? directoryEmailsKey.split('\n') : [];
    setSelectedToEmails(initial[0] ? [initial[0]] : []);
    setSelectedCcEmails([]);

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

  if (!isOpen) return null;

  const subject = buildCustomerInvoiceSubject(invoiceNumber);

  const removeToRecipient = (email: string) => {
    const key = normalizeEmail(email).toLowerCase();
    setSelectedToEmails((prev) => prev.filter((item) => item.toLowerCase() !== key));
  };

  const addToRecipient = (email: string) => {
    const normalized = normalizeEmail(email);
    if (!normalized || !isValidEmail(normalized)) return;
    setSelectedToEmails((prev) => uniqueEmails([...prev, normalized]));
  };

  const addManualToRecipient = () => {
    const email = normalizeEmail(manualToEmail);
    if (!email) return;
    if (!isValidEmail(email)) {
      setError('Zadaná emailová adresa v TO nie je platná.');
      return;
    }
    setError(null);
    addToRecipient(email);
    setManualToEmail('');
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

  const addManualCcRecipient = () => {
    const email = normalizeEmail(manualCcEmail);
    if (!email) return;
    if (!isValidEmail(email)) {
      setError('Zadaná emailová adresa v CC nie je platná.');
      return;
    }
    setError(null);
    addCcRecipient(email);
    setManualCcEmail('');
  };

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
            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">FROM (ODOSIELATEĽ)</label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              disabled={isSending}
              className={emailFieldClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* TO (HLAVNÝ PRÍJEMCA) */}
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">
                TO (HLAVNÝ PRÍJEMCA — DEFAULT EMAIL 1)
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 min-h-[34px]">
                <div className="flex flex-wrap gap-1.5">
                  {selectedToEmails.length === 0 ? (
                    <span className="text-slate-400 py-0.5">Vyberte príjemcu (TO)</span>
                  ) : (
                    selectedToEmails.map((email) => (
                      <span
                        key={email.toLowerCase()}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 text-blue-800 px-1.5 py-0.5 text-[11px] font-medium"
                      >
                        {email}
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={() => removeToRecipient(email)}
                          className="text-blue-500 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
                          aria-label={`Odstrániť ${email}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <input
                  type="email"
                  value={manualToEmail}
                  onChange={(e) => setManualToEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addManualToRecipient();
                    }
                  }}
                  disabled={isSending}
                  placeholder="Pridať ďalší email do TO"
                  className={emailFieldClass}
                />
                <button
                  type="button"
                  disabled={isSending}
                  onClick={addManualToRecipient}
                  className="shrink-0 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-md px-2.5 py-1.5 cursor-pointer disabled:opacity-50"
                  aria-label="Pridať príjemcu"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BCC (SKRYTÁ KÓPIA) */}
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">
                BCC (SKRYTÁ KÓPIA)
              </label>
              <input
                type="email"
                value={bccEmail}
                onChange={(e) => setBccEmail(e.target.value)}
                disabled={isSending}
                className={emailFieldClass}
              />
            </div>
          </div>

          {/* CC (KÓPIA) */}
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase">
              CC (KÓPIA)
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 min-h-[34px]">
              <div className="flex flex-wrap gap-1.5">
                {selectedCcEmails.length === 0 ? (
                  <span className="text-slate-400 py-0.5">V kópii nie je pridaná žiadna adresa</span>
                ) : (
                  selectedCcEmails.map((email) => (
                    <span
                      key={email.toLowerCase()}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-300 text-slate-800 px-1.5 py-0.5 text-[11px] font-medium"
                    >
                      {email}
                      <button
                        type="button"
                        disabled={isSending}
                        onClick={() => removeCcRecipient(email)}
                        className="text-slate-500 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                        aria-label={`Odstrániť ${email}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Dropdown for picking CC and manual CC field */}
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <select
                disabled={isSending}
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addCcRecipient(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 text-[11px] font-medium outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">+ Vybrať email zákazníka do kópie (CC)...</option>
                {savedEmails.map((email, index) => {
                  const isAlreadyInCc = selectedCcEmails.some((item) => item.toLowerCase() === email.toLowerCase());
                  const isDefaultTo = selectedToEmails.some((item) => item.toLowerCase() === email.toLowerCase());
                  return (
                    <option key={email} value={email} disabled={isAlreadyInCc}>
                      {`EMAIL ${index + 1}: ${email}${isDefaultTo ? ' (v TO)' : ''}${isAlreadyInCc ? ' (už v CC)' : ''}`}
                    </option>
                  );
                })}
              </select>

              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={manualCcEmail}
                  onChange={(e) => setManualCcEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addManualCcRecipient();
                    }
                  }}
                  disabled={isSending}
                  placeholder="Alebo napíšte vlastný email do CC"
                  className={emailFieldClass}
                />
                <button
                  type="button"
                  disabled={isSending}
                  onClick={addManualCcRecipient}
                  className="shrink-0 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-md px-2.5 py-1.5 cursor-pointer disabled:opacity-50"
                  aria-label="Pridať do CC"
                  title="Pridať do CC"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
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
