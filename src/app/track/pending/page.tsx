'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, AlertTriangle, Check, X, Copy, Search } from 'lucide-react';
import { formatAnyOdds, formatOddsDisplay, getActiveOddsFormat } from '@/lib/odds';

type PendingBet = {
    bet_id?: string;
    alert_id?: string;
    bet_type?: string;
    multiple_type?: string;
    searchEvent?: string;
    date?: string;
    time?: string;
    country?: string;
    league?: string;
    selection?: string;
    market?: string;
    betDirection?: string;
    player_name?: string;
    threshold?: string;
    odds?: string;
    display_odds?: string;
    displayOdds?: string;
    entry_price_cents?: number | null;
    entryPriceCents?: number | null;
    exitPriceCents?: number | null;
    exit_price_cents?: number | null;
    status?: string;
    cashedOutOdds?: string;
    closingLineOdds?: string;
    prediction_market?: string;
    predictionMarket?: string;
    prediction_position?: string;
    predictionPosition?: string;
    stake?: string;
    bookmaker?: string;
    sync_label?: string;
    syncLabel?: string;
    tags?: string[];
    multi_bet_selections?: any[];
    multi_bet_description?: string;
    reasons?: string[];
};

type PendingItem = {
    message_key: string;
    text: string;
    ocr_text: string;
    confidence: number;
    pending_bets: PendingBet[];
    review_reasons: string[];
    created_at: string | null;
    processed_at: string | null;
    source: string;
};

type EventSuggestion = {
    searchEvent: string;
    date: string;
    time: string;
    country: string;
    league: string;
    id: string;
};

const REASON_LABELS: Record<string, { label: string; tone: 'warn' | 'info' }> = {
    possible_duplicate: { label: 'Possible duplicate', tone: 'warn' },
    missing_stake: { label: 'Missing stake', tone: 'warn' },
    unparseable_market: { label: 'Market not recognised', tone: 'warn' },
    low_confidence: { label: 'Low confidence', tone: 'info' },
    no_event_match: { label: 'No event match', tone: 'warn' },
    incomplete_parse: { label: 'Incomplete parse', tone: 'warn' },
};

function ReasonChip({ reason }: { reason: string }) {
    const meta = REASON_LABELS[reason] || { label: reason, tone: 'info' as const };
    const cls = meta.tone === 'warn'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-gray-50 text-gray-600 border-gray-200';
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
            <AlertTriangle size={11} strokeWidth={2.2} />
            {meta.label}
        </span>
    );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
            <input
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="text-[13px] font-medium text-[#121212] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#10b981] focus:bg-white transition-all"
            />
        </label>
    );
}

