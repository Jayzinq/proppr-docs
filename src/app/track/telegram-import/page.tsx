'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
    AlertCircle,
    ArrowRight,
    Ban,
    Bot,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock3,
    Copy,
    FileArchive,
    FileText,
    Filter,
    LineChart,
    Link2,
    Loader2,
    MessageSquareText,
    Plus,
    Radio,
    RefreshCcw,
    Replace,
    Save,
    Search,
    Send,
    ShieldCheck,
    Wand2,
    Trash2,
    Upload,
    Users,
    X,
} from 'lucide-react';
import { MorphActionMenu, SlidingTabs } from '@/components/transitions/Motion';

type TelegramMessage = {
    id: string;
    sourceMessageKey: string;
    fileName: string;
    date: string;
    sender: string;
    text: string;
    attachments: TelegramAttachment[];
    replyContext: string;
    eventContext?: string;
    detected: boolean;
    confidence: number;
    isGroupChat?: boolean;
    parsedBets?: any[];
    isExtracting?: boolean;
    extractFailed?: boolean;
    accepted?: boolean;
    isAccumulatorOrBuilder?: boolean;
    accumulatorOdds?: string;
    accumulatorStake?: string;
    accumulatorType?: string;
};

type TelegramAttachment = {
    kind: 'photo' | 'file' | 'video';
    path: string;
    previewUrl: string;
    fullUrl: string;
};

type TelegramSyncStatus = {
    status: 'idle' | 'creating' | 'waiting' | 'synced' | 'expired' | 'missing' | 'error';
    linked: boolean;
    code: string;
    expiresAt?: string;
    usedAt?: string | null;
    chatTitle?: string | null;
    chatId?: string | number | null;
    sourceType?: 'channel' | 'group';
    bankrollId?: string | null;
    bankrollName?: string | null;
    label?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
};

type TelegramReportStatus = {
    status: 'idle' | 'creating' | 'waiting' | 'synced' | 'expired' | 'missing' | 'error';
    linked: boolean;
    code: string;
    expiresAt?: string | null;
    usedAt?: string | null;
    chatTitle?: string | null;
    chatId?: string | number | null;
    chatType?: string | null;
    messageThreadId?: number | null;
    reportType?: 'today' | 'open' | 'pnl';
    bankrollId?: string | null;
    bankrollName?: string | null;
    label?: string | null;
    messageId?: number | null;
    sendTime?: string | null;
    timezone?: string | null;
};

type Bankroll = {
    id: string;
    name: string;
    type?: string;
    unit_size?: number;
    currency?: string;
};

const botUsername = '@PropprTrackerBot';

type Replacement = { from: string; to: string };

type SyncRules = {
    whitelist: string[];
    blacklist: string[];
    whitelistOnly: boolean;
    replacements: Replacement[];
};

const EMPTY_RULES: SyncRules = {
    whitelist: [],
    blacklist: [],
    whitelistOnly: false,
    replacements: [],
};

function getUserId() {
    if (typeof window === 'undefined') return 12345;
    const stored = localStorage.getItem('telegram_user_id');
    return stored ? Number(stored) : 12345;
}

const REPORT_TYPE_LABELS: Record<string, string> = { today: "Today's Bets", open: 'Open Bets', pnl: 'Profit / Loss' };
const REPORT_TYPE_SLUGS: Record<string, string> = { today: "today's bets", open: 'open bets', pnl: 'profit / loss' };
const REPORT_TYPE_SCHEDULE: Record<string, string> = { today: 'Daily + live edits', open: 'Live open list', pnl: 'Daily image' };

const DEFAULT_REPORT_SEND_TIME = '09:00';
const DEFAULT_REPORT_TIMEZONE = 'Europe/London';
const COMMON_TIMEZONES = [
    'Europe/London', 'Europe/Dublin', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
    'America/Los_Angeles', 'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo',
    'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Lisbon', 'Europe/Amsterdam',
    'Europe/Stockholm', 'Europe/Helsinki', 'Europe/Athens', 'Europe/Istanbul', 'Africa/Johannesburg', 'Africa/Lagos',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo',
    'Asia/Seoul', 'Australia/Perth', 'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

function rulesStorageKey() {
    return `telegram_sync_rules_${getUserId()}`;
}

function applyReplacements(text: string, replacements: Replacement[]) {
    let out = text;
    for (const rule of replacements) {
        if (!rule.from) continue;
        out = out.split(rule.from).join(rule.to);
    }
    return out;
}

// --- Parsed-bet cache --------------------------------------------------------
// Parsing a slip through /api/parse runs a GPT (vision) call that costs money and
// takes several seconds per message. For a given message + parser version the result
// is stable, so we persist SUCCESSFUL parses in localStorage keyed by message identity.
// On a re-run (refresh, crash, re-open) already-parsed messages are repopulated
// INSTANTLY from cache and only never-parsed messages hit the API again.
// Only successes are cached: empty/failed parses (incl. transient 429/400s) are left
// uncached so they get retried on the next run rather than being permanently skipped.
// Bump PARSE_CACHE_VERSION whenever the parser/prompt changes enough that old results
// should be discarded.
const PARSE_CACHE_VERSION = 'v37';  // v37: flat-digest section sports + odds-less combined-slip (Double/Treble) legs
const PARSE_REQUEST_PAUSE_MS = 450;

function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type CachedParse = {
    parsedBets: any[];
    accepted: boolean;
    isAccumulatorOrBuilder: boolean;
    accumulatorOdds: string;
    accumulatorStake: string;
    accumulatorType: string;
};

function parseCacheStorageKey() {
    return `telegram_parse_cache_${PARSE_CACHE_VERSION}_${getUserId()}`;
}

// Small, stable djb2 hash so the key changes if the message text or its images change.
function hashString(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
}

function parseCacheKey(msg: TelegramMessage, transformedText: string): string {
    const imgSig = msg.attachments
        .filter((a) => a.kind === 'photo')
        .map((a) => a.path)
        .join('|');
    return `${msg.id}:${hashString(transformedText)}:${hashString(imgSig)}`;
}

function buildParseText(message: TelegramMessage, transformedText: string) {
    if (!message.eventContext) return transformedText;
    return `EVENT CONTEXT ONLY:\n${message.eventContext}\n\nBET TO IMPORT:\n${transformedText}`;
}

function normaliseForQuality(value: any) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isLowQualityParsedBet(bet: any) {
    const event = normaliseForQuality(bet?.searchEvent || bet?.match || bet?.fixture_name || bet?.match_name);
    const selection = String(bet?.selection || bet?.player_name || '').trim();
    const selectionNorm = normaliseForQuality(selection);
    const market = normaliseForQuality(bet?.market || bet?.market_display);
    const odds = String(bet?.odds || bet?.display_odds || bet?.displayOdds || '').trim();

    if (!event || event === 'event' || event === 'match' || event === 'fixture') return true;
    if (!selection || selectionNorm === 'selection' || selectionNorm === 'unknown') return true;
    if (event.length > 120 || /⏰|👤|📍|https?:\/\/|bet365\.com|recommended stake|avg rating|model odds|appearances|per game/i.test(String(bet?.searchEvent || bet?.match || ''))) return true;
    if (selection.length > 180) return true;
    if (/\*\*|event\/teams|total odds|to return|bookmaker odds|market:|selection:|⏰|👤|📍|https?:\/\/|bet365\.com|recommended stake|avg rating|model odds|appearances|per game/i.test(selection)) return true;
    if ((!market || market === 'unknown' || market === 'unknown market') && !odds) return true;
    return false;
}

function filterQualityParsedBets(bets: any[]) {
    return (bets || []).filter((bet) => !isLowQualityParsedBet(bet));
}

function loadParseCache(): Record<string, CachedParse> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(parseCacheStorageKey());
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function persistParseCache(cache: Record<string, CachedParse>) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(parseCacheStorageKey(), JSON.stringify(cache));
    } catch {
        // QuotaExceeded: drop the oldest half of the entries and retry once. Caching is a
        // perf optimisation, not correctness, so silently give up if it still fails.
        try {
            const keys = Object.keys(cache);
            for (const k of keys.slice(0, Math.ceil(keys.length / 2))) delete cache[k];
            localStorage.setItem(parseCacheStorageKey(), JSON.stringify(cache));
        } catch {
            /* give up */
        }
    }
}

// Bets posted as a screenshot keep their selection/odds/event INSIDE the image; only a short
// caption (e.g. a stake line) is in the text. The parser is text-only but /api/parse can OCR
// images via Vision - so for any photo attachment we hand the picture over and let the server
// transcribe it. Without this the card comes back empty except for whatever was in the caption.
const MAX_OCR_IMAGES = 4;

function normaliseImageDataUrl(dataUrl: string): string {
    if (!dataUrl) return '';
    if (dataUrl.startsWith('data:image/')) return dataUrl;
    const match = dataUrl.match(/^data:[^;]*;base64,([\s\S]+)$/);
    return match ? `data:image/jpeg;base64,${match[1]}` : dataUrl;
}

async function blobUrlToDataUrl(url: string): Promise<string> {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? normaliseImageDataUrl(reader.result) : '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
        });
    } catch {
        return '';
    }
}

async function collectImageData(message: TelegramMessage): Promise<string[]> {
    const photos = message.attachments.filter((a) => a.kind === 'photo' && (a.fullUrl || a.previewUrl)).slice(0, MAX_OCR_IMAGES);
    const urls = await Promise.all(photos.map((a) => blobUrlToDataUrl(a.fullUrl || a.previewUrl)));
    return urls.filter(Boolean);
}

type SyncDecision = { sync: boolean; reason: string; tone: 'sync' | 'blocked' | 'ignored' };

const HEADS_UP_ANNOUNCEMENT = /\b(?:trade|value|bet|one|play|pick|drop)s?\s+(?:is\s+)?(?:coming|incoming|loading|on the way)\b|\bcoming (?:up|soon|tonight|shortly|in)\b|\bset (?:a )?(?:buy )?limits?\b|\bbuy limit\b|\bif you miss (?:it|this|out)\b|\b(?:barely any|low|not much|thin) liquidity\b|\bgo(?:es|ing)? (?:super )?quick\b|\bheads[ -]?up\b/i;

// Referral / sign-up promo for a bookmaker ("No KYC and no VPN needed to sign up", "use my
// code") rides in alongside a token pick but is an advert, not a slip to track - skip it.
const SIGNUP_PROMO = /\bno kyc\b|\bno vpn\b|\bsign(?:ing)? up\b|\bsign up\b|\breferral\b|\buse (?:my|the) (?:code|link)\b|\bpromo code\b/i;

// Arbitrage picks/services sometimes include "arb" as a team/player placeholder (e.g. "Team Arb"
// or "Arb X"). These are not real fixtures and should not be synced as tracked bets.
const ARB_PICK = /\b(?:arb|arbitrage)\b/i;

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wholeWordMatch(haystack: string, term: string): boolean {
    if (!term) return false;
    return new RegExp(`\\b${escapeRegExp(term.toLowerCase())}\\b`).test(haystack);
}

function decideSync(transformedText: string, detected: boolean, rules: SyncRules, isReply = false): SyncDecision {
    const haystack = transformedText.toLowerCase();
    const hit = rules.blacklist.find((term) => wholeWordMatch(haystack, term));
    if (hit) return { sync: false, reason: `Blacklisted: "${hit}"`, tone: 'blocked' };

    if (rules.whitelistOnly && rules.whitelist.length) {
        const match = rules.whitelist.find((term) => wholeWordMatch(haystack, term));
        if (!match) return { sync: false, reason: 'No whitelist match', tone: 'blocked' };
    }

    // Heads-up / hype posts announce a bet that ISN'T placed yet ("value trade coming",
    // "set buy limits at 30¢", "if you miss it") and usually ride in on a teaser image + a
    // team matchup, which is enough to look bet-like. There's no real slip to import, so skip.
    if (HEADS_UP_ANNOUNCEMENT.test(haystack)) {
        return { sync: false, reason: 'Heads-up, not a placed bet', tone: 'ignored' };
    }
    if (SIGNUP_PROMO.test(haystack)) {
        return { sync: false, reason: 'Sign-up / referral promo', tone: 'ignored' };
    }
    if (ARB_PICK.test(haystack)) {
        return { sync: false, reason: 'Arbitrage pick (contains "arb")', tone: 'blocked' };
    }

    // A reply that re-quotes an already-placed bet and stamps each leg with a settlement tick
    // (✅/✔️) is a "how it landed" recap (e.g. a sub-on-play-on update), not a new pick - skip
    // it even though it's bet-like. Non-reply posts may legitimately use ✅, so scope to replies.
    if (isReply && /[\u2705\u2714\u2611]/.test(transformedText)) {
        return { sync: false, reason: 'Reply recap (settled)', tone: 'ignored' };
    }

    if (!detected) {
        // A non-bet reply just re-quotes the bet it answers (settlement recaps, "thanks",
        // banter), so call out that it was skipped as a reply rather than generic noise.
        if (isReply) return { sync: false, reason: 'Reply (not bet-like)', tone: 'ignored' };
        return { sync: false, reason: 'Not bet-like', tone: 'ignored' };
    }

    // A bet-like reply is usually ADDING a pick to a thread ("adding this one too", "one more
    // I like for this game"), so sync it like any other post instead of dropping it.
    return { sync: true, reason: 'Will sync', tone: 'sync' };
}

// Extract an element's text with line breaks preserved. `textContent` drops <br>
// newlines and `innerText` doesn't work under DOMParser (no layout), so convert
// <br> to "\n" in the HTML first. The bet parser is line-oriented (league stops at
// end-of-line, stake blocks are per-line), so losing newlines corrupts the parse.
function textWithNewlines(el: Element | null): string {
    if (!el) return '';
    const withBreaks = (el.innerHTML || '').replace(/<br\s*\/?>/gi, '\n');
    const tmp = (el.ownerDocument || document).createElement('div');
    tmp.innerHTML = withBreaks;
    // textContent drops <a> hrefs, but Polygun/Polymarket deeplinks carry the exact
    // Polymarket market id (…_m_<id>) and event slug the grader settles by (free Gamma
    // API, no fuzzy sibling match). Inline them as "text (href)" so the parser sees the
    // URLs exactly as it would in pasted text.
    tmp.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        if (/PolyGunSniperBot|polymarket\.com/i.test(href)) {
            a.textContent = `${a.textContent || ''} (${href})`;
        }
    });
    return tmp.textContent || '';
}

