import React, { useState, useEffect, useRef } from 'react';
import { AdresaRecord, ColnaRecord } from '../types';
import {
  X,
  AlertTriangle,
  Bell,
  Calendar,
  Truck,
  DollarSign,
  Upload,
  Trash2,
  Copy,
  Download,
  ExternalLink,
} from 'lucide-react';
import { extractInvoiceNumberFromFileName, invoiceDisplayNameFromPath } from '../utils/invoiceFile';
import { buildCaseLink, formatNotificationTimestampParts } from '../utils/caseLink';
import { calculateInvoiceDueDate, formatDueDateDisplay } from '../utils/dueDate';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { LoadingButtonContent } from './LoadingButtonContent';
import { appApi } from '../lib/appApi';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    record: Partial<ColnaRecord>,
    invoiceFile?: File,
    options?: { onUploadComplete?: () => void },
  ) => void | Promise<void>;
  onDeleteInvoice?: (recordId: string) => Promise<void>;
  initialRecord?: ColnaRecord | null;
  customerList: string[];
  /** Full customer directory — used for display/context in the form. */
  customerDirectory?: AdresaRecord[];
  readOnly?: boolean;
  defaultDate?: string;
  copyMode?: boolean;
  /** From email permanent link — dedicated accountant view (customs locked, invoice editable). */
  invoiceHandoffMode?: boolean;
}

interface AmountInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}

const AmountInput: React.FC<AmountInputProps> = ({ value, onChange, className }) => {
  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (!focused) {
      setDisplayValue(value === 0 || value == null ? '0.00' : value.toFixed(2));
    }
  }, [value, focused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    if (!value || value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
      e.target.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
      setDisplayValue(e.target.value);
      const parsed = parseFloat(raw);
      onChange(isNaN(parsed) ? 0 : parsed);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const raw = displayValue.replace(',', '.');
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed === 0) {
      onChange(0);
      setDisplayValue('0.00');
    } else {
      onChange(parsed);
      setDisplayValue(parsed.toFixed(2));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? displayValue : (value === 0 || value == null ? '0.00' : value.toFixed(2))}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
};

/** Native yes.png size (public/yes.png) — reserved so selected state cannot grow the button. */
const ROUTE_YES_ICON_W = 23;
const ROUTE_YES_ICON_H = 25;
const ROUTE_BTN_H = ROUTE_YES_ICON_H + 12 + 2; // icon + py-1.5*2 + border*2

const ROUTE_YES_ICON_CLASS = 'max-w-none object-contain block -translate-y-[1mm]';
const ROUTE_ICON_SLOT_CLASS =
  'inline-flex items-center justify-center shrink-0 self-center leading-none w-[23px] h-[25px]';
const ROUTE_BTN_BASE_CLASS =
  'box-border h-[39px] min-h-[39px] px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer border transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap';
const ROUTE_BTN_ROW_CLASS =
  'flex flex-nowrap items-center gap-1.5 sm:gap-2 min-h-[39px] overflow-x-auto';

type RouteSelectButtonProps = {
  selected: boolean;
  onClick: () => void;
  label: string;
  selectedClassName: string;
  idleClassName: string;
};

/** Shared UK→EU / EU→UK direction chip — same geometry; only colors differ. */
const RouteSelectButton: React.FC<RouteSelectButtonProps> = ({
  selected,
  onClick,
  label,
  selectedClassName,
  idleClassName,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`${ROUTE_BTN_BASE_CLASS} ${selected ? selectedClassName : idleClassName}`}
    style={{ height: ROUTE_BTN_H, minHeight: ROUTE_BTN_H }}
  >
    <span
      className={ROUTE_ICON_SLOT_CLASS}
      style={{ width: ROUTE_YES_ICON_W, height: ROUTE_YES_ICON_H }}
    >
      {selected ? (
        <img src="/yes.png" alt="" className={ROUTE_YES_ICON_CLASS} />
      ) : (
        <span className="text-[20px] leading-none font-bold">＋</span>
      )}
    </span>
    <span className="inline-block leading-none" style={{ transform: 'translateY(-1mm)' }}>
      {label}
    </span>
  </button>
);

