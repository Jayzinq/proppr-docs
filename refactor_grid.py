import re

with open("src/app/track/new-bet/page.tsx", "r") as f:
    content = f.read()

# I want to replace the sections:
# {/* Selection */} ... down to the end of Stake/Market

new_layout = """
                    {/* Compact Main Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4">
                        
                        {/* Selection */}
                        <div className="md:col-span-6 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Selection</label>
                            <input 
                                type="text" 
                                value={selection}
                                onChange={(e) => setSelection(e.target.value)}
                                placeholder={betType === 'player' ? "e.g. Cole Palmer Over 1.5 Shots on Target" : betType === 'team' ? "e.g. Arsenal Over 5.5 Corners" : "e.g. Arsenal Full Time Result"}
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                            />
                        </div>

                        {/* Market */}
                        <div className="md:col-span-3 space-y-1" ref={marketRef}>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Market</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={market}
                                    onChange={(e) => {
                                        setMarket(e.target.value);
                                        setShowMarketDropdown(true);
                                    }}
                                    onFocus={() => setShowMarketDropdown(true)}
                                    placeholder="e.g. Asian Total Cards"
                                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                                />
                                {showMarketDropdown && filteredMarkets.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filteredMarkets.map((m, idx) => (
                                            <div 
                                                key={idx}
                                                className="px-3 py-2 text-[12px] text-[#121212] hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    setMarket(m);
                                                    setShowMarketDropdown(false);
                                                }}
                                            >
                                                {m}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Market Direction */}
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Direction</label>
                            <div className="relative">
                                <select value={betDirection} onChange={(e) => setBetDirection(e.target.value)} className="w-full pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm appearance-none cursor-pointer">
                                    <option value="">Select...</option>
                                    {marketDirectionOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Bookmaker */}
                        <div className="md:col-span-4 space-y-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bookmaker</label>
                            <div className="relative">
                                <select value={bookmaker} onChange={(e) => setBookmaker(e.target.value)} className="w-full pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm appearance-none cursor-pointer">
                                    <option value="">Select or type...</option>
                                    <option value="bet365">Bet365</option>
                                    <option value="pinnacle">Pinnacle</option>
                                    <option value="polymarket">Polymarket</option>
                                    <option value="kambi">Kambi</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Odds */}
                        <div className="md:col-span-4 space-y-1">
                            <div className="flex justify-between items-center h-4">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Odds</label>
                                <select 
                                    className="text-[9px] font-bold text-gray-400 bg-transparent uppercase tracking-wider outline-none cursor-pointer hover:text-[#121212]"
                                    value={oddsFormat}
                                    onChange={(e: any) => setOddsFormat(e.target.value)}
                                >
                                    <option value="decimal">Dec</option>
                                    <option value="fractional">Frac</option>
                                    <option value="cents">¢</option>
                                </select>
                            </div>
                            <input 
                                type="text" 
                                value={odds}
                                onChange={(e) => setOdds(e.target.value)}
                                placeholder={oddsFormat === 'decimal' ? "1.90" : oddsFormat === 'fractional' ? "9/10" : "52.6¢"}
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                            />
                        </div>

                        {/* Stake */}
                        <div className="md:col-span-4 space-y-1">
                            <div className="flex justify-between items-center h-4">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stake</label>
                                <select 
                                    className="text-[9px] font-bold text-gray-400 bg-transparent uppercase tracking-wider outline-none cursor-pointer hover:text-[#121212]"
                                    value={stakeFormat}
                                    onChange={(e: any) => setStakeFormat(e.target.value)}
                                >
                                    <option value="units">Units</option>
                                    <option value="currency">Cur</option>
                                </select>
                            </div>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={stake}
                                    onChange={(e) => setStake(e.target.value)}
                                    placeholder={stakeFormat === 'units' ? "1.5" : "50.00"}
                                    className="w-full pl-3 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] transition-all shadow-sm"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400 pointer-events-none">
                                    {stakeFormat === 'units' ? 'u' : '£'}
                                </span>
                            </div>
                        </div>
                    </div>"""

start_idx = content.find('{/* Selection */}')
end_idx = content.find('</select>\n                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />\n                            </div>\n                        </div>\n                    </div>')
if start_idx != -1 and end_idx != -1:
    end_part = '</select>\n                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />\n                            </div>\n                        </div>\n                    </div>'
    end_idx += len(end_part)
    content = content[:start_idx] + new_layout + content[end_idx:]
    with open("src/app/track/new-bet/page.tsx", "w") as f:
        f.write(content)
    print("Replaced main form grid!")
else:
    print("Could not find the block.")