function cleanText(value: string) {
    return String(value || '')
        .replace(/[^\S\n]+/g, ' ')        // collapse spaces/tabs but KEEP newlines
        .replace(/[ \t]*\n[ \t]*/g, '\n')  // trim spaces hugging a newline
        .replace(/\n{3,}/g, '\n\n')        // cap blank-line runs
        .trim();
}

function detectBet(text: string, attachmentCount = 0) {
    const lower = text.toLowerCase();
    let score = 0;
    if (/\b(stake|units?|u)\b/.test(lower)) score += 25;
    if (/\b(bet365|pinnacle|betfair|unibet|ladbrokes|coral|betvictor|polymarket)\b/.test(lower)) score += 20;
    if (/\b(over|under|match result|corner|card|shots?|tackles?|goals?|passes?)\b/.test(lower)) score += 20;
    if (/@\s*\d+(\.\d+)?/.test(text) || /\b\d+\.\d{2,3}\b/.test(text)) score += 20;
    if (/\bvs\b|\bv\b/i.test(text)) score += 15;
    if (attachmentCount) score += 30;
    return { detected: score >= 45, confidence: Math.min(98, score) };
}

function normalizePath(value: string) {
    return value.replace(/^\.?\//, '').replace(/\\/g, '/');
}

function joinRelative(baseFile: string, relativePath: string) {
    const cleanRelative = normalizePath(relativePath);
    const baseParts = normalizePath(baseFile).split('/');
    baseParts.pop();
    return normalizePath([...baseParts, cleanRelative].filter(Boolean).join('/'));
}

function resolveAssetUrl(path: string, fileName: string, assets: Map<string, string>) {
    const exact = assets.get(normalizePath(path));
    if (exact) return exact;
    const relative = assets.get(joinRelative(fileName, path));
    if (relative) return relative;
    const bySuffix = Array.from(assets.entries()).find(([key]) => key.endsWith(`/${normalizePath(path)}`) || key.endsWith(normalizePath(path)));
    return bySuffix?.[1] || '';
}

function attachmentKind(path: string): TelegramAttachment['kind'] {
    const lower = path.toLowerCase();
    if (/\.(mp4|mov|webm)$/i.test(lower)) return 'video';
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(lower)) return 'photo';
    return 'file';
}

function formatSyncDate(value?: string | null) {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
}

function extractAttachments(node: Element, fileName: string, assets: Map<string, string>) {
    const attachments: TelegramAttachment[] = [];
    const seen = new Set<string>();
    const mediaNodes = Array.from(node.querySelectorAll('.media_wrap a[href], a.photo_wrap[href], img.photo[src], .document_wrap a[href]'));

    for (const media of mediaNodes) {
        const rawPath = media.getAttribute('href') || media.getAttribute('src') || '';
        if (!rawPath || rawPath.startsWith('#') || rawPath.startsWith('http')) continue;
        if (!/(photos|files|video_files|stickers)\//i.test(rawPath)) continue;

        const img = media.matches('img') ? media : media.querySelector('img');
        const previewPath = img?.getAttribute('src') || rawPath;
        const fullUrl = resolveAssetUrl(rawPath, fileName, assets);
        const previewUrl = resolveAssetUrl(previewPath, fileName, assets) || fullUrl;
        const key = `${rawPath}|${previewPath}`;
        if (seen.has(key)) continue;
        seen.add(key);

        attachments.push({
            kind: attachmentKind(rawPath),
            path: normalizePath(rawPath),
            previewUrl,
            fullUrl,
        });
    }

    return attachments;
}

function mergeAttachments(target: TelegramAttachment[], incoming: TelegramAttachment[]) {
    const seen = new Set(target.map((a) => `${a.kind}|${a.path}|${a.fullUrl || a.previewUrl}`));
    for (const attachment of incoming) {
        const key = `${attachment.kind}|${attachment.path}|${attachment.fullUrl || attachment.previewUrl}`;
        if (seen.has(key)) continue;
        seen.add(key);
        target.push(attachment);
    }
}

const EVENT_CONTEXT_WINDOW_MS = 60 * 60 * 1000;

function exportDateMs(raw: string) {
    const match = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return 0;
    const [, dd, mm, yyyy, hh, min, ss = '0'] = match;
    return Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
}

function looksLikeEventContext(text: string) {
    const t = text || '';
    const hasFixture = /(?:🏟|📅|⏰|World Cup|Friendlies|Price Fancies)/i.test(t)
        && /(?:\bvs\b|\bv\b|[\u{1F1E6}-\u{1F1FF}]{2}\s*(?:vs|v)\s*[\u{1F1E6}-\u{1F1FF}]{2})/iu.test(t);
    return hasFixture;
}

function shouldBorrowEventContext(text: string) {
    const t = text || '';
    const hasBet = /(?:@\s*\d|\bstake\b|💰|📚|\bOver\b|\bUnder\b|To Be Booked|Assist|Fouls?|Shots?)/i.test(t);
    const hasFixture = /(?:🏟|📅|⏰)?\s*[A-Za-zÀ-ÿ .'-]{2,}\s+(?:vs|v)\s+[A-Za-zÀ-ÿ .'-]{2,}/i.test(t);
    return hasBet && !hasFixture;
}

function parseTelegramHtml(html: string, fileName: string, assets: Map<string, string>) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = Array.from(doc.querySelectorAll('.message.default, .message.default.clearfix, .message.default.joined'));
    const messages: TelegramMessage[] = [];
    const byHtmlId = new Map<string, TelegramMessage>();
    let lastEventContext: { text: string; atMs: number } | null = null;
    nodes.forEach((node, index) => {
        const htmlId = node.getAttribute('id') || '';
        const replyHref = (node.querySelector('.reply_to a[href^="#"]') as HTMLAnchorElement | null)?.getAttribute('href') || '';
        const replyTargetId = replyHref.replace(/^#go_to_/, '').replace(/^#/, '');
        const date = node.querySelector('.date.details')?.getAttribute('title') || '';
        const sender = cleanText(node.querySelector('.from_name')?.textContent || '');
        const text = cleanText(textWithNewlines(node.querySelector('.text')));
        const attachments = extractAttachments(node, fileName, assets);
        const replyContext = cleanText(node.querySelector('.reply_to.details')?.textContent || '');
        if (!text && !attachments.length) return;

        // Telegram exports often split one post into a caption message followed by one or more
        // `.joined` media-only messages. Keep those images with the caption so OCR sees the full
        // bet builder / cross-game double instead of detached screenshots with no context.
        const previous = messages[messages.length - 1];
        if (node.classList.contains('joined') && !text && attachments.length && previous) {
            mergeAttachments(previous.attachments, attachments);
            const detection = detectBet(previous.text, previous.attachments.length);
            previous.detected = previous.detected || detection.detected;
            previous.confidence = Math.max(previous.confidence, detection.confidence);
            return;
        }

        // `.joined` messages omit from_name (Telegram semantics: same sender as the
        // previous message) - inherit it so group-chat attribution never goes blank.
        const effectiveSender = sender || (node.classList.contains('joined') && previous ? previous.sender : '');

        const atMs = exportDateMs(date);
        const repliedTo = replyTargetId ? byHtmlId.get(replyTargetId) : undefined;
        let eventContext = repliedTo && looksLikeEventContext(repliedTo.text) ? repliedTo.text : '';
        if (!eventContext && shouldBorrowEventContext(text) && lastEventContext) {
            if (!atMs || !lastEventContext.atMs || atMs - lastEventContext.atMs <= EVENT_CONTEXT_WINDOW_MS) {
                eventContext = lastEventContext.text;
            }
        }

        const detection = detectBet(text, attachments.length);
        const sourceKey = htmlId ? `${fileName}#${htmlId}` : `${fileName}-${index}`;
        const message: TelegramMessage = {
            id: sourceKey,
            sourceMessageKey: sourceKey,
            fileName,
            date,
            sender: effectiveSender,
            text,
            attachments,
            replyContext,
            eventContext,
            detected: detection.detected,
            confidence: detection.confidence,
        };
        messages.push(message);
        if (htmlId) byHtmlId.set(htmlId, message);
        if (looksLikeEventContext(text)) {
            lastEventContext = { text, atMs };
        }
    });
    const isGroup = detectGroupExport(doc, messages.map((m) => m.sender));
    messages.forEach((m) => { m.isGroupChat = isGroup; });
    return messages;
}

// Sender tags are wanted ONLY for group chats - a channel "sends" every post as
// itself, so tagging would stamp the channel name on every bet. HTML exports carry
// no chat_type, so detect it: the service log names the kind outright ("Channel
// «…»" vs "converted a basic group" / "joined the group"), and failing that a
// channel's dominant sender IS the chat title while a group has several people.
function detectGroupExport(doc: Document, senders: string[]): boolean {
    const svc = Array.from(doc.querySelectorAll('.message.service .body.details'))
        .map((n) => (n.textContent || '').trim()).join(' | ');
    if (/channel\s*[«"']/i.test(svc) || /channel (photo|title|created)/i.test(svc)) return false;
    if (/\b(group|topic)\b/i.test(svc)) return true;
    const title = (doc.querySelector('.page_header .text.bold')?.textContent || '').trim();
    const counts = new Map<string, number>();
    let total = 0;
    senders.filter(Boolean).forEach((s) => { counts.set(s, (counts.get(s) || 0) + 1); total += 1; });
    if (!counts.size || !total) return false;
    let top = '', topN = 0;
    counts.forEach((n, s) => { if (n > topN) { topN = n; top = s; } });
    if (title && top === title && topN / total >= 0.6) return false; // channel posts as itself
    return counts.size >= 3;
}

async function readTelegramFiles(files: File[]) {
    const messages: TelegramMessage[] = [];
    const directAssets = new Map<string, string>();
    const directHtmlFiles: File[] = [];

    for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
            const zip = await JSZip.loadAsync(file);
            const assets = new Map<string, string>();
            const assetEntries = Object.values(zip.files).filter((entry) => !entry.dir && /\.(jpg|jpeg|png|webp|gif|mp4|mov|webm|pdf)$/i.test(entry.name));
            for (const entry of assetEntries) {
                const blob = await entry.async('blob');
                assets.set(normalizePath(entry.name), URL.createObjectURL(blob));
            }
            const htmlFiles = Object.values(zip.files).filter((entry) => !entry.dir && /messages.*\.html$/i.test(entry.name));
            for (const entry of htmlFiles) {
                const html = await entry.async('text');
                messages.push(...parseTelegramHtml(html, entry.name, assets));
            }
        } else if (/messages.*\.html$/i.test(file.name) || file.name.toLowerCase().endsWith('.html')) {
            directHtmlFiles.push(file);
        } else if (/\.(jpg|jpeg|png|webp|gif|mp4|mov|webm|pdf)$/i.test(file.name)) {
            directAssets.set(getFilePath(file), URL.createObjectURL(file));
        }
    }

    for (const file of directHtmlFiles) {
        messages.push(...parseTelegramHtml(await file.text(), getFilePath(file), directAssets));
    }
    return messages;
}

function getFilePath(file: File): string {
    return normalizePath((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);
}

type FileSystemEntryLike = {
    isFile: boolean;
    isDirectory: boolean;
    name: string;
    file: (success: (f: File) => void, error?: (err: unknown) => void) => void;
    createReader: () => {
        readEntries: (success: (entries: FileSystemEntryLike[]) => void, error?: (err: unknown) => void) => void;
    };
};

async function walkFileEntry(entry: FileSystemEntryLike, path: string): Promise<File[]> {
    const files: File[] = [];
    if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
            entry.file(resolve, reject);
        });
        (file as File & { webkitRelativePath?: string }).webkitRelativePath = path;
        files.push(file);
    } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const childEntries: FileSystemEntryLike[] = [];
        let moreEntries = true;
        while (moreEntries) {
            await new Promise<void>((resolve) => {
                dirReader.readEntries((results: FileSystemEntryLike[]) => {
                    childEntries.push(...results);
                    moreEntries = results.length > 0;
                    resolve();
                });
            });
        }
        for (const child of childEntries) {
            files.push(...(await walkFileEntry(child, `${path}/${child.name}`)));
        }
    }
    return files;
}

async function collectFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
    if (!dataTransfer.items || dataTransfer.items.length === 0) {
        return Array.from(dataTransfer.files || []);
    }

    const files: File[] = [];
    const items = Array.from(dataTransfer.items);
    let foundEntries = false;

    for (const item of items) {
        const entry =
            ((item as unknown as { webkitGetAsEntry?: () => FileSystemEntryLike | null }).webkitGetAsEntry?.())
            || ((item as unknown as { getAsEntry?: () => FileSystemEntryLike | null }).getAsEntry?.());
        if (entry) {
            foundEntries = true;
            files.push(...(await walkFileEntry(entry, entry.name)));
        }
    }

    // Some browsers don't expose entries for dropped files/folders. Fall back to the flat
    // FileList; this loses folder structure but still supports ZIP/HTML drops.
    if (!foundEntries) {
        return Array.from(dataTransfer.files || []);
    }

    return files;
}

type EventSuggestion = {
    id: string;
    searchEvent: string;
    home?: string;
    away?: string;
    date: string;
    time: string;
    country: string;
    league: string;
    leagueSlug?: string;
    sport?: string;
    source?: string;
    aliases?: string[];
};

// Shared, module-level cache so every Event input across all the parsed-bet cards loads the
// fixture index ONCE rather than refetching per input. Mirrors the new-bet page's autofill.
let _eventIndexCache: EventSuggestion[] | null = null;
let _eventIndexPromise: Promise<EventSuggestion[]> | null = null;

