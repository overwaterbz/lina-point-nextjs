#!/usr/bin/env python3
"""
Dynamically replaces all WordPress image URLs in the Next.js codebase
with the corresponding Supabase Storage URLs, using scripts/image_url_map.json.
"""
from dotenv import load_dotenv
load_dotenv('.env.local')

import os
import json
import re

MAP_FILE = "scripts/image_url_map.json"
SRC_DIR = "src"
EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".json", ".mjs"}

if not os.path.exists(MAP_FILE):
    print(f"ERROR: {MAP_FILE} not found. Run upload_and_update_supabase.py first.")
    exit(1)

with open(MAP_FILE) as f:
    image_url_map = json.load(f)

# Build a reverse map: original URL fragment -> supabase URL
# We match by filename in the URL path
filename_to_supabase = {}
for filename, supabase_url in image_url_map.items():
    filename_to_supabase[filename] = supabase_url

print(f"Loaded {len(filename_to_supabase)} URL mappings.")

total_replacements = 0

for root, dirs, files in os.walk(SRC_DIR):
    # Skip node_modules and .next if somehow inside src
    dirs[:] = [d for d in dirs if d not in {"node_modules", ".next", ".git"}]
    for fname in files:
        _, ext = os.path.splitext(fname)
        if ext not in EXTENSIONS:
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as fh:
                content = fh.read()
        except Exception:
            continue

        original = content
        for filename, supabase_url in filename_to_supabase.items():
            # Match any URL containing this filename (handles query params, different base URLs)
            pattern = r'https?://[^\s"\'`>]*/' + re.escape(filename) + r'[^\s"\'`>]*'
            if re.search(pattern, content):
                content = re.sub(pattern, supabase_url, content)

        if content != original:
            with open(fpath, "w", encoding="utf-8") as fh:
                fh.write(content)
            count = sum(
                len(re.findall(r'https?://[^\s"\'`>]*/' + re.escape(fn) + r'[^\s"\'`>]*', original))
                for fn in filename_to_supabase
            )
            print(f"  ✓ Updated {fpath}")
            total_replacements += 1

print(f"\n✅ Updated {total_replacements} files with Supabase image URLs.")
