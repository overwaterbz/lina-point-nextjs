# Playwright-based scraper for GetYourGuide San Pedro experiences
# This script renders the page and extracts experience cards after JS loads
from playwright.sync_api import sync_playwright
import json
import os

GYG_URL = "https://www.getyourguide.com/san-pedro-belize-l117510/"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "experiencesData.ts")

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
                page.wait_for_selector('a[href*="/san-pedro-belize-l117510/"]', timeout=20000)
            except Exception as e:
                print(f"Navigation or selector wait failed on page {page_num}: {e}")
                break
            anchors = page.query_selector_all('a[href*="/san-pedro-belize-l117510/"]')
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
                if title and img_url and booking_link:
                    experiences.append({
                        'id': id_,
                        'title': title,
                        'description': desc,
                        'image': img_url,
                        'duration': duration,
                        'price': price,
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
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated from GetYourGuide\n')
        f.write('export interface Experience {\n')
        f.write('  id: string;\n  title: string;\n  description: string;\n  image: string;\n  duration: string;\n  price: string;\n  bookingLink: string;\n  dateAdded?: string;\n}\n\n')
        f.write('export const EXPERIENCES: Experience[] = ')
        json.dump(experiences, f, indent=2)
        f.write(';\n')

if __name__ == "__main__":
    exps = scrape_experiences()
    write_ts_data(exps)
    print(f"Updated {len(exps)} experiences.")
