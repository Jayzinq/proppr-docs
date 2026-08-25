import re

with open("src/app/api/events/search/route.ts", "r") as f:
    content = f.read()

# Replace the odds_api_events query
old_query = """db.collection("odds_api_events").find(
                            { $or: [ { home: { $regex: new RegExp(qTokens.join("|"), "i") } }, { away: { $regex: new RegExp(qTokens.join("|"), "i") } } ] },
                            { projection: { id: 1, home: 1, away: 1, date: 1, time: 1, league: 1, country: 1, sport: 1 }, sort: { date: -1 }, limit: 50 }
                        ).toArray()"""
                        
new_query = """db.collection("odds_api_events").find(
                            { $or: [ { home: { $regex: qTokens.join("|"), $options: "i" } }, { away: { $regex: qTokens.join("|"), $options: "i" } } ] },
                            { projection: { id: 1, home: 1, away: 1, date: 1, time: 1, league: 1, country: 1, sport: 1 }, sort: { date: -1 }, limit: 50 }
                        ).toArray()"""

content = content.replace(old_query, new_query)

# Also we need to sort suggestions!
old_push = """                        item.score = scoreEvent(query, item);
                        if (item.score > 0) suggestions.push(item);
                    }
                }
            } catch (e) {"""

new_push = """                        item.score = scoreEvent(query, item);
                        if (item.score > 0) suggestions.push(item);
                    }
                    
                    suggestions.sort((a, b) => {
                        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                        return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
                    });
                }
            } catch (e) {"""

content = content.replace(old_push, new_push)

with open("src/app/api/events/search/route.ts", "w") as f:
    f.write(content)

