import re

with open("src/app/track/new-bet/page.tsx", "r") as f:
    content = f.read()

# Replace massive space-y
content = content.replace('space-y-8', 'space-y-4')
content = content.replace('space-y-6', 'space-y-4')
content = content.replace('space-y-4', 'space-y-3')
# the above might turn space-y-8 -> space-y-4 -> space-y-3, so let's be careful.

# Instead of blindly replacing, let's just do targeted replacements.
