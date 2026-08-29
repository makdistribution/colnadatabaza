import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';

interface HsCodeCheckerModalProps {
  isOpen: boolean;
  /** Main title without region prefix, e.g. "ONLINE TARIFF" or "ONLINE TARIC". */
  title: string;
  flagSrc: string;
  onClose: () => void;
}

interface TariffResult {
  code: string;
  description: string;
}

interface DutyRow {
  key: string;
  measureType: string;
  geoArea: string;
  dutyRate: string;
}

interface TariffDetail {
  code: string;
  description: string;
  basicDutyRate: string | null;
  dutyRows: DutyRow[];
}

const UK_TARIFF_SEARCH_URL = 'https://www.trade-tariff.service.gov.uk/api/v2/search';
const UK_TARIFF_API_BASE = 'https://www.trade-tariff.service.gov.uk/api/v2';
const UK_TARIFF_COMMODITY_URL = 'https://www.trade-tariff.service.gov.uk/commodities';

/** Generic JSON:API resource as returned in the top-level "included" array. */
interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
}

interface JsonApiRelationshipRef {
  data?: { id: string; type: string } | null;
}

interface CommodityDetailResponse {
  data?: {
    attributes?: {
      description?: string;
      basic_duty_rate?: string | null;
    };
    relationships?: {
      import_measures?: { data?: { id: string; type: string }[] };
      ancestors?: { data?: { id: string; type: string }[] };
    };
  };
  included?: JsonApiResource[];
}

/** JSON:API "hit" shape returned inside goods_nomenclature_match / reference_match arrays. */
interface TariffSearchHit {
  _source?: {
    description?: string;
    goods_nomenclature_item_id?: string;
    id?: string | number;
    title?: string;
    reference?: {
      description?: string;
      goods_nomenclature_item_id?: string;
      id?: string | number;
    };
  };
}

interface TariffSearchMatchGroup {
  chapters?: TariffSearchHit[];
  headings?: TariffSearchHit[];
  commodities?: TariffSearchHit[];
}

interface TariffSearchResponse {
  data?: {
    attributes?: {
      type?: 'exact_match' | 'fuzzy_match';
      entry?: { endpoint?: string; id?: string };
      goods_nomenclature_match?: TariffSearchMatchGroup;
      reference_match?: TariffSearchMatchGroup;
    };
  };
}

/** Extracts a { code, description } pair regardless of hit shape (direct or nested under "reference"). */
function hitToResult(hit: TariffSearchHit): TariffResult | null {
  const source = hit._source;
  if (!source) return null;
  const ref = source.reference ?? source;
  const code = ref.goods_nomenclature_item_id ?? (ref.id != null ? String(ref.id) : '');
  const description = ref.description ?? source.title ?? '';
  if (!code || !description) return null;
  return { code, description };
}

function flattenMatchGroup(group?: TariffSearchMatchGroup): TariffResult[] {
  if (!group) return [];
  const hits = [...(group.commodities ?? []), ...(group.headings ?? []), ...(group.chapters ?? [])];
  return hits
    .map(hitToResult)
    .filter((result): result is TariffResult => result !== null);
}

