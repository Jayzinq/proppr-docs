import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """            if (data.error) {
                alert('Error parsing text: ' + data.error);
            } else if (data.bets) {
                const resolvedBets = data.bets.map((bet: any) => {"""

new_logic = """            if (data.error) {
                alert('Error parsing text: ' + data.error);
            } else if (data.bets && data.bets.length > 1) {
                const resolvedBets = data.bets.map((bet: any) => {"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    
    old_logic2 = """            } else {
                let rEvent = null;
                if (data.searchEvent && eventIndex.length > 0) {"""
                
    new_logic2 = """            } else {
                const singleBetData = (data.bets && data.bets.length === 1) ? data.bets[0] : data;
                let rEvent = null;
                if (singleBetData.searchEvent && eventIndex.length > 0) {"""
    
    if old_logic2 in content:
        content = content.replace(old_logic2, new_logic2)
        
        # Now replace all `data.` with `singleBetData.` in the else block
        # It's safer to just replace them manually.
        old_data_refs = [
            "data.searchEvent",
            "data.date",
            "data.time",
            "data.country",
            "data.league",
            "data.market",
            "data.selection",
            "data.betDirection",
            "data.bookmaker",
            "data.odds",
            "data.stake"
        ]
        
        # We need to replace these only inside the else block
        start_idx = content.find("} else {", content.find("setBetStructure('multiple');"))
        end_idx = content.find("} catch (error) {", start_idx)
        
        if start_idx != -1 and end_idx != -1:
            block = content[start_idx:end_idx]
            for ref in old_data_refs:
                block = block.replace(ref, ref.replace("data.", "singleBetData."))
            content = content[:start_idx] + block + content[end_idx:]
            
        with open(filepath, "w") as f:
            f.write(content)
        print("Patched handleParse single/multiple logic")
    else:
        print("Second marker not found")
else:
    print("First marker not found")
