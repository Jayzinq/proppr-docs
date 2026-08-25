import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) return 'Multi-Bet';
                                                    const m = [bet.market_direction, bet.threshold, bet.market].filter(Boolean).join(' ');
                                                    return m || bet.market || 'Unknown Market';
                                                })()}"""

new_logic = """                                                {(() => {
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

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched market direction and capitalization logic")
else:
    print("Old logic not found!")
