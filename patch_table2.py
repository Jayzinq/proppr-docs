import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_row = """                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#121212]">{bet.selection || bet.player_name || (bet.bet_type === 'multiple' || bet.is_multiple ? 'Multiple / Accumulator' : 'Unknown Selection')}</div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">{bet.market || 'Unknown Market'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[#121212]">
                                            {bet.odds ? Number(bet.odds).toFixed(2) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-600">
                                            {bet.stake !== undefined ? bet.stake : (bet.units_staked !== undefined ? bet.units_staked : (bet.actual_stake || 0))}u
                                        </td>"""

new_row = """                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#121212]">
                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) return 'Multiple / Accumulator';
                                                    const s = bet.selection || bet.player_name || bet.team;
                                                    if (!s || s === 'Unknown Player' || s === 'Unknown') return 'Unknown Selection';
                                                    return s;
                                                })()}
                                            </div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">
                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) return 'Multi-Bet';
                                                    const m = [bet.market_direction, bet.threshold, bet.market].filter(Boolean).join(' ');
                                                    return m || bet.market || 'Unknown Market';
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[#121212]">
                                            {bet.odds ? Number(bet.odds).toFixed(2) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-600">
                                            {bet.stake !== undefined && bet.stake !== 0 ? bet.stake : (bet.units_staked !== undefined && bet.units_staked !== 0 ? bet.units_staked : (bet.actual_stake || 0))}u
                                        </td>"""

if old_row in content:
    content = content.replace(old_row, new_row)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched table mapping")
else:
    print("Old row not found!")
