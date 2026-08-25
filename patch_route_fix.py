import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/api/events/search/route.ts"
with open(filepath, "r") as f:
    content = f.read()

old_logic = "const pastDocs = [...alertsDocs, ...evDocs, ...teamDocs];"
new_logic = "const pastDocs = [...alertsDocs, ...teamDocs];"

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, "w") as f:
        f.write(content)
    print("Patched route.ts successfully")
else:
    print("Marker not found in route.ts")
