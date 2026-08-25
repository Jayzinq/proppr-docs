import re

with open("src/app/track/layout.tsx", "r") as f:
    content = f.read()

content = content.replace('p-6', 'px-6 py-4')

with open("src/app/track/layout.tsx", "w") as f:
    f.write(content)

with open("src/app/track/new-bet/page.tsx", "r") as f:
    content = f.read()

content = content.replace('pb-20', 'pb-4')
content = content.replace('h-24', 'h-20')
content = content.replace('space-y-5', 'space-y-4')

with open("src/app/track/new-bet/page.tsx", "w") as f:
    f.write(content)

print("Tightened vertical spaces")
