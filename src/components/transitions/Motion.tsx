"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useInView } from "framer-motion";

/* transitions.dev #19 - Card tilt with glare */
export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tilt = outer.current;
    const el = card.current;
    if (!tilt || !el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const MAX = 12;

    const reset = () => {
      tilt.classList.remove("is-hover");
      el.classList.remove("is-tilting");
      el.style.setProperty("--tilt-rx", "0deg");
      el.style.setProperty("--tilt-ry", "0deg");
    };
    const track = (e: PointerEvent) => {
      if (reduce.matches) return;
      const r = tilt.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      tilt.classList.add("is-hover");
      el.classList.add("is-tilting");
      el.style.setProperty("--tilt-ry", ((px - 0.5) * MAX).toFixed(2) + "deg");
      el.style.setProperty("--tilt-rx", ((0.5 - py) * MAX).toFixed(2) + "deg");
      el.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%");
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") { try { tilt.setPointerCapture(e.pointerId); } catch { /* noop */ } }
    };
    const leave = (e: PointerEvent) => { if (e.pointerType === "mouse") reset(); };

    tilt.addEventListener("pointerdown", down);
    tilt.addEventListener("pointermove", track);
    tilt.addEventListener("pointerup", reset);
    tilt.addEventListener("pointercancel", reset);
    tilt.addEventListener("pointerleave", leave);
    return () => {
      tilt.removeEventListener("pointerdown", down);
      tilt.removeEventListener("pointermove", track);
      tilt.removeEventListener("pointerup", reset);
      tilt.removeEventListener("pointercancel", reset);
      tilt.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={outer} className={`t-tilt ${className}`}>
      <div ref={card} className="t-tilt-card h-full">
        {children}
        <div className="t-tilt-glare" />
      </div>
    </div>
  );
}

/* transitions.dev #18 - Texts reveal (staggered blurred rise) */
export function TextsReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className={`t-stagger ${inView ? "is-shown" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* transitions.dev #21 - Accordion (grid-rows height + chevron morph) */
export function Accordion({ items, className = "", accent = "text-emerald-400" }: { items: { q: string; a: ReactNode }[]; className?: string; accent?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={className}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="t-acc border-b border-white/5 transition-colors" data-open={isOpen}>
            <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="t-acc-head w-full flex items-center justify-between py-4 px-1 text-left">
              <span className="font-semibold text-white pr-4 text-sm">{item.q}</span>
              <span className={`t-acc-chevron shrink-0 ${isOpen ? accent : "text-zinc-500"}`}>
                <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6.5L8 10.5L12 6.5" />
                </svg>
              </span>
            </button>
            <div className="t-acc-panel">
              <div className="t-acc-panel-inner">
                <div className="pb-4 px-1 text-sm text-zinc-400 leading-relaxed">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* transitions.dev #10 - Success check (draw + rotate + blur on reveal) */
export function SuccessCheck({ className = "", size = 16, delay = 0 }: { className?: string; size?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setPlay(true), delay);
    return () => clearTimeout(t);
  }, [inView, delay]);
  return (
    <span ref={ref} className={`t-success-check ${className}`} data-state={play ? "in" : "out"} aria-hidden>
      <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
      </svg>
    </span>
  );
}

/* transitions.dev #02 - Number pop-in (digit blur + stagger on value changes) */
export function NumberPop({ value, className = "" }: { value: string | number; className?: string }) {
  const text = String(value);

  return (
    <span key={text} className={`t-digit-group is-animating ${className}`} aria-label={text}>
      {text.split("").map((char, index) => (
        <span key={`${char}-${index}-${text}`} className="t-digit" data-stagger={index % 3} aria-hidden>
          {char === " " ? "\u00a0" : char}
        </span>
      ))}
    </span>
  );
}

export function SlidingTabs<T extends string>({
  items,
  value,
  onChange,
  className = "",
  buttonClassName = "",
}: {
  items: { id: T; label: ReactNode; icon?: ReactNode; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState({ x: 0, width: 0 });

  const measurePill = useCallback(() => {
    const wrap = wrapRef.current;
    const active = buttonRefs.current[value];
    if (!wrap || !active) return;
    const wrapRect = wrap.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    setPill({ x: activeRect.left - wrapRect.left, width: activeRect.width });
  }, [value]);

  useLayoutEffect(() => {
    measurePill();
  }, [measurePill]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const active = buttonRefs.current[value];
    if (!wrap || !active) return;

    const observer = new ResizeObserver(measurePill);
    observer.observe(wrap);
    observer.observe(active);
    window.addEventListener("resize", measurePill);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measurePill);
    };
  }, [measurePill, value, items.length]);

  return (
    <div ref={wrapRef} className={`t-tabs track-sliding-tabs ${className}`} role="tablist">
      <span className="t-tabs-pill" style={{ width: pill.width, transform: `translateX(${pill.x}px)` }} />
      {items.map((item) => (
        <button
          key={item.id}
          ref={(node) => { buttonRefs.current[item.id] = node; }}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          disabled={item.disabled}
          onClick={() => !item.disabled && onChange(item.id)}
          className={`t-tab inline-flex items-center justify-center gap-2 text-[12px] font-bold ${buttonClassName}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function MorphActionMenu({
  label,
  children,
  className = "",
  menuClassName = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={ref} className={`track-morph-menu-wrap ${className}`} data-open={open}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="track-morph-menu-trigger">
        {label}
      </button>
      <div
        className={`track-morph-menu-surface ${menuClassName}`}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("a,button")) setOpen(false);
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function TrackAccordion({
  items,
  className = "",
}: {
  items: { title: ReactNode; content: ReactNode; defaultOpen?: boolean }[];
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(() => items.findIndex((item) => item.defaultOpen));
  return (
    <div className={className}>
      {items.map((item, index) => {
        const active = open === index;
        return (
          <div key={index} className="t-acc track-accordion-item" data-open={active}>
            <button type="button" className="t-acc-head track-accordion-head" aria-expanded={active} onClick={() => setOpen(active ? null : index)}>
              <span>{item.title}</span>
              <span className="t-acc-chevron">
                <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6.5L8 10.5L12 6.5" />
                </svg>
              </span>
            </button>
            <div className="t-acc-panel">
              <div className="t-acc-panel-inner">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
