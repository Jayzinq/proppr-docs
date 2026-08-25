'use client';

import { Search, LayoutDashboard, PlusCircle, History, Download, LineChart, Settings, Bell, Send, Calculator, Clock, Moon, Sun, Upload, FileArchive, Menu, X, TrendingUp, Tag, Globe } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import { BankrollSelector } from '@/components/BankrollSelector';
import { SessionUpgradeBanner } from '@/components/SessionUpgradeBanner';
import { MorphActionMenu } from '@/components/transitions/Motion';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '600'],
});

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [nightMode, setNightMode] = useState(true); // Default to night
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<{ id: string, name: string } | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K focuses the global search (the badge in the input advertises it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the bell popover on outside click.
  useEffect(() => {
    if (!bellOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [bellOpen]);

  const navLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/track' },
    { name: 'New Bet', icon: PlusCircle, href: '/track/new-bet' },
    { name: 'Analytics', icon: LineChart, href: '/track/analytics' },
    { name: 'Bets', icon: History, href: '/track/bets' },
    { name: 'Closing Lines', icon: TrendingUp, href: '/track/closing-lines' },
    { name: 'Untagged', icon: Tag, href: '/track/untagged' },
    { name: 'Pending', icon: Clock, href: '/track/pending', badge: pendingCount },
    { name: 'Calculators', icon: Calculator, href: '/track/calculators' },
    { name: 'Public Bankroll', icon: Globe, href: '/track/public-bankroll' },
    { name: 'Import Data', icon: Download, href: '/track/import' },
    { name: 'Telegram Import', icon: Send, href: '/track/telegram-import' },
  ];

  // Close the mobile nav whenever the route changes so a tap navigates and dismisses.
  useEffect(() => {
    queueMicrotask(() => setMobileNavOpen(false));
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem('proppr_track_theme');
    if (saved === 'day') {
      queueMicrotask(() => setNightMode(false));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('proppr_track_theme', nightMode ? 'night' : 'day');
  }, [nightMode]);

  useEffect(() => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('telegram_user_id') : null;
    const userName = typeof window !== 'undefined' ? localStorage.getItem('telegram_first_name') : null;
    if (userId) {
      setUser({ id: userId, name: userName || 'User' });
    } else {
      setUser(null);
    }
    
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const bankrollId = localStorage.getItem('active_bankroll_id') || 'personal';
        const res = await fetch(`/api/pending?userId=${encodeURIComponent(userId)}&bankrollId=${encodeURIComponent(bankrollId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPendingCount(Array.isArray(data.items) ? data.items.length : 0);
      } catch {
        // ignore - badge just stays at last known value
      }
    };
    load();
    const id = setInterval(load, 30_000);
    window.addEventListener('bankroll_changed', load);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('bankroll_changed', load);
    };
  }, [pathname]);

  return (
    <>
      <div id="proppr-track-shell" suppressHydrationWarning className={`track-shell ${nightMode ? 'track-night bg-[#070b10] text-[#f8fafc]' : 'bg-[#ffffff] text-[#121212]'} flex h-screen w-full ${inter.variable} ${playfair.variable} font-sans overflow-hidden selection:bg-[#10b981] selection:text-[#121212]`}>
        
        {/* Sidebar - Premium SaaS. Hidden below lg (1024px): phones (incl. desktop-mode / iOS shrink-to-fit,
          which report ~900-980px) and small tablets get the hamburger drawer + full-width content instead. */}
      <aside className="hidden lg:flex w-[280px] flex-col justify-between shrink-0 bg-[#ffffff] border-r border-gray-200 z-20">
        <div className="p-4">
          <div className="mb-6 flex items-center track-panel-reveal">
            <Link href="/track">
              <Image src={nightMode ? "/proppr-logo-white.png" : "/proppr-logo-black.png"} alt="Proppr Logo" width={120} height={32} className="h-6 w-auto object-contain" priority />
            </Link>
          </div>
          
          <BankrollSelector />

          <nav className="flex flex-col gap-1">
            {navLinks.map(link => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  data-active={active}
                  data-tooltip={link.name}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    active
                    ? 'bg-[#121212] text-[#ffffff] shadow-md shadow-gray-200'
                    : 'text-gray-500 hover:text-[#121212] hover:bg-gray-50'
                  } track-nav-item`}
                >
                  <link.icon size={18} strokeWidth={active ? 2 : 1.5} className={`${active ? "text-[#10b981]" : ""} track-icon-swap`} />
                  <span className="flex-1">{link.name}</span>
                  {'badge' in link && (link.badge ?? 0) > 0 && (
                    <span className={`track-badge-motion min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-[#10b981] text-[#121212]' : 'bg-[#10b981] text-white'}`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <Link href="/track/settings" data-active={pathname === '/track/settings'} className={`track-nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${pathname === '/track/settings' ? 'bg-[#121212] text-[#ffffff] shadow-md shadow-gray-200' : 'text-gray-500 hover:text-[#121212] hover:bg-gray-50'}`}>
            <Settings size={18} strokeWidth={pathname === '/track/settings' ? 2 : 1.5} className={`${pathname === '/track/settings' ? "text-[#10b981]" : ""} track-icon-swap`} />
            Settings
          </Link>
          <div className="mt-4 px-3 flex items-center justify-between">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="track-avatar-group flex -space-x-1">
                <div className="track-avatar w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold" style={{ ['--avatar-weight' as string]: 1 }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#121212]">{user.name}</span>
                  <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                    Synced
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-gray-400">Not signed in</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-[260px] max-w-[80%] bg-[#ffffff] border-r border-gray-200 flex flex-col justify-between shadow-xl">
            <div className="p-4">
              <div className="mb-6 flex items-center justify-between">
                <Link href="/track" onClick={() => setMobileNavOpen(false)}>
                  <Image src={nightMode ? "/proppr-logo-white.png" : "/proppr-logo-black.png"} alt="Proppr Logo" width={120} height={32} className="h-6 w-auto object-contain" priority />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close menu"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#121212] hover:bg-gray-50"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              <BankrollSelector />

              <nav className="flex flex-col gap-1">
                {navLinks.map(link => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        active
                        ? 'bg-[#121212] text-[#ffffff] shadow-md shadow-gray-200'
                        : 'text-gray-500 hover:text-[#121212] hover:bg-gray-50'
                      }`}
                    >
                      <link.icon size={18} strokeWidth={active ? 2 : 1.5} className={active ? "text-[#10b981]" : ""} />
                      <span className="flex-1">{link.name}</span>
                      {'badge' in link && (link.badge ?? 0) > 0 && (
                        <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-[#10b981] text-[#121212]' : 'bg-[#10b981] text-white'}`}>
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-gray-100">
              <Link
                href="/track/settings"
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${pathname === '/track/settings' ? 'bg-[#121212] text-[#ffffff] shadow-md shadow-gray-200' : 'text-gray-500 hover:text-[#121212] hover:bg-gray-50'}`}
              >
                <Settings size={18} strokeWidth={pathname === '/track/settings' ? 2 : 1.5} className={pathname === '/track/settings' ? "text-[#10b981]" : ""} />
                Settings
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="min-w-0 flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-[60px] border-b border-gray-200 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 shrink-0 bg-[#ffffff] z-10 sticky top-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="lg:hidden w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-[#121212] hover:bg-gray-50 transition-all"
          >
            <Menu size={18} strokeWidth={2} />
          </button>
          <div className="track-input-wrap hidden md:flex min-w-0 flex-1 md:max-w-96 items-center bg-gray-100/50 rounded-lg px-4 py-2 border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all">
            <Search size={16} className="text-gray-400 mr-2" strokeWidth={2} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search bets, fixtures..."
              onChange={(e) => window.dispatchEvent(new CustomEvent('track_search', { detail: e.target.value }))}
              onKeyDown={(e) => {
                // Enter routes the query to the Bets table (its search filter reads ?q=).
                if (e.key === 'Enter') {
                  const q = (e.target as HTMLInputElement).value.trim();
                  router.push(q ? `/track/bets?q=${encodeURIComponent(q)}` : '/track/bets');
                }
              }}
              className="bg-transparent border-none outline-none text-[13px] w-full text-[#121212] placeholder:text-gray-400 font-medium"
            />
            <div className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-1.5 rounded shadow-sm">⌘K</div>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setNightMode((value) => !value)}
              aria-label={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
              aria-pressed={nightMode}
              title={nightMode ? 'Day mode' : 'Night mode'}
              data-tooltip={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
              className="track-tooltip track-theme-toggle w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-[#121212] hover:bg-gray-50 transition-all"
            >
              <span className="t-icon-swap" data-state={nightMode ? 'b' : 'a'}>
                <Moon className="t-icon" data-icon="a" size={16} strokeWidth={2} />
                <Sun className="t-icon" data-icon="b" size={16} strokeWidth={2} />
              </span>
            </button>
            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                aria-label="Notifications"
                aria-expanded={bellOpen}
                className="track-tooltip relative w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-[#121212] hover:bg-gray-50 transition-all"
                data-tooltip="Notifications"
              >
                <Bell size={16} strokeWidth={2} />
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-[#10b981] text-white text-[9px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                  <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Notifications</div>
                  {pendingCount > 0 ? (
                    <Link
                      href="/track/pending"
                      onClick={() => setBellOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-semibold text-[#121212] hover:bg-gray-50"
                    >
                      <Clock size={15} className="text-[#10b981] shrink-0" />
                      <span className="flex-1">{pendingCount} bet{pendingCount === 1 ? '' : 's'} waiting in Pending</span>
                    </Link>
                  ) : (
                    <div className="px-2 py-2 text-[13px] font-medium text-gray-500">You&apos;re all caught up.</div>
                  )}
                </div>
              )}
            </div>
            <MorphActionMenu
              label={<><PlusCircle size={15} className="text-[#10b981]" /> New Bet</>}
              className="ml-0 sm:ml-1"
              menuClassName="p-1.5"
            >
              <Link href="/track/new-bet" className="track-morph-menu-item rounded-xl">
                <PlusCircle size={16} className="text-[#10b981]" />
                New single bet
              </Link>
              <Link href="/track/import" className="track-morph-menu-item rounded-xl">
                <Upload size={16} className="text-[#10b981]" />
                Import CSV
              </Link>
              <Link href="/track/telegram-import" className="track-morph-menu-item rounded-xl">
                <FileArchive size={16} className="text-[#10b981]" />
                Telegram import
              </Link>
            </MorphActionMenu>
          </div>
        </header>
        
        <SessionUpgradeBanner />
        <div key={pathname} className="track-page-motion flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6">
          {children}
        </div>
      </main>
      <script dangerouslySetInnerHTML={{ __html: `
        try {
          var theme = localStorage.getItem('proppr_track_theme');
          if (theme === 'day') {
            var el = document.getElementById('proppr-track-shell');
            if (el) {
              el.className = el.className.replace('track-night', '').replace('bg-[#070b10]', 'bg-[#ffffff]').replace('text-[#f8fafc]', 'text-[#121212]');
            }
          }
        } catch(e) {}
      `}} />
    </div>
    </>
  );
}
