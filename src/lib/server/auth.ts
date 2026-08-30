import crypto from "crypto";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Proppr session verification for Next.js route handlers (P0 hardening).
//
// Sessions are minted by the FastAPI auth service (proppr-web-app/backend) as an
// HS256 JWT in the httpOnly `pp_session` cookie, signed with the shared secret
// PROPPR_SESSION_JWT_SECRET (from /opt/PROPPR/.env on the server). This module
// verifies that cookie locally — no per-request call to the auth service.
//
// Two enforcement levels:
//   requireSession(req)            — mutations: valid session or 401.
//   requireSessionOrLegacyRead(req, claimedUserId)
//                                  — reads, during the migration window: a valid
//                                    session wins (and the claimed userId must
//                                    match it); otherwise the legacy
//                                    localStorage-telegram-id path is allowed
//                                    while PROPPR_LEGACY_READ_WINDOW=1. Legacy
//                                    responses carry X-Proppr-Auth: legacy so
//                                    adoption can be measured before cutover.
// ---------------------------------------------------------------------------

const ACCESS_COOKIE = "pp_session";

export type SessionClaims = {
    telegramId: number;
    sessionId: string;
    legacy: boolean;
};

function readEnvFile(path: string): Record<string, string> {
    try {
        const text = fs.readFileSync(path, "utf8");
        const env: Record<string, string> = {};
        for (const line of text.split("\n")) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
            if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
        }
        return env;
    } catch {
        return {};
    }
}

let cachedEnv: Record<string, string> | null = null;
function authEnv(): Record<string, string> {
    if (!cachedEnv) {
        cachedEnv = {
            ...readEnvFile("/opt/PROPPR/.env"),
            ...readEnvFile(".env"),
            ...readEnvFile(".env.local"),
            ...process.env,
        } as Record<string, string>;
    }
    return cachedEnv;
}

function b64urlDecode(input: string): Buffer {
    return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function verifySessionToken(token: string): SessionClaims | null {
    const secret = authEnv().PROPPR_SESSION_JWT_SECRET;
    if (!secret || !token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const signingInput = `${parts[0]}.${parts[1]}`;
    const expected = crypto.createHmac("sha256", secret).update(signingInput).digest();
    const actual = b64urlDecode(parts[2]);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    try {
        const payload = JSON.parse(b64urlDecode(parts[1]).toString("utf8"));
        if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
        if (typeof payload.tg !== "number") return null;
        return { telegramId: payload.tg, sessionId: String(payload.sid || ""), legacy: false };
    } catch {
        return null;
    }
}

export function getSession(req: NextRequest): SessionClaims | null {
    return verifySessionToken(req.cookies.get(ACCESS_COOKIE)?.value || "");
}

export function unauthorized(message = "Not authenticated"): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Not allowed"): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 });
}

/** Mutations: valid session required. Returns claims, or a 401 response to return as-is. */
export function requireSession(req: NextRequest): SessionClaims | NextResponse {
    const session = getSession(req);
    if (!session) return unauthorized();
    return session;
}

/**
 * Mutations that act on a specific user's data: valid session AND the target
 * user must be the session user.
 */
export function requireSessionForUser(req: NextRequest, claimedUserId: string | number): SessionClaims | NextResponse {
    const session = getSession(req);
    if (!session) return unauthorized();
    if (String(session.telegramId) !== String(claimedUserId)) return forbidden("User mismatch");
    return session;
}

/** Pure predicate, exported so the missing-variable case is testable. */
export function legacyWindowOpenFor(value: string | undefined): boolean {
    // FAIL CLOSED. This gate decides whether an ANONYMOUS caller may read another
    // user's bets, stats, bankrolls and exports, so an environment that forgets
    // the variable must deny, not allow. It previously read `!== "0"`, which
    // meant a missing value opened the window: verified locally, an anonymous
    // GET /api/bets/user/<id> returned 200 with real bet history.
    //
    // Safe to invert because the migration is already over everywhere it runs -
    // app.proppr.io, proppr.io and docs.proppr.io all answer that request 401
    // today, so no supported client can still depend on the legacy path. Set
    // PROPPR_LEGACY_READ_WINDOW=1 to deliberately reopen it.
    return value === "1";
}

export function legacyWindowOpen(): boolean {
    return legacyWindowOpenFor(authEnv().PROPPR_LEGACY_READ_WINDOW);
}

/**
 * Reads during the migration window. A valid session always wins and pins the
 * userId. Without a session, the legacy client-supplied-id path is allowed only
 * while the window is open; those responses are tagged so adoption is measurable.
 */
export function requireSessionOrLegacyRead(
    req: NextRequest,
    claimedUserId: string | number,
): SessionClaims | NextResponse {
    const session = getSession(req);
    if (session) {
        if (String(session.telegramId) !== String(claimedUserId)) return forbidden("User mismatch");
        return session;
    }
    if (legacyWindowOpen()) {
        const id = Number(claimedUserId);
        if (!Number.isFinite(id)) return unauthorized("Invalid user id");
        // Adoption metric for the cutover decision: grep "[auth] legacy read" in the
        // proppr-docs service log; flip PROPPR_LEGACY_READ_WINDOW=0 when it goes quiet.
        console.log(`[auth] legacy read path=${req.nextUrl?.pathname || "?"}`);
        return { telegramId: id, sessionId: "", legacy: true };
    }
    return unauthorized();
}

/** Tag a response produced under legacy auth so adoption can be measured in logs/nginx. */
export function tagLegacyAuth(res: NextResponse, claims: SessionClaims): NextResponse {
    if (claims.legacy) res.headers.set("X-Proppr-Auth", "legacy");
    return res;
}
