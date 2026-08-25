import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

# 1. Remove the timeframe buttons
# Finding the block around the timeframe buttons
tf_start = """                <div className="flex bg-[#ffffff] border border-gray-200 p-1 rounded-lg shadow-sm">
                    {['7D', '1M', '3M', '6M', 'YTD', 'ALL'].map(t => ("""
tf_end = """                        </button>
                    ))}
                </div>"""

# Replace the flex col container of the header to remove the timeframe buttons
header_old = """            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-[32px] font-bold text-[#121212] tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-[14px] text-gray-500 font-medium mt-1">
                        Updated {new Date().toLocaleTimeString()} · {bets.length} of {allBets.length} bets
                    </p>
                </div>
                <div className="flex bg-[#ffffff] border border-gray-200 p-1 rounded-lg shadow-sm">
                    {['7D', '1M', '3M', '6M', 'YTD', 'ALL'].map(t => (
                        <button 
                            key={t} 
                            onClick={() => setTimeframe(t)}
                            className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-all ${
                                t === timeframe 
                                ? 'bg-gray-100 text-[#121212] shadow-sm' 
                                : 'text-gray-500 hover:text-[#121212]'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>"""

header_new = """            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-[32px] font-bold text-[#121212] tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-[14px] text-gray-500 font-medium mt-1">
                        Updated {new Date().toLocaleTimeString()} · {bets.length} of {allBets.length} bets
                    </p>
                </div>
            </div>"""

if header_old in content:
    content = content.replace(header_old, header_new)

# 2. Remove Paste Action Box
paste_box_old = """            {/* Paste Action Box */}
            <div className="bg-[#ffffff] border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[12px] font-bold text-[#10b981] tracking-wider uppercase mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                    Parse Anything
                </div>
                <h2 className="font-[family-name:var(--font-serif)] text-[36px] leading-tight text-[#121212] mb-3">
                    Paste your bet slips.
                </h2>
                <p className="text-[15px] text-gray-500 mb-6 max-w-3xl">
                    Drop X posts, Telegram tips, or bookmaker copy-paste directly here. The Proppr engine extracts date, market, odds, stake, and result instantly.
                </p>
                
                <div className="relative">
                    <textarea 
                        className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-5 text-[15px] text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all resize-none"
                        placeholder="Sunday&#10;Barcelona vs Real Madrid · Barcelona -0.75 @ 1.79 · 2u (win)..."
                        id="parseTextarea"
                    ></textarea>
                    
                    <div className="flex justify-between items-center mt-4">
                        <button 
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] font-medium text-gray-500 hover:text-[#121212] hover:bg-gray-50 transition-all border border-gray-200 bg-white shadow-sm"
                            onClick={() => alert("Image upload coming soon!")}
                        >
                            <ImageIcon size={16} /> Attach Screenshot
                        </button>
                        <button 
                            className="flex items-center gap-2 px-6 py-3 text-[14px] font-bold text-[#121212] bg-[#10b981] hover:bg-[#23cf3f] rounded-lg shadow-sm shadow-[#10b981]/20 hover:shadow-md hover:shadow-[#10b981]/30 hover:-translate-y-0.5 transition-all active:translate-y-0"
                            onClick={() => {
                                const ta = document.getElementById('parseTextarea') as HTMLTextAreaElement;
                                if (!ta.value.trim()) {
                                    alert('Please paste some text to parse.');
                                    return;
                                }
                                const btn = document.getElementById('parseBtn');
                                if (btn) btn.innerText = 'Parsing...';
                                setTimeout(() => {
                                    alert('Successfully parsed and staged 1 bet! (UI simulation)');
                                    if (btn) btn.innerHTML = 'Parse Bets <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
                                    ta.value = '';
                                }, 1500);
                            }}
                            id="parseBtn"
                        >
                            Parse Bets <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>"""

if paste_box_old in content:
    content = content.replace(paste_box_old, "")

# 3. Add more icons
imports_old = "import { ImageIcon, ArrowRight, TrendingUp, Activity, BarChart2, History as HistoryIcon } from 'lucide-react';"
imports_new = "import { ImageIcon, ArrowRight, TrendingUp, Activity, BarChart2, History as HistoryIcon, PieChart as PieChartIcon, Coins as CoinsIcon, Target as TargetIcon } from 'lucide-react';"
content = content.replace(imports_old, imports_new)

# 4. Update metrics calculations
calc_old = """    const winRate = settledBets > 0 ? Number(((wonBets / settledBets) * 100).toFixed(1)) : 0;
    const yieldPct = totalStaked > 0 ? ((totalProfit / totalStaked) * 100).toFixed(2) : '0.00';
    const roc = totalStaked > 0 ? (totalProfit / (totalStaked * 0.1) * 100).toFixed(1) : '0.0';"""

calc_new = """    const winRate = settledBets > 0 ? Number(((wonBets / settledBets) * 100).toFixed(1)) : 0;
    const yieldPct = totalStaked > 0 ? ((totalProfit / totalStaked) * 100).toFixed(2) : '0.00';
    const roc = totalStaked > 0 ? (totalProfit / (totalStaked * 0.1) * 100).toFixed(1) : '0.0';
    const avgOdds = settledBets > 0 ? (bets.reduce((acc, b) => acc + (b.odds || 0), 0) / bets.length).toFixed(2) : '0.00';"""
content = content.replace(calc_old, calc_new)

# 5. Update Metrics Grid
metrics_old = """            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Profit', value: `${totalProfit > 0 ? '+' : ''}${totalProfit.toFixed(2)}u`, icon: TrendingUp, color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
                    { label: 'Yield', value: `${totalProfit > 0 ? '+' : ''}${yieldPct}%`, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'ROI', value: `+${roc}%`, icon: BarChart2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'Sample Size', value: settledBets, icon: HistoryIcon, color: 'text-gray-500', bg: 'bg-gray-100' }
                ].map((m, i) => ("""

metrics_new = """            {/* Top Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                {[
                    { label: 'Total Profit', value: `${totalProfit > 0 ? '+' : ''}${totalProfit.toFixed(2)}u`, icon: TrendingUp, color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
                    { label: 'Yield', value: `${totalProfit > 0 ? '+' : ''}${yieldPct}%`, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Win Rate', value: `${winRate}%`, icon: PieChartIcon, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'Turnover', value: `${totalStaked.toFixed(2)}u`, icon: CoinsIcon, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { label: 'Avg Odds', value: `@${avgOdds}`, icon: TargetIcon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                    { label: 'Sample Size', value: settledBets, icon: HistoryIcon, color: 'text-gray-500', bg: 'bg-gray-100' }
                ].map((m, i) => ("""
content = content.replace(metrics_old, metrics_new)

with open(filepath, "w") as f:
    f.write(content)

print("Updated dashboard: removed parse box and timeframe, added 2 new metrics")
