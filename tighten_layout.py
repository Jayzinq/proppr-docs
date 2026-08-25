import re

with open("src/app/track/layout.tsx", "r") as f:
    content = f.read()

# Sidebar width
content = content.replace('w-[260px]', 'w-[220px]')
# Sidebar padding
content = content.replace('p-6', 'p-4')
# Logo margin bottom
content = content.replace('mb-10', 'mb-6')
# Nav link padding and text size
content = content.replace('px-3 py-2.5 rounded-lg text-[14px]', 'px-3 py-2 rounded-lg text-[13px]')
# Settings link margin
content = content.replace('mt-6 px-3', 'mt-4 px-3')

# Header height and padding
content = content.replace('h-[72px] border-b border-gray-200 flex items-center justify-between px-10', 'h-[60px] border-b border-gray-200 flex items-center justify-between px-6')
content = content.replace('px-5 py-2.5 rounded-lg', 'px-4 py-2 rounded-lg')

# Main content padding
content = content.replace('p-10 lg:p-12', 'p-6')

with open("src/app/track/layout.tsx", "w") as f:
    f.write(content)

print("Tightened sidebar and layout")
