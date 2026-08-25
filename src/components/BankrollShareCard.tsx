'use client';

// Shareable performance card for a public bankroll page - rendered entirely on a
// <canvas> (1200×630, the OG/social aspect) so it downloads / copies as a crisp PNG
// with zero extra dependencies. Pulls the SAME public payload the page serves, so
// the card can never show numbers the public page wouldn't.

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Link as LinkIcon } from 'lucide-react';

const W = 1200;
const H = 630;

type CardData = {
    name: string;
    bankrollName: string;
    firstDate: string | null;
    profitLabel: string;
    roi: number;
    winRate: number;
    totalBets: number;
    profit: number;
    curve: { profit: number }[];
};

function fmtRange(first: string | null) {
    if (!first) return 'All time';
    const d = new Date(first + 'T00:00:00');
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - Today`;
}

function drawCard(canvas: HTMLCanvasElement, data: CardData, logo: HTMLImageElement | null) {
    const scale = 2; // 2x for retina-crisp downloads
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const GREEN = '#10b981';
    const GREEN_LIGHT = '#34d399';
    const RED = '#f87171';
    const font = (weight: number, size: number) => `${weight} ${size}px Inter, system-ui, -apple-system, sans-serif`;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1420');
    bg.addColorStop(1, '#070b10');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Soft green glow top-right
    const glow = ctx.createRadialGradient(W - 140, 40, 0, W - 140, 40, 420);
    glow.addColorStop(0, 'rgba(16,185,129,0.14)');
    glow.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Green top hairline
    const line = ctx.createLinearGradient(0, 0, W, 0);
    line.addColorStop(0, 'rgba(16,185,129,0)');
    line.addColorStop(0.5, GREEN);
    line.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = line;
    ctx.fillRect(0, 0, W, 4);

    const PAD = 64;

    // Header: logo (or wordmark) left, URL right
    if (logo) {
        const lh = 30;
        const lw = (logo.width / logo.height) * lh;
        ctx.drawImage(logo, PAD, 52, lw, lh);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = font(900, 26);
        ctx.fillText('PROPPR', PAD, 76);
    }

    // Name + chips
    ctx.fillStyle = '#ffffff';
    ctx.font = font(900, 46);
    ctx.fillText(data.name.slice(0, 34), PAD, 170);

    const chips = [data.bankrollName, fmtRange(data.firstDate), '✓ Tracked on Proppr'];
    let cx = PAD;
    ctx.font = font(700, 17);
    for (const [i, chip] of chips.entries()) {
        const tw = ctx.measureText(chip).width;
        const cw = tw + 32;
        const isVerify = i === chips.length - 1;
        ctx.fillStyle = isVerify ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.roundRect(cx, 196, cw, 36, 18);
        ctx.fill();
        ctx.strokeStyle = isVerify ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = isVerify ? GREEN_LIGHT : '#cbd5e1';
        ctx.fillText(chip, cx + 16, 220);
        cx += cw + 12;
    }

    // Stats row
    const stats = [
        { label: 'ROI', value: `${data.roi > 0 ? '+' : ''}${data.roi.toFixed(1)}%`, color: data.roi >= 0 ? GREEN_LIGHT : RED },
        { label: 'PROFIT', value: data.profitLabel, color: data.profit >= 0 ? GREEN_LIGHT : RED },
        { label: 'WIN RATE', value: `${data.winRate.toFixed(1)}%`, color: '#ffffff' },
        { label: 'TOTAL BETS', value: String(data.totalBets), color: '#ffffff' },
    ];
    const statY = 300;
    const colW = (W - PAD * 2) / stats.length;
    stats.forEach((s, i) => {
        const x = PAD + i * colW;
        ctx.fillStyle = '#64748b';
        ctx.font = font(700, 16);
        ctx.fillText(s.label, x, statY);
        ctx.fillStyle = s.color;
        ctx.font = font(900, 52);
        ctx.fillText(s.value, x, statY + 58);
    });

    // Equity sparkline across the lower band
    const curve = data.curve && data.curve.length > 1 ? data.curve : [{ profit: 0 }, { profit: 0 }];
    const chartX = PAD;
    const chartW = W - PAD * 2;
    const chartTop = 420;
    const chartH = 130;
    const values = curve.map((c) => c.profit);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const span = max - min || 1;
    const px = (i: number) => chartX + (i / (curve.length - 1)) * chartW;
    const py = (v: number) => chartTop + chartH - ((v - min) / span) * chartH;

    // zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(chartX, py(0));
    ctx.lineTo(chartX + chartW, py(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // area fill
    const fill = ctx.createLinearGradient(0, chartTop, 0, chartTop + chartH);
    fill.addColorStop(0, 'rgba(16,185,129,0.25)');
    fill.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.beginPath();
    ctx.moveTo(px(0), py(values[0]));
    values.forEach((v, i) => ctx.lineTo(px(i), py(v)));
    ctx.lineTo(chartX + chartW, chartTop + chartH);
    ctx.lineTo(chartX, chartTop + chartH);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // stroke
    ctx.beginPath();
    ctx.moveTo(px(0), py(values[0]));
    values.forEach((v, i) => ctx.lineTo(px(i), py(v)));
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // end dot
    ctx.beginPath();
    ctx.arc(px(values.length - 1), py(values[values.length - 1]), 6, 0, Math.PI * 2);
    ctx.fillStyle = GREEN_LIGHT;
    ctx.fill();

    // Footer
    ctx.fillStyle = '#475569';
    ctx.font = font(700, 16);
    ctx.fillText('Every bet tracked & graded automatically · proppr.io', PAD, H - 28);
}

export function BankrollShareCard({ slug }: { slug: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState<'img' | 'link' | null>(null);
    const url = `https://proppr.io/bankroll/${slug}`;

    useEffect(() => {
        let cancelled = false;
        setReady(false);
        setFailed(false);
        const logoPromise = new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = '/proppr-logo-white.png';
        });
        Promise.all([
            fetch(`/api/bankroll/${encodeURIComponent(slug)}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
            logoPromise,
            // Ensure Inter is loaded before drawing, or the canvas falls back to Times.
            (document as any).fonts?.ready?.catch?.(() => null) || Promise.resolve(),
        ]).then(([payload, logo]) => {
            if (cancelled) return;
            if (!payload || !canvasRef.current) { setFailed(true); return; }
            const unit = payload.bankroll?.type === 'currency' || (payload.bankroll?.currency && payload.bankroll.currency !== 'u');
            const sym = unit ? (payload.bankroll.currency === 'GBP' ? '£' : payload.bankroll.currency === 'USD' ? '$' : payload.bankroll.currency === 'EUR' ? '€' : '') : '';
            const p = payload.stats.profit;
            const profitLabel = `${p > 0 ? '+' : p < 0 ? '-' : ''}${sym}${Math.abs(p).toFixed(2)}${unit ? '' : 'u'}`;
            drawCard(canvasRef.current, {
                name: payload.name,
                bankrollName: payload.bankroll?.name || 'Bankroll',
                firstDate: payload.stats.firstDate,
                profitLabel,
                profit: p,
                roi: payload.stats.roi,
                winRate: payload.stats.winRate,
                totalBets: payload.stats.totalBets,
                curve: payload.curve || [],
            }, logo);
            setReady(true);
        }).catch(() => !cancelled && setFailed(true));
        return () => { cancelled = true; };
    }, [slug, url]);

    const toBlob = () => new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob((b) => resolve(b), 'image/png') ?? resolve(null));

    const download = async () => {
        const blob = await toBlob();
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${slug}-performance.png`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const copyImage = async () => {
        try {
            const blob = await toBlob();
            if (!blob) return;
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setCopied('img');
            setTimeout(() => setCopied(null), 1500);
        } catch { /* clipboard image unsupported in this browser */ }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied('link');
            setTimeout(() => setCopied(null), 1500);
        } catch { /* no clipboard */ }
    };

    if (failed) return null;

    return (
        <div className="track-card-motion rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#121212]">Share card</h2>
            <p className="text-[12px] font-medium text-gray-500">A snapshot image of your record for social posts - always matches the public page.</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-[#070b10]">
                <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block', opacity: ready ? 1 : 0.3 }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={download} disabled={!ready} className="flex items-center gap-1.5 rounded-lg bg-[#121212] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-black disabled:opacity-50">
                    <Download size={14} /> Download image
                </button>
                <button onClick={copyImage} disabled={!ready} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-[#121212] hover:border-[#10b981] disabled:opacity-50">
                    {copied === 'img' ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />} {copied === 'img' ? 'Copied' : 'Copy image'}
                </button>
                <button onClick={copyLink} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-[#121212] hover:border-[#10b981]">
                    {copied === 'link' ? <Check size={14} className="text-[#10b981]" /> : <LinkIcon size={14} />} {copied === 'link' ? 'Copied' : 'Copy public link'}
                </button>
            </div>
        </div>
    );
}
