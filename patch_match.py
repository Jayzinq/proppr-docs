import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """<div className="font-semibold text-[#121212]">{bet.fixture_name || bet.match || bet.search_event || 'Event'}</div>"""

new_logic = """<div className="font-semibold text-[#121212]">
                                                {(() => {
                                                    let m = bet.fixture_name || bet.match || bet.search_event || 'Event';
                                                    if (typeof m === 'string') {
                                                        m = m.replace(/\\s+multi-bet$/i, '').replace(/\\s+accumulator$/i, '').replace(/\\s+bet builder$/i, '');
                                                    }
                                                    return m;
                                                })()}
                                            </div>"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched match name logic")
else:
    print("Old logic not found!")
