import re

with open("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx", "r") as f:
    content = f.read()

# Add state
state_match = re.search(r'const \[selectedEvent, setSelectedEvent\] = useState<EventSuggestion \| null>\(null\);', content)
if state_match:
    content = content[:state_match.end()] + "\n    const [bulkBets, setBulkBets] = useState<any[]>([]);" + content[state_match.end():]

# Add handleBulkUpdate
bulk_update_func = """
    const updateBulkBet = (idx: number, field: string, value: string) => {
        const updated = [...bulkBets];
        updated[idx] = { ...updated[idx], [field]: value };
        setBulkBets(updated);
    };

    const handleSaveBulk = async (e: any) => {
        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Saving All...';
        try {
            const userId = localStorage.getItem('telegram_user_id');
            if (!userId) {
                alert("You must be logged in to save a bet. Please connect your Telegram account first.");
                return;
            }
            
            for (const bet of bulkBets) {
                await fetch('/api/save-bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        betStructure: 'multiple',
                        betType: inferBetType(bet.selection || '', bet.market || ''),
                        date: bet.date || '',
                        time: bet.time || '',
                        country: bet.country || '',
                        league: bet.league || '',
                        searchEvent: bet.searchEvent || '',
                        selection: bet.selection || '',
                        market: bet.market || '',
                        betDirection: bet.betDirection || '',
                        bookmaker: bet.bookmaker || '',
                        odds: bet.odds || '',
                        stake: bet.stake || '',
                        oddsApiEventId: bet.oddsApiEventId || '',
                        oddsApiLeagueSlug: bet.oddsApiLeagueSlug || '',
                        eventSport: bet.eventSport || '',
                        eventSource: bet.eventSource || ''
                    })
                });
            }
            
            alert(`Saved ${bulkBets.length} bets successfully!`);
            setBulkBets([]);
            setParseText('');
            setBetStructure('single');
        } catch (error) {
            alert('Error saving bulk bets');
            console.error(error);
        } finally {
            btn.innerHTML = originalText;
        }
    };
"""
handle_parse_idx = content.find("const handleParse = async () => {")
content = content[:handle_parse_idx] + bulk_update_func + "\n    " + content[handle_parse_idx:]

# Update handleParse
parse_success = """
            if (data.error) {
                alert('Error parsing text: ' + data.error);
            } else if (data.bets) {
                setBulkBets(data.bets);
                setBetStructure('multiple');
            } else {
"""
content = re.sub(r'if \(data\.error\) \{\s*alert\(\'Error parsing text: \' \+ data\.error\);\s*\} else \{', parse_success, content)

# Update JSX
jsx_bulk = """
                    {bulkBets.length > 0 ? (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[16px] font-bold text-[#121212]">Bulk Bets Detected ({bulkBets.length})</h3>
                                <button
                                    onClick={() => setBulkBets([])}
                                    className="text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="space-y-4">
                                {bulkBets.map((bet, idx) => (
                                    <div key={idx} className="p-4 bg-white border border-gray-200 rounded-xl space-y-3 shadow-sm relative group hover:border-[#2bee4b] transition-colors">
                                        <button 
                                            onClick={() => setBulkBets(bulkBets.filter((_, i) => i !== idx))}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                        </button>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Event</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.searchEvent || ''} onChange={(e) => updateBulkBet(idx, 'searchEvent', e.target.value)} placeholder="e.g. Arsenal vs Chelsea" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</label>
                                                <input type="date" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.date || ''} onChange={(e) => updateBulkBet(idx, 'date', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time</label>
                                                <input type="time" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.time || ''} onChange={(e) => updateBulkBet(idx, 'time', e.target.value)} />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selection</label>
                                            <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.selection || ''} onChange={(e) => updateBulkBet(idx, 'selection', e.target.value)} placeholder="e.g. Cole Palmer Over 1.5 Shots on Target" />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bookmaker</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.bookmaker || ''} onChange={(e) => updateBulkBet(idx, 'bookmaker', e.target.value)} placeholder="e.g. bet365" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Odds</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.odds || ''} onChange={(e) => updateBulkBet(idx, 'odds', e.target.value)} placeholder="1.90" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stake</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.stake || ''} onChange={(e) => updateBulkBet(idx, 'stake', e.target.value)} placeholder="1.0" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button 
                                    className="flex items-center gap-2 px-8 py-3 text-[14px] font-bold text-[#121212] bg-[#2bee4b] hover:bg-[#23cf3f] rounded-xl shadow-sm shadow-[#2bee4b]/20 hover:shadow-md hover:shadow-[#2bee4b]/30 hover:-translate-y-0.5 transition-all"
                                    onClick={handleSaveBulk}
                                >
                                    <Check size={18} strokeWidth={2.5} />
                                    Save All {bulkBets.length} Bets
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
"""
search_idx = content.find("{/* Autofill Search */}")
if search_idx != -1:
    content = content[:search_idx] + jsx_bulk + content[search_idx:]
    submit_idx = content.find("</button>\n                    </div>")
    if submit_idx != -1:
        end_idx = content.find("</div>", submit_idx + 10)
        content = content[:end_idx] + "\n                    </div>\n                    </>\n                    )}" + content[end_idx+6:]

with open("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx", "w") as f:
    f.write(content)
