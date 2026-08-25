import re

with open("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx", "r") as f:
    content = f.read()

# We need to replace the bulkBets.map return block

old_jsx = """
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
"""

new_jsx = """
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Market</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.market || ''} onChange={(e) => updateBulkBet(idx, 'market', e.target.value)} placeholder="e.g. Asian Total Cards" />
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                    Bet Type
                                                    {inferBetType(bet.selection || '', bet.market || '') === 'player' && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px]">Player Props</span>}
                                                    {inferBetType(bet.selection || '', bet.market || '') === 'team' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px]">Team Props</span>}
                                                    {inferBetType(bet.selection || '', bet.market || '') === 'match' && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px]">Match Result</span>}
                                                </label>
                                                <select className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all appearance-none" value={bet.betDirection || ''} onChange={(e) => updateBulkBet(idx, 'betDirection', e.target.value)}>
                                                    <option value="">Direction...</option>
                                                    <option value="Over">Over</option>
                                                    <option value="Under">Under</option>
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bookmaker</label>
                                                <input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all capitalize" value={bet.bookmaker || ''} onChange={(e) => updateBulkBet(idx, 'bookmaker', e.target.value)} placeholder="e.g. bet365" />
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
"""

content = content.replace(old_jsx, new_jsx)

with open("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx", "w") as f:
    f.write(content)

