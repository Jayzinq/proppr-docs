import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

# We need to replace the ENTIRE `isMulti` block for selection.
import re

# Find the block starting with `const isMulti = ` and ending right before `const s = bet.selection`
start_marker = "const isMulti = bet.bet_type === 'multiple' || bet.is_multiple"
end_marker = "const s = bet.selection || bet.player_name || bet.team;"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker, start_idx)
    
    old_block = content[start_idx:end_idx]
    
    new_block = """const marketLower = String(bet.market || '').toLowerCase();
                                                    const isMulti = bet.bet_type === 'multiple' || bet.is_multiple || marketLower.includes('multi-bet') || marketLower.includes('accumulator') || marketLower.includes('bet builder');
                                                    if (isMulti) {
                                                        let numMatches = 0;
                                                        let maxSels = 0;
                                                        
                                                        // 1. Try to parse multi_bet_description first as it is the most accurate for legs
                                                        if (bet.multi_bet_description) {
                                                            const legs = bet.multi_bet_description.split('|');
                                                            const descCounts: Record<string, number> = {};
                                                            legs.forEach((leg: string) => {
                                                                const mMatch = leg.match(/🏟\\s*([^🎯\\n]+)/);
                                                                if (mMatch) {
                                                                    const m = mMatch[1].trim();
                                                                    descCounts[m] = (descCounts[m] || 0) + 1;
                                                                }
                                                            });
                                                            if (Object.keys(descCounts).length > 0) {
                                                                numMatches = Object.keys(descCounts).length;
                                                                maxSels = Math.max(...Object.values(descCounts));
                                                            }
                                                        }
                                                        
                                                        // 2. If no description, try parsing multi_bet_selections
                                                        if (numMatches === 0 && bet.multi_bet_selections && Array.isArray(bet.multi_bet_selections) && bet.multi_bet_selections.length > 0) {
                                                            const matchCounts: Record<string, number> = {};
                                                            bet.multi_bet_selections.forEach((sel: any) => {
                                                                const m = sel.match || sel.searchEvent || sel.fixture_name || 'Unknown Match';
                                                                matchCounts[m] = (matchCounts[m] || 0) + 1;
                                                            });
                                                            const matchNames = Object.keys(matchCounts);
                                                            if (matchNames.length === 1 && /multi-match/i.test(matchNames[0])) {
                                                                const mMatch = matchNames[0].match(/(\\d+)\\s+selections/i);
                                                                if (mMatch) {
                                                                    numMatches = parseInt(mMatch[1], 10);
                                                                    maxSels = 1;
                                                                }
                                                            } else {
                                                                numMatches = matchNames.length;
                                                                maxSels = Math.max(...Object.values(matchCounts));
                                                            }
                                                        }
                                                        
                                                        if (maxSels >= 2) return 'Bet Builder';
                                                        if (numMatches === 2) return 'Double';
                                                        if (numMatches === 3) return 'Treble';
                                                        if (numMatches >= 4) return 'Accumulator';
                                                        return 'Bet Builder';
                                                    }
                                                    """
    
    # We only want to replace the first occurrence (which is the Selection column)
    content = content[:start_idx] + new_block + content[end_idx:]
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched selection block successfully")
else:
    print("Markers not found!")
