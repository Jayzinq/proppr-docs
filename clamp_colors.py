import os
import re
import glob

def clamp(c):
    return max(16, min(235, c))

def clamp_hex(match):
    hex_str = match.group(1)
    if len(hex_str) == 3:
        r, g, b = [int(x*2, 16) for x in hex_str]
    elif len(hex_str) == 6:
        r = int(hex_str[0:2], 16)
        g = int(hex_str[2:4], 16)
        b = int(hex_str[4:6], 16)
    else:
        return match.group(0) # don't touch 4 or 8 char hex for now
    
    nr, ng, nb = clamp(r), clamp(g), clamp(b)
    return f"#{nr:02x}{ng:02x}{nb:02x}"

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.css', recursive=True)

for fpath in files:
    with open(fpath, "r") as f:
        content = f.read()
    
    # replace #RRGGBB and #RGB
    new_content = re.sub(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', clamp_hex, content)
    
    if new_content != content:
        with open(fpath, "w") as f:
            f.write(new_content)
        print(f"Updated {fpath}")

print("Done")
