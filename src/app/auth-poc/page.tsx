'use client';

import { useCallback, useEffect, useState } from 'react';
import { TelegramLoginButton, TelegramAuthResult } from '@/components/TelegramLoginButton';

// P1 auth-provider PoC page (throwaway - scored in PROPPR/docs/AUTH_PROVIDER_POC.md).
// No Supabase SDK: OAuth is plain redirects. We send the user to Supabase's
// /authorize, Google runs, Supabase redirects back here with #access_token=...,
// and we exchange that token at our API for first-party Proppr session cookies.

type Result = { status: string; user_id: string; created: boolean; provider: string; email: string | null };

export default function AuthPocPage() {
    const [phase, setPhase] = useState<'idle' | 'exchanging' | 'done' | 'error'>('idle');
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [tgLink, setTgLink] = useState<string>('');
    const [entitlements, setEntitlements] = useState<{ capabilities: string[]; telegram_id: number | null; source: string } | null>(null);

    const loadEntitlements = useCallback(async () => {
        const res = await fetch('/api/auth/me/entitlements', { cache: 'no-store' });
        if (res.ok) setEntitlements(await res.json());
    }, []);

    const [mergeOffer, setMergeOffer] = useState<Record<string, unknown> | null>(null);

    const onTelegramResult = useCallback((r: TelegramAuthResult) => {
        setMergeOffer(null);
        if (r.status === 'error') setTgLink(`Failed: ${r.message}`);
        else if (r.status === 'conflict') {
            setTgLink(r.message);
            if (r.canAutoMerge) setMergeOffer(r.payload);
        }
        else if (r.status === 'linked') setTgLink(`✓ Telegram ${r.telegram_id} linked to account ${r.user_id}`);
        else if (r.status === 'merged') setTgLink(`✓ Accounts merged - Telegram ${r.telegram_id} now on ${r.user_id}`);
        else setTgLink(`✓ Signed in via Telegram as ${r.user_id}${r.created ? ' (new account)' : ' (existing)'}`);
        if (r.status === 'ok' || r.status === 'linked' || r.status === 'merged') loadEntitlements();
    }, [loadEntitlements]);

    const confirmMerge = useCallback(async () => {
        if (!mergeOffer) return;
        const res = await fetch('/api/auth/telegram/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mergeOffer),
        });
        const data = await res.json();
        if (res.ok) onTelegramResult({ status: 'merged', user_id: data.user_id, telegram_id: data.telegram_id });
        else setTgLink(`Merge failed: ${typeof data.detail === 'object' ? data.detail?.message : data.detail}`);
        setMergeOffer(null);
    }, [mergeOffer, onTelegramResult]);

    useEffect(() => {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const token = hash.get('access_token');
        if (!token) return;
        window.history.replaceState(null, '', window.location.pathname);
        setPhase('exchanging');
        fetch('/api/auth/supabase/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: token }),
        })
            .then(async (r) => {
                if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => { setResult(data); setPhase('done'); loadEntitlements(); })
            .catch((e) => { setError(String(e.message || e)); setPhase('error'); });
    }, []);

    const startGoogle = async () => {
        const cfg = await (await fetch('/api/auth/supabase/config')).json();
        const redirect = `${window.location.origin}/auth-poc`;
        window.location.href = `${cfg.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
    };

    const sendMagicLink = async () => {
        const cfg = await (await fetch('/api/auth/supabase/config')).json();
        // redirect_to goes as a QUERY PARAM on the bare REST endpoint (the
        // options.emailRedirectTo shape is supabase-js only and gets ignored,
        // which strands the sign-in token on the Site URL homepage).
        const redirect = encodeURIComponent(`${window.location.origin}/auth-poc`);
        const res = await fetch(`${cfg.url}/auth/v1/otp?redirect_to=${redirect}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: cfg.anon_key },
            body: JSON.stringify({ email, create_user: true }),
        });
        if (res.ok) { setOtpSent(true); setError(''); }
        else {
            const detail = await res.json().catch(() => ({}));
            setError(`Magic link failed: ${detail.msg || detail.error_description || res.status} - if this mentions domain verification, Resend is still verifying proppr.io`);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-white">
            <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
                <div>
                    <h1 className="text-xl font-bold">Auth PoC</h1>
                    <p className="text-sm text-zinc-400">Supabase → Proppr session exchange test</p>
                </div>

                {phase === 'idle' && (
                    <>
                        <button onClick={startGoogle} className="w-full rounded-lg bg-white py-3 font-semibold text-black hover:bg-zinc-200">
                            Continue with Google
                        </button>
                        <div className="space-y-2">
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm"
                            />
                            <button onClick={sendMagicLink} className="w-full rounded-lg border border-zinc-700 py-2 text-sm hover:bg-zinc-800">
                                Send magic link
                            </button>
                            {otpSent && <p className="text-sm text-emerald-400">Sent - check your inbox.</p>}
                            {error && <p className="text-sm text-red-400">{error}</p>}
                        </div>
                    </>
                )}

                {phase === 'exchanging' && <p className="text-zinc-300">Exchanging token for a Proppr session…</p>}

                {phase === 'done' && result && (
                    <div className="space-y-2 text-sm">
                        <p className="text-lg font-medium text-emerald-400">✓ Signed in</p>
                        <p>Canonical user: <span className="font-mono">{result.user_id}</span></p>
                        <p>Provider: {result.provider} · {result.email || 'no email'}</p>
                        <p>{result.created ? 'New Proppr account created.' : 'Existing account matched (no duplicate created).'}</p>
                        <p className="text-zinc-400">Session cookies are set - <span className="font-mono">/api/auth/me</span> now identifies you.</p>
                        <div className="space-y-2 border-t border-zinc-800 pt-4">
                            <p className="text-zinc-300">Link your Telegram to this account (merge test):</p>
                            <TelegramLoginButton onResult={onTelegramResult} />
                            {tgLink && <p className="text-emerald-400">{tgLink}</p>}
                            {mergeOffer && (
                                <button
                                    onClick={confirmMerge}
                                    className="w-full rounded-lg bg-amber-400 py-2 font-semibold text-black hover:bg-amber-300"
                                >
                                    That other account only holds this Telegram - merge it into this one
                                </button>
                            )}
                        </div>
                        {entitlements && (
                            <div className="space-y-1 border-t border-zinc-800 pt-4">
                                <p className="text-zinc-300">
                                    Capabilities {entitlements.telegram_id
                                        ? `(inherited via Telegram ${entitlements.telegram_id})`
                                        : '(free tier - no Telegram linked)'}:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {entitlements.capabilities.map((c) => (
                                        <span key={c} className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-300">{c}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {phase === 'error' && <p className="text-sm text-red-400">Failed: {error}</p>}
            </div>
        </div>
    );
}
