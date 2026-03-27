import asyncio
from playwright.async_api import async_playwright

# List of key pages to test
PAGES = [
    "https://linapoint.com/",
    "https://linapoint.com/gallery",
    "https://linapoint.com/experiences",
    "https://linapoint.com/rooms",
    "https://linapoint.com/checkout",
]

async def check_images_and_experiences(page, url):
    await page.goto(url)
    print(f"\n--- Checking {url} ---")
    # Check for broken images
    images = await page.query_selector_all('img')
    from urllib.parse import urljoin
    origin = url.split("/", 3)[:3]
    site_origin = "/".join(origin)
    for img in images:
        src = await img.get_attribute('src')
        if src:
            # Handle relative URLs
            full_url = src if src.startswith('http') else urljoin(site_origin + '/', src)
            try:
                response = await page.request.get(full_url)
                if not response.ok:
                    print(f"Broken image: {full_url} (status {response.status})")
            except Exception as e:
                print(f"Error fetching image: {full_url} | {e}")
    # If experiences page, count experiences
    if "/experiences" in url:
        cards = await page.query_selector_all('[data-experience-card]')
        print(f"Found {len(cards)} experience cards.")
        if len(cards) < 27:
            print("WARNING: Less than 27 experiences found!")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        for url in PAGES:
            await check_images_and_experiences(page, url)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
