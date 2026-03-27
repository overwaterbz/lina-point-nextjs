#!/usr/bin/env python3
"""
Template for updating all linapoint.com image URLs in your codebase to new CDN URLs.
Fill in the url_map with old:new pairs after uploading to your CDN.
"""
import fileinput

# Example mapping: old_url -> new_url

url_map = {
    "https://linapoint.com/wp-content/uploads/2017/12/21557862_842375785930679_1662415238731283244_n.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/21557862_842375785930679_1662415238731283244_n.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-10-1-scaled.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/anniversary_cabana-10-1-scaled.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/anniversary_cabana-8-scaled.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/anniversary_cabana-8-scaled.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/conch-21-1.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/conch-21-1.jpg",
    "https://linapoint.com/wp-content/uploads/2017/12/day-view.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/day-view.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/drone-2-scaled.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-2-scaled.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/drone-3-scaled.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-3-scaled.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/drone-4-1-scaled.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-4-1-scaled.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/greatwhiteshark-19.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/greatwhiteshark-19.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-39.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/LinaPoint-39.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-41.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/LinaPoint-41.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-55.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/LinaPoint-55.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/LinaPoint-64.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/LinaPoint-64.jpg",
    "https://linapoint.com/wp-content/uploads/2017/12/night-view.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/night-view.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/spa-5.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/spa-5.jpg",
    "https://linapoint.com/wp-content/uploads/2022/08/spa-6.jpg": "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/spa-6.jpg",
}

# List all relevant files to update (relative to repo root)
files_to_update = [
    "src/app/gallery/page.tsx",
    "src/app/page.tsx",
    "src/app/rooms/page.tsx",
    "src/app/experiences/page.tsx",
    "src/components/booking/steps/StepExperiences.tsx",
    "src/components/resort/RoomCarousel.tsx",
    "src/app/guides/belize/page.tsx",
    "src/app/experiences/book/page.tsx",
    "src/app/rooms/layout.tsx",
    "src/app/layout.tsx",
    "src/components/resort/Footer.tsx",
    "src/app/concierge/page.tsx",
    "src/app/api/cron/social-content/route.ts",
]

for file in files_to_update:
    with fileinput.FileInput(file, inplace=True, encoding="utf-8") as f:
        for line in f:
            for old, new in url_map.items():
                line = line.replace(old, new)
            print(line, end="")
