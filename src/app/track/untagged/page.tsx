'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { betHasTags, collectTagsFromBets, currentTagFragment, parseTagsInput, selectedTagsFromInput } from '@/lib/tags';
import { betInBankrollView, abbreviateWomenInBet } from '@/lib/utils';
import { formatOddsDisplay, getActiveOddsFormat } from '@/lib/odds';
import { Check, Tag, Calendar } from 'lucide-react';

function normalizeStatus(value: any) {
    return String(value || 'pending').toLowerCase().replace(/\s+/g, '_');
}

function formatBetDate(bet: any) {
    const d = bet.date || bet.event_date || bet.eventDate || bet.tracked_at || bet.created_at;
    if (!d) return '-';
    try {
        const t = typeof d === 'object' && d.$date ? d.$date : d;
        return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
        return '-';
    }
}

export default function UntaggedPage() {
    const [bets, setBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const existingTags = useMemo(() => collectTagsFromBets(allBets), [allBets]);

    const loadData = async () => {
        const userId = localStorage.getItem('telegram_user_id');
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const betsData = await api.bets.getUserBets(Number(userId));
            const allUserBets = betsData.bets || [];
            setAllBets(allUserBets); // tag suggestions come from every bankroll

            // Scope the displayed list to the ACTIVE bankroll, exactly like the Bets page -
            // otherwise this page shows bets from every bankroll (orphan bets -> Personal).
            let activeId = 'personal';
            let knownIds: Set<string> | null = null;
            try {
                activeId = localStorage.getItem('active_bankroll_id') || 'personal';
                const bkData = await api.bankrolls.get(Number(userId));
                knownIds = new Set((bkData.bankrolls || []).map((b: any) => String(b.id)));
            } catch { /* fall back to unscoped ids */ }
            const userBets = allUserBets.filter((bet: any) => betInBankrollView(bet, activeId, knownIds));

            const untagged = userBets.filter((bet: any) => !betHasTags(bet));
            untagged.sort((a: any, b: any) => {
                const dA = a.tracked_at || a.created_at || a.date || 0;
                const dB = b.tracked_at || b.created_at || b.date || 0;
                const timeA = typeof dA === 'object' && dA.$date ? new Date(dA.$date).getTime() : new Date(dA).getTime();
                const timeB = typeof dB === 'object' && dB.$date ? new Date(dB.$date).getTime() : new Date(dB).getTime();
                return timeB - timeA;
            });

            setBets(untagged);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const onBankrollChange = () => loadData();
        window.addEventListener('bankroll_changed', onBankrollChange);
        return () => window.removeEventListener('bankroll_changed', onBankrollChange);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!dropdownRef.current?.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const suggestionsForBet = (betId: string) => {
        const value = tagInputs[betId] || '';
        const selected = new Set(selectedTagsFromInput(value));
        const fragment = currentTagFragment(value).toLowerCase();
        return existingTags
            .filter((tag) => !selected.has(tag))
            .filter((tag) => !fragment || tag.toLowerCase().includes(fragment))
            .slice(0, 8);
    };

    const applySuggestion = (betId: string, suggestion: string) => {
        const selected = selectedTagsFromInput(tagInputs[betId] || '');
        if (!selected.includes(suggestion)) selected.push(suggestion);
        setTagInputs((prev) => ({ ...prev, [betId]: `${selected.join(', ')}, ` }));
        setOpenDropdownId(betId);
    };

    const handleSave = async (bet: any) => {
        const userId = localStorage.getItem('telegram_user_id');
        const betId = bet.bet_id || bet._id || bet.id;
        const tags = parseTagsInput(tagInputs[betId] || '');

        if (!userId || !betId || tags.length === 0) return;

        setSavingId(betId);

        try {
            const res = await fetch('/api/save-bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    betId,
                    isUpdate: true,
                    tags,
                }),
            });
            if (!res.ok) throw new Error('Failed to save tags');

            setBets((prev) => prev.filter((b) => (b.bet_id || b._id || b.id) !== betId));
            setAllBets((prev) => prev.map((b) => {
                if ((b.bet_id || b._id || b.id) !== betId) return b;
                return { ...b, tags };
            }));
            setTagInputs((prev) => {
                const next = { ...prev };
                delete next[betId];
                return next;
            });
            setOpenDropdownId(null);
        } catch (e) {
            console.error(e);
            alert('Failed to save tags.');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin h-8 w-8 border-4 border-[#10b981] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <Tag className="text-[#10b981]" />
                    Untagged
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Add tags to bets that are missing them so you can filter and analyse your results.
                </p>
            </div>

            {bets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-[#10b981]" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
                    <p className="text-gray-500 mt-2">Every bet has at least one tag.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {bets.map(abbreviateWomenInBet).map((bet) => {
                        const betId = bet.bet_id || bet._id || bet.id;
                        const match = bet.match || bet.fixture_name || bet.searchEvent || 'Unknown Event';
                        const selection = bet.selection || bet.player_name || bet.team || 'Unknown Selection';
                        const market = bet.market || 'Unknown Market';
                        const odds = formatOddsDisplay(bet, getActiveOddsFormat()) || bet.display_odds || bet.displayOdds || bet.odds;
                        const status = normalizeStatus(bet.status);
                        const suggestions = suggestionsForBet(betId);
                        const inputValue = tagInputs[betId] || '';

                        return (
                            <div
                                key={betId}
                                // When this card's tag dropdown is open, lift the WHOLE card into
                                // its own stacking context above later cards - otherwise the
                                // absolute dropdown is trapped in this card's subtree and the next
                                // card (later in the DOM) paints over it, clipping the suggestions.
                                className={`bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 ${openDropdownId === betId ? 'relative z-30' : ''}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                                            {status.replace('_', ' ')}
                                        </span>
                                        <span className="flex items-center text-xs font-semibold text-gray-400 gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatBetDate(bet)}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-base md:text-lg leading-tight truncate">
                                        {selection}
                                    </h3>
                                    <p className="text-sm font-medium text-gray-500 mt-0.5 truncate flex items-center gap-1.5">
                                        <span>{market}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span className="text-gray-400">{match}</span>
                                    </p>
                                    {odds ? (
                                        <p className="text-xs font-semibold text-gray-400 mt-1 tabular-nums">@ {odds}</p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0 shrink-0 md:min-w-[280px]">
                                    <div className="text-[11px] font-semibold text-[#10b981] uppercase tracking-wide">Tags</div>
                                    <div className="relative" ref={openDropdownId === betId ? dropdownRef : null}>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="e.g. Underdogs, Free Bet"
                                                value={inputValue}
                                                onChange={(e) => {
                                                    setTagInputs((prev) => ({ ...prev, [betId]: e.target.value }));
                                                    setOpenDropdownId(betId);
                                                }}
                                                onFocus={() => setOpenDropdownId(betId)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSave(bet);
                                                }}
                                                autoComplete="off"
                                                className="flex-1 text-sm font-medium text-gray-900 bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all"
                                            />
                                            <button
                                                onClick={() => handleSave(bet)}
                                                disabled={savingId === betId || parseTagsInput(inputValue).length === 0}
                                                className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:hover:bg-[#10b981] text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors shrink-0"
                                            >
                                                {savingId === betId ? '...' : 'Save'}
                                            </button>
                                        </div>
                                        {openDropdownId === betId && suggestions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {suggestions.map((tag) => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-[12px] text-[#121212] hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => applySuggestion(betId, tag)}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}