/** Vytvorí kompletný názov pospájaním všetkých nadradených kategórií */
function buildFullDescription(json: CommodityDetailResponse): string {
  const attributes = json.data?.attributes;
  let description = attributes?.description ?? '';

  const included = json.included ?? [];
  const ancestorsRefs = json.data?.relationships?.ancestors?.data ?? [];

  if (ancestorsRefs.length > 0) {
    const ancestorParts = ancestorsRefs.map((ref) => {
      const inc = included.find((i) => i.id === ref.id && i.type === ref.type);
      return (inc?.attributes?.description as string) ?? '';
    }).filter((d) => d.trim().length > 0);

    if (ancestorParts.length > 0) {
      // Pospája kategórie do cesty a odstráni zbytočné medzery a odriadkovania
      description = [...ancestorParts, description]
        .map(s => s.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ').trim())
        .join(' > ');
    }
  }
  return description.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ').trim();
}

/** Looks up the description for an exact-match entry (e.g. a single commodity/heading code). */
async function fetchExactMatchDescription(endpoint: string, id: string): Promise<string> {
  const response = await fetch(`${UK_TARIFF_API_BASE}/${endpoint}/${id}.json`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!response.ok) throw new Error('lookup failed');
  const json = (await response.json()) as CommodityDetailResponse;
  return buildFullDescription(json);
}

/** Fetches full commodity detail (description + import duty rates) directly from UK Tariff API. */
async function fetchCommodityDetail(code: string): Promise<TariffDetail> {
  const response = await fetch(`${UK_TARIFF_API_BASE}/commodities/${code}.json`, {
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) throw new Error('detail lookup failed');
  const json = (await response.json()) as CommodityDetailResponse;

  const attributes = json.data?.attributes;
  const included = json.included ?? [];
  
  // Získanie plného názvu tovaru namiesto obyčajného "Other"
  const fullDescription = buildFullDescription(json);

  const findIncluded = (ref?: JsonApiRelationshipRef) => {
    if (!ref?.data) return undefined;
    return included.find((item) => item.type === ref.data!.type && item.id === ref.data!.id);
  };

  const measureRefs = json.data?.relationships?.import_measures?.data ?? [];
  const dutyRows: DutyRow[] = [];
  const seen = new Set<string>();

  for (const measureRef of measureRefs) {
    const measure = included.find((item) => item.type === 'measure' && item.id === measureRef.id);
    if (!measure?.attributes?.import) continue;

    const relationships = (measure as unknown as {
      relationships?: {
        measure_type?: JsonApiRelationshipRef;
        geographical_area?: JsonApiRelationshipRef;
        duty_expression?: JsonApiRelationshipRef;
      };
    }).relationships;

    const measureType = findIncluded(relationships?.measure_type);
    const geoArea = findIncluded(relationships?.geographical_area);
    const dutyExpression = findIncluded(relationships?.duty_expression);

    const measureTypeLabel = (measureType?.attributes?.description as string | undefined) ?? '';
    const geoAreaLabel = (geoArea?.attributes?.description as string | undefined) ?? '';
    const dutyRate = (dutyExpression?.attributes?.base as string | undefined) ?? '';
    if (!measureTypeLabel && !dutyRate) continue;

    const key = `${measureTypeLabel}|${geoAreaLabel}|${dutyRate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dutyRows.push({ key, measureType: measureTypeLabel, geoArea: geoAreaLabel, dutyRate });
  }

  dutyRows.sort((a, b) => a.geoArea.localeCompare(b.geoArea) || a.measureType.localeCompare(b.measureType));

  return {
    code,
    description: fullDescription,
    basicDutyRate: attributes?.basic_duty_rate ?? null,
    dutyRows,
  };
}

async function searchUkTariff(query: string): Promise<TariffResult[]> {
  const response = await fetch(`${UK_TARIFF_SEARCH_URL}?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('search failed');
  const json = (await response.json()) as TariffSearchResponse;
  const attributes = json.data?.attributes;

  if (attributes?.type === 'exact_match' && attributes.entry?.id) {
    const { endpoint = 'commodities', id } = attributes.entry;
    const description = await fetchExactMatchDescription(endpoint, id).catch(() => '');
    return [{ code: id, description: description || 'Presná zhoda' }];
  }

  if (attributes?.type === 'fuzzy_match') {
    const results = [
      ...flattenMatchGroup(attributes.goods_nomenclature_match),
      ...flattenMatchGroup(attributes.reference_match),
    ];
    const seen = new Set<string>();
    const unique = results.filter((result) => {
      if (seen.has(result.code)) return false;
      seen.add(result.code);
      return true;
    });
    return unique.slice(0, 20);
  }

  return [];
}

/** HS code checker modal. UK ("ONLINE TARIFF") has a live UK Trade Tariff search; other regions remain a placeholder. */
export const HsCodeCheckerModal: React.FC<HsCodeCheckerModalProps> = ({
  isOpen,
  title,
  flagSrc,
  onClose,
}) => {
  const isUkTariff = flagSrc === '/uk1.png';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TariffResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<TariffDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const detailSeq = useRef(0);

  if (!isOpen) return null;

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setErrorMessage(null);
    setResults(null);
    setDetail(null);
    setDetailError(null);
    try {
      const found = await searchUkTariff(trimmed);
      if (seq !== requestSeq.current) return;
      if (found.length === 0) {
        setErrorMessage('Nenašli sa žiadne výsledky pre zadaný výraz.');
      } else {
        setResults(found);
      }
    } catch {
      if (seq !== requestSeq.current) return;
      setErrorMessage('Vyhľadávanie zlyhalo. Skúste to prosím neskôr.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSearch();
    }
  };

  const handleOpenDetail = async (result: TariffResult) => {
    const seq = ++detailSeq.current;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const found = await fetchCommodityDetail(result.code);
      if (seq !== detailSeq.current) return;
      setDetail({ ...found, description: found.description || result.description });
    } catch {
      if (seq !== detailSeq.current) return;
      setDetailError('Detail tovaru sa nepodarilo načítať. Skúste to prosím neskôr.');
    } finally {
      if (seq === detailSeq.current) setDetailLoading(false);
    }
  };

  const handleBackToResults = () => {
    detailSeq.current += 1;
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
  };

  const handleClose = () => {
    requestSeq.current += 1;
    detailSeq.current += 1;
    setQuery('');
    setResults(null);
    setLoading(false);
    setErrorMessage(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
    onClose();
  };

  const showDetailView = detailLoading || detailError || detail;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <img src={flagSrc} alt="" className="w-6 h-6 object-contain shrink-0" />
            <h3 className="font-bold text-base leading-none whitespace-nowrap">
              {title}{' '}
              <span className="font-normal text-[11px] text-slate-400">(HS code checker)</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {isUkTariff ? (
            <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 space-y-3">
              <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
                HS kód alebo názov tovaru
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="napr. laptop alebo 8471300000"
                  disabled={loading}
                  className="flex-1 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSearch();
                  }}
                  disabled={loading}
                  className="bg-[#1a65ff] hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                >
                  {loading ? 'Vyhľadávam…' : 'Vyhľadať'}
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-md px-3 py-2.5 min-h-[320px] max-h-[65vh] overflow-y-auto text-xs text-slate-900 text-left leading-snug">
                {loading && <p className="font-semibold text-slate-600">Vyhľadávam…</p>}
                {!loading && errorMessage && <p className="text-amber-700 font-semibold">{errorMessage}</p>}

                {!loading && !errorMessage && showDetailView && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleBackToResults}
                      className="text-[#1a65ff] hover:underline font-semibold"
                    >
                      ← Späť na výsledky
                    </button>
                    {detailLoading && <p className="font-semibold text-slate-600">Načítavam detail…</p>}
                    {!detailLoading && detailError && (
                      <p className="text-amber-700 font-semibold">{detailError}</p>
                    )}
                    {!detailLoading && !detailError && detail && (
                      <div className="border border-slate-200 rounded-md p-3 bg-slate-50/60 space-y-3">
                        <p className="font-semibold text-slate-900 text-sm">{detail.description}</p>
                        <p className="text-slate-600">
                          Commodity code: <span className="font-mono font-semibold">{detail.code}</span>
                        </p>
                        {detail.basicDutyRate && (
                          <p className="text-slate-600">
                            Základná colná sadzba:{' '}
                            <span className="font-semibold text-slate-900">{detail.basicDutyRate}</span>
                          </p>
                        )}

                        {detail.dutyRows.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px] border-collapse">
                              <thead>
                                <tr className="text-left text-slate-500 uppercase border-b border-slate-200">
                                  <th className="py-1.5 pr-2 font-semibold">Typ opatrenia</th>
                                  <th className="py-1.5 pr-2 font-semibold">Oblasť</th>
                                  <th className="py-1.5 pr-2 font-semibold">Sadzba</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.dutyRows.map((row) => (
                                  <tr key={row.key} className="border-b border-slate-100">
                                    <td className="py-1.5 pr-2 text-slate-700">{row.measureType}</td>
                                    <td className="py-1.5 pr-2 text-slate-700">{row.geoArea}</td>
                                    <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">
                                      {row.dutyRate || '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <a
                          href={`${UK_TARIFF_COMMODITY_URL}/${detail.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1a65ff] hover:underline font-semibold inline-block"
                        >
                          Otvoriť na trade-tariff.service.gov.uk →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {!loading && !errorMessage && !showDetailView && results && (
                  <ul className="space-y-2">
                    {results.map((result) => (
                      <li key={result.code} className="border border-slate-200 rounded-md p-2.5 bg-slate-50/60">
                        <p className="font-semibold text-slate-900">{result.description}</p>
                        <p className="text-slate-600 mt-0.5">
                          Commodity code: <span className="font-mono font-semibold">{result.code}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              void handleOpenDetail(result);
                            }}
                            className="text-[#1a65ff] hover:underline font-semibold cursor-pointer"
                          >
                            Zobraziť detail →
                          </button>
                          <a
                            href={`${UK_TARIFF_COMMODITY_URL}/${result.code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:underline"
                          >
                            Otvoriť na trade-tariff.service.gov.uk
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {!loading && !errorMessage && !showDetailView && !results && (
                  <p className="text-slate-500">
                    Zadajte HS kód alebo názov tovaru a vyhľadajte ho v britskom colnom sadzobníku.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 min-h-[160px]" />
          )}
        </div>
      </div>
    </div>
  );
};