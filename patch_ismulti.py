import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) {"""

new_logic = """                                                {(() => {
                                                    const marketLower = String(bet.market || '').toLowerCase();
                                                    const isMulti = bet.bet_type === 'multiple' || bet.is_multiple || marketLower.includes('multi-bet') || marketLower.includes('accumulator') || marketLower.includes('bet builder');
                                                    if (isMulti) {"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)

    old_logic_2 = """                                                {(() => {
                                                    if (bet.bet_type === 'multiple' || bet.is_multiple) {"""
    
    if old_logic_2 in content:
        content = content.replace(old_logic_2, new_logic)

    with open(filepath, "w") as f:
        f.write(content)
    print("Patched isMulti detection logic")
else:
    print("Old logic not found!")
