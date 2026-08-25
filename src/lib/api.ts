import { useState, useEffect } from 'react';

const API_BASE_URL = '/api';

// Session cookies (pp_session, 15 min) are refreshed transparently: on a 401 we
// try one /auth/refresh (rotating refresh cookie) and retry the request once.
// Legacy (pre-session) users pass through unchanged during the migration window.
let refreshInFlight: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
    if (!refreshInFlight) {
        refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST' })
            .then((r) => r.ok)
            .catch(() => false)
            .finally(() => setTimeout(() => { refreshInFlight = null; }, 0));
    }
    return refreshInFlight;
}
async function authedFetch(input: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(input, init);
    if (res.status !== 401) return res;
    if (!(await tryRefresh())) return res;
    return fetch(input, init);
}

export type AuthInitResponse = {
    session_id: string;
    connect_code: string;
    expires_in_seconds: number;
};

export type AuthStatusResponse = {
    linked: boolean;
};

export const api = {
    auth: {
        init: async (): Promise<AuthInitResponse> => {
            const res = await fetch(`${API_BASE_URL}/auth/init`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to init session');
            return res.json();
        },
        status: async (code: string, sessionId: string): Promise<AuthStatusResponse> => {
            const res = await fetch(
                `${API_BASE_URL}/auth/status/${code}?session_id=${encodeURIComponent(sessionId)}&t=${Date.now()}`,
                { cache: 'no-store' },
            );
            if (!res.ok) throw new Error('Failed to check status');
            return res.json();
        },
        me: async (): Promise<{ telegram_id: number } | null> => {
            const res = await fetch(`${API_BASE_URL}/auth/me`, { cache: 'no-store' });
            return res.ok ? res.json() : null;
        },
        upgrade: async (telegramId: number): Promise<'sent' | 'undeliverable' | 'error'> => {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/upgrade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telegram_id: telegramId }),
                });
                if (!res.ok) return 'error';
                return (await res.json()).status === 'sent' ? 'sent' : 'undeliverable';
            } catch {
                return 'error';
            }
        },
        logout: async (): Promise<void> => {
            await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' }).catch(() => undefined);
        },
    },
    bets: {
        getUserBets: async (userId: number) => {
            const res = await authedFetch(`${API_BASE_URL}/bets/user/${userId}?t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch bets');
            return res.json();
        },
        // Single full bet by id (edit form) - avoids loading the whole list to find one bet.
        getBetById: async (userId: number, betId: string) => {
            const res = await authedFetch(`${API_BASE_URL}/bets/user/${userId}?betId=${encodeURIComponent(betId)}&t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch bet');
            return res.json();
        },
        // All bets, projected to only the fields the analytics/closing/home aggregations read
        // (~3.5x smaller than the full list). Same {bets} shape as getUserBets - drop-in.
        getUserBetsLite: async (userId: number) => {
            const res = await authedFetch(`${API_BASE_URL}/bets/user/${userId}?lite=1&t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch bets');
            return res.json();
        },
        // Distinct tag vocabulary for the tag autocomplete (server-side, not the whole list).
        getUserTags: async (userId: number) => {
            const res = await authedFetch(`${API_BASE_URL}/bets/user/${userId}?tags=1&t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch tags');
            return res.json();
        },
        // Server-side paginated page of the bets table. Returns {bets, total, page, pageSize}.
        getUserBetsPaged: async (userId: number, params: Record<string, any>) => {
            const qs = new URLSearchParams({ ...Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
                    .map(([k, v]) => [k, String(v)])
            ), t: String(Date.now()) });
            const res = await authedFetch(`${API_BASE_URL}/bets/user/${userId}?${qs.toString()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch bets');
            return res.json();
        },
        // Filter-menu options + full matching id list (for select-all). {facets, ids}.
        getUserBetsMeta: async (userId: number, params: Record<string, any>) => {
            const qs = new URLSearchParams({ meta: '1', ...Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
                    .map(([k, v]) => [k, String(v)])
            ), t: String(Date.now()) });
            const res = await authedFetch(`${API_BASE_URL}/bets/user/${userId}?${qs.toString()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch bets meta');
            return res.json();
        },
        // Export bets for a user as CSV (proppr full format or traditional tracker format).
        // If bankrollIds is omitted or empty, all bankrolls are exported.
        exportUserBets: async (
            userId: number,
            format: 'csv' | 'json' = 'csv',
            template: 'proppr' | 'traditional' = 'proppr',
            bankrollIds?: string[]
        ): Promise<Blob> => {
            const qs = new URLSearchParams({ format, template, t: String(Date.now()) });
            if (bankrollIds && bankrollIds.length) qs.set('bankrollIds', bankrollIds.join(','));
            const res = await authedFetch(`${API_BASE_URL}/bets/user/${userId}/export?${qs.toString()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to export bets');
            return res.blob();
        }
    },
    stats: {
        getUserStats: async (userId: number) => {
            const res = await authedFetch(`${API_BASE_URL}/stats/user/${userId}?t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        }
    },
    bankrolls: {
        get: async (userId: number) => {
            const res = await authedFetch(`${API_BASE_URL}/bankrolls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get', userId })
            });
            return res.json();
        },
        create: async (userId: number, data: any) => {
            const res = await authedFetch(`${API_BASE_URL}/bankrolls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', userId, ...data })
            });
            return res.json();
        },
        update: async (userId: number, bankrollId: string, data: any) => {
            const res = await authedFetch(`${API_BASE_URL}/bankrolls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', userId, bankrollId, ...data })
            });
            return res.json();
        },
        delete: async (userId: number, bankrollId: string) => {
            const res = await authedFetch(`${API_BASE_URL}/bankrolls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', userId, bankrollId })
            });
            return res.json();
        }
    }
};
