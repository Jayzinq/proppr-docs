'use client';

// Public Bankroll manager - create and publish a public performance page for a
// bankroll at /bankroll/<slug>. The scope IS the bankroll: each profile shows one
// bankroll's settled bets, aggregated server-side (no balances, notes or pending).

import { useEffect, useMemo, useState } from 'react';
import {
    Check, Copy, ExternalLink, Eye, EyeOff, Globe, Link as LinkIcon,
    Plus, Trash2, Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { BankrollShareCard } from '@/components/BankrollShareCard';

type Profile = {
    bankroll_id: string;
    slug: string;
    name: string;
    bio: string;
    public: boolean;
    toggles: Record<string, boolean>;
    display_unit?: string;
    links: { telegram?: string; x?: string; website?: string };
    cta: { text?: string; url?: string };
};

const DEFAULT_TOGGLES: Record<string, boolean> = {
    summary: true, equityCurve: true, monthlyResults: true,
    recentBets: true, marketBreakdown: true, showStakes: true, showClv: true,
    settledOnly: true,
};

const TOGGLE_LABELS: [string, string, string][] = [
    ['settledOnly', 'Settled bets only', 'When off, your open/pending bets are shown as live positions'],
    ['equityCurve', 'Profit trajectory', 'Cumulative P/L line over every settled bet'],
    ['summary', 'Outcome donut', 'Win / loss / push split with win rate'],
    ['monthlyResults', 'Daily profit calendar', 'Month grid of daily P/L, like your analytics page'],
    ['marketBreakdown', 'Market edge table', 'Profit + ROI by market'],
    ['recentBets', 'Latest bets', 'The 12 most recent settled bets'],
    ['showStakes', 'Show stake sizes', 'Display each bet’s stake in the table'],
    ['showClv', 'Show CLV', 'Average closing-line value stat card'],
];

function slugify(raw: string) {
    return raw.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function emptyProfile(): Profile {
    return { bankroll_id: 'personal', slug: '', name: '', bio: '', public: false, toggles: { ...DEFAULT_TOGGLES }, display_unit: 'default', links: {}, cta: {} };
}

export default function PublicBankrollPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [bankrolls, setBankrolls] = useState<any[]>([]);
    const [draft, setDraft] = useState<Profile>(emptyProfile());
    const [originalSlug, setOriginalSlug] = useState<string | null>(null); // null = creating new
    const [slugTouched, setSlugTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    const origin = typeof window !== 'undefined' ? window.location.origin.replace('docs.proppr.io', 'proppr.io') : 'https://proppr.io';
    const publicUrl = draft.slug ? `${origin}/bankroll/${draft.slug}` : '';

    useEffect(() => {
        const uid = localStorage.getItem('telegram_user_id');
        setUserId(uid);
        if (!uid) { setLoading(false); return; }
        Promise.all([
            fetch(`/api/public-bankroll?userId=${encodeURIComponent(uid)}`).then((r) => r.json()).catch(() => ({ profiles: [] })),
            api.bankrolls.get(Number(uid)).catch(() => ({ bankrolls: [] })),
        ]).then(([p, b]) => {
            const list = Array.isArray(p.profiles) ? p.profiles : [];
            setProfiles(list);
            const brs = Array.isArray(b.bankrolls) ? b.bankrolls : [];
            setBankrolls(brs.length ? brs : [{ id: 'personal', name: 'Personal', type: 'units', currency: 'u' }]);
            if (list.length) { setDraft({ ...emptyProfile(), ...list[0] }); setOriginalSlug(list[0].slug); setSlugTouched(true); }
        }).finally(() => setLoading(false));
    }, []);

    const bankrollName = useMemo(
        () => bankrolls.find((b) => String(b.id) === String(draft.bankroll_id))?.name || 'Personal',
        [bankrolls, draft.bankroll_id],
    );

    const selectProfile = (p: Profile) => {
        setDraft({ ...emptyProfile(), ...p, toggles: { ...DEFAULT_TOGGLES, ...(p.toggles || {}) } });
        setOriginalSlug(p.slug);
        setSlugTouched(true);
        setFeedback(null);
    };

    const startNew = () => {
        setDraft(emptyProfile());
        setOriginalSlug(null);
        setSlugTouched(false);
        setFeedback(null);
    };

    // Feedback must be impossible to miss - it sits right by the publish bar AND we scroll to it.
    const showFeedback = (kind: 'ok' | 'err', text: string) => {
        setFeedback({ kind, text });
        setTimeout(() => document.getElementById('pb-feedback')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50);
    };

    const save = async (overrides: Partial<Profile> = {}) => {
        if (!userId) { showFeedback('err', 'You are not signed in - connect Telegram first, then come back.'); return; }
        const body = { ...draft, ...overrides };
        if (!body.name.trim()) { showFeedback('err', 'Give the page a name first.'); return; }
        if (!body.slug || body.slug.length < 3) { showFeedback('err', 'Slug must be at least 3 characters.'); return; }
        setSaving(true);
        setFeedback(null);
        try {
            // Renaming the slug creates the new one, then removes the old.
            const res = await fetch('/api/public-bankroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ...body }),
            });
            const data = await res.json();
            if (data.error) { showFeedback('err', data.error); return; }
            if (originalSlug && originalSlug !== body.slug) {
                await fetch('/api/public-bankroll', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, action: 'delete', slug: originalSlug }),
                });
            }
            setDraft(body);
            setOriginalSlug(body.slug);
            const listRes = await fetch(`/api/public-bankroll?userId=${encodeURIComponent(userId)}`).then((r) => r.json());
            setProfiles(Array.isArray(listRes.profiles) ? listRes.profiles : []);
            showFeedback('ok', body.public ? 'Saved - your page is live.' : 'Saved (page hidden until you publish).');
        } catch {
            showFeedback('err', 'Save failed - the server may be redeploying. Wait a few seconds and try again.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!userId || !originalSlug) return;
        if (!confirm('Delete this public page? The URL will stop working immediately.')) return;
        await fetch('/api/public-bankroll', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, action: 'delete', slug: originalSlug }),
        });
        const listRes = await fetch(`/api/public-bankroll?userId=${encodeURIComponent(userId)}`).then((r) => r.json());
        const list = Array.isArray(listRes.profiles) ? listRes.profiles : [];
        setProfiles(list);
        if (list.length) selectProfile(list[0]); else startNew();
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable */ }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-[#10b981] animate-spin" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1100px]">
            <div className="mb-5">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#10b981]">
                    <Globe size={14} /> Public Bankroll
                </div>
                <h1 className="text-[32px] font-bold tracking-tight text-[#121212]">Share your record</h1>
                <p className="mt-1 max-w-2xl text-[14px] font-medium text-gray-500">
                    Publish a verified performance page for a bankroll - settled bets only, aggregated automatically.
                    Balances, notes and pending bets stay private.
                </p>
            </div>

            {!userId && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="text-[13px] font-semibold text-amber-800">
                        You&apos;re not signed in - connect your Telegram account to create and publish a public page.
                    </div>
                    <a href="/connect" className="shrink-0 rounded-lg bg-[#121212] px-4 py-2 text-[12px] font-bold text-white hover:bg-black">
                        Connect Telegram
                    </a>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
                {/* Profile list */}
                <aside className="space-y-3">
                    <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Pages</span>
                            <button onClick={startNew} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[12px] font-bold text-gray-600 hover:border-[#10b981] hover:text-[#047857]">
                                <Plus size={13} /> New
                            </button>
                        </div>
                        <div className="space-y-2">
                            {profiles.length === 0 && (
                                <p className="text-[13px] font-medium text-gray-400">No public pages yet - create your first one.</p>
                            )}
                            {profiles.map((p) => (
                                <button
                                    key={p.slug}
                                    onClick={() => selectProfile(p)}
                                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${originalSlug === p.slug ? 'border-[#10b981] bg-[#10b981]/5' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-[13px] font-bold text-[#121212]">{p.name}</span>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.public ? 'bg-[#10b981]/15 text-[#047857]' : 'bg-gray-100 text-gray-500'}`}>
                                            {p.public ? 'Live' : 'Hidden'}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 truncate text-[11px] font-medium text-gray-400">/bankroll/{p.slug}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {originalSlug && draft.public && (
                        <div className="track-card-motion rounded-xl border border-[#10b981]/30 bg-[#10b981]/5 p-4">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-[#047857]">Your page is live</div>
                            <div className="mt-1 break-all text-[12px] font-semibold text-[#121212]">{publicUrl}</div>
                            <div className="mt-3 flex gap-2">
                                <button onClick={copyLink} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#10b981] px-3 py-2 text-[12px] font-bold text-white hover:brightness-105">
                                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy link'}
                                </button>
                                <a href={`/bankroll/${draft.slug}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-bold text-[#121212] hover:border-[#10b981]">
                                    <ExternalLink size={13} /> Open
                                </a>
                            </div>
                        </div>
                    )}
                </aside>

                {/* Editor */}
                <section className="space-y-4">
                    <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-[15px] font-bold text-[#121212]">{originalSlug ? 'Edit page' : 'Create page'}</h2>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Page name</label>
                                <input
                                    value={draft.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setDraft((d) => ({ ...d, name, slug: slugTouched ? d.slug : slugify(name) }));
                                    }}
                                    placeholder="e.g. In-Play Value Picks"
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-[#10b981]"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Bankroll (scope)</label>
                                <div className="relative">
                                    <Wallet size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={draft.bankroll_id}
                                        onChange={(e) => setDraft((d) => ({ ...d, bankroll_id: e.target.value }))}
                                        className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-8 text-[13px] font-semibold outline-none focus:border-[#10b981]"
                                    >
                                        {bankrolls.map((b) => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Display amounts as</label>
                                <select
                                    value={draft.display_unit || 'default'}
                                    onChange={(e) => setDraft((d) => ({ ...d, display_unit: e.target.value }))}
                                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-[#10b981]"
                                >
                                    <option value="default">Bankroll default</option>
                                    <option value="u">Units (u)</option>
                                    <option value="GBP">£ GBP</option>
                                    <option value="USD">$ USD</option>
                                    <option value="EUR">€ EUR</option>
                                </select>
                                <p className="mt-1 text-[11px] font-medium text-gray-400">Presentation only - the numbers don&apos;t convert.</p>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Public URL</label>
                                <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#10b981]">
                                    <span className="shrink-0 px-3 text-[13px] font-semibold text-gray-400">proppr.io/bankroll/</span>
                                    <input
                                        value={draft.slug}
                                        onChange={(e) => { setSlugTouched(true); setDraft((d) => ({ ...d, slug: slugify(e.target.value) })); }}
                                        placeholder="my-picks"
                                        className="w-full bg-transparent py-2.5 pr-3 text-[13px] font-bold text-[#121212] outline-none"
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Bio</label>
                                <textarea
                                    value={draft.bio}
                                    onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value.slice(0, 300) }))}
                                    placeholder="Short description of your approach…"
                                    rows={2}
                                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-medium outline-none focus:border-[#10b981]"
                                />
                                <div className="mt-1 text-right text-[11px] font-medium text-gray-400">{draft.bio.length}/300</div>
                            </div>
                        </div>
                    </div>

                    <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-[15px] font-bold text-[#121212]">Sections</h2>
                        <p className="text-[12px] font-medium text-gray-500">Choose what the public page shows. Stats cards are always on.</p>
                        <div className="mt-3 space-y-2">
                            {TOGGLE_LABELS.map(([key, label, hint]) => (
                                <div key={key} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                                    <div>
                                        <div className="text-[13px] font-bold text-[#121212]">{label}</div>
                                        <div className="text-[11px] font-medium text-gray-400">{hint}</div>
                                    </div>
                                    <button
                                        role="switch"
                                        aria-checked={draft.toggles[key] !== false}
                                        onClick={() => setDraft((d) => ({ ...d, toggles: { ...d.toggles, [key]: !(d.toggles[key] !== false) } }))}
                                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${draft.toggles[key] !== false ? 'bg-[#10b981]' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${draft.toggles[key] !== false ? 'left-[18px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-[15px] font-bold text-[#121212]">Links &amp; call to action</h2>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {([['telegram', 'Telegram', 'https://t.me/…'], ['x', 'X / Twitter', 'https://x.com/…'], ['website', 'Website', 'https://…']] as const).map(([key, label, ph]) => (
                                <div key={key}>
                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</label>
                                    <input
                                        value={(draft.links as any)[key] || ''}
                                        onChange={(e) => setDraft((d) => ({ ...d, links: { ...d.links, [key]: e.target.value } }))}
                                        placeholder={ph}
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-medium outline-none focus:border-[#10b981]"
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">CTA button text</label>
                                <input
                                    value={draft.cta.text || ''}
                                    onChange={(e) => setDraft((d) => ({ ...d, cta: { ...d.cta, text: e.target.value.slice(0, 40) } }))}
                                    placeholder="Join my Telegram"
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-medium outline-none focus:border-[#10b981]"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">CTA button URL</label>
                                <input
                                    value={draft.cta.url || ''}
                                    onChange={(e) => setDraft((d) => ({ ...d, cta: { ...d.cta, url: e.target.value } }))}
                                    placeholder="https://t.me/…"
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-medium outline-none focus:border-[#10b981]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Publish bar */}
                    <div className="track-card-motion flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${draft.public ? 'bg-[#10b981]/15 text-[#047857]' : 'bg-gray-100 text-gray-400'}`}>
                                {draft.public ? <Eye size={18} /> : <EyeOff size={18} />}
                            </div>
                            <div>
                                <div className="text-[14px] font-bold text-[#121212]">{draft.public ? 'Page is public' : 'Page is hidden'}</div>
                                <div className="text-[12px] font-medium text-gray-500">
                                    {draft.public ? `Anyone with the link can view ${bankrollName}'s record.` : 'Only you can see it until you publish.'}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {originalSlug && (
                                <button onClick={remove} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-bold text-red-600 hover:bg-red-100">
                                    <Trash2 size={14} /> Delete
                                </button>
                            )}
                            <button
                                onClick={() => save({ public: !draft.public })}
                                disabled={saving}
                                className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-bold transition-all disabled:opacity-50 ${draft.public ? 'border border-gray-200 bg-white text-[#121212] hover:border-gray-300' : 'bg-[#10b981] text-white hover:brightness-105'}`}
                            >
                                {saving ? 'Saving…' : draft.public ? <><EyeOff size={14} /> Unpublish</> : <><Globe size={14} /> Publish</>}
                            </button>
                            <button
                                onClick={() => save()}
                                disabled={saving}
                                className="flex items-center gap-1.5 rounded-lg bg-[#121212] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-black disabled:opacity-50"
                            >
                                <LinkIcon size={14} /> {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>

                    {feedback && (
                        <div id="pb-feedback" className={`rounded-lg px-4 py-3 text-[13px] font-semibold ${feedback.kind === 'ok' ? 'bg-[#10b981]/10 text-[#047857]' : 'bg-red-50 text-red-600'}`}>
                            {feedback.text}
                        </div>
                    )}

                    {/* Share card - needs the public payload, so it appears once the page is live. */}
                    {originalSlug && draft.public && <BankrollShareCard slug={originalSlug} />}
                    {originalSlug && !draft.public && (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-3 text-[13px] font-medium text-gray-500">
                            Publish the page to generate your shareable performance card.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
