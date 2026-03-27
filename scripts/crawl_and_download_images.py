#!/usr/bin/env python3
"""
Agentic Image Crawler - Strategy:
1. Extract WordPress image URLs from the CODEBASE (src/ files), then try Wayback Machine
2. Download GYG experience images directly from cdn.getyourguide.com URLs in experiencesData.ts
3. Save everything to images_to_upload/ and gyg_experiences_raw.json
"""
from dotenv import load_dotenv
load_dotenv('.env.local')

import os
import re
import json
import hashlib
import requests
from urllib.parse import urlparse

OUTPUT_DIR = "images_to_upload"
os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
SRC_DIR = "src"
WP_BASE = "https://linapoint.com/wp-content/uploads"
WAYBACK_BASE = "https://web.archive.org/web/2024"


def download_image(url, output_dir, filename=None):
    """Download a single image, return filename or None."""
    try:
        r = requests.get(url, timeout=20, headers=HEADERS)
        r.raise_for_status()
        content_type = r.headers.get("content-type", "")
        if "image" not in content_type and not any(
            url.lower().split("?")[0].endswith(ext)
            for ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        ):
            return None
        if not filename:
            parsed_path = urlparse(url).path
            filename = os.path.basename(parsed_path.split("?")[0])
            if not filename or "." not in filename:
                filename = hashlib.md5(url.encode()).hexdigest()[:12] + ".jpg"
        out_path = os.path.join(output_dir, filename)
        with open(out_path, "wb") as f:
            f.write(r.content)
        return filename
    except Exception as e:
        print(f"  Failed: {url[:80]} ({e})")
        return None


downloaded = {}

# ─── Step 1: Extract WordPress image URLs from codebase ───────────────────────
print("\n=== Step 1: Extracting WordPress image URLs from codebase ===")
wp_urls = set()
for root, dirs, files in os.walk(SRC_DIR):
    dirs[:] = [d for d in dirs if d not in {"node_modules", ".next", ".git"}]
    for fname in files:
        if not fname.endswith(('.ts', '.tsx', '.js', '.jsx', '.json')):
            continue
        fpath = os.path.join(root, fname)
        try:
            content = open(fpath, encoding="utf-8").read()
            for m in re.finditer(r'https?://(?:www\.)?linapoint\.com/wp-content/uploads/[^\s"\'`>]+', content):
                url = m.group(0).rstrip('.,)')
                wp_urls.add(url)
        except Exception:
            pass

print(f"Found {len(wp_urls)} unique WordPress image URLs in codebase")

# Try to download each via Wayback Machine
for wp_url in sorted(wp_urls):
    filename = os.path.basename(urlparse(wp_url).path)
    if os.path.exists(os.path.join(OUTPUT_DIR, filename)):
        print(f"  (skip, already downloaded) {filename}")
        downloaded[wp_url] = filename
        continue
    # Try direct first (in case WP is back), then Wayback Machine
    fn = download_image(wp_url, OUTPUT_DIR, filename)
    if fn:
        downloaded[wp_url] = fn
        print(f"  ✓ direct: {fn}")
    else:
        wayback_url = f"{WAYBACK_BASE}/{wp_url}"
        fn = download_image(wayback_url, OUTPUT_DIR, filename)
        if fn:
            downloaded[wp_url] = fn
            print(f"  ✓ wayback: {fn}")
        else:
            print(f"  ✗ unavailable: {filename}")


# ─── Step 2: Download GYG images from experiencesData.ts ─────────────────────
print("\n=== Step 2: Loading GYG images from experiencesData.ts ===")
gyg_experiences = []

try:
    with open("src/lib/experiencesData.ts", encoding="utf-8") as f:
        ts = f.read()
    match = re.search(r'export const EXPERIENCES: Experience\[\] = (\[.*?\]);', ts, re.DOTALL)
    if not match:
        # Try alternate pattern
        match = re.search(r'EXPERIENCES\s*=\s*(\[.*?\]);', ts, re.DOTALL)
    if match:
        experiences = json.loads(match.group(1))
        print(f"  Found {len(experiences)} experiences in experiencesData.ts")
        for exp in experiences:
            img_url = exp.get("image", "")
            price_raw = exp.get("price", "")
            dur_raw = exp.get("duration", "")
            title = exp.get("title", "")
            # Parse numeric price
            price_match = re.search(r'\$(\d+(?:\.\d+)?)', price_raw)
            price_num = float(price_match.group(1)) if price_match else 0.0
            # Parse duration hours
            dur_match = re.search(r'(\d+(?:\.\d+)?)\s*hours?', dur_raw, re.IGNORECASE)
            dur_hours = float(dur_match.group(1)) if dur_match else None

            fn = None
            if img_url and img_url.startswith("http"):
                # Use a clean filename derived from the title
                safe = re.sub(r'[^a-z0-9]+', '-', title.lower())[:40]
                ext = "jpg"
                filename = f"gyg-{safe}.{ext}"
                if os.path.exists(os.path.join(OUTPUT_DIR, filename)):
                    fn = filename
                    print(f"  (skip) {filename}")
                else:
                    fn = download_image(img_url, OUTPUT_DIR, filename)
                    if fn:
                        print(f"  ✓ {fn}")

            gyg_experiences.append({
                "title": title,
                "image": img_url,
                "local_file": fn or "",
                "price": price_num,
                "duration_hours": dur_hours,
                "slug": exp.get("id", ""),
            })
    else:
        print("  Could not parse EXPERIENCES from experiencesData.ts")
except FileNotFoundError:
    print("  experiencesData.ts not found")

# Save GYG experience data
with open("scripts/gyg_experiences_raw.json", "w", encoding="utf-8") as f:
    json.dump(gyg_experiences, f, indent=2, ensure_ascii=False)

print(f"\n✅ Downloaded {len(downloaded)} WordPress images")
print(f"✅ Processed {len(gyg_experiences)} GetYourGuide experiences")
print(f"✅ All images saved to ./{OUTPUT_DIR}/")
print(f"✅ GYG data saved to scripts/gyg_experiences_raw.json")
