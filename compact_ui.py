import re

with open("src/app/track/new-bet/page.tsx", "r") as f:
    content = f.read()

# Overall max-width and vertical spacing
content = content.replace('max-w-[800px] mx-auto space-y-8', 'max-w-[850px] mx-auto space-y-5')
content = content.replace('p-6 space-y-8', 'p-5 space-y-5')
content = content.replace('p-6 border-b', 'p-4 border-b')

# Form field vertical spacing (label to input gap)
content = content.replace('space-y-3', 'space-y-1.5')

# Input padding and text sizes
# from py-3 to py-2
content = content.replace('py-3 bg-white border', 'py-2 bg-white border')
content = content.replace('pl-11 pr-4 py-3 bg-white border', 'pl-10 pr-3 py-2 bg-white border')
content = content.replace('px-4 py-3 bg-white border', 'px-3 py-2 bg-white border')
content = content.replace('pl-4 pr-8 py-3 bg-white', 'pl-3 pr-7 py-2 bg-white')

# Grid gaps
content = content.replace('gap-6', 'gap-4')
content = content.replace('gap-4 p-4', 'gap-3 p-3')

# Bulk Bets padding
content = content.replace('p-4 bg-white border', 'p-3 bg-white border')
content = content.replace('space-y-4', 'space-y-3')
content = content.replace('py-1.5 focus:bg-white', 'py-1 focus:bg-white') # even tighter for bulk

# Save buttons
content = content.replace('px-8 py-3 text-[14px]', 'px-6 py-2.5 text-[13px]')
content = content.replace('py-3.5 text-[14px]', 'py-2.5 text-[13px]')

with open("src/app/track/new-bet/page.tsx", "w") as f:
    f.write(content)

print("Compacted form spacing.")