async function loadEventIndexOnce(): Promise<EventSuggestion[]> {
    if (_eventIndexCache) return _eventIndexCache;
    if (_eventIndexPromise) return _eventIndexPromise;
    _eventIndexPromise = (async () => {
        const fetchIndex = async (url: string) => {
            const res = await fetch(url);
            const data = await res.json();
            return Array.isArray(data.events) ? (data.events as EventSuggestion[]) : [];
        };
        try {
            // Near-term index first for a fast first paint, then merge the full index in.
            const near = await fetchIndex('/api/events/search?index=1&days=21');
            _eventIndexCache = near;
            fetchIndex('/api/events/search?index=1')
                .then((full) => {
                    const seen = new Set((_eventIndexCache || []).map((e) => e.id));
                    const merged = [...(_eventIndexCache || [])];
                    for (const e of full) {
                        if (!seen.has(e.id)) { seen.add(e.id); merged.push(e); }
                    }
                    _eventIndexCache = merged;
                })
                .catch(() => { /* near-term index is enough */ });
            return near;
        } catch {
            _eventIndexCache = [];
            return [];
        }
    })();
    return _eventIndexPromise;
}

function useEventIndex(): EventSuggestion[] {
    const [index, setIndex] = useState<EventSuggestion[]>(_eventIndexCache || []);
    useEffect(() => {
        let alive = true;
        loadEventIndexOnce().then((events) => { if (alive) setIndex(events); });
        // The full-index merge happens async after the near-term load; poll briefly so this
        // input picks up the larger set without each input refetching it.
        const t = window.setTimeout(() => {
            if (alive && _eventIndexCache) setIndex(_eventIndexCache);
        }, 1200);
        return () => { alive = false; window.clearTimeout(t); };
    }, []);
    return index;
}

const normalizeSearchText = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const scoreEventSuggestion = (query: string, event: EventSuggestion) => {
    const q = normalizeSearchText(query);
    if (!q) return 0;

    const home = normalizeSearchText(event.home || event.searchEvent.split(' vs ')[0] || '');
    const away = normalizeSearchText(event.away || event.searchEvent.split(' vs ')[1] || '');
    const teams = `${home} ${away}`.trim();
    const eventName = normalizeSearchText(event.searchEvent);
    const metadata = normalizeSearchText(`${event.league} ${event.country} ${event.leagueSlug || ''} ${(event.aliases || []).join(' ')}`);
    const tokens = q.split(' ').filter(Boolean);

    let score = 0;
    if (eventName === q) score += 180;
    if (teams === q) score += 140;
    if (tokens.length > 1 && teams.startsWith(q)) score += 100;
    if (tokens.length > 1 && eventName.includes(q)) score += 80;
    else if (home === q || away === q) score += 80;
    else if (home.startsWith(q) || away.startsWith(q)) score += 60;
    else if (metadata.includes(q)) score += 8;

    for (const token of tokens) {
        if (home === token || away === token) score += 90;
        else if (home.startsWith(token) || away.startsWith(token)) score += 65;
        else if (metadata.includes(token)) score += 6;
        else return 0;
    }

    const eventTime = Date.parse(`${event.date}T${event.time || '00:00'}:00Z`);
    if (!Number.isNaN(eventTime)) {
        const daysAway = Math.max(0, (eventTime - Date.now()) / 86_400_000);
        score += Math.max(0, 120 - Math.min(daysAway * 5, 120));
    }
    if (event.sport === 'football') score += 8;
    return score;
};

