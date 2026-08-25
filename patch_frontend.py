import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """            if (data.error) {
                alert('Error parsing text: ' + data.error);
            } else if (data.bets && data.bets.length > 1) {
                const resolvedBets = data.bets.map((bet: any) => {
                    if (bet.searchEvent && eventIndex.length > 0) {
                        const bestMatch = eventIndex
                            .map((e) => ({ event: e, score: scoreEventSuggestion(bet.searchEvent, e) }))
                            .filter(({ score }) => score > 0)
                            .sort((a, b) => b.score - a.score)[0];
                        if (bestMatch) {
                            return {
                                ...bet,
                                searchEvent: bestMatch.event.searchEvent,
                                date: bestMatch.event.date,
                                time: bestMatch.event.time,
                                country: bestMatch.event.country,
                                league: bestMatch.event.league
                            };
                        }
                    }
                    return bet;
                });
                setBulkBets(resolvedBets);
                setBetStructure('multiple');
            } else {
                const singleBetData = (data.bets && data.bets.length === 1) ? data.bets[0] : data;
                let rEvent = null;
                if (singleBetData.searchEvent && eventIndex.length > 0) {
                    const bestMatch = eventIndex
                        .map((e) => ({ event: e, score: scoreEventSuggestion(singleBetData.searchEvent, e) }))
                        .filter(({ score }) => score > 0)
                        .sort((a, b) => b.score - a.score)[0];
                    if (bestMatch) rEvent = bestMatch.event;
                }

                if (rEvent) {
                    setSearchEvent(rEvent.searchEvent);
                    setDate(rEvent.date);
                    setTime(rEvent.time);
                    setCountry(rEvent.country);
                    setLeague(rEvent.league);
                } else {
                    if (singleBetData.searchEvent) setSearchEvent(singleBetData.searchEvent);
                    if (singleBetData.date) setDate(singleBetData.date);
                    if (singleBetData.time) setTime(singleBetData.time);
                    if (singleBetData.country) setCountry(singleBetData.country);
                    if (singleBetData.league) setLeague(singleBetData.league);
                }"""

new_logic = """            if (data.error) {
                alert('Error parsing text: ' + data.error);
            } else if (data.bets && data.bets.length > 1) {
                const resolvedBets = await Promise.all(data.bets.map(async (bet: any) => {
                    if (bet.searchEvent) {
                        let bestMatch = null;
                        if (eventIndex.length > 0) {
                            bestMatch = eventIndex
                                .map((e) => ({ event: e, score: scoreEventSuggestion(bet.searchEvent, e) }))
                                .filter(({ score }) => score > 0)
                                .sort((a, b) => b.score - a.score)[0];
                        }
                        if (!bestMatch) {
                            try {
                                const qRes = await fetch('/api/events/search?q=' + encodeURIComponent(bet.searchEvent));
                                const qData = await qRes.json();
                                if (qData.suggestions && qData.suggestions.length > 0) {
                                    bestMatch = { event: qData.suggestions[0], score: 100 };
                                }
                            } catch (e) {}
                        }
                        if (bestMatch) {
                            return {
                                ...bet,
                                searchEvent: bestMatch.event.searchEvent,
                                date: bestMatch.event.date,
                                time: bestMatch.event.time,
                                country: bestMatch.event.country,
                                league: bestMatch.event.league
                            };
                        }
                    }
                    return bet;
                }));
                setBulkBets(resolvedBets);
                setBetStructure('multiple');
            } else {
                const singleBetData = (data.bets && data.bets.length === 1) ? data.bets[0] : data;
                let rEvent = null;
                if (singleBetData.searchEvent) {
                    let bestMatch = null;
                    if (eventIndex.length > 0) {
                        bestMatch = eventIndex
                            .map((e) => ({ event: e, score: scoreEventSuggestion(singleBetData.searchEvent, e) }))
                            .filter(({ score }) => score > 0)
                            .sort((a, b) => b.score - a.score)[0];
                    }
                    if (!bestMatch) {
                        try {
                            const qRes = await fetch('/api/events/search?q=' + encodeURIComponent(singleBetData.searchEvent));
                            const qData = await qRes.json();
                            if (qData.suggestions && qData.suggestions.length > 0) {
                                bestMatch = { event: qData.suggestions[0], score: 100 };
                            }
                        } catch (e) {}
                    }
                    if (bestMatch) rEvent = bestMatch.event;
                }

                if (rEvent) {
                    setSearchEvent(rEvent.searchEvent);
                    setDate(rEvent.date);
                    setTime(rEvent.time);
                    setCountry(rEvent.country);
                    setLeague(rEvent.league);
                } else {
                    if (singleBetData.searchEvent) setSearchEvent(singleBetData.searchEvent);
                    if (singleBetData.date) setDate(singleBetData.date);
                    if (singleBetData.time) setTime(singleBetData.time);
                    if (singleBetData.country) setCountry(singleBetData.country);
                    if (singleBetData.league) setLeague(singleBetData.league);
                }"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched frontend parse logic")
else:
    print("Marker not found")
