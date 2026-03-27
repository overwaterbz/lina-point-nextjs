#!/usr/bin/env python3
"""Remove duplicate tours (keep the oldest/lowest id per name)."""
from dotenv import load_dotenv
load_dotenv('.env.local')

import os
from supabase import create_client

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

r = sb.table("tours").select("id,name,created_at").order("created_at").execute()
rows = r.data

seen = {}
to_delete = []
for row in rows:
    name = row["name"]
    if name in seen:
        to_delete.append(row["id"])
    else:
        seen[name] = row["id"]

if to_delete:
    for rid in to_delete:
        sb.table("tours").delete().eq("id", rid).execute()
    print(f"Deleted {len(to_delete)} duplicate rows")
else:
    print("No duplicates found")
