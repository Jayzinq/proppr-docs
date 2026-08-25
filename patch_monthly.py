import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

old_logic = """        const monthlyMap = new Map();
        
        const data = chronologicalBets.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'half_win' || b.status === 'half_loss').map(bet => {
            cumulative += bet.profit_loss || 0;
            staked += bet.stake || 0;
            s++;
            if (bet.status === 'won' || bet.status === 'half_win') w++;
            
            // Monthly agg
            const dateVal = bet.tracked_at || bet.created_at;
            let month = 'Unknown';
            let name = 'Unknown';
            if (dateVal) {
                try {
                    let t = typeof dateVal === 'object' && dateVal.$date ? dateVal.$date : dateVal;
                    month = new Date(t).toLocaleString('default', { month: 'short' });
                    name = new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                } catch (e) {}
            }
            monthlyMap.set(month, (monthlyMap.get(month) || 0) + (bet.profit_loss || 0));

            return {
                name,
                value: Number(cumulative.toFixed(2)),
            };
        });
        
        const mData = Array.from(monthlyMap.entries()).map(([month, val]) => ({
            month, value: Number(val.toFixed(2))
        }));"""

new_logic = """        const monthlyMap = new Map();
        
        const now = new Date();
        const startLimit = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        let earliestDate = new Date();
        
        if (chronologicalBets.length > 0) {
            const firstBetDateVal = chronologicalBets[0].tracked_at || chronologicalBets[0].created_at;
            if (firstBetDateVal) {
                try {
                    let t = typeof firstBetDateVal === 'object' && firstBetDateVal.$date ? firstBetDateVal.$date : firstBetDateVal;
                    earliestDate = new Date(t);
                } catch(e) {}
            }
        }
        
        const actualStart = earliestDate < startLimit ? startLimit : earliestDate;
        const iter = new Date(actualStart.getFullYear(), actualStart.getMonth(), 1);
        const endIter = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Pre-fill the last up-to-12 months
        while (iter <= endIter) {
            // Using "MMM 'YY" ensures no collisions if exactly 12 months span the same month name,
            // but the user's previous chart just used short month. We'll stick to short month as they only span 12 max.
            const mStr = iter.toLocaleString('default', { month: 'short' });
            // Let's append year if we want to be super safe: iter.toLocaleString('default', { month: 'short', year: '2-digit' })
            // Wait, let's just use short month to match their "Dec" requirement.
            monthlyMap.set(mStr, 0);
            iter.setMonth(iter.getMonth() + 1);
        }
        
        const validMonths = Array.from(monthlyMap.keys());
        
        const data = chronologicalBets.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'half_win' || b.status === 'half_loss').map(bet => {
            cumulative += bet.profit_loss || 0;
            staked += bet.stake || 0;
            s++;
            if (bet.status === 'won' || bet.status === 'half_win') w++;
            
            // Monthly agg
            const dateVal = bet.tracked_at || bet.created_at;
            let month = 'Unknown';
            let name = 'Unknown';
            if (dateVal) {
                try {
                    let t = typeof dateVal === 'object' && dateVal.$date ? dateVal.$date : dateVal;
                    const d = new Date(t);
                    month = d.toLocaleString('default', { month: 'short' });
                    name = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    
                    // Only add to the chart if it's within the 12-month pre-filled window
                    if (d >= startLimit) {
                        if (monthlyMap.has(month)) {
                            monthlyMap.set(month, monthlyMap.get(month) + (bet.profit_loss || 0));
                        }
                    }
                } catch (e) {}
            }

            return {
                name,
                value: Number(cumulative.toFixed(2)),
            };
        });
        
        const mData = validMonths.map(month => ({
            month, value: Number(monthlyMap.get(month).toFixed(2))
        }));"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched monthly data logic")
else:
    print("Old logic not found!")
