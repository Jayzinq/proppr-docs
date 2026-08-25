import re

with open("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx", "r") as f:
    content = f.read()

# 1. Update inferBetType
old_infer = """    const inferBetType = (selectionValue: string, marketValue: string) => {
        const searchString = `${selectionValue} ${marketValue}`.toLowerCase();
        if (searchString.includes('tackles') || searchString.includes('corners') || searchString.includes('cards')) {
            return 'team';
        }
        if (searchString.includes('shots') || searchString.includes('fouls') || searchString.includes('passes')) {
            return 'player';
        }
        return 'match';
    };"""

new_infer = """    const inferBetType = (selectionValue: string, marketValue: string) => {
        const searchString = `${selectionValue} ${marketValue}`.toLowerCase();
        if (searchString.includes('player') || searchString.includes('shots') || searchString.includes('sot') || searchString.includes('fouls') || searchString.includes('passes') || searchString.includes('assist')) {
            return 'player';
        }
        if (searchString.includes('tackles') || searchString.includes('corners') || searchString.includes('cards') || searchString.includes('team ')) {
            return 'team';
        }
        return 'match';
    };"""

content = content.replace(old_infer, new_infer)

# 2. Add <datalist> before the bulkBets.map and update the market input
old_market_input = """<input className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.market || ''} onChange={(e) => updateBulkBet(idx, 'market', e.target.value)} placeholder="e.g. Asian Total Cards" />"""

new_market_input = """<input list="canonicalMarkets" className="w-full text-[13px] font-semibold text-[#121212] bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 focus:bg-white focus:border-[#2bee4b] focus:ring-1 focus:ring-[#2bee4b] outline-none transition-all" value={bet.market || ''} onChange={(e) => updateBulkBet(idx, 'market', e.target.value)} placeholder="e.g. Asian Total Cards" />"""

content = content.replace(old_market_input, new_market_input)

# Add datalist to the top of the bulk bets section
old_bulk_header = """                            <div className="flex items-center justify-between">
                                <h3 className="text-[16px] font-bold text-[#121212]">Bulk Bets Detected ({bulkBets.length})</h3>"""

new_bulk_header = """                            <datalist id="canonicalMarkets">
                                {CANONICAL_MARKETS.map(m => <option key={m} value={m} />)}
                            </datalist>
                            <div className="flex items-center justify-between">
                                <h3 className="text-[16px] font-bold text-[#121212]">Bulk Bets Detected ({bulkBets.length})</h3>"""

content = content.replace(old_bulk_header, new_bulk_header)

with open("/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx", "w") as f:
    f.write(content)

