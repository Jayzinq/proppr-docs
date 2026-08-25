'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { api } from '@/lib/api';

// Migration-window banner (platform plan D5 step 3): users who signed in the old
// localStorage way get a one-tap path to a real session. Proving ownership happens
// in Telegram (one-time DM link) - the banner never treats the stored id as proof.
// Non-blocking: dismissible per browser session, reappears on the next visit until
// a session cookie exists.
export function SessionUpgradeBanner() {
    const [state, setState] = useState<'hidden' | 'offer' | 'sending' | 'sent' | 'undeliverable'>('hidden');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (sessionStorage.getItem('pp_upgrade_dismissed')) return;
            const legacyId = localStorage.getItem('telegram_user_id');
            if (!legacyId) return;
            let me = await api.auth.me();
            if (!me) {
                // A refresh cookie may outlive the 15-min access token.
                await fetch('/api/auth/refresh', { method: 'POST' }).catch(() => undefined);
                me = await api.auth.me();
            }
            if (me?.telegram_id) {
                localStorage.setItem('telegram_user_id', String(me.telegram_id));
                return;
            }
            if (!cancelled) setState('offer');
        })();
        return () => { cancelled = true; };
    }, []);

    if (state === 'hidden') return null;

    const requestLink = async () => {
        const legacyId = Number(localStorage.getItem('telegram_user_id'));
        if (!Number.isFinite(legacyId)) return setState('undeliverable');
        setState('sending');
        const result = await api.auth.upgrade(legacyId);
        setState(result === 'sent' ? 'sent' : 'undeliverable');
    };

    // Solid surface + explicit colors: the tracker has light and dark themes and
    // this banner must be readable in both (the tinted version vanished on light).
    return (
        <div className="mx-3 mt-3 flex items-start gap-3 rounded-xl bg-emerald-700 px-4 py-3 text-sm text-white shadow-md sm:mx-4 md:mx-6">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-200" />
            {state === 'offer' && (
                <>
                    <span className="flex-1">
                        <span className="font-semibold">Sign-in upgrade.</span>{' '}
                        We&apos;re replacing the old code-based login with a more secure one. Tap the button
                        and we&apos;ll send a one-time sign-in link to your Telegram — it takes about ten
                        seconds, your bets and settings are untouched, and you won&apos;t be asked again on
                        this device.
                    </span>
                    <button
                        onClick={requestLink}
                        className="shrink-0 self-center rounded-lg bg-white px-3 py-1.5 font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                    >
                        Send me the link
                    </button>
                </>
            )}
            {state === 'sending' && <span className="flex-1">Sending a sign-in link to your Telegram…</span>}
            {state === 'sent' && (
                <span className="flex-1">
                    Sent — open Telegram, tap the sign-in link from @PropprPlayerBot, then come back to this tab.
                </span>
            )}
            {state === 'undeliverable' && (
                <span className="flex-1">
                    We couldn&apos;t message you on Telegram (have you started @PropprPlayerBot?). You can also
                    re-link on <a href="/connect" className="font-semibold underline">the connect page</a>.
                </span>
            )}
            <button
                aria-label="Dismiss"
                onClick={() => { sessionStorage.setItem('pp_upgrade_dismissed', '1'); setState('hidden'); }}
                className="shrink-0 text-emerald-200 transition-colors hover:text-white"
            >
                <X size={16} />
            </button>
        </div>
    );
}
