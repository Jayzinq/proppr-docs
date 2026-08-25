import { NextResponse } from 'next/server';
import fs from 'fs';
import { getSession, legacyWindowOpen } from '@/lib/server/auth';

// Single source of truth: the shared FastAPI parser (SharedServices/tracking/bet_parser.py).
// Web (this route) and the Telegram bot both go through it, so canonicalisation, market
// metadata, team-vs-player logic, leg-splitting and nearest-year dates stay identical.
const SHARED_PARSER_URL = process.env.SHARED_PARSER_URL || 'http://127.0.0.1:8000/api/parse';

function findTotalOdds(text: string) {
    const match = String(text || '').match(/\bTotal\s+odds\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
    return match ? match[1] : '';
}

function valueOrEmpty(...values: any[]) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}

// The shared parser wraps bet-builder/accumulator legs in a nested `legs` array, but the
// new-bet UI expects every leg as a separate flat array item (its bulk/builder heuristic and
// save mapping are built around flat bets). Expand legs, carrying parent-level context, and
// flag them so the UI treats them as one slip rather than independent bets.
function flattenBets(bets: any[], joinLegs = false, textToSearch = ''): any[] {
    const out: any[] = [];
    for (const b of bets || []) {
        if (Array.isArray(b.legs) && b.legs.length > 0) {
            const parentTotalOdds = valueOrEmpty(b.total_odds, b.totalOdds, b.odds, findTotalOdds(textToSearch));
            const parentDisplayOdds = valueOrEmpty(b.display_odds, b.displayOdds, parentTotalOdds);
            const parentStake = valueOrEmpty(b.stake, b.total_stake, b.totalStake);
            if (joinLegs) {
                const combinedSelection = b.legs.map((l: any) => {
                    const prefix = l.player_name && l.player_name !== 'Unknown Player' && l.player_name !== 'Unknown' ? `${l.player_name} ` : '';
                    let sel = l.selection || '';
                    if (prefix && !sel.toLowerCase().includes(l.player_name.toLowerCase())) {
                        sel = `${prefix}${sel}`.trim();
                    }
                    if (!sel) {
                        const marketStr = l.market_display || l.market || '';
                        let lineStr = '';
                        if (l.direction && l.threshold !== undefined && l.threshold !== null) {
                            lineStr = ` ${l.direction.charAt(0).toUpperCase() + l.direction.slice(1)} ${l.threshold}`;
                        } else if (l.direction) {
                            lineStr = ` ${l.direction.charAt(0).toUpperCase() + l.direction.slice(1)}`;
                        } else if (l.threshold !== undefined && l.threshold !== null) {
                            lineStr = ` ${l.threshold}`;
                        }
                        sel = `${prefix}${marketStr}${lineStr}`.trim();
                    }
                    return sel;
                }).filter(Boolean).join(' & ');

                const firstLeg = b.legs[0];
                let fallbackOdds = parentTotalOdds || firstLeg.odds || '';
                let fallbackDisplayOdds = parentDisplayOdds || firstLeg.display_odds || firstLeg.displayOdds || '';
                if (!fallbackOdds && textToSearch) {
                    const oddsMatch = textToSearch.match(/(?:double|treble|acca|accumulator|parlay|multiple|builder)[^0-9]{0,10}?([0-9]+\.[0-9]{2,3})/i);
                    if (oddsMatch) {
                        fallbackOdds = oddsMatch[1];
                    }
                }

                out.push({
                    ...b,
                    searchEvent: b.searchEvent || firstLeg.searchEvent || '',
                    sport: b.sport || firstLeg.sport || '',
                    selection: combinedSelection,
                    market: b.market || firstLeg.market || '',
                    player_name: '', // Cleared since it's combined
                    odds: fallbackOdds,
                    display_odds: fallbackDisplayOdds,
                    displayOdds: fallbackDisplayOdds,
                    entryPriceCents: b.entry_price_cents || firstLeg.entry_price_cents || null,
                    entry_price_cents: b.entry_price_cents || firstLeg.entry_price_cents || null,
                    exitPriceCents: b.exit_price_cents || firstLeg.exit_price_cents || null,
                    exit_price_cents: b.exit_price_cents || firstLeg.exit_price_cents || null,
                    status: b.status || firstLeg.status || '',
                    cashedOutOdds: b.cashedOutOdds || firstLeg.cashedOutOdds || '',
                    predictionMarket: b.prediction_market || firstLeg.prediction_market || '',
                    predictionPosition: b.prediction_position || firstLeg.prediction_position || '',
                    stake: parentStake,
                    total_odds: parentTotalOdds,
                    totalOdds: parentTotalOdds,
                    total_stake: parentStake,
                    totalStake: parentStake,
                    is_accumulator_or_builder: false // Force it to be a single
                });
            } else {
                for (const leg of b.legs) {
                    out.push({
                        searchEvent: leg.searchEvent || b.searchEvent || '',
                        date: leg.date || b.date || '',
                        time: leg.time || b.time || '',
                        country: leg.country || b.country || '',
                        league: leg.league || b.league || '',
                        sport: leg.sport || b.sport || '',
                        selection: leg.selection || '',
                        market: leg.market || '',
                        betDirection: leg.betDirection || '',
                        player_name: leg.player_name || '',
                        threshold: leg.threshold || '',
                        odds: leg.odds || b.odds || '',
                        display_odds: leg.display_odds || b.display_odds || '',
                        displayOdds: leg.display_odds || b.display_odds || '',
                        entryPriceCents: leg.entry_price_cents || b.entry_price_cents || null,
                        entry_price_cents: leg.entry_price_cents || b.entry_price_cents || null,
                        exitPriceCents: leg.exit_price_cents || b.exit_price_cents || null,
                        exit_price_cents: leg.exit_price_cents || b.exit_price_cents || null,
                        status: leg.status || b.status || '',
                        cashedOutOdds: leg.cashedOutOdds || b.cashedOutOdds || '',
                        predictionMarket: leg.prediction_market || b.prediction_market || '',
                        predictionPosition: leg.prediction_position || b.prediction_position || '',
                        stake: parentStake,
                        total_odds: parentTotalOdds,
                        totalOdds: parentTotalOdds,
                        total_stake: parentStake,
                        totalStake: parentStake,
                        bookmaker: b.bookmaker || '',
                        api_location_override: leg.api_location_override || '',
                        market_metadata: leg.market_metadata || null,
                        is_accumulator_or_builder: true,
                        is_multi_bet: true,
                        multiple_type: b.multiple_type || b.multipleType || '',
                        bet_type: b.bet_type || b.betType || 'multiple',
                    });
                }
            }
        } else {
            out.push(b);
        }
    }
    return out;
}

