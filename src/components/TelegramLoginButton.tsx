'use client';

import { useEffect, useRef } from 'react';

// Official Telegram Login Widget (core.telegram.org/bots/telegram-login).
// Renders Telegram's iframe button; on confirm, Telegram calls our global
// callback with an HMAC-signed payload which we exchange server-side for
// first-party Proppr session cookies. Requires the bot's domain to be linked
// via BotFather /setdomain (@PropprPlayerBot -> proppr.io).

declare global {
    interface Window {
        onTelegramAuth?: (user: Record<string, unknown>) => void;
    }
}

export type TelegramAuthResult =
    | { status: 'ok' | 'linked' | 'merged'; user_id: string; telegram_id: number; created?: boolean }
    | { status: 'conflict'; message: string; canAutoMerge: boolean; payload: Record<string, unknown> }
    | { status: 'error'; message: string };

export function TelegramLoginButton({
    botName = 'PropprPlayerBot',
    size = 'large',
    onResult,
}: {
    botName?: string;
    size?: 'large' | 'medium' | 'small';
    onResult: (r: TelegramAuthResult) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        window.onTelegramAuth = async (user) => {
            try {
                const res = await fetch('/api/auth/telegram/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user),
                });
                const data = await res.json();
                if (!res.ok) {
                    const detail = data.detail;
                    if (res.status === 409 && detail && typeof detail === 'object') {
                        // Identity owned by another account - offer the verified merge
                        // (the payload is the fresh HMAC proof /merge re-verifies).
                        onResult({ status: 'conflict', message: detail.message, canAutoMerge: !!detail.can_auto_merge, payload: user });
                        return;
                    }
                    const message = typeof detail === 'object' ? detail?.message : detail;
                    onResult({ status: 'error', message: message || `HTTP ${res.status}` });
                    return;
                }
                onResult(data);
            } catch (e) {
                onResult({ status: 'error', message: String(e) });
            }
        };
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', size);
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write'); // allows the bot to DM (alerts later)
        container.appendChild(script);
        return () => {
            container.innerHTML = '';
            delete window.onTelegramAuth;
        };
    }, [botName, size, onResult]);

    return <div ref={containerRef} className="flex justify-center" />;
}
