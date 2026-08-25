import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

# 1. Fix sorting in useMemo bets and allBets
sort1_old = """            const sorted = [...userBets].sort((a: any, b: any) =>
                new Date(b.tracked_at).getTime() - new Date(a.tracked_at).getTime()
            );"""
sort1_new = """            const sorted = [...userBets].sort((a: any, b: any) => {
                const dateA = a.tracked_at || a.created_at;
                const dateB = b.tracked_at || b.created_at;
                if (!dateA) return 1;
                if (!dateB) return -1;
                let tA = typeof dateA === 'object' && dateA.$date ? dateA.$date : dateA;
                let tB = typeof dateB === 'object' && dateB.$date ? dateB.$date : dateB;
                return new Date(tB).getTime() - new Date(tA).getTime();
            });"""

if sort1_old in content:
    content = content.replace(sort1_old, sort1_new)

filter_old = """        return allBets.filter(b => new Date(b.tracked_at) >= past);"""
filter_new = """        return allBets.filter(b => {
            const dateVal = b.tracked_at || b.created_at;
            if (!dateVal) return false;
            let t = typeof dateVal === 'object' && dateVal.$date ? dateVal.$date : dateVal;
            return new Date(t) >= past;
        });"""

if filter_old in content:
    content = content.replace(filter_old, filter_new)

sort2_old = """        const chronologicalBets = [...bets].sort((a: any, b: any) =>
            new Date(a.tracked_at).getTime() - new Date(b.tracked_at).getTime()
        );"""
sort2_new = """        const chronologicalBets = [...bets].sort((a: any, b: any) => {
            const dateA = a.tracked_at || a.created_at;
            const dateB = b.tracked_at || b.created_at;
            if (!dateA) return 1;
            if (!dateB) return -1;
            let tA = typeof dateA === 'object' && dateA.$date ? dateA.$date : dateA;
            let tB = typeof dateB === 'object' && dateB.$date ? dateB.$date : dateB;
            return new Date(tA).getTime() - new Date(tB).getTime();
        });"""

if sort2_old in content:
    content = content.replace(sort2_old, sort2_new)

# 2. Fix the `toLocaleString` crash
chart_old = """            // Monthly agg
            const month = new Date(bet.tracked_at).toLocaleString('default', { month: 'short' });
            monthlyMap.set(month, (monthlyMap.get(month) || 0) + (bet.profit_loss || 0));

            return {
                name: new Date(bet.tracked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                value: Number(cumulative.toFixed(2)),
            };"""

chart_new = """            // Monthly agg
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
            };"""

if chart_old in content:
    content = content.replace(chart_old, chart_new)


# 3. Fix the table row date rendering
row_date_old = """                                            <div className="text-[12px] text-gray-500 mt-0.5">{bet.tracked_at || bet.created_at ? new Date(bet.tracked_at || bet.created_at).toLocaleDateString() : 'Unknown Date'}</div>"""
row_date_new = """                                            <div className="text-[12px] text-gray-500 mt-0.5">{(() => {
                                                const d = bet.tracked_at || bet.created_at;
                                                if (!d) return 'Unknown Date';
                                                try {
                                                    let t = typeof d === 'object' && d.$date ? d.$date : d;
                                                    return new Date(t).toLocaleDateString();
                                                } catch(e) { return 'Unknown Date'; }
                                            })()}</div>"""

if row_date_old in content:
    content = content.replace(row_date_old, row_date_new)

with open(filepath, "w") as f:
    f.write(content)
print("Patched page.tsx dates to avoid crashing on missing tracked_at or Mongo $date objects.")
