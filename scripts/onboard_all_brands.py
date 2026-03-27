"""
Automated onboarding for all brands using shared environment and admin dashboard.
- Ensures all brands in agentic-brand-config.json are initialized in the database.
- Can be run after deployment or when adding a new brand.
"""
import os
import json
import requests

CONFIG_PATH = os.path.join(os.path.dirname(__file__), '../agentic-brand-config.example.json')
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

brands = config['brands']

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

def ensure_brand_in_db(brand):
    # Example: POST to /rest/v1/brands (adjust table/API as needed)
    data = {
        'brand': brand['brand'],
        'display_name': brand['displayName'],
        'domain': brand['domain'],
        'voice': brand['voice'],
        'key_messages': brand['keyMessages'],
    }
    resp = requests.post(f'{SUPABASE_URL}/rest/v1/brands', headers=headers, json=data)
    if resp.status_code in (200, 201, 409):
        print(f"[OK] {brand['displayName']} onboarded.")
    else:
        print(f"[ERROR] {brand['displayName']}: {resp.status_code} {resp.text}")

if __name__ == '__main__':
    for brand in brands:
        ensure_brand_in_db(brand)
    print("All brands processed.")
