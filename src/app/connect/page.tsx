'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, AuthInitResponse } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { TelegramLoginButton, TelegramAuthResult } from '@/components/TelegramLoginButton';

export default function ConnectPage() {
    const [data, setData] = useState<AuthInitResponse | null>(null);
    const [linked, setLinked] = useState(false);
    const [widgetError, setWidgetError] = useState('');
    const router = useRouter();

    // One-click login via the official Telegram widget; the code flow below stays
    // as the in-Telegram fallback.
    const onTelegramResult = useCallback(async (r: TelegramAuthResult) => {
        if (r.status === 'error' || r.status === 'conflict') {
            setWidgetError(r.message);
            return;
        }
        setLinked(true);
        localStorage.setItem('telegram_user_id', String(r.telegram_id));
        setTimeout(() => router.push('/track'), 1200);
    }, [router]);

    useEffect(() => {
        // Init session on mount
        api.auth.init().then(setData).catch(console.error);
    }, []);

    useEffect(() => {
        if (!data || linked) return;

        const interval = setInterval(async () => {
            try {
                // Passing our session_id proves we initiated this code; the linked
                // response sets the httpOnly session cookies (no Telegram ID ever
                // reaches the browser from an unauthenticated endpoint).
                const status = await api.auth.status(data.connect_code, data.session_id);
                if (status.linked) {
                    setLinked(true);
                    clearInterval(interval);
                    // The tracker UI still keys its requests off localStorage during
                    // the migration window - populate it via the cookie-authed /me.
                    const me = await api.auth.me();
                    if (me?.telegram_id) {
                        localStorage.setItem('telegram_user_id', String(me.telegram_id));
                    }
                    // Redirect to dashboard
                    setTimeout(() => router.push('/track'), 1500);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [data, linked, router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
            <div className="relative flex w-full max-w-md flex-col items-center gap-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 shadow-2xl backdrop-blur-xl">

                {/* Logo / Header */}
                <div className="text-center">
                    <img src="/proppr-logo-white.png" alt="Proppr Logo" className="h-10 w-auto mx-auto mb-4" />
                    <p className="mt-2 text-zinc-400">Link your Telegram account</p>
                </div>

                {linked ? (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        </div>
                        <p className="text-lg font-medium text-emerald-400">Successfully Linked!</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-6 w-full">
                        <div className="w-full space-y-2">
                            <TelegramLoginButton onResult={onTelegramResult} />
                            {widgetError && <p className="text-center text-sm text-red-400">{widgetError}</p>}
                        </div>
                        <div className="flex w-full items-center gap-3 text-xs uppercase tracking-widest text-zinc-600">
                            <span className="h-px flex-1 bg-zinc-800" /> or use a code <span className="h-px flex-1 bg-zinc-800" />
                        </div>
                        <div className="flex flex-col items-center gap-2 text-center">
                            <span className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Your Code</span>
                            {data ? (
                                <div className="text-5xl font-mono font-bold tracking-widest text-white tabular-nums">
                                    {data.connect_code}
                                </div>
                            ) : (
                                <div className="h-12 w-32 animate-pulse rounded bg-zinc-800" />
                            )}
                        </div>

                        <div className="w-full space-y-3">
                            <a
                                href={data ? `https://t.me/PropprPlayerBot?text=%2Fconnect%20${data.connect_code}` : "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-2 rounded-lg py-4 font-bold text-black transition-all ${
                                    data ? "bg-emerald-400 hover:bg-emerald-300" : "bg-emerald-900 text-emerald-700 cursor-not-allowed"
                                }`}
                            >
                                Open Telegram Bot
                            </a>
                            <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-300">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-500">OR</span>
                                <span className="font-mono">Send: /connect {data?.connect_code || '...'} to @PropprPlayerBot</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
