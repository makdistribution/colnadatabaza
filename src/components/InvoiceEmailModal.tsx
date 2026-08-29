import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Mail, Paperclip, Send, X } from 'lucide-react';
import { EmailRichTextEditor } from './EmailRichTextEditor';
import { LoadingButtonContent } from './LoadingButtonContent';
import { appApi } from '../lib/appApi';
import {
  CUSTOMER_INVOICE_FROM,
  buildCustomerInvoiceEmailHtml,
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

/** Header date as DD.MM.YYYY (day month year). */
const formatHeaderDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  const dotted = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (dotted) {
    return `${dotted[1].padStart(2, '0')}.${dotted[2].padStart(2, '0')}.${dotted[3]}`;
  }
  return dateStr;
};

const inputClass =
  'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-60';

const readonlyClass = `${inputClass} bg-slate-50 read-only:cursor-default`;

const labelClass = 'block text-slate-700 font-bold mb-0.5 text-[11px] uppercase';

const htmlContainsGreeting = (html: string) =>
  /Dobrý deň/i.test(html) && /v prílohe Vám zasielame/i.test(html);

/** Keep only the logo/contact block after the closing line, so the greeting is never duplicated. */
const signatureAfterClosing = (html: string) => {
  const match = html.match(/S pozdravom\s*\/\s*best regards/i);
  if (!match || match.index == null) return '';
  return html
    .slice(match.index + match[0].length)
    .replace(/^(\s|<br\s*\/?>|<\/div>|<\/p>|<\/span>|&nbsp;)+/i, '')
    .trim();
};

/** Compose-and-send customer invoice email — layout matches the invoice email template. */
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
  const [toEmailsText, setToEmailsText] = useState('');
  const [ccEmailsText, setCcEmailsText] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [signatureHtml, setSignatureHtml] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false);
  const ccDropdownRef = useRef<HTMLDivElement>(null);
  const directoryEmailsKey = directoryEmails.join('|').toLowerCase();

  const toEmailKey = parseEmailList(toEmailsText)[0]?.toLowerCase() || '';
  const ccOptions = directoryEmails.filter((email) => email.toLowerCase() !== toEmailKey);

  useEffect(() => {
    if (!isOpen) return;

    const first = directoryEmails[0] || '';
    setToEmailsText(first);
    setCcEmailsText('');
    setHtmlBody(buildCustomerInvoiceEmailHtml());
    setSignatureHtml('');
    setLocalError(null);
    setSignatureError(null);
    setCcDropdownOpen(false);

    let cancelled = false;
    void (async () => {
      try {
        const result = await appApi.getEmailSignature();
        if (cancelled) return;
        const html = String(result.html || '').trim();
        const defaultHtml = buildCustomerInvoiceEmailHtml();
        if (!html) {
          setSignatureHtml('');
          setHtmlBody(defaultHtml);
          return;
        }
        if (htmlContainsGreeting(html)) {
          const logoPart = signatureAfterClosing(html);
          setSignatureHtml(logoPart || '');
          setHtmlBody(logoPart ? `${defaultHtml}${logoPart}` : html);
          return;
        }
        setSignatureHtml(html);
        setHtmlBody(`${defaultHtml}${html}`);
      } catch {
        if (!cancelled) setSignatureHtml('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, directoryEmailsKey]);

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
  const headerDate = formatHeaderDate(recordDate);

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
      fromEmail: CUSTOMER_INVOICE_FROM,
      toEmails,
      ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
      bccEmail: CUSTOMER_INVOICE_FROM,
      invoicePdfPath,
    });
  };

  const errorText = localError || sendError;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-[900px] w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-tight">ODOSLAŤ FA EMAIL</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {invoiceNumber ? `Faktúra č. ${invoiceNumber}` : 'Faktúra'}
                {headerDate ? ` - ${headerDate}` : ''}
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

        <div className="p-5 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>From</label>
              <input type="email" value={CUSTOMER_INVOICE_FROM} readOnly className={readonlyClass} />
            </div>
            <div>
              <label className={labelClass}>To</label>
              <input
                type="text"
                value={toEmailsText}
                onChange={(e) => setToEmailsText(e.target.value)}
                disabled={isSending}
                placeholder="email@firma.sk"
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
              <div ref={ccDropdownRef} className="relative">
                <input
                  type="text"
                  value={ccEmailsText}
                  onChange={(e) => setCcEmailsText(e.target.value)}
                  disabled={isSending}
                  placeholder="voliteľné"
                  className={`${inputClass} ${ccOptions.length > 0 ? 'pr-8' : ''}`}
                />
                {ccOptions.length > 0 && (
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => setCcDropdownOpen((open) => !open)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer disabled:opacity-40"
                    title="Vybrať email z adresára"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}
                {ccDropdownOpen && ccOptions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1">
                    {ccOptions.map((email) => (
                      <button
                        key={email}
                        type="button"
                        onClick={() => {
                          setCcEmailsText(email);
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
            <div>
              <label className={labelClass}>Bcc</label>
              <input type="email" value={CUSTOMER_INVOICE_FROM} readOnly className={readonlyClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Predmet</label>
            <input type="text" value={subject} readOnly className={readonlyClass} />
          </div>

          {attachmentName ? (
            <div className="flex items-center gap-1.5 text-[#1a65ff]">
              <Paperclip className="w-3.5 h-3.5 shrink-0" />
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

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
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
