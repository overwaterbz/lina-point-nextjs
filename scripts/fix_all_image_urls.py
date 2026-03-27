#!/usr/bin/env python3
"""Replace all WordPress image URLs with Supabase CDN URLs across source files."""
import json, re, os

from dotenv import load_dotenv
load_dotenv('.env.local')

# Load the image URL mappings
with open('scripts/image_url_map.json') as f:
    url_map = json.load(f)

def wp_to_supabase(content, url_map):
    for fn, supabase_url in url_map.items():
        if fn.startswith('gyg-'):
            continue
        # Replace any WP URL ending in this filename
        pattern = r'https://linapoint\.com/wp-content/uploads/[^\"\' ]+/' + re.escape(fn)
        content = re.sub(pattern, supabase_url, content)
    return content

files_to_update = [
    'src/app/page.tsx',
    'src/app/gallery/page.tsx',
    'src/app/rooms/page.tsx',
    'src/app/guides/belize/page.tsx',
    'src/app/api/cron/social-content/route.ts',
]

for filepath in files_to_update:
    if not os.path.exists(filepath):
        print(f'SKIP (not found): {filepath}')
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    updated = wp_to_supabase(original, url_map)
    if updated != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(updated)
        n = original.count('linapoint.com/wp-content') - updated.count('linapoint.com/wp-content')
        print(f'  Updated {n} URLs in {filepath}')
    else:
        print(f'  No changes needed: {filepath}')

print()
for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath) as f:
            content = f.read()
        remaining = len(re.findall(r'linapoint\.com/wp-content', content))
        if remaining:
            print(f'  WARNING: {remaining} still-broken URL(s) in {filepath}')

print('Done.')
