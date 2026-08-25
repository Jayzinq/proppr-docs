import os

filepath = "src/app/track/new-bet/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

# We need to find the handleParse function and insert the resolution logic.

old_handle_parse = """            if (data.error) {
                alert('Error parsing text: ' + data.error);
            } else if (data.bets) {
                setBulkBets(data.bets);
                setBetStructure('multiple');
            } else {

                if (data.searchEvent) setSearchEvent(data.searchEvent);
                if (data.date) setDate(data.date);
                if (data.time) setTime(data.time);
                if (data.country) setCountry(data.country);
                if (data.league) setLeague(data.league);"""

new_handle_parse = """            if (data.error) {
                alert('Error parsing text: ' + data.error);
            } else if (data.bets) {
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
                let rEvent = null;
                if (data.searchEvent && eventIndex.length > 0) {
                    const bestMatch = eventIndex
                        .map((e) => ({ event: e, score: scoreEventSuggestion(data.searchEvent, e) }))
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
                    if (data.searchEvent) setSearchEvent(data.searchEvent);
                    if (data.date) setDate(data.date);
                    if (data.time) setTime(data.time);
                    if (data.country) setCountry(data.country);
                    if (data.league) setLeague(data.league);
                }"""

new_content = content.replace(old_handle_parse, new_handle_parse)

with open(filepath, "w") as f:
    f.write(new_content)

print("Updated handleParse in page.tsx")
