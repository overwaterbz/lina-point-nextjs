# Playwright-based scraper for GetYourGuide San Pedro experiences
# This script renders the page and extracts experience cards after JS loads
from playwright.sync_api import sync_playwright
import json
import os
import re

GYG_URL = "https://www.getyourguide.com/belize-l169068/"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "experiencesData.ts")
MIN_REVIEWS = 20
SUPABASE = "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/images/"

# In-house Lina Point experiences — preserved on every scraper run
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
    """Extract review count from strings like '4.8\n(227)\nFrom\n$125' or '(227)'."""
    m = re.search(r'\((\d+)\)', price_str)
    return int(m.group(1)) if m else 0

def scrape_experiences():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        experiences = []
        page_num = 1
        while True:
            print(f"Scraping page {page_num}...")
            url = GYG_URL + (f"?page={page_num}" if page_num > 1 else "")
            try:
                page.goto(url, timeout=30000)
                page.wait_for_selector('a[href*="/belize-l169068/"], a[href*="-l117510/"], a[href*="-l"]', timeout=20000)
            except Exception as e:
                print(f"Navigation or selector wait failed on page {page_num}: {e}")
                break
            anchors = page.query_selector_all('a[href*="getyourguide.com"][href*="-l"]')
            found = 0
            for anchor in anchors:
                img = anchor.query_selector('img')
                img_url = img.get_attribute('src') if img else ''
                title = anchor.query_selector('h2, h3, strong')
                title = title.inner_text().strip() if title else ''
                desc = ''
                desc_tag = anchor.query_selector('p, span')
                if desc_tag:
                    desc = desc_tag.inner_text().strip()
                duration = ''
                price = ''
                for node in anchor.query_selector_all('*'):
                    try:
                        text = node.inner_text().strip()
                    except Exception:
                        continue
                    if "hour" in text and not duration:
                        duration = text
                    if "$" in text and not price:
                        price = text
                booking_link = anchor.get_attribute('href')
                id_ = title.lower().replace(' ', '-').replace(':', '').replace('/', '-')[:40]
                # Extract review count — looks for pattern "(N)" among all text nodes
                review_count = 0
                for node in anchor.query_selector_all('*'):
                    try:
                        t = node.inner_text().strip()
                    except Exception:
                        continue
                    m = re.match(r'^\((\d+)\)$', t)
                    if m:
                        review_count = int(m.group(1))
                        break
                if title and img_url and booking_link and review_count >= MIN_REVIEWS:
                    experiences.append({
                        'id': id_,
                        'title': title,
                        'description': desc,
                        'image': img_url,
                        'duration': duration,
                        'price': price,
                        'reviewCount': review_count,
                        'bookingLink': booking_link
                    })
                    found += 1
            # Check for next page button or if no new experiences found
            try:
                next_button = page.query_selector('a[aria-label="Next page"]')
            except Exception:
                next_button = None
            if next_button and found > 0:
                page_num += 1
            else:
                break
        browser.close()
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

if __name__ == "__main__":
    exps = scrape_experiences()
    write_ts_data(exps)
    print(f"Updated {len(exps)} experiences.")
