import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = "<h3 className=\"text-[16px] font-bold text-[#121212]\">Bulk Bets Detected ({bulkBets.length})</h3>"
new_logic = "<h3 className=\"text-[16px] font-bold text-[#121212]\">{betStructure === 'single' ? 'Bet Builder Selections' : 'Bulk Bets Detected'} ({bulkBets.length})</h3>"

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched bulk bets title")
else:
    print("Marker not found")
