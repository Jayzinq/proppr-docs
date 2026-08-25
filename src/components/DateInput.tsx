'use client';

import { CalendarDays } from 'lucide-react';

/**
 * A date input whose calendar opens on a click ANYWHERE in the field - no typing needed.
 *
 * Native `<input type=date>` styled with a custom border keeps the calendar behind a tiny
 * (often invisible) picker-indicator icon, so users end up typing dd/mm/yyyy by hand. This
 * stretches the WebKit picker-indicator across the whole control, calls showPicker() on click
 * as a belt-and-braces (harmless NotAllowedError without a user gesture), and renders its own
 * calendar glyph. Same technique as the /track/bets date filter - keep the two in sync.
 */
export function DateInput({
    value,
    onChange,
    className = '',
    iconClassName = '',
}: {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    iconClassName?: string;
}) {
    return (
        <div className="relative">
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* pre-gesture call; indicator still opens it */ } }}
                className={`cursor-pointer appearance-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${className}`}
            />
            <CalendarDays size={14} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 ${iconClassName}`} />
        </div>
    );
}
