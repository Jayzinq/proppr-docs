import os

files = [
    "src/app/track/layout.tsx",
    "src/app/track/page.tsx"
]

replacements = {
    "bg-[#0a0f0f]": "bg-[#050505]",
    "bg-proppr-green": "bg-emerald-500",
    "bg-proppr-green-light": "bg-emerald-400",
    "font-anton": "font-heading font-black",
    "border-proppr-green-light": "border-emerald-400",
    "border-proppr-green": "border-emerald-500",
    "bg-proppr-bg": "bg-[#050505]",
    "bg-proppr-card": "bg-[#0a0a0a]",
    "bg-proppr-surface": "bg-[#111]",
    "text-proppr-green-light": "text-emerald-400",
    "text-proppr-loss": "text-red-400",
    "bg-proppr-loss/20": "bg-red-500/20",
    "text-proppr-pending": "text-amber-400",
    "bg-proppr-pending/20": "bg-amber-500/20",
    "#22a377": "#34d399",
    "#1c2424": "#111",
    "#151b1b": "#0a0a0a",
    "#232c2c": "#1a1a1a",
}

for fpath in files:
    if os.path.exists(fpath):
        with open(fpath, "r") as f:
            content = f.read()
        for k, v in replacements.items():
            content = content.replace(k, v)
        with open(fpath, "w") as f:
            f.write(content)
        print(f"Updated {fpath}")
    else:
        print(f"Not found: {fpath}")
