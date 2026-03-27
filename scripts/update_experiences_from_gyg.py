# update_experiences_from_gyg.py
# Script to scrape GetYourGuide San Pedro experiences and update local data
import requests
from bs4 import BeautifulSoup
import json

GYG_URL = "https://www.getyourguide.com/san-pedro-belize-l117510/"
import os
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "experiencesData.ts")


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
        id_ = title.lower().replace(' ', '-').replace(':', '').replace('/', '-')[:40]
        if title:
            experiences.append({
                'id': id_,
                'title': title,
                'description': desc,
                'image': img,
                'duration': duration,
                'price': price,
                'bookingLink': f"/booking?experience={id_}"
            })
    return experiences

def write_ts_data(experiences):
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated from GetYourGuide\n')
        f.write('export interface Experience {\n')
        f.write('  id: string;\n  title: string;\n  description: string;\n  image: string;\n  duration: string;\n  price: string;\n  bookingLink: string;\n  dateAdded?: string;\n}\n\n')
        f.write('export const EXPERIENCES: Experience[] = ')
        json.dump(experiences, f, indent=2)
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
