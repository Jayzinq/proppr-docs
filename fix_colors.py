import os
import glob

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.css', recursive=True)

for fpath in files:
    with open(fpath, "r") as f:
        content = f.read()
    
    # Replace the grayed out white back to real white, since users perceive #ebebeb as dirty/gray,
    # or to #F7F7F9 which was the original background color for track pages.
    new_content = content.replace('#ebebeb', '#ffffff')
    
    # Replace the clamped harsh green with a softer emerald green that is natively NTSC safe
    new_content = new_content.replace('#2beb4b', '#10b981')
    
    if new_content != content:
        with open(fpath, "w") as f:
            f.write(new_content)
        print(f"Updated {fpath}")

print("Done")
