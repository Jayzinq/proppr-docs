import re

with open("src/app/track/page.tsx", "r") as f:
    content = f.read()

# Space-y and gaps
content = content.replace('space-y-8', 'space-y-4')
content = content.replace('gap-6', 'gap-4')

# Card paddings
content = content.replace('p-8 shadow-sm', 'p-5 shadow-sm')
content = content.replace('rounded-2xl p-6 shadow-sm', 'rounded-xl p-4 shadow-sm')

# Table paddings
content = content.replace('px-6 py-4', 'px-4 py-3')
content = content.replace('p-6 border-b', 'p-4 border-b')

# Chart heights
content = content.replace('h-[280px]', 'h-[240px]')
content = content.replace('h-[240px]', 'h-[200px]')

with open("src/app/track/page.tsx", "w") as f:
    f.write(content)

print("Tightened dashboard")
