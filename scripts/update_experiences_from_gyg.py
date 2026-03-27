# update_experiences_from_gyg.py
# Script to scrape GetYourGuide San Pedro experiences and update local data
import requests
from bs4 import BeautifulSoup
import json
import re

GYG_URL = "https://www.getyourguide.com/belize-l169068/"
import os
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "experiencesData.ts")
MIN_REVIEWS = 20
SUPABASE = "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/images/"

# In-house Lina Point experiences — always appended after scraping
IN_HOUSE_ENTRIES = [
    {
        "id": "garifuna-drumming-class",
        "title": "Garifuna Drumming Class",
        "description": "Workshop or class",
        "image": f"{SUPABASE}gyg-garifuna-drumming-class.jpg",
        "duration": "Workshop or class\nGarifuna Drumming Class\n1.5 hours",
        "price": "From\n$30",
        "reviewCount": 0,
        "isInHouse": True,
        "bookingLink": "/experiences/book?tour=garifuna-drumming-class",
    }
]


def parse_review_count(price_str: str) -> int:
    """Extract review count from strings like '(227)' or '4.8\n(227)\nFrom\n$125'."""
    m = re.search(r'\((\d+)\)', price_str)
    return int(m.group(1)) if m else 0


def scrape_gyg_experiences():
    resp = requests.get(GYG_URL)
    soup = BeautifulSoup(resp.text, 'html.parser')
    cards = soup.find_all('div', attrs={'data-test-id': 'activity-card'})
    experiences = []
    for card in cards:
        # Title
        title_tag = card.find(['h2', 'h3'])
        title = title_tag.get_text(strip=True) if title_tag else ''
        # Description (may not be present)
        desc_tag = card.find('div', class_='activity-card-description')
        desc = desc_tag.get_text(strip=True) if desc_tag else ''
        # Image
        img_tag = card.find('img')
        img = img_tag['src'] if img_tag and img_tag.has_attr('src') else ''
        # Duration
        duration_tag = card.find(string=lambda s: s and 'hour' in s)
        duration = duration_tag.strip() if duration_tag else ''
        # Price
        price_tag = card.find(string=lambda s: s and 'From $' in s)
        price = price_tag.strip().replace('From ', '') if price_tag else ''
        # Review count
        review_tag = card.find(string=lambda s: s and re.match(r'^\(\d+\)$', s.strip()))
        review_count = parse_review_count(review_tag.strip()) if review_tag else 0
        id_ = title.lower().replace(' ', '-').replace(':', '').replace('/', '-')[:40]
        if title and review_count >= MIN_REVIEWS:
            experiences.append({
                'id': id_,
                'title': title,
                'description': desc,
                'image': img,
                'duration': duration,
                'price': price,
                'reviewCount': review_count,
                'bookingLink': f"/booking?experience={id_}"
            })
    return experiences

def write_ts_data(experiences):
    all_entries = experiences + IN_HOUSE_ENTRIES
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated from GetYourGuide (MIN_REVIEWS=20) + in-house entries\n')
        f.write(f'const SUP = "{SUPABASE}";\n\n')
        f.write('export interface Experience {\n')
        f.write('  id: string;\n  title: string;\n  description: string;\n  image: string;\n  duration: string;\n  price: string;\n  bookingLink: string;\n  reviewCount: number;\n  isInHouse?: boolean;\n  dateAdded?: string;\n}\n\n')
        f.write('export const EXPERIENCES: Experience[] = ')
        json.dump(all_entries, f, indent=2)
        f.write(';\n')

import re
from datetime import datetime

def read_existing_experiences():
    try:
        with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
            # Extract the JSON array from the TypeScript file
            match = re.search(r'export const EXPERIENCES: Experience\[] = (\[.*?\]);', content, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                return {e['id']: e for e in data}
    except Exception:
        pass
    return {}

if __name__ == "__main__":
    existing = read_existing_experiences()
    exps = scrape_gyg_experiences()
    today = datetime.now().strftime('%Y-%m-%d')
    for exp in exps:
        if exp['id'] in existing and 'dateAdded' in existing[exp['id']]:
            exp['dateAdded'] = existing[exp['id']]['dateAdded']
        else:
            exp['dateAdded'] = today
    write_ts_data(exps)
    print(f"Updated {len(exps)} experiences.")
