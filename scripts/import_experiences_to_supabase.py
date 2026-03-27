from dotenv import load_dotenv
load_dotenv('.env.local')
#!/usr/bin/env python3
"""
Import experiences from src/lib/experiencesData.ts into Supabase 'tours' table.
Requires: pip install supabase
Set env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import os
import re
import json
from supabase import create_client, Client


# Load Supabase credentials from environment variables (now required)
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# Read and parse the TypeScript experiences file
with open("src/lib/experiencesData.ts", encoding="utf-8") as f:
    ts = f.read()

# Extract the JSON array from the file
match = re.search(r"export const EXPERIENCES: Experience\[] = (\[.*?\]);", ts, re.DOTALL)
if not match:
    raise Exception("Could not find EXPERIENCES array in experiencesData.ts")
experiences = json.loads(match.group(1))

def parse_price(price_str):
    """Extract numeric price from strings like '4.8\n(227)\nFrom\n$125'"""
    m = re.search(r'\$(\d+(?:\.\d+)?)', str(price_str))
    return float(m.group(1)) if m else None

def parse_duration_hours(dur_str):
    """Extract hours as float from strings like '8 hours' or messy multi-line text"""
    m = re.search(r'(\d+(?:\.\d+)?)\s*hours?', str(dur_str), re.IGNORECASE)
    return float(m.group(1)) if m else None

# Map fields to Supabase 'tours' table schema
for exp in experiences:
    price_num = parse_price(exp.get("price", ""))
    dur_hours = parse_duration_hours(exp.get("duration", ""))
    slug = exp.get("id", re.sub(r'[^a-z0-9]+', '-', exp.get("title", "").lower()))
    data = {
        "name": exp["title"],
        "description": exp.get("description", ""),
        "image_url": exp.get("image", None),
        "active": True,
        "slug": slug,
    }
    if price_num is not None:
        data["price"] = price_num
    if dur_hours is not None:
        data["duration_hours"] = dur_hours
    # Upsert by name
    name = data["name"]
    existing = supabase.table("tours").select("id").eq("name", name).execute()
    if existing.data:
        # Update only image_url, price, duration_hours, slug (don't clobber good description)
        update_fields = {k: v for k, v in data.items() if k in ("image_url", "price", "duration_hours", "slug", "active")}
        supabase.table("tours").update(update_fields).eq("name", name).execute()
        print(f"Updated: {name}")
    else:
        supabase.table("tours").insert(data).execute()
        print(f"Inserted: {name}")

print("All experiences imported to Supabase.")
