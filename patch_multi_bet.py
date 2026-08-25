import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) return 'Multiple / Accumulator';
                                                    const s = bet.selection || bet.player_name || bet.team;
                                                    if (!s || s === 'Unknown Player' || s === 'Unknown') return 'Unknown Selection';
                                                    return s;
                                                })()}
                                            </div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">
                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) return 'Multi-Bet';
                                                    let md = bet.market_direction || '';
                                                    if (typeof md === 'string') {
                                                        const lmd = md.toLowerCase();
                                                        if (lmd === 'positive' || lmd === 'plus') md = '+';
                                                        else if (lmd === 'negative' || lmd === 'minus') md = '-';
                                                    }
                                                    
                                                    let thresh = bet.threshold || '';
                                                    let prefix = '';
                                                    if (md && thresh) {
                                                        prefix = (md === '+' || md === '-') ? `${md}${thresh}` : `${md} ${thresh}`;
                                                    } else if (md) {
                                                        prefix = md;
                                                    } else if (thresh) {
                                                        prefix = thresh;
                                                    }
                                                    
                                                    let m = [prefix, bet.market].filter(Boolean).join(' ');
                                                    if (!m) m = bet.market || 'Unknown Market';
                                                    
                                                    // Capitalize each word
                                                    return m.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                                                })()}"""

new_logic = """                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) {
                                                        if (!bet.multi_bet_selections || !Array.isArray(bet.multi_bet_selections) || bet.multi_bet_selections.length === 0) {
                                                            return 'Bet Builder';
                                                        }
                                                        const matchCounts: Record<string, number> = {};
                                                        bet.multi_bet_selections.forEach((sel: any) => {
                                                            const m = sel.match || sel.searchEvent || sel.fixture_name || 'Unknown Match';
                                                            matchCounts[m] = (matchCounts[m] || 0) + 1;
                                                        });
                                                        const numMatches = Object.keys(matchCounts).length;
                                                        const maxSels = Math.max(...Object.values(matchCounts));
                                                        
                                                        if (maxSels >= 2) return 'Bet Builder';
                                                        if (numMatches === 2) return 'Double';
                                                        if (numMatches === 3) return 'Treble';
                                                        if (numMatches >= 4) return 'Accumulator';
                                                        return 'Bet Builder';
                                                    }
                                                    const s = bet.selection || bet.player_name || bet.team;
                                                    if (!s || s === 'Unknown Player' || s === 'Unknown') return 'Unknown Selection';
                                                    return s;
                                                })()}
                                            </div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">
                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) {
                                                        if (!bet.multi_bet_selections || !Array.isArray(bet.multi_bet_selections) || bet.multi_bet_selections.length === 0) {
                                                            return 'Mixed';
                                                        }
                                                        let hasPlayer = false;
                                                        let hasTeam = false;
                                                        bet.multi_bet_selections.forEach((sel: any) => {
                                                            const isPlayerMarket = sel.market && String(sel.market).toLowerCase().includes('player');
                                                            const hasPlayerName = sel.player_name && sel.player_name !== 'Unknown Player' && sel.player_name !== 'Unknown';
                                                            const hasSel = sel.selection && sel.selection !== 'Unknown Player' && sel.selection !== 'Unknown';
                                                            
                                                            if (isPlayerMarket || hasPlayerName || hasSel) {
                                                                hasPlayer = true;
                                                            } else {
                                                                hasTeam = true;
                                                            }
                                                        });
                                                        if (hasPlayer && !hasTeam) return 'Player Props';
                                                        if (!hasPlayer && hasTeam) return 'Team Props';
                                                        return 'Mixed';
                                                    }
                                                    let md = bet.market_direction || '';
                                                    if (typeof md === 'string') {
                                                        const lmd = md.toLowerCase();
                                                        if (lmd === 'positive' || lmd === 'plus') md = '+';
                                                        else if (lmd === 'negative' || lmd === 'minus') md = '-';
                                                    }
                                                    
                                                    let thresh = bet.threshold || '';
                                                    let prefix = '';
                                                    if (md && thresh) {
                                                        prefix = (md === '+' || md === '-') ? `${md}${thresh}` : `${md} ${thresh}`;
                                                    } else if (md) {
                                                        prefix = md;
                                                    } else if (thresh) {
                                                        prefix = thresh;
                                                    }
                                                    
                                                    let m = [prefix, bet.market].filter(Boolean).join(' ');
                                                    if (!m) m = bet.market || 'Unknown Market';
                                                    
                                                    return m.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                                                })()}"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched multi bet logic")
else:
    print("Old logic not found!")
