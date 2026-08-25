import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """                    return bet;
                }));
                setBulkBets(resolvedBets);
                setBetStructure('multiple');
            } else {"""

new_logic = """                    return bet;
                }));
                setBulkBets(resolvedBets);
                
                // If all bets belong to the exact same game, it's a Bet Builder (Single game multi), so toggle the structure to 'single'
                const allSameEvent = resolvedBets.length > 0 && resolvedBets.every((b: any) => b.searchEvent && b.searchEvent === resolvedBets[0].searchEvent);
                setBetStructure(allSameEvent ? 'single' : 'multiple');
            } else {"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched bet structure logic in handleParse")
else:
    print("Marker not found")
