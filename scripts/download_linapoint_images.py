#!/usr/bin/env python3
"""
Batch download all unique linapoint.com images for CDN migration.
Place this script in your repo root and run with Python 3.7+.
"""
import os
import re
import requests

# Recursively search for all WordPress image URLs in the codebase
def find_wp_image_urls(root_dir):
    wp_urls = set()
    pattern = re.compile(r'https://linapoint.com/wp-content/uploads/[^"\s)]+')
    for subdir, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith(('.js', '.ts', '.tsx', '.json', '.md', '.mjs', '.py', '.sql')):
                try:
                    with open(os.path.join(subdir, file), encoding='utf-8', errors='ignore') as f:
                        for line in f:
                            for match in pattern.findall(line):
                                wp_urls.add(match)
                except Exception as e:
                    print(f"Error reading {file}: {e}")
    return sorted(wp_urls)

output_dir = "images_to_upload"
os.makedirs(output_dir, exist_ok=True)

print("Scanning codebase for WordPress image URLs...")
image_urls = find_wp_image_urls("..")  # Search parent directory (repo root)
print(f"Found {len(image_urls)} unique image URLs.")

for url in image_urls:
    filename = url.split("/")[-1]
    out_path = os.path.join(output_dir, filename)
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        with open(out_path, "wb") as f:
            f.write(r.content)
        print(f"Downloaded: {url}")
    except Exception as e:
        print(f"Failed: {url} ({e})")
