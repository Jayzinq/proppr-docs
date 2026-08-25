import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """            for (const bet of bulkBets) {
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
            }"""

new_logic = """            // If we are saving bulk bets, determine if they should be saved as a single multi-bet or independent bets
            if (betStructure === 'multiple' || (betStructure === 'single' && bulkBets.length > 1)) {
                // Determine common fields from the first bet
                const firstBet = bulkBets[0];
                const searchEvent = bulkBets.every(b => b.searchEvent === firstBet.searchEvent) ? firstBet.searchEvent : (bulkBets.length + ' selections');
                const isSingleEvent = bulkBets.every(b => b.searchEvent === firstBet.searchEvent);

                // Format as a single payload with multi_bet_selections
                await fetch('/api/save-bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        betStructure: betStructure, // 'single' for Bet Builder, 'multiple' for Accumulator
                        is_multiple: true,
                        date: firstBet.date || '',
                        time: firstBet.time || '',
                        country: firstBet.country || '',
                        league: firstBet.league || '',
                        searchEvent: searchEvent,
                        bookmaker: firstBet.bookmaker || '',
                        odds: firstBet.odds || '', // Assuming odds and stake are filled out identically or only on the first bet
                        stake: firstBet.stake || '',
                        oddsApiEventId: firstBet.oddsApiEventId || '',
                        oddsApiLeagueSlug: firstBet.oddsApiLeagueSlug || '',
                        eventSport: firstBet.eventSport || '',
                        eventSource: firstBet.eventSource || '',
                        multi_bet_selections: bulkBets.map((bet: any) => ({
                            market: bet.market || '',
                            selection: bet.selection || '',
                            bet_direction: bet.betDirection || '',
                            odds: parseFloat(bet.odds || '0'),
                            match: bet.searchEvent || '',
                            sport: bet.eventSport || ''
                        }))
                    })
                });
            } else {
                // Fallback to saving as truly independent bets (should rarely happen now if UI controls match)
                for (const bet of bulkBets) {
                    await fetch('/api/save-bet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            betStructure: 'single',
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
            }"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched frontend save bulk logic")
else:
    print("Marker not found")