// Reusable Event input with the same fixture-search suggestions as /track/new-bet. Selecting a
// suggestion fills the Event text and, when the parent provides the callbacks, the date/time too.
function EventAutocomplete({
    value,
    onChange,
    onSelectEvent,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    onSelectEvent?: (event: EventSuggestion) => void;
    className?: string;
}) {
    const eventIndex = useEventIndex();
    const [deepEvents, setDeepEvents] = useState<EventSuggestion[]>([]);
    const [isDeepSearching, setIsDeepSearching] = useState(false);
    const [show, setShow] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShow(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const suggestions = useMemo(() => {
        const query = (value || '').trim();
        if (query.length < 2) return [];
        const combinedIndex = [...eventIndex, ...deepEvents];
        return combinedIndex
            .map((event) => ({ event, score: scoreEventSuggestion(query, event) }))
            .filter(({ score }) => score > 0)
            // Deduplicate by searchEvent+date to avoid showing the same match from both indices
            .filter((obj, index, self) => index === self.findIndex((t) => (
                t.event.searchEvent === obj.event.searchEvent && t.event.date === obj.event.date
            )))
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return `${b.event.date}T${b.event.time}`.localeCompare(`${a.event.date}T${a.event.time}`); // Sort newest first
            })
            .slice(0, 8)
            .map(({ event }) => event);
    }, [eventIndex, deepEvents, value]);

    const handleDeepSearch = async (e: React.MouseEvent) => {
        e.preventDefault();
        const query = (value || '').trim();
        if (query.length < 2 || isDeepSearching) return;

        setIsDeepSearching(true);
        try {
            const res = await fetch('/api/events/search?q=' + encodeURIComponent(query));
            if (res.ok) {
                const data = await res.json();
                if (data.suggestions && data.suggestions.length > 0) {
                    setDeepEvents(prev => [...prev, ...data.suggestions]);
                }
            }
        } catch (err) {
            console.error('Deep search failed', err);
        } finally {
            setIsDeepSearching(false);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <input
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShow(true);
                    // Clear deep search results if user alters query significantly
                    if (deepEvents.length > 0 && Math.abs(e.target.value.length - value.length) > 3) {
                        setDeepEvents([]);
                    }
                }}
                onFocus={() => { if ((value || '').trim().length >= 2) setShow(true); }}
                placeholder="e.g. Arsenal vs Chelsea"
                className={className}
            />
            {show && (value || '').trim().length >= 2 && (
                <div className="absolute z-50 mt-1 w-full min-w-[220px] max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg flex flex-col">
                    {suggestions.map((event) => (
                        <button
                            key={event.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onChange(event.searchEvent);
                                onSelectEvent?.(event);
                                setShow(false);
                            }}
                        >
                            <div className="text-[12px] font-semibold text-[#121212]">{event.searchEvent}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] font-medium text-gray-500">
                                {event.date && <span>{event.date}</span>}
                                {event.time && <span>{event.time}</span>}
                                {event.country && <span>{event.country}</span>}
                                {event.league && <span>{event.league}</span>}
                            </div>
                        </button>
                    ))}
                    <button
                        type="button"
                        onMouseDown={handleDeepSearch}
                        disabled={isDeepSearching}
                        className="flex items-center justify-center w-full px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#10b981] hover:bg-[#ecfdf5] transition-colors border-t border-gray-100 disabled:opacity-50"
                    >
                        {isDeepSearching ? (
                            <><Loader2 size={12} className="animate-spin mr-1.5" /> Searching database...</>
                        ) : (
                            <><Search size={12} className="mr-1.5" /> Is this a past fixture? Deep search</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Page() {
    const [messages, setMessages] = useState<TelegramMessage[]>([]);
    const [fileName, setFileName] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [query, setQuery] = useState('');
    const [sourceType, setSourceType] = useState<'channel' | 'group'>('channel');
    const [syncMode, setSyncMode] = useState<'manual' | 'bot'>('manual');
    const [syncs, setSyncs] = useState<TelegramSyncStatus[]>([]);
    const [reports, setReports] = useState<TelegramReportStatus[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionProgress, setExtractionProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [isCreatingSync, setIsCreatingSync] = useState(false);
    const [isCreatingReport, setIsCreatingReport] = useState(false);
    const [showHidden, setShowHidden] = useState(false);
    const [bankrolls, setBankrolls] = useState<Bankroll[]>([]);
    const [selectedBankrollId, setSelectedBankrollId] = useState('personal');
    const [syncLabel, setSyncLabel] = useState('');
    const [reportLabel, setReportLabel] = useState('');
    const [reportType, setReportType] = useState<'today' | 'open' | 'pnl'>('today');
    const [reportSendTime, setReportSendTime] = useState(DEFAULT_REPORT_SEND_TIME);
    const [reportTimezone, setReportTimezone] = useState(DEFAULT_REPORT_TIMEZONE);
    const [timezoneOptions, setTimezoneOptions] = useState<string[]>(COMMON_TIMEZONES);

    useEffect(() => {
        // Client-only: full IANA list + the visitor's own timezone preselected for new targets.
        try {
            const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : COMMON_TIMEZONES;
            setTimezoneOptions(supported);
            const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (local && supported.includes(local)) setReportTimezone(local);
        } catch { /* keep defaults */ }
    }, []);
    const [dateFrom, setDateFrom] = useState('2026-06-01');
    const [dateTo, setDateTo] = useState('2026-06-25');
    const [rules, setRules] = useState<SyncRules>(EMPTY_RULES);
    const [rulesLoaded, setRulesLoaded] = useState(false);
    const [savingRules, setSavingRules] = useState(false);
    const [rulesSaved, setRulesSaved] = useState(false);
    const [whitelistDraft, setWhitelistDraft] = useState('');
    const [blacklistDraft, setBlacklistDraft] = useState('');
    const [replaceFrom, setReplaceFrom] = useState('');
    const [replaceTo, setReplaceTo] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const folderRef = useRef<HTMLInputElement>(null);
    const selectedBankroll = bankrolls.find((bankroll) => bankroll.id === selectedBankrollId) || bankrolls[0] || { id: 'personal', name: 'Personal' };

    const detected = useMemo(() => messages.filter((message) => message.detected), [messages]);
    // A single detected message can hold many bets (Polygun/Polymarket daily digests bundle
    // 10-17 picks in one post). Once parsed, count the real bets; before parsing, estimate one
    // per detected message so the headline never understates what a digest will expand into.
    const totalBets = useMemo(() => messages.reduce((sum, m) => {
        if (Array.isArray(m.parsedBets) && m.parsedBets.length) {
            // An accumulator/bet-builder stores its legs in parsedBets but is ONE bet; a digest
            // of singles stores each pick separately and counts in full.
            return sum + (m.isAccumulatorOrBuilder ? 1 : m.parsedBets.length);
        }
        return sum + (m.detected ? 1 : 0);
    }, 0), [messages]);
    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        return messages.filter((message) => {
            if (q) return `${message.text} ${message.sender} ${message.fileName}`.toLowerCase().includes(q);
            return message.detected;
        }).slice(0, 500);
    }, [messages, query]);

    const previewRows = useMemo(() => {
        return filtered.map((message) => {
            const transformed = applyReplacements(message.text, rules.replacements);
            const changed = transformed !== message.text;
            const decision = decideSync(transformed, message.detected, rules, !!message.replyContext);
            return { message, transformed, changed, decision };
        });
    }, [filtered, rules]);

    // Blocked / ignored (rejected) rows are noise - collapse them by default so the page stays
    // short and, crucially, their attachment thumbnails aren't mounted (no wasted media loads).
    const hiddenRowCount = useMemo(
        () => previewRows.filter(({ decision }) => decision.tone !== 'sync').length,
        [previewRows],
    );

    // Cross-message event propagation. Tipsters post several picks for the SAME fixture as
    // separate messages within minutes of each other, but only some captions name the opponent
    // (e.g. Krejci's text says "vs South Korea" so it resolves "South Korea vs Czechia", while
    // Sulc/Zeleny only say "(Czechia)"). Each message is parsed in isolation, so the others come
    // back with a blank event. Here we share a resolved fixture across the whole upload: a bet
    // with a blank event inherits a fixture when one (and ONLY one) resolved fixture has a team
    // that is literally named in that message's own text - so we never invent or guess the wrong
    // opponent, we only reuse a fixture the message clearly belongs to.
    useEffect(() => {
        if (messages.some((m) => m.isExtracting)) return;

        const splitTeams = (ev: string) =>
            ev.split(/\s+(?:vs?|v)\s+/i).map((s) => s.trim()).filter((s) => s.length >= 3);

        type Fixture = { event: string; date: string; time: string; teams: string[] };
        const fixtures: Fixture[] = [];
        for (const m of messages) {
            if (!Array.isArray(m.parsedBets)) continue;
            for (const b of m.parsedBets) {
                const ev = String(b.searchEvent || b.match || '').trim();
                if (ev && /\s(?:vs?|v)\s/i.test(ev) && !fixtures.some((f) => f.event.toLowerCase() === ev.toLowerCase())) {
                    fixtures.push({ event: ev, date: b.date || '', time: b.time || '', teams: splitTeams(ev) });
                }
            }
        }
        if (!fixtures.length) return;

        let changed = false;
        const next = messages.map((m) => {
            if (!Array.isArray(m.parsedBets)) return m;
            const hay = (m.text || '').toLowerCase();
            let touched = false;
            const bets = m.parsedBets.map((b) => {
                const ev = String(b.searchEvent || b.match || '').trim();
                if (ev) return b;
                const matches = fixtures.filter((f) => f.teams.some((t) => hay.includes(t.toLowerCase())));
                const distinct = Array.from(new Set(matches.map((f) => f.event.toLowerCase())));
                if (distinct.length === 1) {
                    const f = matches.find((x) => x.event.toLowerCase() === distinct[0])!;
                    touched = true;
                    changed = true;
                    return { ...b, searchEvent: f.event, date: b.date || f.date, time: b.time || f.time };
                }
                return b;
            });
            return touched ? { ...m, parsedBets: bets } : m;
        });
        if (changed) setMessages(next);
    }, [messages]);

    const syncSummary = useMemo(() => {
        let willSync = 0;
        let blocked = 0;
        for (const message of messages) {
            const transformed = applyReplacements(message.text, rules.replacements);
            const decision = decideSync(transformed, message.detected, rules, !!message.replyContext);
            if (decision.sync) willSync += 1;
            else if (decision.tone === 'blocked') blocked += 1;
        }
        return { willSync, blocked };
    }, [messages, rules]);

    async function handleFiles(nextFiles: File[]) {
        if (!nextFiles.length) return;
        setFileName(nextFiles.length === 1 ? nextFiles[0].name : `${nextFiles.length} files`);
        setIsParsing(true);
        try {
            setMessages(await readTelegramFiles(nextFiles));
        } finally {
            setIsParsing(false);
        }
    }

    const processingRef = useRef(false);

    const formatParsedBets = async (bets: any[]) => {
        return Promise.all(bets.map(async (s: any) => {
            let parsedDate = '';
            let parsedTime = '';
            if (s.date) {
                if (typeof s.date === 'object' && s.date.$date) {
                    const d = new Date(s.date.$date);
                    parsedDate = d.toISOString().split('T')[0];
                    if (!s.time || s.time === 'N/A') parsedTime = d.toISOString().split('T')[1].substring(0, 5);
                } else if (typeof s.date === 'string') {
                    if (s.date.includes('T')) {
                        parsedDate = s.date.split('T')[0];
                        if (!s.time || s.time === 'N/A') parsedTime = new Date(s.date).toISOString().split('T')[1].substring(0, 5);
                    } else {
                        parsedDate = s.date;
                    }
                }
            }
            if (s.time && s.time !== 'N/A') parsedTime = s.time;

            let constructedSelection = s.selection || '';
            const prefix = s.player_name && s.player_name !== 'Unknown Player' && s.player_name !== 'Unknown' ? `${s.player_name} ` : '';

            // If it's a player bet but the AI blindly transcribed "Match Shots" (e.g. Bet365's header),
            // rewrite it to the proper "Player Shots" market type.
            if (prefix && (s.market || '').toLowerCase() === 'match shots') {
                s.market = 'Player Shots';
                if (s.market_display) s.market_display = 'Player Shots';
            }

            if (!constructedSelection) {
                let marketStr = s.market_display || s.market || '';
                let lineStr = '';
                if (s.direction && s.threshold !== undefined && s.threshold !== null) {
                    lineStr = ` ${s.direction.charAt(0).toUpperCase() + s.direction.slice(1)} ${s.threshold}`;
                } else if (s.direction) {
                    lineStr = ` ${s.direction.charAt(0).toUpperCase() + s.direction.slice(1)}`;
                } else if (s.threshold !== undefined && s.threshold !== null) {
                    lineStr = ` ${s.threshold}`;
                }
                constructedSelection = `${prefix}${marketStr}${lineStr}`.trim();
            } else if (prefix && !constructedSelection.toLowerCase().includes(s.player_name.toLowerCase())) {
                constructedSelection = `${prefix}${constructedSelection}`.trim();
            }

            const bet = {
                ...s,
                date: parsedDate,
                time: parsedTime,
                selection: constructedSelection,
                betDirection: s.direction || s.bet_direction || s.betDirection || '',
                searchEvent: s.match || s.searchEvent || s.fixture_name || s.match_name || '',
                eventSport: s.sport || ''
            };

            if (bet.searchEvent) {
                try {
                    const qRes = await fetch('/api/events/search?q=' + encodeURIComponent(bet.searchEvent));
                    const qData = await qRes.json();
                    if (qData.suggestions && qData.suggestions.length > 0) {
                        // Guard against bad fuzzy matches clobbering a clean parsed event.
                        // A team matches when the smaller token set is fully contained in the
                        // larger one: accepts abbreviations ("West Ham" within "West Ham United")
                        // but rejects same-prefix rivals ("West Ham" vs "West Bromwich Albion",
                        // "Man United" vs "Man City") that a plain any-token overlap used to accept
                        // via the shared "west"/"man". Both sides of the fixture must match.
                        const norm = (v: any) => String(v || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
                        const teamTokens = (name: any) => new Set(norm(name).split(' ').filter((t) => t.length >= 3));
                        const teamMatch = (a: any, b: any) => {
                            const ta = teamTokens(a), tb = teamTokens(b);
                            if (!ta.size || !tb.size) return false;
                            const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
                            return [...small].every((t) => big.has(t));
                        };
                        const sides = String(bet.searchEvent).split(/\s+(?:vs?|v)\s+/i).map((s) => s.trim()).filter(Boolean);
                        const fixtureMatch = (c: any) => {
                            const home = c.home || '', away = c.away || '';
                            if (sides.length === 2 && home && away) {
                                return (teamMatch(sides[0], home) && teamMatch(sides[1], away)) ||
                                       (teamMatch(sides[0], away) && teamMatch(sides[1], home));
                            }
                            return teamMatch(bet.searchEvent, `${home} ${away}`);
                        };
                        const bestMatch = qData.suggestions.slice(0, 8).find(fixtureMatch);
                        if (bestMatch) {
                            // Only FILL fields the parse left blank - never overwrite details the
                            // slip already stated. The New Bet page keeps the parsed event/date/
                            // league as-is; Telegram Import must too, else a fuzzy DB match (a men's
                            // fixture matched to the women's "(W)" one, or an old-season date)
                            // clobbers correct data.
                            return {
                                ...bet,
                                searchEvent: bet.searchEvent || bestMatch.searchEvent,
                                date: bet.date || bestMatch.date,
                                time: bet.time || bestMatch.time,
                                // Fall back to the parsed value so an event match with a
                                // blank country/league doesn't clobber what we parsed from
                                // the slip (e.g. 🇫🇮 → Finland getting wiped to '').
                                country: bet.country || bestMatch.country,
                                league: bet.league || bestMatch.league
                            };
                        }
                    }
                } catch (e) {}
            }
            return bet;
        }));
    };

    useEffect(() => {
        if (processingRef.current) return;

        const toExtract = messages.filter(m => {
            const transformed = applyReplacements(m.text, rules.replacements);
            const decision = decideSync(transformed, m.detected, rules, !!m.replyContext);
            return decision.tone === 'sync' && !m.parsedBets && m.isExtracting === undefined;
        });

        if (!toExtract.length) return;

        const processAll = async () => {
            processingRef.current = true;

            const cache = loadParseCache();

            // Split into instant cache hits (already parsed on a previous run) vs misses
            // that still need the API. Hits skip the fetch AND the image-data work entirely.
            const hits: { id: string; cached: CachedParse }[] = [];
            const misses: typeof toExtract = [];
            for (const msg of toExtract) {
                const transformed = applyReplacements(msg.text, rules.replacements);
                const parseText = buildParseText(msg, transformed);
                const cached = cache[parseCacheKey(msg, parseText)];
                if (cached && Array.isArray(cached.parsedBets) && cached.parsedBets.length > 0) {
                    hits.push({ id: msg.id, cached });
                } else {
                    misses.push(msg);
                }
            }

            if (hits.length) {
                setMessages(prev => prev.map(m => {
                    const hit = hits.find(h => h.id === m.id);
                    return hit ? { ...m, isExtracting: false, extractFailed: false, ...hit.cached } : m;
                }));
            }

            // Only the never-parsed messages show the spinner and hit the API.
            setMessages(prev => prev.map(m => misses.find(x => x.id === m.id) ? { ...m, isExtracting: true } : m));

            let cacheDirty = false;
            for (let i = 0; i < misses.length; i += 1) {
                const msg = misses[i];
                if (i > 0) await sleep(PARSE_REQUEST_PAUSE_MS);
                try {
                    const transformed = applyReplacements(msg.text, rules.replacements);
                    const parseText = buildParseText(msg, transformed);
                    const images = await collectImageData(msg);
                    const res = await fetch('/api/parse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: parseText, images, joinLegs: false })
                    });
                    if (res.ok) {
                        const data = await res.json();

                        let rawBets: any[] = [];
                        let isAccumulatorOrBuilder = false;
                        let accumulatorOdds = '';
                        let accumulatorStake = '';
                        let accumulatorType = '';

                        if (data.bets && Array.isArray(data.bets)) {
                            rawBets = data.bets;
                            isAccumulatorOrBuilder = data.is_accumulator_or_builder || rawBets.some((b: any) => b.is_accumulator_or_builder);
                        } else if (data.multi_bet_selections && Array.isArray(data.multi_bet_selections)) {
                            isAccumulatorOrBuilder = true;
                            accumulatorOdds = String(data.odds || '');
                            accumulatorStake = String(data.stake || '');
                            accumulatorType = data.bet_type || '';
                            rawBets = data.multi_bet_selections.map((s: any) => ({ ...data, ...s, multi_bet_selections: undefined }));
                        } else if (data.player_name || data.match || data.selection) {
                            rawBets = [data];
                        }

                        rawBets = rawBets.flatMap((bet: any) => {
                            if (bet.is_accumulator_or_builder) {
                                isAccumulatorOrBuilder = true;
                                accumulatorOdds = String(bet.totalOdds || bet.total_odds || bet.odds || accumulatorOdds);
                                accumulatorStake = String(bet.totalStake || bet.total_stake || bet.stake || accumulatorStake);
                                accumulatorType = bet.multiple_type || bet.bet_type || accumulatorType;
                            }
                            if (bet.multi_bet_selections && Array.isArray(bet.multi_bet_selections)) {
                                isAccumulatorOrBuilder = true;
                                accumulatorOdds = String(bet.odds || accumulatorOdds);
                                accumulatorStake = String(bet.stake || accumulatorStake);
                                accumulatorType = bet.bet_type || accumulatorType;
                                return bet.multi_bet_selections.map((s: any) => ({ ...bet, ...s, multi_bet_selections: undefined }));
                            }
                            return bet;
                        });

                        const formattedBets = filterQualityParsedBets(await formatParsedBets(rawBets));
                        // Fallback: if the parser returned several legs but didn't flag them as a
                        // multi-bet, treat them as a builder when they share a common total odds or
                        // stake. This stops bet-builders from being saved as independent singles.
                        if (!isAccumulatorOrBuilder && formattedBets.length > 1) {
                            const totals = formattedBets.map((b: any) =>
                                cleanText(b.total_odds || b.totalOdds || b.odds || '')
                            ).filter(Boolean);
                            const stakes = formattedBets.map((b: any) =>
                                cleanText(b.total_stake || b.totalStake || b.stake || '')
                            ).filter(Boolean);
                            const allSame = (arr: string[]) => arr.length > 0 && arr.every((v) => v === arr[0]);
                            if (allSame(totals) || allSame(stakes) || formattedBets.some((b: any) => b.is_multi_bet || b.multiple_type)) {
                                isAccumulatorOrBuilder = true;
                                if (!accumulatorOdds && totals[0]) accumulatorOdds = totals[0];
                                if (!accumulatorStake && stakes[0]) accumulatorStake = stakes[0];
                                if (!accumulatorType) accumulatorType = 'team';
                            }
                        }
                        setMessages(prev => prev.map(m => m.id === msg.id ? {
                            ...m,
                            parsedBets: formattedBets.length > 0 ? formattedBets : undefined,
                            accepted: formattedBets.length > 0,
                            isExtracting: false,
                            isAccumulatorOrBuilder,
                            accumulatorOdds,
                            accumulatorStake,
                            accumulatorType,
                            extractFailed: formattedBets.length === 0
                        } : m));

                        // Only persist real successes - empty/failed parses stay uncached
                        // so a transient 429/400 gets retried on the next run.
                        if (formattedBets.length > 0) {
                            cache[parseCacheKey(msg, parseText)] = {
                                parsedBets: formattedBets,
                                accepted: true,
                                isAccumulatorOrBuilder,
                                accumulatorOdds,
                                accumulatorStake,
                                accumulatorType,
                            };
                            cacheDirty = true;
                        }
                    } else {
                        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isExtracting: false, parsedBets: undefined, extractFailed: true } : m));
                    }
                } catch (e) {
                    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isExtracting: false, parsedBets: undefined, extractFailed: true } : m));
                }
                // Flush after each batch so progress survives a crash/refresh mid-run.
                if (cacheDirty) { persistParseCache(cache); cacheDirty = false; }
            }

            processingRef.current = false;
        };

        processAll();
    }, [messages, rules.replacements, rules.whitelist, rules.blacklist, rules.whitelistOnly]);

    // Wipe every persisted parse cache and force every message to re-parse against
    // the (freshly deployed) backend. The parsing useEffect re-runs automatically
    // once parsedBets/isExtracting are cleared. This is the durable alternative to
    // bumping PARSE_CACHE_VERSION every time the parser changes: results are cached
    // for speed, and stale cached parses were what kept showing old/blank fields.
    function reparseAll() {
        try {
            Object.keys(localStorage)
                .filter((k) => k.startsWith('telegram_parse_cache_'))
                .forEach((k) => localStorage.removeItem(k));
        } catch { /* ignore storage errors */ }
        processingRef.current = false;
        setMessages((prev) => prev.map((m) => ({
            ...m,
            parsedBets: undefined,
            isExtracting: undefined,
            extractFailed: false,
            accepted: false,
        })));
    }

    async function extractFields() {
        const toExtract = messages.filter(m => {
            const transformed = applyReplacements(m.text, rules.replacements);
            const decision = decideSync(transformed, m.detected, rules, !!m.replyContext);
            return decision.tone === 'sync' && !m.parsedBets;
        });

        if (!toExtract.length) return;
        setIsExtracting(true);
        setExtractionProgress(0);

        let updatedMessages = [...messages];

        // Repopulate already-parsed messages instantly from cache; only fetch the misses.
        const cache = loadParseCache();
        const misses: typeof toExtract = [];
        for (const msg of toExtract) {
            const transformed = applyReplacements(msg.text, rules.replacements);
            const parseText = buildParseText(msg, transformed);
            const cached = cache[parseCacheKey(msg, parseText)];
            if (cached && Array.isArray(cached.parsedBets) && cached.parsedBets.length > 0) {
                const idx = updatedMessages.findIndex(m => m.id === msg.id);
                if (idx >= 0) updatedMessages[idx] = { ...updatedMessages[idx], extractFailed: false, ...cached };
            } else {
                misses.push(msg);
            }
        }
        setMessages([...updatedMessages]);

        let cacheDirty = false;
        for (let i = 0; i < misses.length; i += 1) {
            const msg = misses[i];
            if (i > 0) await sleep(PARSE_REQUEST_PAUSE_MS);
            try {
                const transformed = applyReplacements(msg.text, rules.replacements);
                const parseText = buildParseText(msg, transformed);
                const images = await collectImageData(msg);
                const res = await fetch('/api/parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: parseText, images, joinLegs: false })
                });
                if (res.ok) {
                    const data = await res.json();

                    let rawBets: any[] = [];
                    let isAccumulatorOrBuilder = false;
                    let accumulatorOdds = '';
                    let accumulatorStake = '';
                    let accumulatorType = '';

                    if (data.bets && Array.isArray(data.bets)) {
                        rawBets = data.bets;
                        isAccumulatorOrBuilder = data.is_accumulator_or_builder || rawBets.some((b: any) => b.is_accumulator_or_builder);
                    } else if (data.multi_bet_selections && Array.isArray(data.multi_bet_selections)) {
                        isAccumulatorOrBuilder = true;
                        accumulatorOdds = String(data.odds || '');
                        accumulatorStake = String(data.stake || '');
                        accumulatorType = data.bet_type || '';
                        rawBets = data.multi_bet_selections.map((s: any) => ({ ...data, ...s, multi_bet_selections: undefined }));
                    } else if (data.player_name || data.match || data.selection) {
                        rawBets = [data];
                    }

                    rawBets = rawBets.flatMap((bet: any) => {
                        if (bet.is_accumulator_or_builder) {
                            isAccumulatorOrBuilder = true;
                            accumulatorOdds = String(bet.totalOdds || bet.total_odds || bet.odds || accumulatorOdds);
                            accumulatorStake = String(bet.totalStake || bet.total_stake || bet.stake || accumulatorStake);
                            accumulatorType = bet.multiple_type || bet.bet_type || accumulatorType;
                        }
                        if (bet.multi_bet_selections && Array.isArray(bet.multi_bet_selections)) {
                            isAccumulatorOrBuilder = true;
                            accumulatorOdds = String(bet.odds || accumulatorOdds);
                            accumulatorStake = String(bet.stake || accumulatorStake);
                            accumulatorType = bet.bet_type || accumulatorType;
                            return bet.multi_bet_selections.map((s: any) => ({ ...bet, ...s, multi_bet_selections: undefined }));
                        }
                        return bet;
                    });

                    const formattedBets = filterQualityParsedBets(await formatParsedBets(rawBets));
                    // Fallback: if the parser returned several legs but didn't flag them as a
                    // multi-bet, treat them as a builder when they share a common total odds or
                    // stake. This stops bet-builders from being saved as independent singles.
                    if (!isAccumulatorOrBuilder && formattedBets.length > 1) {
                        const totals = formattedBets.map((b: any) =>
                            cleanText(b.total_odds || b.totalOdds || b.odds || '')
                        ).filter(Boolean);
                        const stakes = formattedBets.map((b: any) =>
                            cleanText(b.total_stake || b.totalStake || b.stake || '')
                        ).filter(Boolean);
                        const allSame = (arr: string[]) => arr.length > 0 && arr.every((v) => v === arr[0]);
                        if (allSame(totals) || allSame(stakes) || formattedBets.some((b: any) => b.is_multi_bet || b.multiple_type)) {
                            isAccumulatorOrBuilder = true;
                            if (!accumulatorOdds && totals[0]) accumulatorOdds = totals[0];
                            if (!accumulatorStake && stakes[0]) accumulatorStake = stakes[0];
                            if (!accumulatorType) accumulatorType = 'team';
                        }
                    }
                    const idx = updatedMessages.findIndex(m => m.id === msg.id);
                    if (idx >= 0) {
                        updatedMessages[idx] = {
                            ...updatedMessages[idx],
                            parsedBets: formattedBets.length > 0 ? formattedBets : undefined,
                            accepted: formattedBets.length > 0,
                            isAccumulatorOrBuilder,
                            accumulatorOdds,
                            accumulatorStake,
                            accumulatorType,
                            extractFailed: formattedBets.length === 0
                        };
                    }
                    if (formattedBets.length > 0) {
                        cache[parseCacheKey(msg, parseText)] = {
                            parsedBets: formattedBets,
                            accepted: true,
                            isAccumulatorOrBuilder,
                            accumulatorOdds,
                            accumulatorStake,
                            accumulatorType,
                        };
                        cacheDirty = true;
                    }
                } else {
                    const idx = updatedMessages.findIndex(m => m.id === msg.id);
                    if (idx >= 0) {
                        updatedMessages[idx] = { ...updatedMessages[idx], parsedBets: undefined, extractFailed: true };
                    }
                }
            } catch (e) {
                console.error(e);
                const idx = updatedMessages.findIndex(m => m.id === msg.id);
                if (idx >= 0) {
                    updatedMessages[idx] = { ...updatedMessages[idx], parsedBets: undefined, extractFailed: true };
                }
            }
            if (cacheDirty) { persistParseCache(cache); cacheDirty = false; }
            setExtractionProgress(misses.length ? Math.min(100, Math.round(((i + 1) / misses.length) * 100)) : 100);
            setMessages([...updatedMessages]);
        }
        setIsExtracting(false);
    }

    async function importAccepted() {
        const toImport = messages.filter(m => m.accepted && m.parsedBets && m.parsedBets.length > 0);
        if (!toImport.length) return;
        setIsImporting(true);

        const userId = getUserId();

        for (const msg of toImport) {
            if (!msg.parsedBets) continue;

            // Source message: raw text + any slip images ride with the save so the bet can
            // always show what it was parsed from (and be re-derived if a parse was wrong).
            // The SENDER becomes a tag - GROUP-chat imports only (a channel "sends"
            // every post as itself; detectGroupExport gates this). Display name;
            // exports carry no @usernames.
            const senderTag = msg.isGroupChat
                ? (msg.sender || '').replace(/\s+/g, ' ').trim().slice(0, 32)
                : '';
            // Preserve reply / event context in the stored original message so the edit view
            // shows what the bet was parsed from, not a flattened caption.
            const originalMessageParts = [
                msg.replyContext && `Reply to: ${msg.replyContext}`,
                msg.eventContext && `Event context: ${msg.eventContext}`,
                msg.text,
            ].filter(Boolean);
            const sourceMeta = {
                originalMessage: originalMessageParts.join('\n\n').slice(0, 4000),
                sourceMessageKey: msg.sourceMessageKey || msg.id,
                sourceImages: await collectImageData(msg).catch(() => [] as string[]),
                ...(senderTag ? { tags: [senderTag] } : {}),
            };

            try {
                if (msg.isAccumulatorOrBuilder) {
                    const validParsedBets = filterQualityParsedBets(msg.parsedBets);
                    if (!validParsedBets.length) continue;

                    const combinedBet = {
                        betStructure: 'single',
                        userId,
                        bankrollId: selectedBankrollId,
                        forceSave: true, // explicit import: don't let a delete-tombstone skip it
                        stake: parseFloat(msg.accumulatorStake || '0'),
                        odds: msg.accumulatorOdds || '',
                        bet_type: msg.accumulatorType || 'team',
                        multi_bet_selections: validParsedBets.map((b: any) => ({
                            match: b.searchEvent || b.match || '',
                            selection: b.selection || '',
                            market: b.market || '',
                            bet_direction: b.betDirection || '',
                            threshold: b.threshold || '',
                            date: b.date || '',
                            time: b.time || '',
                            country: b.country || '',
                            league: b.league || '',
                            sport: b.sport || b.eventSport || '',
                            polymarket_market_id: b.polymarket_market_id || b.polymarketMarketId || b.market_id || '',
                            condition_id: b.condition_id || b.conditionId || '',
                            token_id: b.token_id || b.tokenId || '',
                            polymarket_url: b.polymarket_url || b.polymarketUrl || '',
                            polymarket_slug: b.polymarket_slug || b.polymarketSlug || ''
                        }))
                    };

                    await fetch('/api/save-bet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...combinedBet, ...sourceMeta })
                    });
                } else {
                    for (const bet of filterQualityParsedBets(msg.parsedBets)) {
                        await fetch('/api/save-bet', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...bet, userId, bankrollId: selectedBankrollId, forceSave: true, ...sourceMeta, tags: [...(Array.isArray((bet as any).tags) ? (bet as any).tags : []), ...(senderTag ? [senderTag] : [])] })
                        });
                    }
                }
            } catch(e) {
                console.error(e);
            }

            const idx = messages.findIndex(m => m.id === msg.id);
            if (idx >= 0) {
                messages[idx].accepted = false;
            }
        }
        setMessages([...messages]);
        setIsImporting(false);
        alert(`Imported ${toImport.length} posts successfully!`);
    }

    function toggleAll(accept: boolean) {
        setMessages(messages.map(m => m.parsedBets ? { ...m, accepted: accept } : m));
    }

    async function handleInput(event: ChangeEvent<HTMLInputElement>) {
        await handleFiles(Array.from(event.target.files || []));
    }

    async function loadBankrolls() {
        try {
            const response = await fetch('/api/bankrolls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get', userId: getUserId() }),
            });
            const data = await response.json();
            const nextBankrolls = data.bankrolls || [{ id: 'personal', name: 'Personal' }];
            setBankrolls(nextBankrolls);
            const saved = localStorage.getItem('active_bankroll_id');
            if (saved && nextBankrolls.some((bankroll: Bankroll) => bankroll.id === saved)) {
                setSelectedBankrollId(saved);
            } else if (nextBankrolls[0]?.id) {
                setSelectedBankrollId(nextBankrolls[0].id);
            }
        } catch {
            setBankrolls([{ id: 'personal', name: 'Personal' }]);
        }
    }

    async function loadRules() {
        let applied = false;
        try {
            const cached = localStorage.getItem(rulesStorageKey());
            if (cached) {
                setRules({ ...EMPTY_RULES, ...JSON.parse(cached) });
                applied = true;
            }
        } catch {
            // ignore malformed cache
        }
        try {
            const response = await fetch('/api/telegram-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get', userId: getUserId() }),
            });
            const data = await response.json();
            if (data?.rules) {
                setRules({ ...EMPTY_RULES, ...data.rules });
                applied = true;
            }
        } catch {
            if (!applied) setRules(EMPTY_RULES);
        } finally {
            setRulesLoaded(true);
        }
    }

    async function saveRules(next: SyncRules) {
        setSavingRules(true);
        setRulesSaved(false);
        try {
            localStorage.setItem(rulesStorageKey(), JSON.stringify(next));
        } catch {
            // ignore quota errors
        }
        try {
            const response = await fetch('/api/telegram-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', userId: getUserId(), ...next }),
            });
            const data = await response.json();
            if (data?.rules) {
                setRules({ ...EMPTY_RULES, ...data.rules });
                try {
                    localStorage.setItem(rulesStorageKey(), JSON.stringify(data.rules));
                } catch {}
            }
            setRulesSaved(true);
            window.setTimeout(() => setRulesSaved(false), 2500);
        } catch {
            // keep local copy even if remote save fails
        } finally {
            setSavingRules(false);
        }
    }

    function addKeyword(kind: 'whitelist' | 'blacklist') {
        const draft = kind === 'whitelist' ? whitelistDraft : blacklistDraft;
        const terms = draft.split(',').map((term) => term.trim()).filter(Boolean);
        if (!terms.length) return;
        setRules((current) => {
            const existing = new Set(current[kind].map((term) => term.toLowerCase()));
            const merged = [...current[kind]];
            for (const term of terms) {
                if (!existing.has(term.toLowerCase())) {
                    merged.push(term);
                    existing.add(term.toLowerCase());
                }
            }
            return { ...current, [kind]: merged };
        });
        if (kind === 'whitelist') setWhitelistDraft('');
        else setBlacklistDraft('');
    }

    function removeKeyword(kind: 'whitelist' | 'blacklist', term: string) {
        setRules((current) => ({ ...current, [kind]: current[kind].filter((item) => item !== term) }));
    }

    function addReplacement() {
        const from = replaceFrom.trim();
        if (!from) return;
        setRules((current) => {
            if (current.replacements.some((rule) => rule.from.toLowerCase() === from.toLowerCase())) return current;
            return { ...current, replacements: [...current.replacements, { from, to: replaceTo }] };
        });
        setReplaceFrom('');
        setReplaceTo('');
    }

    function removeReplacement(from: string) {
        setRules((current) => ({ ...current, replacements: current.replacements.filter((rule) => rule.from !== from) }));
    }

    async function loadTelegramSyncs() {
        try {
            const response = await fetch(`/api/telegram-sync?userId=${getUserId()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to load Telegram syncs');
            const data = await response.json();
            setSyncs(Array.isArray(data.syncs) ? data.syncs : []);
        } catch {
            setSyncs([]);
        }
    }

    async function createTelegramSyncCode() {
        setIsCreatingSync(true);
        try {
            const response = await fetch('/api/telegram-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: getUserId(),
                    sourceType,
                    dateFrom,
                    dateTo,
                    bankrollId: selectedBankroll.id,
                    bankrollName: selectedBankroll.name,
                    label: syncLabel.trim() || `${selectedBankroll.name} ${sourceType}`,
                }),
            });
            if (!response.ok) throw new Error('Failed to create Telegram sync code');
            const data = await response.json();
            setSyncs((current) => [{
                status: data.status || 'waiting',
                linked: Boolean(data.linked),
                code: data.code || '',
                expiresAt: data.expiresAt,
                sourceType,
                bankrollId: selectedBankroll.id,
                bankrollName: selectedBankroll.name,
                label: data.label || syncLabel.trim() || `${selectedBankroll.name} ${sourceType}`,
                dateFrom,
                dateTo,
            }, ...current]);
            setSyncLabel('');
        } catch {
            setSyncs((current) => [{ status: 'error', linked: false, code: '', sourceType, bankrollId: selectedBankroll.id, bankrollName: selectedBankroll.name }, ...current]);
        } finally {
            setIsCreatingSync(false);
        }
    }

    async function refreshTelegramSyncStatus(code: string) {
        try {
            const response = await fetch(`/api/telegram-sync?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to read Telegram sync status');
            const data = await response.json();
            setSyncs((current) => current.map((sync) => sync.code === code ? {
                ...sync,
                status: data.status || sync.status,
                linked: Boolean(data.linked),
                expiresAt: data.expiresAt || sync.expiresAt,
                usedAt: data.usedAt || sync.usedAt,
                chatTitle: data.chatTitle || sync.chatTitle,
                chatId: data.chatId || sync.chatId,
                sourceType: data.sourceType || sync.sourceType,
                bankrollId: data.bankrollId || sync.bankrollId,
                bankrollName: data.bankrollName || sync.bankrollName,
                label: data.label || sync.label,
                dateFrom: data.dateFrom || sync.dateFrom,
                dateTo: data.dateTo || sync.dateTo,
            } : sync));
        } catch {
            setSyncs((current) => current.map((sync) => sync.code === code && sync.status !== 'synced' ? { ...sync, status: 'error' } : sync));
        }
    }

    async function deleteTelegramSync(code: string) {
        setSyncs((current) => current.filter((sync) => sync.code !== code));
        await fetch('/api/telegram-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', userId: getUserId(), code }),
        }).catch(() => null);
    }

    async function loadTelegramReports() {
        try {
            const response = await fetch(`/api/telegram-reports?userId=${getUserId()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to load Telegram reports');
            const data = await response.json();
            setReports(Array.isArray(data.reports) ? data.reports : []);
        } catch {
            setReports([]);
        }
    }

    async function createTelegramReportCode() {
        const uid = getUserId();
        if (!uid || uid === 12345) {
            // No Telegram identity yet - otherwise the report binds to the shared dummy user.
            setReports((current) => [{
                status: 'error',
                linked: false,
                code: '',
                reportType,
                bankrollId: selectedBankroll.id,
                bankrollName: selectedBankroll.name,
                label: 'Connect Telegram first - open the Bot sync tab above',
            }, ...current]);
            return;
        }
        const fallbackLabel = `${selectedBankroll.name} ${REPORT_TYPE_SLUGS[reportType] || "today's bets"}`;
        setIsCreatingReport(true);
        try {
            const response = await fetch('/api/telegram-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: uid,
                    reportType,
                    bankrollId: selectedBankroll.id,
                    bankrollName: selectedBankroll.name,
                    label: reportLabel.trim() || fallbackLabel,
                    sendTime: reportSendTime,
                    timezone: reportTimezone,
                }),
            });
            if (!response.ok) throw new Error('Failed to create Telegram report code');
            const data = await response.json();
            setReports((current) => [{
                status: data.status || 'waiting',
                linked: Boolean(data.linked),
                code: data.code || '',
                expiresAt: data.expiresAt,
                reportType,
                bankrollId: selectedBankroll.id,
                bankrollName: selectedBankroll.name,
                label: data.label || reportLabel.trim() || fallbackLabel,
                sendTime: data.sendTime || reportSendTime,
                timezone: data.timezone || reportTimezone,
            }, ...current]);
            setReportLabel('');
        } catch {
            setReports((current) => [{
                status: 'error',
                linked: false,
                code: '',
                reportType,
                bankrollId: selectedBankroll.id,
                bankrollName: selectedBankroll.name,
            }, ...current]);
        } finally {
            setIsCreatingReport(false);
        }
    }

    async function refreshTelegramReportStatus(code: string) {
        try {
            const response = await fetch(`/api/telegram-reports?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to read Telegram report status');
            const data = await response.json();
            setReports((current) => current.map((report) => report.code === code ? {
                ...report,
                status: data.status || report.status,
                linked: Boolean(data.linked),
                expiresAt: data.expiresAt || report.expiresAt,
                usedAt: data.usedAt || report.usedAt,
                chatTitle: data.chatTitle || report.chatTitle,
                chatId: data.chatId || report.chatId,
                chatType: data.chatType || report.chatType,
                messageThreadId: data.messageThreadId ?? report.messageThreadId,
                reportType: data.reportType || report.reportType,
                bankrollId: data.bankrollId || report.bankrollId,
                bankrollName: data.bankrollName || report.bankrollName,
                label: data.label || report.label,
                messageId: data.messageId || report.messageId,
                sendTime: data.sendTime || report.sendTime,
                timezone: data.timezone || report.timezone,
            } : report));
        } catch {
            setReports((current) => current.map((report) => report.code === code && report.status !== 'synced' ? { ...report, status: 'error' } : report));
        }
    }

    function setReportSchedule(code: string, patch: { sendTime?: string; timezone?: string }) {
        setReports((current) => current.map((report) => report.code === code ? { ...report, ...patch } : report));
    }

    async function saveReportSchedule(report: TelegramReportStatus, patch: { sendTime?: string; timezone?: string } = {}) {
        if (!report.code) return;
        const sendTime = patch.sendTime ?? report.sendTime ?? DEFAULT_REPORT_SEND_TIME;
        const timezone = patch.timezone ?? report.timezone ?? DEFAULT_REPORT_TIMEZONE;
        await fetch('/api/telegram-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'schedule', userId: getUserId(), code: report.code, sendTime, timezone }),
        }).catch(() => null);
    }

    async function deleteTelegramReport(code: string) {
        setReports((current) => current.filter((report) => report.code !== code));
        await fetch('/api/telegram-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', userId: getUserId(), code }),
        }).catch(() => null);
    }

    useEffect(() => {
        void loadBankrolls();
        void loadTelegramSyncs();
        void loadTelegramReports();
        void loadRules();
    }, []);

    useEffect(() => {
        const pendingCodes = syncs
            .filter((sync) => sync.code && !['synced', 'expired', 'missing'].includes(sync.status))
            .map((sync) => sync.code);
        const pendingReportCodes = reports
            .filter((report) => report.code && !['synced', 'expired', 'missing'].includes(report.status))
            .map((report) => report.code);
        if (!pendingCodes.length && !pendingReportCodes.length) return;
        const interval = window.setInterval(() => {
            pendingCodes.forEach((code) => void refreshTelegramSyncStatus(code));
            pendingReportCodes.forEach((code) => void refreshTelegramReportStatus(code));
        }, 2000);
        return () => window.clearInterval(interval);
    }, [syncs, reports]);

    const activeSyncs = syncs.filter((sync) => sync.status === 'synced').length;

    function syncBadge(sync: TelegramSyncStatus) {
        if (sync.status === 'synced') return 'Synced';
        if (sync.status === 'expired') return 'Expired';
        if (sync.status === 'missing') return 'Code expired';
        if (sync.status === 'creating') return 'Creating code';
        if (sync.status === 'error') return 'Connection issue';
        return 'Waiting for code';
    }

    function reportBadge(report: TelegramReportStatus) {
        if (report.status === 'synced') return 'Synced';
        if (report.status === 'expired') return 'Expired';
        if (report.status === 'missing') return 'Code expired';
        if (report.status === 'creating') return 'Creating code';
        if (report.status === 'error') return 'Connection issue';
        return 'Waiting for code';
    }

    return (
        <div className="mx-auto max-w-[1420px] space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#10b981]">
                        <Send size={14} />
                        Telegram Import
                    </div>
                    <h1 className="mt-1 text-[30px] font-bold tracking-tight text-[#121212]">Telegram bet sync</h1>
                    <p className="mt-1 max-w-3xl text-[14px] font-medium text-gray-500">
                        Import exported chat history now, then connect a channel or group for live post detection and bet confirmation.
                    </p>
                </div>
                <SlidingTabs
                    value={syncMode}
                    onChange={setSyncMode}
                    className="rounded-xl"
                    buttonClassName="h-10 px-4"
                    items={[
                        { id: 'manual', label: 'Manual export', icon: <FileArchive size={15} className={syncMode === 'manual' ? 'text-[#10b981]' : ''} /> },
                        { id: 'bot', label: 'Bot sync', icon: <Bot size={15} className={syncMode === 'bot' ? 'text-[#10b981]' : ''} /> },
                    ]}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-[17px] font-bold text-[#121212]">Manual Telegram export</h2>
                            <p className="mt-1 text-[13px] font-medium text-gray-500">Upload a ZIP containing Telegram `messages*.html` files, or select the HTML files directly.</p>
                        </div>
                        <FileArchive className="text-[#10b981]" size={22} />
                    </div>

                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileRef.current?.click()}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileRef.current?.click(); } }}
                        onDrop={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const dt = event.dataTransfer;
                            const files = await collectFilesFromDataTransfer(dt);
                            void handleFiles(files);
                        }}
                        onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); }}
                        onDragEnter={(event) => { event.preventDefault(); event.stopPropagation(); }}
                        className="mt-5 flex min-h-[155px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 text-center transition hover:border-[#10b981] hover:bg-[#ecfdf5]"
                    >
                        {isParsing ? <Loader2 size={28} className="animate-spin text-[#10b981]" /> : <Upload size={28} className="text-gray-500" />}
                        <span className="mt-3 text-[14px] font-bold text-[#121212]">{fileName || 'Upload Telegram ZIP, HTML files, or export folder'}</span>
                        <span className="mt-1 text-[12px] font-semibold text-gray-500">Drop a ZIP, the export folder, or `messages*.html` files. Media in sibling photos/files folders is linked automatically.</span>
                    </div>
                    <input ref={fileRef} type="file" accept=".zip,.html" multiple className="hidden" onChange={handleInput} />
                    <input ref={folderRef} type="file" multiple className="hidden" onChange={handleInput} {...({ webkitdirectory: 'true' } as any)} />

                    <div className="mt-3">
                        <MorphActionMenu label={<><Upload size={16} className="text-[#10b981]" /> Select export</>} className="w-full" menuClassName="left-0 right-auto p-1.5">
                            <button onClick={() => folderRef.current?.click()} className="track-morph-menu-item rounded-xl">
                                <FileArchive size={16} className="text-[#10b981]" />
                                Select export folder
                            </button>
                            <button onClick={() => fileRef.current?.click()} className="track-morph-menu-item rounded-xl">
                                <Upload size={16} className="text-[#10b981]" />
                                Select ZIP or HTML
                            </button>
                        </MorphActionMenu>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {[
                            { label: 'Messages', value: messages.length, icon: MessageSquareText },
                            { label: 'Bets detected', value: totalBets, icon: CheckCircle2 },
                            { label: 'Media posts', value: messages.filter((m) => m.attachments.length).length, icon: FileText },
                            { label: 'Date range', value: messages.length ? 'Ready' : '-', icon: CalendarDays },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                <div className="flex items-center justify-between text-gray-500">
                                    <span className="text-[11px] font-bold uppercase tracking-wide">{item.label}</span>
                                    <item.icon size={14} />
                                </div>
                                <div className="mt-2 text-[24px] font-bold text-[#121212]">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-[17px] font-bold text-[#121212]">Bot sync</h2>
                                <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-bold text-[#047857]">
                                    {activeSyncs} active
                                </span>
                            </div>
                            <p className="mt-1 text-[13px] font-medium text-gray-500">Connect {botUsername} for live post detection. Historical posts from the selected window require a Telegram export upload.</p>
                        </div>
                        <Bot className="text-[#10b981]" size={22} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {[
                            { id: 'channel', label: 'Channel', icon: Send, detail: 'Posts, forwards, announcements' },
                            { id: 'group', label: 'Group', icon: Users, detail: 'Chat messages and replies' },
                        ].map((item) => {
                            const active = sourceType === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setSourceType(item.id as 'channel' | 'group')}
                                    className={`rounded-xl border p-4 text-left transition ${active ? 'border-[#10b981] bg-[#ecfdf5]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2 text-[13px] font-bold text-[#121212]">
                                            <item.icon size={16} />
                                            {item.label}
                                        </span>
                                        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${active ? 'bg-[#10b981] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <Check size={13} />
                                        </span>
                                    </div>
                                    <p className="mt-2 text-[12px] font-medium text-gray-500">{item.detail}</p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-[12px] font-bold uppercase tracking-wide text-gray-400 sm:col-span-2">
                                Sync label
                                <input value={syncLabel} onChange={(event) => setSyncLabel(event.target.value)} placeholder="VIP channel, Personal group..." className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]" />
                            </label>
                            <label className="text-[12px] font-bold uppercase tracking-wide text-gray-400">
                                Bankroll
                                <select value={selectedBankrollId} onChange={(event) => setSelectedBankrollId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]">
                                    {bankrolls.map((bankroll) => (
                                        <option key={bankroll.id} value={bankroll.id}>{bankroll.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-[12px] font-bold uppercase tracking-wide text-gray-400">
                                Historical from
                                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]" />
                            </label>
                            <label className="text-[12px] font-bold uppercase tracking-wide text-gray-400">
                                Historical to
                                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]" />
                            </label>
                        </div>
                        <button
                            onClick={() => void createTelegramSyncCode()}
                            disabled={isCreatingSync}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#121212] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-black disabled:opacity-50"
                        >
                            {isCreatingSync ? <Loader2 size={15} className="animate-spin text-[#10b981]" /> : <Plus size={15} className="text-[#10b981]" />}
                            Add sync target
                        </button>
                    </div>

                    <div className="mt-5 space-y-3">
                        {syncs.map((sync) => {
                            const connected = sync.status === 'synced';
                            const connectCode = sync.code || '------';
                            return (
                                <div key={connectCode} className={`rounded-xl border p-3 ${connected ? 'border-[#10b981] bg-[#ecfdf5]' : 'border-gray-100 bg-white'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[13px] font-bold text-[#121212]">{sync.label || sync.chatTitle || `${sync.bankrollName || 'Personal'} ${sync.sourceType || 'channel'}`}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${connected ? 'bg-white text-[#047857]' : sync.status === 'expired' || sync.status === 'missing' || sync.status === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    {syncBadge(sync)}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-[12px] font-semibold text-gray-500">
                                                {sync.sourceType || 'channel'} · {sync.bankrollName || 'Personal'} bankroll
                                            </div>
                                            {connected && (
                                                <div className="mt-1 text-[12px] font-semibold text-[#047857]">
                                                    {sync.chatTitle ? `${sync.chatTitle} synced` : 'Code detected and synced'}
                                                </div>
                                            )}
                                            {connected && sync.dateFrom && sync.dateTo && (
                                                <div className="mt-1 text-[12px] font-semibold text-amber-700">
                                                    Live sync active. Backfill {formatSyncDate(sync.dateFrom)} to {formatSyncDate(sync.dateTo)} by uploading this chat export ZIP.
                                                </div>
                                            )}
                                            {sync.status === 'missing' && (
                                                <div className="mt-1 text-[12px] font-semibold text-rose-600">
                                                    This code is no longer active. Delete it and add a fresh sync target.
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => sync.code && navigator.clipboard?.writeText(sync.code)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#121212]">
                                                <Copy size={15} />
                                            </button>
                                            <button onClick={() => void deleteTelegramSync(sync.code)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-rose-600">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-[12px] font-semibold text-gray-500 sm:grid-cols-3">
                                        <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                                            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Connect code</div>
                                            <div className="mt-0.5 font-mono text-[16px] font-bold tracking-[0.16em] text-[#121212]">{connectCode}</div>
                                        </div>
                                        <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                                            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Admin step</div>
                                            <div className="mt-1 flex items-center gap-1.5"><ShieldCheck size={13} /> Add bot</div>
                                        </div>
                                        <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                                            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Post</div>
                                            <div className="mt-1 flex items-center gap-1.5"><Link2 size={13} /> /link{botUsername} {connectCode}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {!syncs.length && (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center">
                                <Radio size={22} className="mx-auto text-gray-300" />
                                <div className="mt-2 text-[13px] font-bold text-[#121212]">No synced channels yet</div>
                                <div className="mt-1 text-[12px] font-semibold text-gray-500">Add a sync target for each Telegram channel or group you want tracked.</div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 border-t border-gray-100 pt-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-[15px] font-bold text-[#121212]">Channel reports</h3>
                                <p className="mt-1 text-[12px] font-semibold text-gray-500">
                                    Add a daily Today's Bets list, a live Open Bets list, or a daily Profit / Loss image to any channel, group, or topic.
                                </p>
                            </div>
                            <CalendarDays className="text-[#10b981]" size={19} />
                        </div>

                        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <SlidingTabs
                                value={reportType}
                                onChange={setReportType}
                                className="mb-3 rounded-xl"
                                buttonClassName="h-9 px-3 text-[12px]"
                                items={[
                                    { id: 'today', label: "Today's Bets", icon: <CalendarDays size={14} /> },
                                    { id: 'open', label: 'Open Bets', icon: <Clock3 size={14} /> },
                                    { id: 'pnl', label: 'Profit / Loss', icon: <LineChart size={14} /> },
                                ]}
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-[12px] font-bold uppercase tracking-wide text-gray-400 sm:col-span-2">
                                    Report label
                                    <input
                                        value={reportLabel}
                                        onChange={(event) => setReportLabel(event.target.value)}
                                        placeholder="Main channel, VIP open bets..."
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]"
                                    />
                                </label>
                                <label className="text-[12px] font-bold uppercase tracking-wide text-gray-400 sm:col-span-2">
                                    Bankroll
                                    <select value={selectedBankrollId} onChange={(event) => setSelectedBankrollId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]">
                                        {bankrolls.map((bankroll) => (
                                            <option key={bankroll.id} value={bankroll.id}>{bankroll.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-[12px] font-bold uppercase tracking-wide text-gray-400">
                                    Send time
                                    <input
                                        type="time"
                                        value={reportSendTime}
                                        onChange={(event) => setReportSendTime(event.target.value || DEFAULT_REPORT_SEND_TIME)}
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]"
                                    />
                                </label>
                                <label className="text-[12px] font-bold uppercase tracking-wide text-gray-400">
                                    Timezone
                                    <select
                                        value={reportTimezone}
                                        onChange={(event) => setReportTimezone(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]"
                                    >
                                        {timezoneOptions.map((zone) => (
                                            <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                </label>
                                <div className="text-[11px] font-semibold normal-case tracking-normal text-gray-400 sm:col-span-2">
                                    The daily report posts at this local time. Open Bets lists also update live between posts.
                                </div>
                            </div>
                            <button
                                onClick={() => void createTelegramReportCode()}
                                disabled={isCreatingReport}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#121212] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-black disabled:opacity-50"
                            >
                                {isCreatingReport ? <Loader2 size={15} className="animate-spin text-[#10b981]" /> : <Plus size={15} className="text-[#10b981]" />}
                                Add report target
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            {reports.map((report, index) => {
                                const connected = report.status === 'synced';
                                const reportCode = report.code || `report-${index}`;
                                const label = REPORT_TYPE_LABELS[report.reportType || 'today'] || "Today's Bets";
                                return (
                                    <div key={reportCode} className={`rounded-xl border p-3 ${connected ? 'border-[#10b981] bg-[#ecfdf5]' : 'border-gray-100 bg-white'}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-[13px] font-bold text-[#121212]">{report.label || report.chatTitle || label}</span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${connected ? 'bg-white text-[#047857]' : report.status === 'expired' || report.status === 'missing' || report.status === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {reportBadge(report)}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-[12px] font-semibold text-gray-500">
                                                    {label} · {report.bankrollName || 'Personal'} bankroll
                                                </div>
                                                {connected && (
                                                    <div className="mt-1 text-[12px] font-semibold text-[#047857]">
                                                        {report.chatTitle ? `${report.chatTitle} report active` : 'Report code detected and synced'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => report.code && navigator.clipboard?.writeText(report.code)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#121212]">
                                                    <Copy size={15} />
                                                </button>
                                                <button onClick={() => void deleteTelegramReport(report.code)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-rose-600">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid gap-2 text-[12px] font-semibold text-gray-500 sm:grid-cols-3">
                                            <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                                                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Report code</div>
                                                <div className="mt-0.5 font-mono text-[16px] font-bold tracking-[0.16em] text-[#121212]">{report.code || '------'}</div>
                                            </div>
                                            <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                                                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Schedule</div>
                                                <div className="mt-1">{REPORT_TYPE_SCHEDULE[report.reportType || 'today'] || 'Daily + live edits'}</div>
                                                {report.code ? (
                                                    <div className="mt-1.5 flex flex-col gap-1.5">
                                                        <input
                                                            type="time"
                                                            value={report.sendTime || DEFAULT_REPORT_SEND_TIME}
                                                            onChange={(event) => {
                                                                const sendTime = event.target.value;
                                                                if (!sendTime) return;
                                                                setReportSchedule(reportCode, { sendTime });
                                                                void saveReportSchedule(report, { sendTime });
                                                            }}
                                                            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] font-semibold text-[#121212] outline-none focus:border-[#10b981]"
                                                        />
                                                        <select
                                                            value={report.timezone || DEFAULT_REPORT_TIMEZONE}
                                                            onChange={(event) => {
                                                                const timezone = event.target.value;
                                                                setReportSchedule(reportCode, { timezone });
                                                                void saveReportSchedule(report, { timezone });
                                                            }}
                                                            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] font-semibold text-[#121212] outline-none focus:border-[#10b981]"
                                                        >
                                                            {(timezoneOptions.includes(report.timezone || DEFAULT_REPORT_TIMEZONE)
                                                                ? timezoneOptions
                                                                : [report.timezone as string, ...timezoneOptions]
                                                            ).map((zone) => (
                                                                <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                                                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Post</div>
                                                <div className="mt-1 flex items-center gap-1.5"><Link2 size={13} /> /report{botUsername} {report.code || 'CODE'}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {!reports.length && (
                                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center">
                                    <CalendarDays size={22} className="mx-auto text-gray-300" />
                                    <div className="mt-2 text-[13px] font-bold text-[#121212]">No report channels yet</div>
                                    <div className="mt-1 text-[12px] font-semibold text-gray-500">Add a report target for each list you want the bot to maintain.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#10b981]">
                            <Filter size={14} />
                            Sync rules
                        </div>
                        <h2 className="mt-1 text-[17px] font-bold text-[#121212]">Control what gets synced</h2>
                        <p className="mt-1 max-w-2xl text-[13px] font-medium text-gray-500">
                            Auto-replace cleans up post text first, then whitelist/blacklist decide what reaches your bankroll. Rules apply to live bot sync and to the preview below.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <div className="text-[12px] font-bold text-[#047857]">{syncSummary.willSync} will sync</div>
                            <div className="text-[12px] font-semibold text-rose-500">{syncSummary.blocked} blocked by rules</div>
                        </div>
                        <button
                            onClick={() => void saveRules(rules)}
                            disabled={savingRules || !rulesLoaded}
                            className="flex items-center gap-2 rounded-xl bg-[#121212] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-black disabled:opacity-50"
                        >
                            {savingRules ? <Loader2 size={15} className="animate-spin text-[#10b981]" /> : rulesSaved ? <Check size={15} className="text-[#10b981]" /> : <Save size={15} className="text-[#10b981]" />}
                            {rulesSaved ? 'Saved' : 'Save rules'}
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {/* Whitelist */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-[13px] font-bold text-[#121212]">
                                <ShieldCheck size={16} className="text-[#10b981]" />
                                Whitelist
                            </span>
                            <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                                Only sync matches
                                <input
                                    type="checkbox"
                                    checked={rules.whitelistOnly}
                                    onChange={(event) => setRules((current) => ({ ...current, whitelistOnly: event.target.checked }))}
                                    className="h-4 w-4 accent-[#10b981]"
                                />
                            </label>
                        </div>
                        <p className="mt-1 text-[12px] font-medium text-gray-500">
                            {rules.whitelistOnly ? 'Posts must contain a whitelist term to sync.' : 'Boosts confidence - enable the toggle to require a match.'}
                        </p>
                        <div className="mt-3 flex gap-2">
                            <input
                                value={whitelistDraft}
                                onChange={(event) => setWhitelistDraft(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addKeyword('whitelist'); } }}
                                placeholder="e.g. pinnacle, 2u, value"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-[#10b981]"
                            />
                            <button onClick={() => addKeyword('whitelist')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#121212] text-white hover:bg-black">
                                <Plus size={15} className="text-[#10b981]" />
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {rules.whitelist.map((term) => (
                                <span key={term} className="flex items-center gap-1.5 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[12px] font-bold text-[#047857]">
                                    {term}
                                    <button onClick={() => removeKeyword('whitelist', term)} className="text-[#047857] hover:text-[#121212]"><X size={12} /></button>
                                </span>
                            ))}
                            {!rules.whitelist.length && <span className="text-[12px] font-semibold text-gray-400">No whitelist terms yet.</span>}
                        </div>
                    </div>

                    {/* Blacklist */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <span className="flex items-center gap-2 text-[13px] font-bold text-[#121212]">
                            <Ban size={16} className="text-rose-500" />
                            Blacklist
                        </span>
                        <p className="mt-1 text-[12px] font-medium text-gray-500">Posts containing any of these are never synced.</p>
                        <div className="mt-3 flex gap-2">
                            <input
                                value={blacklistDraft}
                                onChange={(event) => setBlacklistDraft(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addKeyword('blacklist'); } }}
                                placeholder="e.g. cashout, sold, void"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-rose-400"
                            />
                            <button onClick={() => addKeyword('blacklist')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#121212] text-white hover:bg-black">
                                <Plus size={15} className="text-rose-400" />
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {rules.blacklist.map((term) => (
                                <span key={term} className="flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[12px] font-bold text-rose-600">
                                    {term}
                                    <button onClick={() => removeKeyword('blacklist', term)} className="text-rose-600 hover:text-[#121212]"><X size={12} /></button>
                                </span>
                            ))}
                            {!rules.blacklist.length && <span className="text-[12px] font-semibold text-gray-400">No blacklist terms yet.</span>}
                        </div>
                    </div>

                    {/* Auto-replace */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <span className="flex items-center gap-2 text-[13px] font-bold text-[#121212]">
                            <Replace size={16} className="text-indigo-500" />
                            Auto-replace
                        </span>
                        <p className="mt-1 text-[12px] font-medium text-gray-500">Normalise shorthand before parsing, e.g. <span className="font-bold">2u</span> → <span className="font-bold">2 units</span>.</p>
                        <div className="mt-3 flex items-center gap-2">
                            <input
                                value={replaceFrom}
                                onChange={(event) => setReplaceFrom(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addReplacement(); } }}
                                placeholder="Find"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-indigo-400"
                            />
                            <ArrowRight size={15} className="shrink-0 text-gray-400" />
                            <input
                                value={replaceTo}
                                onChange={(event) => setReplaceTo(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addReplacement(); } }}
                                placeholder="Replace"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#121212] outline-none focus:border-indigo-400"
                            />
                            <button onClick={addReplacement} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#121212] text-white hover:bg-black">
                                <Plus size={15} className="text-indigo-400" />
                            </button>
                        </div>
                        <div className="mt-3 space-y-2">
                            {rules.replacements.map((rule) => (
                                <div key={rule.from} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
                                    <span className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[#121212]">
                                        <span className="truncate rounded bg-gray-100 px-1.5 py-0.5 font-bold">{rule.from}</span>
                                        <ArrowRight size={12} className="shrink-0 text-gray-400" />
                                        <span className="truncate rounded bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-600">{rule.to || '(removed)'}</span>
                                    </span>
                                    <button onClick={() => removeReplacement(rule.from)} className="shrink-0 text-gray-400 hover:text-rose-600"><Trash2 size={14} /></button>
                                </div>
                            ))}
                            {!rules.replacements.length && <span className="text-[12px] font-semibold text-gray-400">No replacements yet.</span>}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-[17px] font-bold text-[#121212]">Telegram preview</h2>
                        <p className="mt-1 text-[12px] font-semibold text-gray-500">{detected.length} bet-like messages from {messages.length} parsed posts</p>
                    </div>
                    <div className="flex min-w-[260px] items-center rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <Search size={15} className="mr-2 text-gray-400" />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" className="w-full border-none bg-transparent text-[13px] font-medium outline-none" />
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => toggleAll(true)} className="text-[12px] font-bold text-[#047857] hover:underline">Accept All</button>
                        <div className="h-3 w-px bg-gray-300"></div>
                        <button onClick={() => toggleAll(false)} className="text-[12px] font-bold text-rose-600 hover:underline">Decline All</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={reparseAll}
                            disabled={messages.some(m => m.isExtracting)}
                            title="Clear the saved parse cache and re-run the parser on every message"
                            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12px] font-bold text-gray-600 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
                        >
                            <RefreshCcw size={13} />
                            Re-parse all
                        </button>
                        {messages.some(m => m.accepted) && (
                            <button
                                onClick={importAccepted}
                                disabled={isImporting}
                                className="flex items-center gap-1.5 rounded-lg bg-[#10b981] px-5 py-2 text-[13px] font-bold text-white shadow-md transition-all hover:bg-[#059669] hover:shadow-lg disabled:opacity-50"
                            >
                                {isImporting ? <Loader2 size={14} className="animate-spin text-white" /> : <CheckCircle2 size={14} />}
                                Sync {messages.filter(m => m.accepted).length} Accepted {messages.filter(m => m.accepted).length === 1 ? 'Bet' : 'Bets'}
                            </button>
                        )}
                    </div>
                </div>

                {hiddenRowCount > 0 && (
                    <button
                        onClick={() => setShowHidden((v) => !v)}
                        className="flex w-full items-center justify-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-[12px] font-bold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                        {showHidden ? <X size={13} /> : <AlertCircle size={13} />}
                        {showHidden ? 'Hide' : 'Show'} {hiddenRowCount} blocked / ignored message{hiddenRowCount === 1 ? '' : 's'}
                    </button>
                )}
                <div className="divide-y divide-gray-100">
                    {previewRows
                        .filter(({ decision }) => showHidden || decision.tone === 'sync')
                        .map(({ message, transformed, changed, decision }) => (
                        <div key={message.id} className="grid gap-3 p-4 md:grid-cols-[170px_minmax(0,1fr)_140px]">
                            <div>
                                <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500">
                                    <Clock3 size={13} />
                                    {message.date || 'No date'}
                                </div>
                                <div className="mt-1 truncate text-[12px] font-semibold text-gray-400">{message.sender || message.fileName}</div>
                            </div>
                            <div className="min-w-0">
                                {message.parsedBets ? (
                                    <div className="mb-3 space-y-2">
                                        {message.parsedBets.length > 1 && (
                                            <div className="flex items-center justify-between px-1 mb-2">
                                                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-500 cursor-pointer hover:text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={message.isAccumulatorOrBuilder || false}
                                                        onChange={(e) => {
                                                            const newMsgs = [...messages];
                                                            newMsgs.find(m => m.id === message.id)!.isAccumulatorOrBuilder = e.target.checked;
                                                            setMessages(newMsgs);
                                                        }}
                                                        className="accent-[#10b981] h-3.5 w-3.5"
                                                    />
                                                    TREAT AS BET BUILDER (MULTI)
                                                </label>
                                            </div>
                                        )}
                                        {message.parsedBets.map((bet, i) => (
                                            <div key={i} className="group relative rounded-md border border-gray-200 bg-white p-3 text-[12px] space-y-3 shadow-sm transition-all hover:border-gray-300">
                                                <button
                                                    onClick={() => {
                                                        const newMsgs = [...messages];
                                                        const msgObj = newMsgs.find(m => m.id === message.id);
                                                        if (msgObj && msgObj.parsedBets) {
                                                            msgObj.parsedBets.splice(i, 1);
                                                            if (msgObj.parsedBets.length === 0) {
                                                                msgObj.accepted = false;
                                                                msgObj.parsedBets = undefined;
                                                            }
                                                            setMessages(newMsgs);
                                                        }
                                                    }}
                                                    className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 group-hover:flex"
                                                    title="Remove this bet"
                                                >
                                                    <X size={14} />
                                                </button>
                                                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                                    <label className="md:col-span-2">
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Event</div>
                                                        <EventAutocomplete
                                                            value={bet.searchEvent || bet.match || ''}
                                                            onChange={(val) => {
                                                                const newMsgs = [...messages];
                                                                const msgObj = newMsgs.find(m => m.id === message.id)!;
                                                                msgObj.parsedBets![i].searchEvent = val;
                                                                if (msgObj.isAccumulatorOrBuilder && i === 0 && msgObj.parsedBets!.length > 1) {
                                                                    msgObj.parsedBets!.forEach((b, idx) => {
                                                                        if (idx !== 0) b.searchEvent = val;
                                                                    });
                                                                }
                                                                setMessages(newMsgs);
                                                            }}
                                                            onSelectEvent={(event) => {
                                                                const newMsgs = [...messages];
                                                                const msgObj = newMsgs.find(m => m.id === message.id)!;

                                                                // Apply to current leg
                                                                const target = msgObj.parsedBets![i];
                                                                target.searchEvent = event.searchEvent;
                                                                if (event.date) target.date = event.date;
                                                                if (event.time) target.time = event.time;
                                                                if (event.country) target.country = event.country;
                                                                if (event.league) target.league = event.league;

                                                                // If it's a builder and we're editing the first leg, cascade to all legs (similar to new-bet)
                                                                if (msgObj.isAccumulatorOrBuilder && i === 0 && msgObj.parsedBets!.length > 1) {
                                                                    msgObj.parsedBets!.forEach((bet, idx) => {
                                                                        if (idx === 0) return; // already did first leg
                                                                        bet.searchEvent = event.searchEvent;
                                                                        if (event.date) bet.date = event.date;
                                                                        if (event.time) bet.time = event.time;
                                                                        if (event.country) bet.country = event.country;
                                                                        if (event.league) bet.league = event.league;
                                                                    });
                                                                }

                                                                setMessages(newMsgs);
                                                            }}
                                                            className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white"
                                                        />
                                                    </label>
                                                    <label>
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Date</div>
                                                        <input type="date" value={bet.date || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].date = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                    </label>
                                                    <label>
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Time</div>
                                                        <input type="time" value={bet.time || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].time = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                    </label>
                                                    <label>
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Country</div>
                                                        <input value={bet.country || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].country = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                    </label>
                                                    <label>
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">League</div>
                                                        <input value={bet.league || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].league = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                    </label>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <label>
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Selection</div>
                                                        <input value={bet.selection || bet.player_name || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].selection = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                    </label>
                                                    <label>
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Market</div>
                                                        <input value={bet.market || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].market = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <label className="w-1/2">
                                                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Dir</div>
                                                            <input value={bet.betDirection || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].betDirection = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                        </label>
                                                        <label className="w-1/2">
                                                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Line</div>
                                                            <input value={bet.threshold || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].threshold = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {!message.isAccumulatorOrBuilder && (
                                                        <>
                                                            <label>
                                                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Odds</div>
                                                                <input value={bet.odds || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].odds = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                            </label>
                                                            <label>
                                                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Stake</div>
                                                                <input value={bet.stake || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].stake = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                            </label>
                                                        </>
                                                    )}
                                                    <label>
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Bookmaker</div>
                                                        <input value={bet.bookmaker || ''} onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.parsedBets![i].bookmaker = e.target.value; setMessages(newMsgs); }} className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 font-semibold text-[#121212] outline-none transition focus:border-[#10b981] focus:bg-white" />
                                                    </label>
                                                </div>
                                            </div>
                                        ))}

                                        {message.isAccumulatorOrBuilder && (
                                            <div className="mt-3 rounded-lg border border-[#121212] bg-[#121212] p-4 text-white shadow-xl relative overflow-hidden">
                                                <div className="relative">
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <h4 className="flex items-center gap-2 text-[14px] font-black uppercase tracking-wider text-[#10b981]">
                                                            <CheckCircle2 size={16} />
                                                            Bet Builder Details
                                                        </h4>
                                                    </div>
                                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Stake</label>
                                                            <input
                                                                value={message.accumulatorStake || ''}
                                                                onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.accumulatorStake = e.target.value; setMessages(newMsgs); }}
                                                                placeholder="e.g. 10"
                                                                className="w-full rounded bg-white/10 px-3 py-2 text-[14px] font-bold text-white placeholder-white/30 outline-none focus:bg-white/20"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Odds</label>
                                                            <input
                                                                value={message.accumulatorOdds || ''}
                                                                onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.accumulatorOdds = e.target.value; setMessages(newMsgs); }}
                                                                placeholder="e.g. 4.5"
                                                                className="w-full rounded bg-white/10 px-3 py-2 text-[14px] font-bold text-white placeholder-white/30 outline-none focus:bg-white/20"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Bet Type</label>
                                                            <select
                                                                value={message.accumulatorType || 'team'}
                                                                onChange={(e) => { const newMsgs = [...messages]; newMsgs.find(m => m.id === message.id)!.accumulatorType = e.target.value; setMessages(newMsgs); }}
                                                                className="w-full rounded bg-white/10 px-3 py-2 text-[14px] font-bold text-white outline-none focus:bg-white/20 [&>option]:text-black"
                                                            >
                                                                <option value="match">Match Result</option>
                                                                <option value="team">Team Props</option>
                                                                <option value="player">Player Props</option>
                                                                <option value="outright">Outrights</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : message.isExtracting ? (
                                    <div className="my-4 flex items-center gap-2 text-[12px] font-bold text-[#10b981]">
                                        <Loader2 size={15} className="animate-spin" />
                                        Extracting fields automatically...
                                    </div>
                                ) : (
                                <>
                                {message.extractFailed && (
                                    <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-rose-50 p-3 text-[12px] font-semibold text-rose-600">
                                        <span className="flex items-center gap-2">
                                            <AlertCircle size={14} />
                                            Failed to extract bet fields.
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newMsgs = [...messages];
                                                const idx = newMsgs.findIndex(m => m.id === message.id);
                                                if (idx >= 0) {
                                                    newMsgs[idx] = {
                                                        ...newMsgs[idx],
                                                        parsedBets: undefined,
                                                        accepted: false,
                                                        extractFailed: false,
                                                        isExtracting: undefined,
                                                    };
                                                    setMessages(newMsgs);
                                                }
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-100"
                                        >
                                            <RefreshCcw size={12} />
                                            Refresh parse
                                        </button>
                                    </div>
                                )}
                                {message.attachments.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {message.attachments.slice(0, 4).map((attachment) => (
                                            attachment.kind === 'photo' && attachment.previewUrl ? (
                                                <img
                                                    key={`${message.id}-${attachment.path}`}
                                                    src={attachment.previewUrl}
                                                    alt=""
                                                    className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                                                />
                                            ) : (
                                                <div key={`${message.id}-${attachment.path}`} className="flex h-20 w-20 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                                                    {attachment.kind}
                                                </div>
                                            )
                                        ))}
                                        {message.attachments.length > 4 && (
                                            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-bold text-gray-500">
                                                +{message.attachments.length - 4}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="line-clamp-3 text-[13px] font-medium leading-6 text-[#121212]">{transformed || 'Media-only message'}</div>
                                {changed && (
                                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                                        <Wand2 size={10} /> Auto-replaced
                                    </div>
                                )}
                                {message.replyContext && <div className="mt-2 text-[12px] font-semibold text-gray-400">{message.replyContext}</div>}
                                <div className="mt-2 truncate text-[11px] font-bold uppercase tracking-wide text-gray-400">{message.fileName}</div>
                                </>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                                {message.parsedBets && (
                                    <div className="mb-2 flex w-[140px] overflow-hidden rounded-md border border-gray-200">
                                        <button
                                            onClick={() => {
                                                const newMsgs = [...messages];
                                                const idx = newMsgs.findIndex(m => m.id === message.id);
                                                if (idx >= 0) newMsgs[idx].accepted = true;
                                                setMessages(newMsgs);
                                            }}
                                            className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                                                message.accepted === true ? 'bg-[#10b981] text-white shadow-inner' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-[#10b981]'
                                            }`}
                                        >
                                            Accept
                                        </button>
                                        <div className="w-px self-stretch bg-gray-200"></div>
                                        <button
                                            onClick={() => {
                                                const newMsgs = [...messages];
                                                const idx = newMsgs.findIndex(m => m.id === message.id);
                                                if (idx >= 0) newMsgs[idx].accepted = false;
                                                setMessages(newMsgs);
                                            }}
                                            className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                                                message.accepted === false ? 'bg-rose-500 text-white shadow-inner' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-rose-600'
                                            }`}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                    decision.tone === 'sync' ? 'bg-[#ecfdf5] text-[#047857]' : decision.tone === 'blocked' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {decision.tone === 'sync' ? <CheckCircle2 size={12} /> : decision.tone === 'blocked' ? <Ban size={12} /> : <AlertCircle size={12} />}
                                    {decision.tone === 'sync' ? 'Will sync' : decision.tone === 'blocked' ? 'Blocked' : 'Ignored'}
                                </span>
                                <span className="text-[10px] font-semibold text-gray-400">{message.detected ? `${message.confidence}% · ${decision.reason}` : decision.reason}</span>
                            </div>
                        </div>
                    ))}
                    {!previewRows.length && (
                        <div className="px-4 py-16 text-center">
                            <MessageSquareText size={30} className="mx-auto text-gray-300" />
                            <div className="mt-3 text-[14px] font-bold text-[#121212]">No Telegram messages parsed yet</div>
                            <div className="mt-1 text-[13px] font-medium text-gray-500">Upload a Telegram export ZIP or select the export folder.</div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
