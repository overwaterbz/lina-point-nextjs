#!/usr/bin/env python3
"""
Upload all images from images_to_upload/ to Supabase Storage (bucket: lp),
save a mapping file, and update the tours table image_url.
"""
from dotenv import load_dotenv
load_dotenv('.env.local')

import os
import json
import mimetypes
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = "LP"
IMAGE_DIR = "images_to_upload"
MAP_FILE = "scripts/image_url_map.json"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

image_url_map = {}

# Load existing map if present
if os.path.exists(MAP_FILE):
    with open(MAP_FILE) as f:
        image_url_map = json.load(f)

files = [f for f in os.listdir(IMAGE_DIR) if os.path.isfile(os.path.join(IMAGE_DIR, f))]
print(f"Uploading {len(files)} images to Supabase bucket '{BUCKET}'...")

for filename in files:
    local_path = os.path.join(IMAGE_DIR, filename)
    storage_path = f"images/{filename}"
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = "image/jpeg"

    try:
        with open(local_path, "rb") as fh:
            data = fh.read()
        # Upsert: try upload first, then update on conflict
        try:
            supabase.storage.from_(BUCKET).upload(
                storage_path, data,
                file_options={"content-type": mime_type, "upsert": "true"}
            )
        except Exception:
            supabase.storage.from_(BUCKET).update(
                storage_path, data,
                file_options={"content-type": mime_type}
            )

        public_url = supabase.storage.from_(BUCKET).get_public_url(storage_path)
        image_url_map[filename] = public_url
        print(f"  ✓ {filename} -> {public_url}")
    except Exception as e:
        print(f"  ✗ {filename}: {e}")

# Save mapping
with open(MAP_FILE, "w") as f:
    json.dump(image_url_map, f, indent=2)
print(f"\n✅ Saved URL mapping to {MAP_FILE}")

# Update tours table image_url based on filename matches in GYG data
gyg_file = "scripts/gyg_experiences_raw.json"
if os.path.exists(gyg_file):
    with open(gyg_file) as f:
        experiences = json.load(f)

    updated = 0
    for exp in experiences:
        local_file = exp.get("local_file")
        if local_file and local_file in image_url_map:
            new_url = image_url_map[local_file]
            title = exp.get("title", "")
            try:
                result = supabase.table("tours").update({"image_url": new_url}).eq("name", title).execute()
                if result.data:
                    updated += 1
                    print(f"  ✓ Updated tours table for: {title[:50]}")
            except Exception as e:
                print(f"  ✗ Failed to update tours for '{title}': {e}")

    print(f"\n✅ Updated {updated} tours records with new image URLs")
else:
    print("No gyg_experiences_raw.json found. Skipping tours update.")