/** Same outer geometry for UK→EU and EU→UK TRASA panels. */
const routePanelClassName = (highlighted: boolean, handoffMode: boolean) =>
  `bg-slate-50/70 p-3 sm:p-3.5 rounded-xl space-y-2 border-solid box-border min-h-[108px] ${
    handoffMode && highlighted
      ? 'border-[3px] border-[#0f766e]'
      : handoffMode
        ? 'border-[3px] border-slate-200'
        : 'border border-slate-200'
  }`;

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDeleteInvoice,
  initialRecord,
  customerList,
  customerDirectory = [],
  readOnly = false,
  defaultDate,
  copyMode = false,
  invoiceHandoffMode = false,
}) => {
  const localTodayYmd = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [formData, setFormData] = useState<Partial<ColnaRecord>>({
    zakaznik: '',
    isNew: true,
    bell: false,
    alert: false,
    datumColnice: localTodayYmd(),
    spz: '',
    refNaFa: '',
    ukToEu: '',
    euToUk: '',
    faOdUkAgent: 0,
    faOdEuAgent: 0,
    faKlient: 0,
    intPoznamka: '',
    opravaFaktury: '',
    cisloFa: '',
    splatna: '',
    zaplatena: false,
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isInvoiceDragActive, setIsInvoiceDragActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /** True only while the PDF bytes are uploading (handoff UPLOAD FILE box animation). */
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  /** Visible DÁTUM SPLATNOSTI text — always DD.MM.YYYY while editing. */
  const [splatnaInput, setSplatnaInput] = useState('');
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [isInvoiceDeleteModalOpen, setIsInvoiceDeleteModalOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isRequiredFieldsModalOpen, setIsRequiredFieldsModalOpen] = useState(false);
  /** Sticky correction workflow for handoff session (survives PDF delete). */
  const [correctionWorkflow, setCorrectionWorkflow] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const spzInputRef = useRef<HTMLInputElement>(null);
  const opravaInputRef = useRef<HTMLInputElement>(null);

  const [linkCopied, setLinkCopied] = useState(false);
  const savingLockRef = useRef(false);

  useEffect(() => {
    // Never reset form / clear the save spinner while an upload+save is in flight.
    // applyBootstrap after PDF upload re-renders the parent and would otherwise
    // stop the blue button spinner for several seconds before save finishes.
    if (savingLockRef.current) return;

    if (initialRecord) {
      if (copyMode) {
        const {
          id: _id,
          invoicePdfPath: _pdf,
          invoiceToken: _token,
          invoicingEmailSentAt: _sent,
          customerInvoiceEmailSentAt: _customerSent,
          ...copied
        } = initialRecord;
        // Copy is a new record — notification must be opt-in for this SAVE.
        // Keep zakaznik exactly as stored (never rewrite / strip legal form).
        setFormData({
          ...copied,
          zakaznik: copied.zakaznik || '',
          bell: false,
          alert: false,
        });
      } else {
        // bell/alert checkboxes mean "send notification on THIS save".
        // Never preload them from DB for edit — persistent OPRAVA must not
        // auto-trigger a duplicate EmailJS send on the next SAVE.
        // Accountant view keeps NEW/OPRAVA flags for read-only display.
        // Keep zakaznik exactly as stored in Supabase (display-only stripping is in <select> labels).
        setFormData(
          invoiceHandoffMode
            ? { ...initialRecord, opravaFaktury: initialRecord.opravaFaktury || '', bell: false }
            : {
                ...initialRecord,
                opravaFaktury: initialRecord.opravaFaktury || '',
                bell: false,
                alert: false,
              },
        );
      }
    } else {
      setFormData({
        zakaznik: '',
        isNew: true,
        bell: false,
        alert: false,
        datumColnice: defaultDate || localTodayYmd(),
        spz: '',
        refNaFa: '',
        ukToEu: '',
        euToUk: '',
        faOdUkAgent: 0,
        faOdEuAgent: 0,
        faKlient: 0,
        intPoznamka: '',
        opravaFaktury: '',
        cisloFa: '',
        splatna: '',
        zaplatena: false,
      });
    }
    setMissingFields([]);
    setIsRequiredFieldsModalOpen(false);
    setLinkCopied(false);
    savingLockRef.current = false;
    setIsSaving(false);
    setIsUploadingInvoice(false);
    setSplatnaInput(formatDueDateDisplay(initialRecord?.splatna || ''));
  }, [initialRecord, isOpen, customerList, defaultDate, copyMode, invoiceHandoffMode]);

  useEffect(() => {
    if (!isOpen || !invoiceHandoffMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, invoiceHandoffMode]);

  useEffect(() => {
    if (!isOpen) {
      setCorrectionWorkflow(false);
      return;
    }
    if (
      invoiceHandoffMode &&
      (initialRecord?.invoiceCorrectionPending ||
        initialRecord?.invoiceCorrected ||
        initialRecord?.invoicePdfPath ||
        initialRecord?.cisloFa)
    ) {
      setCorrectionWorkflow(true);
    }
  }, [isOpen, invoiceHandoffMode, initialRecord]);

  useEffect(() => {
    if (isOpen) {
      if (savingLockRef.current) return;
      setInvoiceFile(null);
      setIsInvoiceDragActive(false);
      setIsSaving(false);
      setIsUploadingInvoice(false);
    }
  }, [isOpen]);

  // Helper state toggles for UK/EU route selection
  const isUkZaclenieSelected = !!(formData.ukToEu && formData.ukToEu.includes('zaclenie v UK'));
  const isEuVyclenieSelected = !!(formData.ukToEu && formData.ukToEu.includes('vyclenie v EU'));

  const toggleUkZaclenie = () => {
    const nextUk = !isUkZaclenieSelected;
    const nextEu = isEuVyclenieSelected;
    let newStr = '';
    if (nextUk && nextEu) newStr = 'zaclenie v UK; vyclenie v EU';
    else if (nextUk) newStr = 'zaclenie v UK';
    else if (nextEu) newStr = 'vyclenie v EU';
    setFormData(prev => ({ ...prev, ukToEu: newStr }));
  };

  const toggleEuVyclenie = () => {
    const nextUk = isUkZaclenieSelected;
    const nextEu = !isEuVyclenieSelected;
    let newStr = '';
    if (nextUk && nextEu) newStr = 'zaclenie v UK; vyclenie v EU';
    else if (nextUk) newStr = 'zaclenie v UK';
    else if (nextEu) newStr = 'vyclenie v EU';
    setFormData(prev => ({ ...prev, ukToEu: newStr }));
  };

  const isEuZaclenieSelected = !!(formData.euToUk && formData.euToUk.includes('zaclenie v EU'));
  const isUkVyclenieSelected = !!(formData.euToUk && formData.euToUk.includes('vyclenie v UK'));

  const toggleEuZaclenie = () => {
    const nextEu = !isEuZaclenieSelected;
    const nextUk = isUkVyclenieSelected;
    let newStr = '';
    if (nextEu && nextUk) newStr = 'zaclenie v EU; vyclenie v UK';
    else if (nextEu) newStr = 'zaclenie v EU';
    else if (nextUk) newStr = 'vyclenie v UK';
    setFormData(prev => ({ ...prev, euToUk: newStr }));
  };

  const toggleUkVyclenie = () => {
    const nextEu = isEuZaclenieSelected;
    const nextUk = !isUkVyclenieSelected;
    let newStr = '';
    if (nextEu && nextUk) newStr = 'zaclenie v EU; vyclenie v UK';
    else if (nextEu) newStr = 'zaclenie v EU';
    else if (nextUk) newStr = 'vyclenie v UK';
    setFormData(prev => ({ ...prev, euToUk: newStr }));
  };

  const selectInvoiceFile = (file?: File) => {
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      setInvoiceFile(file);
      const invoiceNumber = extractInvoiceNumberFromFileName(file.name);
      // New invoice → due date = invoice (upload) date + 15 calendar days.
      const dueIso = calculateInvoiceDueDate(new Date());
      setFormData((prev) => ({ ...prev, cisloFa: invoiceNumber, splatna: dueIso }));
      setSplatnaInput(formatDueDateDisplay(dueIso));
    }
  };

  const hasUploadedInvoice = !!(invoiceFile || formData.invoicePdfPath);
  const displayedInvoiceName =
    invoiceFile?.name || invoiceDisplayNameFromPath(formData.invoicePdfPath) || '';

  const permanentCaseLink = copyMode ? '' : buildCaseLink(formData.invoiceToken);
  const notificationTimestampParts = copyMode
    ? null
    : formatNotificationTimestampParts(formData.invoicingEmailSentAt);
  const handleCopyCaseLink = async () => {
    if (!permanentCaseLink) return;
    try {
      await navigator.clipboard.writeText(permanentCaseLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt('Skopírujte odkaz:', permanentCaseLink);
    }
  };

  const handleOpenInvoice = async () => {
    if (invoiceFile) {
      const url = URL.createObjectURL(invoiceFile);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!formData.id || !formData.invoicePdfPath) return;
    try {
      const { url } = await appApi.getInvoiceDownloadUrl(formData.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Faktúru sa nepodarilo otvoriť.');
    }
  };

  const handleDownloadInvoice = async () => {
    if (invoiceFile) {
      const url = URL.createObjectURL(invoiceFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = invoiceFile.name;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }
    if (!formData.id || !formData.invoicePdfPath) return;
    try {
      const { url, fileName } = await appApi.getInvoiceDownloadUrl(formData.id);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Faktúru sa nepodarilo stiahnuť.');
    }
  };

  const handleDeleteInvoiceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly || isDeletingInvoice) return;
    setIsInvoiceDeleteModalOpen(true);
  };

  /** NÁHĽAD from main table — allow late "Odoslať na fakturáciu" + save. */
  const isPreviewMode = readOnly && !invoiceHandoffMode;
  const customsLocked = invoiceHandoffMode || (readOnly && !isPreviewMode);
  const invoiceEditable = !readOnly || isPreviewMode;
  /**
   * NÁHĽAD workflow:
   * - Invoice PDF uploaded → customer invoice email is sent from the table @ action
   * - No invoice PDF → original "Odoslať na fakturáciu" controls
   */
  /** Accountant correction workflow — title stays OPRAVA even if PDF is deleted. */
  const isAccountantCorrectionMode = invoiceHandoffMode && correctionWorkflow;
  /** First-time invoicing handoff — green highlight only here. */
  const isNewInvoicingHandoff = invoiceHandoffMode && !isAccountantCorrectionMode;
  const greenFocus =
    'border-[#0f766e] border-[3px] focus:ring-[#0f766e]';
  const greenPanel = 'border-[#0f766e] border-[3px]';

  const collectMissingRequiredFields = (): string[] => {
    const missing: string[] = [];
    if (!(formData.zakaznik || '').trim()) missing.push('ZÁKAZNÍK');
    if (!(formData.datumColnice || '').trim()) missing.push('DÁTUM COLNICE');
    if (!(formData.spz || '').trim()) missing.push('ŠPZ VOZIDLA');
    const hasRoute = Boolean(
      (formData.ukToEu || '').trim() || (formData.euToUk || '').trim(),
    );
    if (!hasRoute) missing.push('TRASA');
    if (formData.faOdUkAgent == null || Number.isNaN(Number(formData.faOdUkAgent))) {
      missing.push('FA OD UK AGENT (€)');
    }
    if (formData.faOdEuAgent == null || Number.isNaN(Number(formData.faOdEuAgent))) {
      missing.push('FA OD EU AGENT (€)');
    }
    return missing;
  };

  const confirmDeleteInvoice = async () => {
    // Local-only selection (not yet saved/uploaded)
    if (invoiceFile && !formData.invoicePdfPath) {
      setInvoiceFile(null);
      if (invoiceInputRef.current) invoiceInputRef.current.value = '';
      setFormData((prev) => ({ ...prev, cisloFa: '', splatna: '' }));
      setSplatnaInput('');
      setIsInvoiceDeleteModalOpen(false);
      return;
    }

    if (!formData.id || !onDeleteInvoice) return;

    setIsDeletingInvoice(true);
    try {
      await onDeleteInvoice(formData.id);
      setInvoiceFile(null);
      if (invoiceInputRef.current) invoiceInputRef.current.value = '';
      setFormData((prev) => ({
        ...prev,
        invoicePdfPath: undefined,
        cisloFa: '',
        splatna: '',
      }));
      setSplatnaInput('');
      setIsInvoiceDeleteModalOpen(false);
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleSpzChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectionStart = e.currentTarget.selectionStart;
    const selectionEnd = e.currentTarget.selectionEnd;
    const uppercaseValue = e.currentTarget.value.toUpperCase();
    setFormData(prev => ({ ...prev, spz: uppercaseValue }));
    requestAnimationFrame(() => {
      if (spzInputRef.current && selectionStart !== null && selectionEnd !== null) {
        spzInputRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  };

  /** ÚPRAVA ZÁZNAMU COLNICE only — uppercase user input in OPRAVA FAKTÚRY. */
  const isCustomsEditMode =
    Boolean(initialRecord) && !copyMode && !readOnly && !invoiceHandoffMode;

  const handleOpravaFakturyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectionStart = e.currentTarget.selectionStart;
    const selectionEnd = e.currentTarget.selectionEnd;
    const nextValue = isCustomsEditMode
      ? e.currentTarget.value.toLocaleUpperCase('sk-SK')
      : e.currentTarget.value;
    setFormData((prev) => ({ ...prev, opravaFaktury: nextValue }));
    if (isCustomsEditMode) {
      requestAnimationFrame(() => {
        if (opravaInputRef.current && selectionStart !== null && selectionEnd !== null) {
          opravaInputRef.current.setSelectionRange(selectionStart, selectionEnd);
        }
      });
    }
  };

  if (!isOpen) return null;

  // Auto calculate profit
  const calculatedProfit = (Number(formData.faKlient) || 0) - (Number(formData.faOdUkAgent) || 0) - (Number(formData.faOdEuAgent) || 0);

  const isCreateOrCopy = !initialRecord || copyMode;
  /** Create, copy, and NÁHĽAD late-send use bell ("Odoslať na fakturáciu"). */
  const usesBellSend = isCreateOrCopy || isPreviewMode;
  const willSendNotification =
    !invoiceHandoffMode &&
    (!readOnly || isPreviewMode) &&
    (usesBellSend ? Boolean(formData.bell) : Boolean(formData.alert));
  const saveButtonLabel = isAccountantCorrectionMode
    ? 'ULOŽIŤ A ODOSLAŤ OPRAVENÚ FAKTÚRU'
    : isNewInvoicingHandoff
      ? 'ULOŽIŤ A ODOSLAŤ'
    : willSendNotification
        ? usesBellSend
          ? 'ULOŽIŤ A ODOSLAŤ NA FAKTURÁCIU'
          : 'ULOŽIŤ A ODOSLAŤ NOTIFIKÁCIU'
        : 'ULOŽIŤ';
  const saveLoadingKind =
    isAccountantCorrectionMode ||
    isNewInvoicingHandoff ||
    willSendNotification
      ? 'send'
      : 'save';
  const isUploadingInvoicePdf = isUploadingInvoice;
  const handoffRequiresInvoice = invoiceHandoffMode && !hasUploadedInvoice;

  const formatHandoffDate = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '…………';
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [y, m, d] = raw.slice(0, 10).split('-');
      return `${d}.${m}.${y}`;
    }
    return raw;
  };
  const handoffDateLabel = formatHandoffDate(formData.datumColnice);
  const handoffSpzLabel = (formData.spz || '').trim() || '…………';
  const handoffUkToEuText =
    `Fakturujeme Vám poplatok za sprostredkovanie col. konania pri preprave z UK zo dňa ${handoffDateLabel} / ŠPZ: ${handoffSpzLabel}`;
  const handoffEuToUkText =
    `Fakturujeme Vám poplatok za sprostredkovanie col. konania pri preprave do UK zo dňa ${handoffDateLabel} / ŠPZ: ${handoffSpzLabel}`;
  const isUkToEuRouteActive = isUkZaclenieSelected || isEuVyclenieSelected;
  const isEuToUkRouteActive = isEuZaclenieSelected || isUkVyclenieSelected;
  // Only one invoice text may be visible; prefer EU→UK when it is the sole selection.
  const showEuToUkInvoice = isEuToUkRouteActive && !isUkToEuRouteActive;
  const showUkToEuInvoice = isUkToEuRouteActive && !showEuToUkInvoice;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Synchronous guard — React state alone cannot block double-clicks before re-render.
    if (savingLockRef.current || isSaving || (readOnly && !isPreviewMode)) return;
    if (handoffRequiresInvoice) return;

    // Required fields for NEW / COPY (and preview save of a new-style form).
    if (!invoiceHandoffMode && (isCreateOrCopy || isPreviewMode)) {
      const missing = collectMissingRequiredFields();
      if (missing.length > 0) {
        setMissingFields(missing);
        setIsRequiredFieldsModalOpen(true);
        return;
      }
    }
    setMissingFields([]);
    setIsRequiredFieldsModalOpen(false);

    savingLockRef.current = true;
    setIsSaving(true);
    // Upload-box animation starts together with the blue button spinner.
    if (invoiceFile) setIsUploadingInvoice(true);
    try {
      // Accountant view: save only invoice fields; never mark OPRAVA / send notification.
      // isSaving stays true for the full await (upload + save); modal closes only after success.
      if (invoiceHandoffMode) {
        if (!initialRecord?.id) return;
        await onSave(
          {
            ...initialRecord,
            cisloFa: formData.cisloFa,
            splatna: formData.splatna,
            zaplatena: formData.zaplatena,
            zisk: initialRecord.zisk,
            invoiceHandoff: true,
            alert: false,
            bell: false,
          } as Partial<ColnaRecord> & { invoiceHandoff?: boolean },
          invoiceFile || undefined,
          {
            onUploadComplete: () => setIsUploadingInvoice(false),
          },
        );
        return;
      }

      const { id: _id, ...withoutId } = formData;
      // New + copy must never send an id (forces INSERT → new created_at → row 1).
      // Edit / preview keeps id so UPDATE preserves created_at / table position.
      const isNewOrCopy = copyMode || !initialRecord;
      await onSave(
        {
          ...(isNewOrCopy ? withoutId : formData),
          // Preview late-send must not also fire edit "alert" email path.
          alert: isPreviewMode ? false : formData.alert,
          zisk: calculatedProfit,
        },
        invoiceFile || undefined,
        {
          onUploadComplete: () => setIsUploadingInvoice(false),
        },
      );
    } catch {
      // Parent shows toast; keep modal open for retry. Spinner stops in finally.
    } finally {
      setIsSaving(false);
      setIsUploadingInvoice(false);
      savingLockRef.current = false;
    }
  };

  const fieldMissing = (name: string) => missingFields.includes(name);
  const requiredMark = <span className="text-red-600"> *</span>;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-4xl my-auto text-slate-800 overflow-hidden flex flex-col max-h-[98vh]">
        
        {/* Modal Header */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 
              className="font-bold text-slate-900 tracking-tight uppercase px-3 py-1"
              style={{
                borderRadius: '8px',
                borderWidth: '4px',
                borderColor:
                  invoiceHandoffMode
                    ? '#0f766e'
                    : initialRecord && !copyMode && !readOnly
                      ? '#e33a3a'
                      : '#1e10d0',
                borderStyle: 'solid',
                fontSize: '15px',
                fontFamily: 'system-ui, sans-serif'
              }}
            >
              {invoiceHandoffMode
                ? isAccountantCorrectionMode
                  ? 'FAKTURÁCIA – OPRAVA FAKTÚRY'
                  : 'FAKTURÁCIA NOVEJ COLNICE'
                : readOnly
                  ? 'NÁHĽAD ZÁZNAMU COLNICE'
                  : initialRecord && !copyMode
                    ? 'ÚPRAVA ZÁZNAMU COLNICE'
                    : 'NOVÝ ZÁZNAM'}
            </h3>
          </div>
          
          <button 
            type="button"
            onClick={invoiceHandoffMode ? undefined : onClose}
            disabled={invoiceHandoffMode}
            className={`text-slate-400 p-1 rounded-md transition-colors ${
              invoiceHandoffMode
                ? 'cursor-not-allowed opacity-40'
                : 'hover:text-slate-700 hover:bg-slate-100 cursor-pointer'
            }`}
            title={invoiceHandoffMode ? 'Najprv nahrajte faktúru a uložte záznam' : 'Zavrieť'}
            aria-disabled={invoiceHandoffMode}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="colna-record-form" onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 text-xs overflow-y-auto">
          {/* Customs fields — locked in accountant view */}
          <fieldset disabled={customsLocked} className="space-y-3">
          
          {/* Row 1: Customer & Flags — toolbar shares the select row so centres match the dropdown arrow */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <label className="block text-slate-700 font-bold mb-0.5 text-[11px] uppercase">
              ZÁKAZNÍK{requiredMark}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={formData.zakaznik}
                onChange={(e) => setFormData({ ...formData, zakaznik: e.target.value })}
                className={`flex-1 min-w-[240px] bg-white border rounded-md px-2.5 py-1.5 text-slate-900 font-semibold text-xs focus:ring-1 outline-none ${
                  fieldMissing('ZÁKAZNÍK')
                    ? 'border-red-500 focus:ring-blue-500'
                    : isNewInvoicingHandoff
                      ? greenFocus
                      : 'border-slate-200 focus:ring-blue-500'
                }`}
                required
              >
                <option value=""></option>
                {/* Options are SKRATKA values from Adresár (not official legal names). */}
                {formData.zakaznik &&
                  formData.zakaznik !== 'Iný zákazník' &&
                  !customerList.includes(formData.zakaznik) && (
                    <option value={formData.zakaznik}>{formData.zakaznik}</option>
                  )}
                {customerList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Iný zákazník">+ Pridať nového zákazníka</option>
              </select>

            {!invoiceHandoffMode && !(isPreviewMode && hasUploadedInvoice) && (
            <div className="flex items-center justify-end shrink-0">
              <div className="inline-flex items-center gap-2.5 shrink-0">
              {!initialRecord || copyMode || readOnly ? (
                <>
                  <label className="inline-flex items-center gap-2.5 m-0 p-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isNew}
                      onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 m-0 bg-white border-slate-300 shrink-0 self-center"
                    />
                    <img src="/new1.png" alt="NEW" className="h-6.5 w-auto object-contain shrink-0 block self-center" title="Nové colné konanie v evidencii" />
                  </label>

                  <label className="inline-flex items-center gap-2.5 m-0 p-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.bell}
                      onChange={(e) => setFormData({ ...formData, bell: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 m-0 bg-white border-slate-300 shrink-0 self-center"
                    />
                    <img
                      src="/mail.png"
                      alt="Mail"
                      className="object-contain shrink-0 block max-w-none self-center"
                      style={{ width: 48, height: 56 }}
                    />
                    <span className="inline-flex items-center self-center text-slate-600 font-medium text-[12px] whitespace-nowrap leading-none">
                      Odoslať Mirovi na fakturáciu
                    </span>
                  </label>
                </>
              ) : (
                <label className="inline-flex items-center gap-2 m-0 p-0 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.alert}
                    onChange={(e) => setFormData({ ...formData, alert: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0 w-4 h-4 m-0 bg-white border-slate-300 shrink-0 self-center"
                  />
                  <img
                    src="/edit.png"
                    alt=""
                    className="object-contain shrink-0 max-w-none self-center block"
                    aria-hidden="true"
                  />
                  <span className="flex flex-col text-slate-700 font-medium text-[12px] text-left leading-none shrink-0">
                    <span className="flex h-[15px] items-center whitespace-nowrap gap-1">
                      Zaznamenať úpravu a
                      <img
                        src="/posli.png"
                        alt=""
                        className="object-contain shrink-0 max-w-none block"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="flex h-[15px] items-center whitespace-nowrap">
                      info pre opravu faktúry.
                    </span>
                    <span className="flex h-[15px] items-center whitespace-nowrap">
                      (pre vystavenie novej faktúry)
                    </span>
                  </span>
                </label>
              )}
              </div>
            </div>
            )}
            </div>
          </div>

          {/* Row 2: Transport & Direction Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" /> DÁTUM COLNICE{requiredMark}
              </label>
              <input
                type="date"
                value={formData.datumColnice || ''}
                onChange={(e) => setFormData({ ...formData, datumColnice: e.target.value })}
                className={`w-full bg-slate-50 border rounded-md px-2.5 py-1 text-slate-900 focus:ring-1 outline-none ${
                  fieldMissing('DÁTUM COLNICE')
                    ? 'border-red-500 focus:ring-blue-500'
                    : isNewInvoicingHandoff
                      ? greenFocus
                      : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-600" /> ŠPZ VOZIDLA{requiredMark}
              </label>
              <input
                ref={spzInputRef}
                type="text"
                value={formData.spz || ''}
                onChange={handleSpzChange}
                className={`w-full bg-slate-50 border rounded-md px-2.5 py-1 text-slate-900 font-mono focus:ring-1 outline-none ${
                  fieldMissing('ŠPZ VOZIDLA')
                    ? 'border-red-500 focus:ring-blue-500'
                    : isNewInvoicingHandoff
                      ? greenFocus
                      : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
                REFERENCIA NA FAKTÚRU
              </label>
              <input
                type="text"
                value={formData.refNaFa || ''}
                onChange={(e) => setFormData({ ...formData, refNaFa: e.target.value })}
                className={`w-full bg-slate-50 border rounded-md px-2.5 py-1 text-slate-900 focus:ring-1 outline-none ${
                  isNewInvoicingHandoff && (formData.refNaFa || '').trim()
                    ? greenFocus
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Row 3: UK/EU Direction Statuses */}
          <div className={`grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3.5 items-start ${
            fieldMissing('TRASA') ? 'ring-2 ring-red-500 rounded-xl p-1' : ''
          }`}>
            <div className={routePanelClassName(showUkToEuInvoice, isNewInvoicingHandoff)}>
              <label className="block text-teal-900 font-bold text-[11px] uppercase tracking-wide">
                TRASA <img src="/uk1.png" alt="UK" className="inline-block w-5 h-5 object-contain" /> ➔ <img src="/eu1.png" alt="EU" className="inline-block w-5 h-5 object-contain" />
              </label>
              <div className={ROUTE_BTN_ROW_CLASS}>
                <RouteSelectButton
                  onClick={toggleUkZaclenie}
                  selected={isUkZaclenieSelected}
                  label="zaclenie v UK"
                  selectedClassName="bg-blue-600 text-white border-blue-700 shadow-xs"
                  idleClassName="bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:text-blue-700"
                />
                <RouteSelectButton
                  onClick={toggleEuVyclenie}
                  selected={isEuVyclenieSelected}
                  label="vyclenie v EU"
                  selectedClassName="bg-blue-600 text-white border-blue-700 shadow-xs"
                  idleClassName="bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:text-blue-700"
                />
              </div>
            </div>

            <span
              className="flex items-center justify-center sm:items-start sm:pt-3.5 text-red-600 font-bold text-[14px] leading-none select-none"
              aria-hidden="true"
            >
              *
            </span>

            <div className={routePanelClassName(showEuToUkInvoice, isNewInvoicingHandoff)}>
              <label className="block text-teal-900 font-bold text-[11px] uppercase tracking-wide">
                TRASA <img src="/eu1.png" alt="EU" className="inline-block w-5 h-5 object-contain" /> ➔ <img src="/uk1.png" alt="UK" className="inline-block w-5 h-5 object-contain" />
              </label>
              <div className={ROUTE_BTN_ROW_CLASS}>
                <RouteSelectButton
                  onClick={toggleEuZaclenie}
                  selected={isEuZaclenieSelected}
                  label="zaclenie v EU"
                  selectedClassName="bg-emerald-600 text-white border-emerald-700 shadow-xs"
                  idleClassName="bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
                />
                <RouteSelectButton
                  onClick={toggleUkVyclenie}
                  selected={isUkVyclenieSelected}
                  label="vyclenie v UK"
                  selectedClassName="bg-emerald-600 text-white border-emerald-700 shadow-xs"
                  idleClassName="bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Financial Amounts & Live Calculated Profit */}
          <div className={`bg-slate-50 p-2.5 rounded-lg border space-y-2 ${
            isNewInvoicingHandoff ? greenPanel : 'border-slate-200'
          }`}>
            <h4 className="font-bold text-slate-800 flex items-center gap-1 uppercase text-[11px] tracking-wider">
              Poplatky & Zisk
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-start">
              <div className="min-w-0">
                <label className="block text-slate-600 font-medium mb-0.5 text-[11px] leading-none">
                  FA OD UK AGENT (€){requiredMark}
                </label>
                <AmountInput
                  value={formData.faOdUkAgent ?? 0}
                  onChange={(val) => setFormData(prev => ({ ...prev, faOdUkAgent: val }))}
                  className={`w-full h-[26px] bg-white border rounded-md px-2.5 py-1 text-slate-900 font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none box-border ${
                    fieldMissing('FA OD UK AGENT (€)') ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-slate-600 font-medium mb-0.5 text-[11px] leading-none">
                  FA OD EU AGENT (€){requiredMark}
                </label>
                <AmountInput
                  value={formData.faOdEuAgent ?? 0}
                  onChange={(val) => setFormData(prev => ({ ...prev, faOdEuAgent: val }))}
                  className={`w-full h-[26px] bg-white border rounded-md px-2.5 py-1 text-slate-900 font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none box-border ${
                    fieldMissing('FA OD EU AGENT (€)') ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-blue-900 font-bold mb-0.5 text-[11px] leading-none">
                  FA ➔ KLIENT (€)
                </label>
                <AmountInput
                  value={formData.faKlient ?? 0}
                  onChange={(val) => setFormData(prev => ({ ...prev, faKlient: val }))}
                  className="w-full h-[26px] bg-white border border-blue-400 rounded-md px-2.5 py-1 text-blue-900 font-bold font-mono text-right focus:ring-1 focus:ring-blue-500 outline-none box-border"
                />
              </div>

              <div className="min-w-0">
                <span className="block text-slate-600 font-medium mb-0.5 text-[11px] leading-none invisible select-none" aria-hidden="true">
                  VYPOČÍTANÝ ZISK
                </span>
                <div className="bg-emerald-100 border border-emerald-300 rounded-md px-2.5 flex w-full h-[26px] box-border items-end justify-center gap-2 whitespace-nowrap leading-none pb-1">
                  <span className="inline-flex items-baseline gap-2 leading-none">
                    <span className="font-bold text-emerald-900 text-[11px] leading-none">VYPOČÍTANÝ ZISK:</span>
                    <span className="text-xs font-black font-mono text-emerald-700 leading-none">{calculatedProfit.toFixed(2)} €</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          </fieldset>

          {/* Invoice fields — editable in accountant view */}
          <fieldset disabled={!invoiceEditable} className="space-y-3">
          {/* Row 5: Invoice — FAKTÚRA ZAPLATENÁ under DÁTUM SPLATNOSTI */}
          <div className="grid grid-cols-1 gap-2.5 items-start sm:grid-cols-[0.9fr_1.1fr_minmax(0,1.6fr)]">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase tracking-wide">
                ČÍSLO FAKTÚRY
              </label>
              <input
                type="text"
                value={formData.cisloFa || ''}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 outline-none read-only:cursor-default"
              />
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase tracking-wide">
                  DÁTUM SPLATNOSTI
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatDueDateDisplay(formData.splatna || splatnaInput)}
                  placeholder="DD.MM.YYYY"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none read-only:cursor-default"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.zaplatena}
                  onChange={(e) => setFormData({ ...formData, zaplatena: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                />
                <span className={`font-bold text-[11px] uppercase ${formData.zaplatena ? 'text-emerald-700 font-extrabold' : 'text-slate-700'}`}>
                  FAKTÚRA ZAPLATENÁ
                </span>
              </label>
            </div>

            <div className="flex items-start gap-1 min-w-0">
              <input
                ref={invoiceInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => selectInvoiceFile(e.target.files?.[0])}
                className="hidden"
              />
              <span className="box-border flex h-[84px] w-[62px] shrink-0 items-center text-slate-500 font-semibold text-[11px] uppercase leading-tight">
                NAHRAJ VYSTAVENÚ FAKTÚRU
              </span>
              <div className="flex min-w-0 flex-1 items-stretch gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!invoiceEditable) return;
                    // Empty → upload; with file → replace (no separate Replace button in layout).
                    invoiceInputRef.current?.click();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (invoiceEditable) setIsInvoiceDragActive(true);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => setIsInvoiceDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsInvoiceDragActive(false);
                    if (invoiceEditable) selectInvoiceFile(e.dataTransfer.files?.[0]);
                  }}
                  className={`relative box-border min-w-0 flex-1 h-[84px] rounded-xl transition-colors ${
                    hasUploadedInvoice
                      ? 'border border-amber-500 bg-[#ECE039] cursor-pointer'
                      : isNewInvoicingHandoff
                        ? `border-[3px] border-solid border-[#0f766e] bg-blue-50/40 ${invoiceEditable ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'}`
                        : isInvoiceDragActive
                          ? 'border border-dashed border-blue-600 bg-blue-50 cursor-pointer'
                          : `border border-dashed border-blue-400 bg-blue-50/40 ${invoiceEditable ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'}`
                  }`}
                >
                  {isUploadingInvoicePdf ? (
                    <span className="absolute inset-0 flex items-center justify-center gap-1 text-blue-900 font-bold text-[11px] pointer-events-none">
                      <span aria-hidden="true">📄</span>
                      <span className="btn-loading-spinner" aria-hidden="true">⟳</span>
                      <span>Nahrávam...</span>
                    </span>
                  ) : hasUploadedInvoice ? (
                    <>
                      <img
                        src="/pin.png"
                        alt="Faktúra PDF"
                        className="absolute left-1/2 top-[38%] h-[28.8px] w-auto -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
                      />
                      <span className="absolute bottom-1 left-2 right-2 text-center text-slate-900 font-semibold text-[9px] break-all whitespace-normal leading-tight pointer-events-none">
                        Current invoice: {displayedInvoiceName}
                      </span>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-blue-600 pointer-events-none">
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wide leading-none">
                        UPLOAD FILE
                      </span>
                    </span>
                  )}
                </button>

                {/* Fixed action column — always present so layout never shifts. */}
                <div className="flex w-[5.5rem] shrink-0 flex-col justify-between gap-1 h-[84px]">
                  <button
                    type="button"
                    onClick={() => { void handleOpenInvoice(); }}
                    disabled={!hasUploadedInvoice}
                    className={`inline-flex h-[26px] w-full items-center justify-center gap-1 rounded border px-1.5 text-[10px] font-bold ${
                      hasUploadedInvoice
                        ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'
                        : 'border-slate-200 bg-white text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleDownloadInvoice(); }}
                    disabled={!hasUploadedInvoice}
                    className={`inline-flex h-[26px] w-full items-center justify-center gap-1 rounded border px-1.5 text-[10px] font-bold ${
                      hasUploadedInvoice
                        ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'
                        : 'border-slate-200 bg-white text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteInvoiceClick}
                    disabled={!hasUploadedInvoice || !invoiceEditable || isDeletingInvoice}
                    className={`inline-flex h-[26px] w-full items-center justify-center gap-1 rounded border px-1.5 text-[10px] font-bold ${
                      hasUploadedInvoice && invoiceEditable
                        ? 'border-red-300 bg-white text-red-700 hover:bg-red-50 cursor-pointer disabled:cursor-not-allowed'
                        : 'border-red-200 bg-white text-red-300 cursor-not-allowed'
                    }`}
                  >
                    <LoadingButtonContent loading={isDeletingInvoice} kind="delete">
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </LoadingButtonContent>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </fieldset>

          {/* Remaining customs fields — locked in accountant view */}
          <fieldset disabled={customsLocked && !invoiceHandoffMode} className="space-y-3">
          {/* Row 6: POZNÁMKA + OPRAVA FAKTÚRY (side by side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5 text-[11px] uppercase tracking-wide">
                POZNÁMKA
              </label>
              <input
                type="text"
                value={formData.intPoznamka || ''}
                onChange={(e) => setFormData({ ...formData, intPoznamka: e.target.value })}
                readOnly={invoiceHandoffMode}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-[30px] rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none read-only:cursor-default"
              />
            </div>
            <div>
              <label
                className={`block font-semibold mb-0.5 text-[11px] uppercase tracking-wide leading-tight ${
                  isAccountantCorrectionMode || isCustomsEditMode
                    ? 'text-red-600'
                    : 'text-slate-600'
                }`}
              >
                OPRAVA FAKTÚRY{' '}
                <span
                  className={`normal-case font-normal ${
                    isAccountantCorrectionMode || isCustomsEditMode
                      ? 'text-red-600'
                      : 'text-slate-500'
                  }`}
                >
                  (tu nájdeš info, čo treba zmeniť v už vystavenej faktúre)
                </span>
              </label>
              <input
                ref={opravaInputRef}
                type="text"
                value={formData.opravaFaktury || ''}
                onChange={handleOpravaFakturyChange}
                readOnly={invoiceHandoffMode}
                className={`w-full h-[30px] rounded-md px-2.5 py-1.5 focus:ring-1 outline-none read-only:cursor-default ${
                  isAccountantCorrectionMode || isCustomsEditMode
                    ? 'border-[3px] border-red-500 bg-[#ECE039] text-red-600 focus:ring-red-500'
                    : 'border border-slate-200 bg-slate-50 text-slate-900 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>
          </fieldset>

          {/* LINK + single date/time field (refs: always one combined timestamp box) */}
          <div className="grid w-full min-w-0 grid-cols-[3rem_minmax(0,1fr)_4.75rem_9.375rem] gap-1.5 items-start">
            <span className="shrink-0 pt-1.5 text-slate-600 font-bold text-[11px] uppercase tracking-wide">
              LINK
            </span>
            <div className="box-border h-[30px] w-full min-w-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <a
                href={permanentCaseLink || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`block h-full w-full truncate text-[11px] font-mono leading-tight ${
                  permanentCaseLink
                    ? 'text-blue-700 hover:underline'
                    : 'pointer-events-none text-slate-400'
                }`}
                title={permanentCaseLink || undefined}
              >
                {permanentCaseLink || '\u00A0'}
              </a>
            </div>
            <button
              type="button"
              onClick={() => { void handleCopyCaseLink(); }}
              disabled={!permanentCaseLink}
              className="inline-flex h-[30px] w-full items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              title="Kopírovať odkaz"
            >
              {linkCopied ? <img src="/yes.png" alt="" className="max-w-none object-contain" /> : <Copy className="w-3.5 h-3.5" />}
              {linkCopied ? 'OK' : 'COPY'}
            </button>
            <div className="box-border flex h-[30px] w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 font-mono text-[11px] text-slate-800">
              <span className="whitespace-nowrap">
                {notificationTimestampParts
                  ? `${notificationTimestampParts.date} | ${notificationTimestampParts.time}`
                  : '\u00A0'}
              </span>
            </div>
          </div>

          {invoiceHandoffMode && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-[5.75rem] shrink-0 inline-flex items-center justify-start gap-1" aria-label="UK to EU">
                  <img src="/uk1.png" alt="" className="inline-block w-5 h-5 object-contain" aria-hidden="true" /> ➔ <img src="/eu1.png" alt="" className="inline-block w-5 h-5 object-contain" aria-hidden="true" />
                </span>
                <div
                  className={`box-border min-w-0 flex-1 rounded-md bg-white px-2.5 py-2 min-h-[36px] border-solid ${
                    showUkToEuInvoice ? 'border-[3px] border-[#0f766e]' : 'border-[3px] border-slate-300'
                  }`}
                >
                  <p className="text-[11px] leading-snug text-slate-800 select-text cursor-text">
                    {showUkToEuInvoice ? handoffUkToEuText : '\u00A0'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-[5.75rem] shrink-0 inline-flex items-center justify-start gap-1" aria-label="EU to UK">
                  <img src="/eu1.png" alt="" className="inline-block w-5 h-5 object-contain" aria-hidden="true" /> ➔ <img src="/uk1.png" alt="" className="inline-block w-5 h-5 object-contain" aria-hidden="true" />
                </span>
                <div
                  className={`box-border min-w-0 flex-1 rounded-md bg-white px-2.5 py-2 min-h-[36px] border-solid ${
                    showEuToUkInvoice ? 'border-[3px] border-[#0f766e]' : 'border-[3px] border-slate-300'
                  }`}
                >
                  <p className="text-[11px] leading-snug text-slate-800 select-text cursor-text">
                    {showEuToUkInvoice ? handoffEuToUkText : '\u00A0'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Bottom Action Footer — submit via form= so Enter and click share one handler */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex items-center justify-center shrink-0">
          <button
            type="submit"
            form="colna-record-form"
            disabled={(readOnly && !isPreviewMode) || isSaving || handoffRequiresInvoice}
            className="bg-[#1a65ff] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold text-xs px-10 py-2 rounded-lg shadow-md flex items-center justify-center cursor-pointer transition-colors uppercase tracking-wider"
          >
            <LoadingButtonContent loading={isSaving} kind={saveLoadingKind}>
              {saveButtonLabel}
            </LoadingButtonContent>
          </button>
        </div>

      </div>

      <ConfirmDeleteModal
        isOpen={isInvoiceDeleteModalOpen}
        title="VYMAZAŤ FAKTÚRU"
        message={
          <>
            Naozaj chcete vymazať{' '}
            <strong className="font-bold text-red-900">nahratú faktúru</strong>
            ? Túto akciu nie je možné vrátiť späť.
          </>
        }
        isLoading={isDeletingInvoice}
        onCancel={() => {
          if (!isDeletingInvoice) setIsInvoiceDeleteModalOpen(false);
        }}
        onConfirm={() => { void confirmDeleteInvoice(); }}
      />

      <ConfirmDeleteModal
        isOpen={isRequiredFieldsModalOpen}
        title="CHÝBAJÚ POVINNÉ POLIA"
        subtitle="Kontrola pred uložením"
        okOnly
        confirmLabel="OK"
        message={
          <div className="space-y-2">
            <p>Vyplňte povinné polia:</p>
            <ul className="list-none space-y-1">
              {missingFields.map((field) => (
                <li key={field}>• {field}</li>
              ))}
            </ul>
          </div>
        }
        onCancel={() => setIsRequiredFieldsModalOpen(false)}
        onConfirm={() => setIsRequiredFieldsModalOpen(false)}
      />
    </div>
  );
};
