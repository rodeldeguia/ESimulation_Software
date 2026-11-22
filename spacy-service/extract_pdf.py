import re
import csv

# 1. Load the raw text from your PDF copy-paste
with open('phrasal_raw.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

phrasal_verbs = set()
# We will use a state machine to read the lines
current_verb = None

for line in lines:
    line = line.strip()
    if not line:
        continue

    # The structure usually starts with the phrasal verb, then a tab, then the example.
    # We look for lines that are just a verb phrase (no punctuation, 2-4 words)
    # Example: "account for", "act up (informal)", "look forward to"
    
    # 1. Clean out the (informal) tags
    clean_line = re.sub(r'\(.*?\)', '', line).strip()
    
    # 2. Check if this line looks like a phrasal verb header
    # It should be 2 to 4 words, all lowercase, no punctuation.
    words = clean_line.split()
    if 2 <= len(words) <= 4:
        # Check if the last word is a common particle
        particles = ['up', 'down', 'off', 'on', 'in', 'out', 'over', 'back', 'away', 'with', 'to', 'for', 'into', 'through', 'about', 'around', 'after', 'by', 'along', 'across', 'under', 'above', 'at', 'against', 'from', 'of', 'upon']
        if words[-1].lower() in particles:
            # Check if it's all lowercase letters (no numbers or weird symbols)
            if all(re.match(r'^[a-z]+$', w.lower()) for w in words):
                current_verb = ' '.join(words).lower()
                phrasal_verbs.add(current_verb)

print(f"✅ Found {len(phrasal_verbs)} phrasal verbs.")

# 3. Save to CSV
with open('new_phrasal_verbs.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['phrasal', 'base_verb', 'particle', 'meaning'])
    
    for pv in sorted(phrasal_verbs):
        parts = pv.split()
        base = parts[0]
        particle = ' '.join(parts[1:])
        # Leave meaning blank for now; the teacher can fill it in later
        writer.writerow([pv, base, particle, ''])

print("✅ Saved to new_phrasal_verbs.csv")