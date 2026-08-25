import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

# I will replace the table body row mapping logic to support the new keys from save_bet.py

old_row = """                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#121212]">{bet.fixture_name || 'Event'}</div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">{new Date(bet.tracked_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#121212]">{bet.selection || bet.player_name}</div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">{bet.market}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[#121212]">
                                            {bet.odds.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-600">
                                            {bet.stake}u
                                        </td>"""

new_row = """                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#121212]">{bet.fixture_name || bet.match || bet.search_event || 'Event'}</div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">{bet.tracked_at || bet.created_at ? new Date(bet.tracked_at || bet.created_at).toLocaleDateString() : 'Unknown Date'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#121212]">{bet.selection || bet.player_name || (bet.bet_type === 'multiple' || bet.is_multiple ? 'Multiple / Accumulator' : 'Unknown Selection')}</div>
                                            <div className="text-[12px] text-gray-500 mt-0.5">{bet.market || 'Unknown Market'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[#121212]">
                                            {bet.odds ? Number(bet.odds).toFixed(2) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-600">
                                            {bet.stake !== undefined ? bet.stake : (bet.units_staked !== undefined ? bet.units_staked : (bet.actual_stake || 0))}u
                                        </td>"""

if old_row in content:
    content = content.replace(old_row, new_row)
    with open(filepath, "w") as f:
        f.write(content)
    print("Updated table mapping logic in page.tsx")
else:
    print("Could not find the old row mapping in page.tsx")