export async function POST(req: Request) {
    try {
        // Stateless helper for the new-bet form; still gated once the legacy window
        // closes so anonymous callers can't burn parse compute.
        if (!getSession(req as any) && !legacyWindowOpen()) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const body = await req.json();
        const text = body.text || '';
        const images = body.images || [];

        const joinLegs = body.joinLegs === true;

        if (!text && images.length === 0) {
            return NextResponse.json({ error: 'No text or images provided' }, { status: 400 });
        }

        // Pass text and images directly to the shared parser.
        // The Python backend will handle multimodal structured extraction directly,
        // rather than relying on a jumbled OCR transcription step first.
        
        const parserText = text;
        const looksPredictionMarket = /\bpolymarket\b|polymarket\.com|(?:\d+(?:\.\d+)?)\s*¢|\bpnl\b|\bavg\s*\/\s*now\b/i.test(parserText);
        const simplePredictionMarket = looksPredictionMarket
            && (parserText.match(/\b(?:bookmaker\s+)?odds\b|buy\s+limi?t|avg\s*\/\s*now/gi) || []).length <= 1
            && (parserText.match(/\bstake\b|💰/gi) || []).length <= 1;
        
        // If there are images, we MUST use GPT (vision), so override shouldAvoidGpt to false
        const shouldAvoidGpt = simplePredictionMarket && images.length === 0;

        let upstream: Response;
        try {
            upstream = await fetch(SHARED_PARSER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    images: images.length > 0 ? images : undefined,
                    ...(shouldAvoidGpt ? { use_gpt: false } : {}),
                }),
            });
        } catch (e: any) {
            console.error('=== SHARED PARSER UNREACHABLE ===', e?.message);
            return NextResponse.json({ error: 'Parser service unavailable', details: e?.message }, { status: 502 });
        }

        if (!upstream.ok) {
            const details = await upstream.text();
            console.error('=== SHARED PARSER ERROR ===', upstream.status, details);
            return NextResponse.json({ error: 'Parser failed', details }, { status: 502 });
        }

        const data = await upstream.json();
        const bets = flattenBets(data.bets || [], joinLegs, text);
        console.log('=== SHARED PARSE RESULT ===', JSON.stringify({ source: data.source, count: bets.length }));
        return NextResponse.json({ bets });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
