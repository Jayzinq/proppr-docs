import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

# I will replace the layout from the start of Search Event down to Stake.
# To do this safely, I will locate the start of Search Event and the end of Stake.

start_marker = "{/* Search Event */}"
end_marker = "{/* Submit Area */}"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)

    new_form_layout = """{/* Search Event */}
                    <div className="space-y-3 mt-4">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left">Search Event</label>
                            <div className="col-span-2 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-[14px] text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all shadow-sm"
                                    placeholder="Search by team, player, or league (e.g. Arsenal vs Chelsea)..."
                                    value={searchEvent}
                                    onChange={(e) => setSearchEvent(e.target.value)}
                                    ref={eventSearchRef as any}
                                    onFocus={() => { if (eventSuggestions.length > 0) setShowEventSuggestions(true); }}
                                />
                                {eventSearchLoading && eventIndex.length === 0 && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#10b981] border-t-transparent"></div>
                                    </div>
                                )}
                                {showEventSuggestions && eventSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[300px] overflow-y-auto">
                                        {eventSuggestions.map((ev, idx) => (
                                            <button
                                                key={ev.id}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-3"
                                                onClick={() => {
                                                    selectedEventSuggestionRef.current = true;
                                                    setSelectedEvent(ev);
                                                    setSearchEvent(ev.searchEvent);
                                                    setDate(ev.date);
                                                    setTime(ev.time);
                                                    setCountry(ev.country);
                                                    setLeague(ev.league);
                                                    setShowEventSuggestions(false);
                                                }}
                                            >
                                                <div className="mt-0.5"><Trophy size={14} className="text-gray-400"/></div>
                                                <div>
                                                    <div className="text-[13px] font-bold text-[#121212]">{ev.searchEvent}</div>
                                                    <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                                                        {ev.date} {ev.time} • {ev.country} • {ev.league}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Date */}
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left flex items-center gap-1.5"><Calendar size={14}/> Date</label>
                            <div className="col-span-2">
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981] shadow-sm" />
                            </div>
                        </div>

                        {/* Time */}
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left flex items-center gap-1.5"><Clock size={14}/> Time</label>
                            <div className="col-span-2">
                                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981] shadow-sm" />
                            </div>
                        </div>

                        {/* Country */}
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left flex items-center gap-1.5"><Globe size={14}/> Country</label>
                            <div className="col-span-2">
                                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. England" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981] shadow-sm" />
                            </div>
                        </div>

                        {/* League */}
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left flex items-center gap-1.5"><Trophy size={14}/> League</label>
                            <div className="col-span-2">
                                <input type="text" value={league} onChange={(e) => setLeague(e.target.value)} placeholder="e.g. Premier League" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-[#121212] focus:outline-none focus:border-[#10b981] shadow-sm" />
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 w-full my-2"></div>

                        {/* Selection */}
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left">Selection</label>
                            <div className="col-span-2">
                                <input 
                                    type="text" 
                                    value={selection}
                                    onChange={(e) => setSelection(e.target.value)}
                                    placeholder={betType === 'player' ? "e.g. Cole Palmer Over 1.5 Shots on Target" : betType === 'team' ? "e.g. Arsenal Over 5.5 Corners" : "e.g. Arsenal Full Time Result"}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Market */}
                        <div className="grid grid-cols-3 items-center gap-4" ref={marketRef}>
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left">Market</label>
                            <div className="col-span-2 relative">
                                <input 
                                    type="text" 
                                    value={market}
                                    onChange={(e) => {
                                        setMarket(e.target.value);
                                        setShowMarketDropdown(true);
                                    }}
                                    onFocus={() => setShowMarketDropdown(true)}
                                    placeholder="e.g. Asian Total Cards"
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] shadow-sm"
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

                        {/* Direction */}
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left">Direction</label>
                            <div className="col-span-2 relative">
                                <select value={betDirection} onChange={(e) => setBetDirection(e.target.value)} className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] shadow-sm appearance-none cursor-pointer">
                                    <option value="">Select...</option>
                                    {marketDirectionOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Bookmaker */}
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label className="col-span-1 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-left">Bookmaker</label>
                            <div className="col-span-2 relative">
                                <select value={bookmaker} onChange={(e) => setBookmaker(e.target.value)} className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#10b981] shadow-sm appearance-none cursor-pointer">
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
                        <div className="grid grid-cols-3 items-center gap-4">
                            <div className="col-span-1 flex justify-between items-center pr-2">
                                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Odds</label>
                                <select 
                                    className="text-[10px] font-bold text-gray-400 bg-transparent uppercase tracking-wider outline-none cursor-pointer hover:text-[#121212]"
                                    value={oddsFormat}
                                    onChange={(e: any) => setOddsFormat(e.target.value)}
                                >
                                    <option value="decimal">Dec</option>
                                    <option value="fractional">Frac</option>
                                    <option value="cents">¢</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <input 
                                    type="text" 
                                    value={odds}
                                    onChange={(e) => setOdds(e.target.value)}
                                    placeholder={oddsFormat === 'decimal' ? "1.90" : oddsFormat === 'fractional' ? "9/10" : "52.6¢"}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Stake */}
                        <div className="grid grid-cols-3 items-center gap-4">
                            <div className="col-span-1 flex justify-between items-center pr-2">
                                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Stake</label>
                                <select 
                                    className="text-[10px] font-bold text-gray-400 bg-transparent uppercase tracking-wider outline-none cursor-pointer hover:text-[#121212]"
                                    value={stakeFormat}
                                    onChange={(e: any) => setStakeFormat(e.target.value)}
                                >
                                    <option value="units">Units</option>
                                    <option value="currency">Cur</option>
                                </select>
                            </div>
                            <div className="col-span-2 relative">
                                <input 
                                    type="number" 
                                    value={stake}
                                    onChange={(e) => setStake(e.target.value)}
                                    placeholder={stakeFormat === 'units' ? "1.5" : "50.00"}
                                    className="w-full pl-3 pr-7 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#10b981] shadow-sm"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400 pointer-events-none">
                                    {stakeFormat === 'units' ? 'u' : '£'}
                                </span>
                            </div>
                        </div>
                    </div>

                    """
    
    new_content = content[:start_idx] + new_form_layout + content[end_idx:]
    
    with open(filepath, "w") as f:
        f.write(new_content)
    print("Reformatted single bet form to 1/3 label 2/3 input")
else:
    print("Markers not found!")