export default function PendingPage() {
    const [items, setItems] = useState<PendingItem[]>([]);
    const [edits, setEdits] = useState<Record<string, PendingBet[]>>({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkProgress, setBulkProgress] = useState('');
    const [eventSuggestions, setEventSuggestions] = useState<Record<string, EventSuggestion[]>>({});
    const [activeBankrollId, setActiveBankrollId] = useState('personal');

    const load = useCallback(async () => {
        const userId = localStorage.getItem('telegram_user_id');
        const bankrollId = localStorage.getItem('active_bankroll_id') || 'personal';
        setActiveBankrollId(bankrollId);
        if (!userId) {
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/pending?userId=${encodeURIComponent(userId)}&bankrollId=${encodeURIComponent(bankrollId)}`);
            const data = await res.json();
            const list: PendingItem[] = Array.isArray(data.items) ? data.items : [];
            setItems(list);
            const initial: Record<string, PendingBet[]> = {};
            for (const it of list) {
                // Filter out completely blank/empty cards. Coerce fields to strings first:
                // the backend sometimes stores numeric defaults (odds=0.0) and .trim() on a
                // number would silently fail, causing valid parsed bets to vanish and the
                // Approve button to grey out.
                const validBets = it.pending_bets.filter(b =>
                    String(b.selection || '').trim() ||
                    String(b.market || '').trim() ||
                    String(b.player_name || '').trim() ||
                    String(b.searchEvent || '').trim() ||
                    String(b.odds || '').trim() ||
                    String(b.stake || '').trim() ||
                    (b.multi_bet_selections && b.multi_bet_selections.length > 0)
                );
                const oddsFormat = getActiveOddsFormat();
                initial[it.message_key] = validBets.map((b) => ({
                    ...b,
                    odds: formatOddsDisplay(b, oddsFormat) || b.odds || '',
                    displayOdds: formatOddsDisplay(b, oddsFormat) || b.display_odds || b.displayOdds || b.odds || '',
                    closingLineOdds: formatAnyOdds(b.closingLineOdds, oddsFormat) || b.closingLineOdds || '',
                    cashedOutOdds: formatAnyOdds(b.cashedOutOdds, oddsFormat) || b.cashedOutOdds || '',
                }));
            }
            setEdits(initial);
        } catch {
            // leave list as-is
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const handleBankrollChange = () => {
            setLoading(true);
            void load();
        };
        window.addEventListener('bankroll_changed', handleBankrollChange);
        return () => window.removeEventListener('bankroll_changed', handleBankrollChange);
    }, [load]);

    const updateBet = (msgKey: string, idx: number, patch: Partial<PendingBet>) => {
        setEdits((prev) => {
            const bets = (prev[msgKey] || []).map((b, i) => (i === idx ? { ...b, ...patch } : b));
            return { ...prev, [msgKey]: bets };
        });
    };

    const searchEvents = async (key: string, q: string) => {
        if (q.trim().length < 2) {
            setEventSuggestions((p) => ({ ...p, [key]: [] }));
            return;
        }
        try {
            const res = await fetch('/api/events/search?q=' + encodeURIComponent(q));
            const data = await res.json();
            setEventSuggestions((p) => ({ ...p, [key]: (data.suggestions || []).slice(0, 6) }));
        } catch {
            setEventSuggestions((p) => ({ ...p, [key]: [] }));
        }
    };

    const resolveQueue = async (msgKey: string, action: 'resolve' | 'dismiss') => {
        const userId = localStorage.getItem('telegram_user_id');
        await fetch('/api/pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, message_key: msgKey, action }),
        });
    };

    // Core approval used by both the per-item button and Approve-all. Returns null on
    // success or an error string - NEVER alert()s, so the bulk loop can collect failures.
    const approveCore = async (item: PendingItem): Promise<string | null> => {
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) return 'You must be logged in to approve a bet.';
        const bankrollId = activeBankrollId;
        const bets = edits[item.message_key] || [];
        if (bets.length === 0) return 'No bets on this item.';
        try {
            for (const bet of bets) {
                const isMulti = Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 0;
                const syncLabel = bet.sync_label || bet.syncLabel || '';
                const tags = Array.isArray(bet.tags) ? [...bet.tags] : [];
                if (syncLabel && !tags.includes(syncLabel)) {
                    tags.push(syncLabel);
                }

                const market = bet.market || '';
                const isGoalscorer = /player goals|goalscorer/i.test(market);
                const payload: any = {
                    userId,
                    sourceMessageKey: item.message_key,
                    alertId: bet.alert_id || `telegram_import|${item.message_key}`,
                    betStructure: 'single',
                    betType: isMulti ? (bet.multiple_type || 'multiple') : 'single',
                    is_multiple: isMulti,
                    multiple_type: isMulti ? (bet.multiple_type || '') : '',
                    date: bet.date || '',
                    time: bet.time || '',
                    country: bet.country || '',
                    league: bet.league || '',
                    searchEvent: bet.searchEvent || '',
                    bookmaker: bet.bookmaker || '',
                    syncLabel: syncLabel,
                    tags: tags,
                    odds: bet.odds || '',
                    displayOdds: bet.display_odds || bet.displayOdds || bet.odds || '',
                    entryPriceCents: bet.entry_price_cents || bet.entryPriceCents || null,
                    exitPriceCents: bet.exit_price_cents || bet.exitPriceCents || null,
                    stake: bet.stake || '',
                    status: bet.status || 'pending',
                    cashedOutOdds: bet.cashedOutOdds || '',
                    predictionMarket: bet.prediction_market || bet.predictionMarket || '',
                    predictionPosition: bet.prediction_position || bet.predictionPosition || '',
                    bankrollId,
                    selection: bet.selection || '',
                    market,
                    betDirection: bet.betDirection || '',
                    closingLineOdds: bet.closingLineOdds || '',
                    ...(bet.player_name ? { player_name: bet.player_name, playerName: bet.player_name } : {}),
                    ...(isGoalscorer ? { eventSport: 'Football' } : {}),
                };
                if (isMulti) payload.multi_bet_selections = bet.multi_bet_selections;

                const res = await fetch('/api/save-bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (data.error) return 'Error saving bet: ' + data.error;
            }
            await resolveQueue(item.message_key, 'resolve');
            setItems((prev) => prev.filter((it) => it.message_key !== item.message_key));
            return null;
        } catch (e: any) {
            return 'Failed to approve: ' + (e?.message || 'unknown error');
        }
    };

    const approve = async (item: PendingItem) => {
        setBusy(item.message_key);
        try {
            const err = await approveCore(item);
            if (err) alert(err);
        } finally {
            setBusy(null);
        }
    };

    const isDuplicateItem = (item: PendingItem) =>
        (item.review_reasons || []).some((r) => /duplicate/i.test(String(r)));
    const nonDuplicates = items.filter((it) => !isDuplicateItem(it) && (edits[it.message_key] || []).length > 0);

    // Approve every item EXCEPT duplicate-flagged ones, sequentially (save-bet is a
    // python-subprocess endpoint - parallel calls would race the same user doc).
    const approveAllNonDuplicates = async () => {
        if (!nonDuplicates.length || bulkBusy) return;
        if (!confirm(`Approve & track ${nonDuplicates.length} bet${nonDuplicates.length === 1 ? '' : 's'}? Duplicate-flagged items are left for manual review.`)) return;
        setBulkBusy(true);
        const failures: string[] = [];
        try {
            for (let i = 0; i < nonDuplicates.length; i++) {
                const item = nonDuplicates[i];
                setBulkProgress(`${i + 1}/${nonDuplicates.length}`);
                setBusy(item.message_key);
                const err = await approveCore(item);
                if (err) failures.push(`${(edits[item.message_key]?.[0]?.searchEvent || item.message_key).slice(0, 40)} - ${err}`);
            }
        } finally {
            setBusy(null);
            setBulkBusy(false);
            setBulkProgress('');
        }
        if (failures.length) {
            alert(`Approved with ${failures.length} failure${failures.length === 1 ? '' : 's'} (kept in the queue):\n\n` + failures.join('\n'));
        }
    };

    const dismiss = async (item: PendingItem) => {
        if (!confirm('Dismiss this pending bet? It will not be added to your bets.')) return;
        setBusy(item.message_key);
        try {
            await resolveQueue(item.message_key, 'dismiss');
            setItems((prev) => prev.filter((it) => it.message_key !== item.message_key));
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <div className="track-skeleton h-8 w-64 rounded-lg bg-gray-200" />
                    <div className="track-skeleton h-4 w-full max-w-md rounded bg-gray-100 mt-3" />
                </div>
                <div className="flex flex-col gap-5">
                    {[0, 1].map((i) => (
                        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div className="track-skeleton h-5 w-32 rounded-full bg-gray-200" />
                                <div className="track-skeleton h-4 w-20 rounded bg-gray-100" />
                            </div>
                            <div className="p-5 flex flex-col gap-3">
                                <div className="track-skeleton h-10 w-full rounded-lg bg-gray-100" />
                                <div className="grid grid-cols-2 gap-3">
                                    {[0, 1, 2, 3].map((j) => (
                                        <div key={j} className="track-skeleton h-10 w-full rounded-lg bg-gray-100" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight text-[#121212] flex items-center gap-2">
                        <Clock size={26} className="text-[#10b981]" /> Pending Review
                    </h1>
                    <p className="text-[13px] text-gray-500 font-medium mt-1">
                        Telegram bets that need a quick check before they&apos;re tracked - confirm the stake, event, and market, then approve.
                    </p>
                </div>
                {items.length > 0 && (
                    <button
                        onClick={approveAllNonDuplicates}
                        disabled={bulkBusy || nonDuplicates.length === 0}
                        title={nonDuplicates.length === 0 ? 'Every waiting item is duplicate-flagged - review those manually.' : undefined}
                        className="flex shrink-0 items-center gap-2 rounded-xl bg-[#10b981] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:brightness-105 transition-all disabled:opacity-40 disabled:hover:brightness-100"
                    >
                        <Check size={15} />
                        {bulkBusy ? `Approving ${bulkProgress}…` : `Approve all non-duplicates (${nonDuplicates.length})`}
                    </button>
                )}
            </div>

            {items.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl py-16 text-center">
                    <Check size={28} className="text-[#10b981] mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#121212]">All caught up</p>
                    <p className="text-[13px] text-gray-400 font-medium mt-1">No Telegram bets are waiting for review.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {items.map((item) => {
                        const bets = edits[item.message_key] || [];
                        return (
                            <div key={item.message_key} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {item.review_reasons.map((r) => <ReasonChip key={r} reason={r} />)}
                                    </div>
                                    <span className="text-[11px] font-semibold text-gray-400">
                                        Confidence {item.confidence}%
                                    </span>
                                </div>

                                {(item.text || item.ocr_text) && (
                                    <div className="px-5 pt-3">
                                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                                            <Copy size={11} /> Original message
                                        </div>
                                        <pre className="text-[12px] text-gray-600 font-medium bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                                            {item.text || item.ocr_text}
                                        </pre>
                                    </div>
                                )}

                                <div className="p-5 flex flex-col gap-5">
                                    {bets.map((bet, idx) => {
                                        const sugKey = `${item.message_key}|${idx}`;
                                        const sugs = eventSuggestions[sugKey] || [];
                                        return (
                                            <div key={idx} className="relative border border-gray-100 rounded-lg p-4 flex flex-col gap-3">
                                                <div className="absolute top-3 right-3 flex items-center">
                                                    <button
                                                        onClick={() => {
                                                            setEdits((prev) => {
                                                                const newBets = (prev[item.message_key] || []).filter((_, i) => i !== idx);
                                                                if (newBets.length === 0) {
                                                                    // Auto-dismiss if all bets are removed
                                                                    dismiss(item);
                                                                }
                                                                return { ...prev, [item.message_key]: newBets };
                                                            });
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                                                        title="Reject this specific bet"
                                                    >
                                                        <X size={15} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                                {bet.reasons && bet.reasons.length > 0 && (
                                                    <div className="flex items-center gap-2 flex-wrap pr-8">
                                                        {bet.reasons.map((r) => <ReasonChip key={r} reason={r} />)}
                                                    </div>
                                                )}

                                                <div className="relative">
                                                    <Field
                                                        label="Event"
                                                        value={bet.searchEvent || ''}
                                                        placeholder="Home vs Away"
                                                        onChange={(v) => { updateBet(item.message_key, idx, { searchEvent: v }); searchEvents(sugKey, v); }}
                                                    />
                                                    {sugs.length > 0 && (
                                                        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                                            {sugs.map((s) => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => {
                                                                        updateBet(item.message_key, idx, {
                                                                            searchEvent: s.searchEvent,
                                                                            date: s.date || bet.date,
                                                                            time: s.time || bet.time,
                                                                            country: s.country || bet.country,
                                                                            league: s.league || bet.league,
                                                                        });
                                                                        setEventSuggestions((p) => ({ ...p, [sugKey]: [] }));
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <Search size={12} className="text-gray-400" />
                                                                    <span className="text-[13px] font-medium text-[#121212]">{s.searchEvent}</span>
                                                                    <span className="text-[11px] text-gray-400 ml-auto">{s.date} {s.league}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <Field label="Selection" value={bet.selection || ''} onChange={(v) => updateBet(item.message_key, idx, { selection: v })} />
                                                    <Field label="Market" value={bet.market || ''} onChange={(v) => updateBet(item.message_key, idx, { market: v })} />
                                                    <Field label="Odds" value={bet.odds || ''} placeholder="1.90 / +150 / 5/2" onChange={(v) => updateBet(item.message_key, idx, { odds: v })} />
                                                    <Field label="Stake" value={bet.stake || ''} placeholder="required" onChange={(v) => updateBet(item.message_key, idx, { stake: v })} />
                                                    <Field label="Date" value={bet.date || ''} onChange={(v) => updateBet(item.message_key, idx, { date: v })} />
                                                    <Field label="Bookmaker" value={bet.bookmaker || ''} onChange={(v) => updateBet(item.message_key, idx, { bookmaker: v })} />
                                                    <Field label="CLV" value={bet.closingLineOdds || ''} onChange={(v) => updateBet(item.message_key, idx, { closingLineOdds: v })} />
                                                    <Field label="Tags" value={(bet.tags || []).join(', ')} onChange={(v) => updateBet(item.message_key, idx, { tags: v.split(',').map(s => s.trim()).filter(Boolean) })} />
                                                </div>

                                                {Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 0 && (
                                                    <div className="text-[12px] text-gray-500 font-medium bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                                        {bet.multi_bet_selections.length}-leg multi: {bet.multi_bet_description || bet.multi_bet_selections.map((l: any) => l.selection).join(' / ')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    <button
                                        onClick={() => {
                                            setEdits((prev) => {
                                                const newBets = [...(prev[item.message_key] || [])];
                                                newBets.push({
                                                    bet_type: 'single',
                                                    selection: '',
                                                    market: '',
                                                    odds: '',
                                                    stake: '',
                                                    date: '',
                                                    bookmaker: ''
                                                });
                                                return { ...prev, [item.message_key]: newBets };
                                            });
                                        }}
                                        className="text-[12px] font-medium text-[#10b981] hover:text-[#059669] flex items-center gap-1.5 py-2 px-1 self-start transition-colors"
                                    >
                                        <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center">
                                            <span className="text-[14px] leading-none">+</span>
                                        </div>
                                        Add bet manually
                                    </button>
                                </div>

                                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => dismiss(item)}
                                        disabled={busy === item.message_key}
                                        className="text-[13px] font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                                    >
                                        <X size={15} /> Dismiss
                                    </button>
                                    <button
                                        onClick={() => approve(item)}
                                        disabled={busy === item.message_key || bets.length === 0}
                                        className="text-[13px] font-semibold text-white bg-[#121212] hover:bg-black flex items-center gap-1.5 px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                    >
                                        <Check size={15} className="text-[#10b981]" /> {busy === item.message_key ? 'Saving…' : 'Approve & Track'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
