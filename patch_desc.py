import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """                                                        if (!bet.multi_bet_selections || !Array.isArray(bet.multi_bet_selections) || bet.multi_bet_selections.length === 0) {
                                                            return 'Bet Builder';
                                                        }"""

new_logic = """                                                        if (!bet.multi_bet_selections || !Array.isArray(bet.multi_bet_selections) || bet.multi_bet_selections.length === 0) {
                                                            if (bet.multi_bet_description) {
                                                                const legs = bet.multi_bet_description.split('|');
                                                                const matchCounts: Record<string, number> = {};
                                                                legs.forEach((leg: string) => {
                                                                    const mMatch = leg.match(/🏟\\s*([^🎯\\n]+)/);
                                                                    if (mMatch) {
                                                                        const m = mMatch[1].trim();
                                                                        matchCounts[m] = (matchCounts[m] || 0) + 1;
                                                                    }
                                                                });
                                                                const numMatches = Object.keys(matchCounts).length;
                                                                if (numMatches > 0) {
                                                                    const maxSels = Math.max(...Object.values(matchCounts));
                                                                    if (maxSels >= 2) return 'Bet Builder';
                                                                    if (numMatches === 2) return 'Double';
                                                                    if (numMatches === 3) return 'Treble';
                                                                    if (numMatches >= 4) return 'Accumulator';
                                                                }
                                                            }
                                                            return 'Bet Builder';
                                                        }"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)

    old_logic_2 = """                                                        if (!bet.multi_bet_selections || !Array.isArray(bet.multi_bet_selections) || bet.multi_bet_selections.length === 0) {
                                                            return 'Mixed';
                                                        }"""
    
    new_logic_2 = """                                                        if (!bet.multi_bet_selections || !Array.isArray(bet.multi_bet_selections) || bet.multi_bet_selections.length === 0) {
                                                            if (bet.multi_bet_description) {
                                                                const lowerDesc = bet.multi_bet_description.toLowerCase();
                                                                const isPlayer = lowerDesc.includes('player');
                                                                if (isPlayer) return 'Player Props';
                                                                return 'Team Props';
                                                            }
                                                            return 'Mixed';
                                                        }"""
    if old_logic_2 in content:
        content = content.replace(old_logic_2, new_logic_2)

    with open(filepath, "w") as f:
        f.write(content)
    print("Patched description parsing")
else:
    print("Old logic not found!")
