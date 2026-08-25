'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { BOOKMAKER_SUGGESTIONS } from '@/lib/bookmakers';
import { ODDS_FORMAT_OPTIONS, normalizeOddsFormat, type OddsFormat } from '@/lib/odds';
import { ChevronDown, Plus, Settings, Check, Trash2 } from 'lucide-react';

/** Progressive name size so short names stay bold/large and long ones still fit in 2 lines. */
function bankrollNameSizeClass(name: string): string {
    const len = name.trim().length;
    if (len <= 12) return 'bankroll-name--short';
    if (len <= 22) return 'bankroll-name--medium';
    if (len <= 36) return 'bankroll-name--long';
    return 'bankroll-name--xlong';
}

export function BankrollSelector() {
    const [bankrolls, setBankrolls] = useState<any[]>([]);
    const [activeId, setActiveId] = useState('personal');
    const [isOpen, setIsOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Form state
    const [editingBr, setEditingBr] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState('currency');
    const [unitSize, setUnitSize] = useState('10');
    const [currency, setCurrency] = useState('GBP');
    // Fallbacks applied when a parsed/imported bet is missing the stake or bookmaker.
    const [defaultStake, setDefaultStake] = useState('');
    const [defaultBookmaker, setDefaultBookmaker] = useState('');
    // Event kickoffs on this bankroll's bets are shown in this timezone (US users see their
    // local game date, not the London one).
    const [timezone, setTimezone] = useState('');
    const [timezoneOptions, setTimezoneOptions] = useState<string[]>(['Europe/London']);
    // Site-wide odds display for this bankroll (math still stored as decimal).
    const [oddsFormat, setOddsFormat] = useState<OddsFormat>('decimal');

    useEffect(() => {
        try {
            const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Europe/London'];
            setTimezoneOptions(zones);
        } catch { /* keep fallback */ }
    }, []);

    const browserTz = () => {
        try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London'; } catch { return 'Europe/London'; }
    };

    useEffect(() => {
        const uid = localStorage.getItem('telegram_user_id');
        setUserId(uid);
        if (uid) {
            loadBankrolls(uid);
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const loadBankrolls = async (uid: string) => {
        try {
            const data = await api.bankrolls.get(Number(uid));
            if (data.bankrolls) {
                setBankrolls(data.bankrolls);
                const saved = localStorage.getItem('active_bankroll_id');
                if (saved && data.bankrolls.find((b: any) => b.id === saved)) {
                    setActiveId(saved);
                    const br = data.bankrolls.find((b: any) => b.id === saved);
                    if (br) localStorage.setItem('active_bankroll_odds_format', normalizeOddsFormat(br.odds_format));
                } else if (data.bankrolls.length > 0) {
                    // The saved bankroll no longer exists (deleted / stale). Prefer Personal so
                    // reassigned-to-Personal bets stay visible, and tell the other views to
                    // resync - otherwise their filters keep pointing at the vanished bankroll
                    // and its bets look lost.
                    const fallbackBr = data.bankrolls.find((b: any) => b.id === 'personal') || data.bankrolls[0];
                    const fallback = fallbackBr.id;
                    setActiveId(fallback);
                    localStorage.setItem('active_bankroll_id', fallback);
                    localStorage.setItem('active_bankroll_odds_format', normalizeOddsFormat(fallbackBr.odds_format));
                    if (saved && saved !== fallback) {
                        window.dispatchEvent(new Event('bankroll_changed'));
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (id: string) => {
        setActiveId(id);
        localStorage.setItem('active_bankroll_id', id);
        const br = bankrolls.find((b) => b.id === id);
        localStorage.setItem('active_bankroll_odds_format', normalizeOddsFormat(br?.odds_format));
        setIsOpen(false);
        // Dispatch custom event so other components (analytics, bets) can reload
        window.dispatchEvent(new Event('bankroll_changed'));
    };

    // Both defaults are REQUIRED - they're the fallback for every parsed/imported bet,
    // so a bankroll (new or pre-existing) can't be saved without them.
    const defaultsValid = Number(defaultStake) > 0 && defaultBookmaker.trim().length > 0;

    const handleSave = async () => {
        if (!userId || busy) return;
        if (!defaultsValid) return;
        setBusy(true);
        try {
            const payload = {
                name,
                type,
                unit_size: Number(unitSize),
                currency,
                default_stake: Number(defaultStake),
                default_bookmaker: defaultBookmaker.trim(),
                timezone: timezone || browserTz(),
                odds_format: oddsFormat || 'decimal',
            };
            let res;
            const isCreate = !editingBr?.id;
            if (editingBr?.id) {
                res = await api.bankrolls.update(Number(userId), editingBr.id, payload);
            } else {
                res = await api.bankrolls.create(Number(userId), payload);
            }
            if (res.error) {
                alert(res.error);
                return;
            }
            await loadBankrolls(userId);
            // Make the just-created bankroll the active one so the next bet the user adds
            // lands in it, instead of silently staying on the previously-selected bankroll.
            const newId = res.bankroll?.id;
            if (isCreate && newId) handleSelect(newId);
            else {
                // Persist format for the bankroll we just edited if it's the active one.
                const targetId = editingBr?.id || activeId;
                if (targetId === activeId) {
                    localStorage.setItem('active_bankroll_odds_format', oddsFormat || 'decimal');
                    window.dispatchEvent(new Event('bankroll_changed'));
                }
            }
            setEditingBr(null);
            setIsManageOpen(false);
        } catch (e) {
            console.error(e);
            alert("Error saving bankroll");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!userId || busy) return;
        if (id === 'personal') {
            alert("Cannot delete the default bankroll.");
            return;
        }
        if (!confirm("Are you sure? All bets in this bankroll will be moved to Personal.")) return;
        setBusy(true);
        try {
            await api.bankrolls.delete(Number(userId), id);
            if (activeId === id) {
                setActiveId('personal');
                localStorage.setItem('active_bankroll_id', 'personal');
                window.dispatchEvent(new Event('bankroll_changed'));
            }
            await loadBankrolls(userId);
            // Close the modal after a delete - otherwise it stays open showing the
            // now-deleted bankroll, inviting a second (failing) delete click.
            setEditingBr(null);
            setIsManageOpen(false);
        } catch (e) {
            console.error(e);
            alert("Error deleting bankroll");
        } finally {
            setBusy(false);
        }
    };

    const openCreate = () => {
        setEditingBr({});
        setName('New Bankroll');
        setType('currency');
        setUnitSize('10');
        setCurrency('GBP');
        setDefaultStake('');
        setDefaultBookmaker('');
        setTimezone(browserTz());
        setOddsFormat('decimal');
        setIsManageOpen(true);
        setIsOpen(false);
    };

    const openEdit = (br: any) => {
        setEditingBr(br);
        setName(br.name || '');
        setType(br.type || 'currency');
        setUnitSize(String(br.unit_size || 1));
        setCurrency(br.currency || 'GBP');
        setDefaultStake(br.default_stake != null && br.default_stake !== '' ? String(br.default_stake) : '');
        setDefaultBookmaker(br.default_bookmaker || '');
        setTimezone(br.timezone || browserTz());
        setOddsFormat(normalizeOddsFormat(br.odds_format));
        setIsManageOpen(true);
        setIsOpen(false);
    };

    if (loading) return <div className="track-skeleton h-[60px] animate-pulse bg-gray-100 rounded-xl mb-4 w-full"></div>;
    if (!userId) return null;

    const activeBankroll = bankrolls.find(b => b.id === activeId) || bankrolls[0];
    const activeName = activeBankroll?.name || 'Personal';
    const nameSizeClass = bankrollNameSizeClass(activeName);

    return (
        <>
            <div className="relative mb-6 w-full" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="bankroll-selector w-full bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all group"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    <span className="bankroll-selector__label">BANKROLL</span>
                    <span
                        className={`bankroll-selector__name bankroll-name ${nameSizeClass} group-hover:text-[#10b981]`}
                        title={activeName}
                    >
                        {activeName}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`bankroll-selector__chevron text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                </button>

                {isOpen && (
                    <div className="track-dropdown-motion absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                            {bankrolls.map(br => (
                                <div key={br.id} className="flex items-center justify-between group/item p-1 rounded-lg hover:bg-gray-50">
                                    <button 
                                        onClick={() => handleSelect(br.id)}
                                        className="flex-1 flex items-center gap-2 px-3 py-2 text-left"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${activeId === br.id ? 'bg-[#10b981]' : 'bg-transparent'}`}></div>
                                        <span className={`text-[13px] font-semibold ${activeId === br.id ? 'text-[#121212]' : 'text-gray-600'}`}>{br.name}</span>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); openEdit(br); }}
                                        className="p-2 text-gray-400 hover:text-[#121212] opacity-0 group-hover/item:opacity-100 transition-opacity"
                                    >
                                        <Settings size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-50 bg-gray-50/50">
                            <button 
                                onClick={openCreate}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-bold text-gray-500 hover:text-[#121212] hover:bg-white rounded-lg transition-all"
                            >
                                <Plus size={14} />
                                Create New Bankroll
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Manage Bankroll Modal */}
            {isManageOpen && (
                <div className="track-modal-overlay fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="track-modal-motion bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-[#121212]">{editingBr?.id ? 'Edit Bankroll' : 'Create Bankroll'}</h3>
                            <button onClick={() => setIsManageOpen(false)} className="text-gray-400 hover:text-[#121212]">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Name</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full bg-gray-50 border border-gray-200 text-[#121212] text-[14px] font-medium rounded-lg px-4 py-3 outline-none focus:border-[#10b981] transition-colors"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tracking Mode</label>
                                    <div className="relative">
                                        <select 
                                            value={type} 
                                            onChange={e => setType(e.target.value)} 
                                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-[#121212] text-[14px] font-medium rounded-lg px-4 py-3 outline-none focus:border-[#10b981] transition-colors"
                                        >
                                            <option value="currency">Currency</option>
                                            <option value="units">Units</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Currency</label>
                                    <div className="relative">
                                        <select 
                                            value={currency} 
                                            onChange={e => setCurrency(e.target.value)} 
                                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-[#121212] text-[14px] font-medium rounded-lg px-4 py-3 outline-none focus:border-[#10b981] transition-colors"
                                        >
                                            <option value="GBP">GBP (£)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="AUD">AUD ($)</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {type === 'units' && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">1 Unit = ?</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                                            {currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'AUD' ? '$' : ''}
                                        </span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={unitSize} 
                                            onChange={e => setUnitSize(e.target.value)} 
                                            className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 text-[#121212] text-[14px] font-medium rounded-lg outline-none focus:border-[#10b981] transition-colors"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 font-medium mt-1">This allows us to accurately track your PnL when betting in units.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Default Stake {type === 'units' ? '(units)' : `(${currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'})`}
                                    </label>
                                    <div className="relative">
                                        {type !== 'units' && (
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                                                {currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}
                                            </span>
                                        )}
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={defaultStake}
                                            onChange={e => setDefaultStake(e.target.value)}
                                            placeholder={type === 'units' ? 'e.g. 0.5' : 'e.g. 10'}
                                            className={`w-full ${type !== 'units' ? 'pl-8' : 'pl-4'} pr-8 py-3 bg-gray-50 border border-gray-200 text-[#121212] text-[14px] font-medium rounded-lg outline-none focus:border-[#10b981] transition-colors`}
                                        />
                                        {type === 'units' && (
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">u</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Default Bookmaker</label>
                                    <input
                                        type="text"
                                        list="bankroll-default-bookmakers"
                                        value={defaultBookmaker}
                                        onChange={e => setDefaultBookmaker(e.target.value)}
                                        placeholder="e.g. Bet365"
                                        className="w-full bg-gray-50 border border-gray-200 text-[#121212] text-[14px] font-medium rounded-lg px-4 py-3 outline-none focus:border-[#10b981] transition-colors"
                                    />
                                    <datalist id="bankroll-default-bookmakers">
                                        {BOOKMAKER_SUGGESTIONS.map((b) => <option key={b} value={b} />)}
                                    </datalist>
                                </div>
                            </div>
                            <p className={`text-[11px] font-medium -mt-1 ${defaultsValid ? 'text-gray-400' : 'text-amber-600'}`}>
                                Required - used when an imported or parsed bet (paste, image, Telegram) is missing its stake or bookmaker.
                            </p>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Timezone</label>
                                <select
                                    value={timezone || browserTz()}
                                    onChange={e => setTimezone(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-[#121212] text-[14px] font-medium rounded-lg px-4 py-3 outline-none focus:border-[#10b981] transition-colors"
                                >
                                    {(timezoneOptions.includes(timezone || browserTz()) ? timezoneOptions : [timezone || browserTz(), ...timezoneOptions]).map((zone) => (
                                        <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                                <p className="text-[11px] font-medium text-gray-400 mt-1.5">
                                    Match kickoff dates and times on this bankroll are shown in this timezone.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Odds Display</label>
                                <div className="relative">
                                    <select
                                        value={oddsFormat}
                                        onChange={e => setOddsFormat(normalizeOddsFormat(e.target.value))}
                                        className="w-full appearance-none bg-gray-50 border border-gray-200 text-[#121212] text-[14px] font-medium rounded-lg px-4 py-3 outline-none focus:border-[#10b981] transition-colors"
                                    >
                                        {ODDS_FORMAT_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label} - {opt.hint}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <p className="text-[11px] font-medium text-gray-400 mt-1.5">
                                    How odds appear on Bets, Dashboard, Pending, and New Bet for this bankroll. You can still type any format when entering odds.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                {editingBr?.id && editingBr.id !== 'personal' && (
                                    <button
                                        onClick={() => handleDelete(editingBr.id)}
                                        disabled={busy}
                                        className="px-4 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                                        title="Delete Bankroll"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <div className="flex-1 flex gap-3 justify-end">
                                    <button onClick={() => setIsManageOpen(false)} disabled={busy} className="px-5 py-3 text-[13px] font-bold text-gray-500 hover:text-[#121212] transition-colors disabled:opacity-50">Cancel</button>
                                    <button
                                        onClick={handleSave}
                                        disabled={busy || !defaultsValid}
                                        title={!defaultsValid ? 'Set a default stake and bookmaker first' : undefined}
                                        className="flex items-center gap-2 px-6 py-3 bg-[#121212] hover:bg-black text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:pointer-events-none"
                                    >
                                        <Check size={16} />
                                        {busy ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
