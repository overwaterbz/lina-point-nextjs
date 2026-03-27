#!/usr/bin/env python3
"""
Master automation pipeline for lina-point-nextjs.
Must be run from inside the lina-point-nextjs/ directory.

Steps:
  1. Install Playwright Chromium (idempotent)
  2. Crawl WordPress + GetYourGuide, download all images
  3. Upload images to Supabase Storage, update tours table
  4. Replace WordPress image URLs in codebase with Supabase URLs
  5. Import GetYourGuide experiences into Supabase tours table
  6. Build Next.js app
  7. Git commit & push (triggers Vercel auto-deploy)
  8. Run site audit to verify live results
"""
import subprocess
import sys

def run_step(label, cmd, abort_on_fail=True):
    print(f"\n{'='*60}")
    print(f"STEP: {label}")
    print(f"CMD:  {' '.join(cmd)}")
    print('='*60)
    # Use shell=True for npm/git commands on Windows so PATH is resolved correctly
    use_shell = cmd[0] in ("npm", "git")
    result = subprocess.run(cmd, shell=use_shell)
    if result.returncode != 0:
        print(f"\n✗ FAILED: {label}")
        if abort_on_fail:
            print("Aborting pipeline.")
            sys.exit(result.returncode)
    else:
        print(f"\n✓ OK: {label}")
    return result.returncode

python = sys.executable

STEPS = [
    ("Install Playwright Chromium",       [python, "-m", "playwright", "install", "chromium"]),
    ("Crawl & download images",           [python, "scripts/crawl_and_download_images.py"]),
    ("Upload to Supabase & update tours", [python, "scripts/upload_and_update_supabase.py"]),
    ("Update image URLs in codebase",     [python, "scripts/update_image_urls_auto.py"]),
    ("Deduplicate tours table",           [python, "scripts/dedup_tours.py"]),
    ("Import experiences to Supabase",    [python, "scripts/import_experiences_to_supabase.py"]),
    ("Build Next.js",                     ["npm", "run", "build"]),
    ("Git add & commit",                  ["git", "add", "-A"]),
]

if __name__ == "__main__":
    for label, cmd in STEPS:
        run_step(label, cmd)

    # Git commit (non-fatal if nothing changed)
    subprocess.run(["git", "commit", "-m", "chore: automated image migration and experience import"])
    run_step("Git push to main", ["git", "push", "origin", "main"])

    print("\n\n" + "="*60)
    print("Pipeline complete! Vercel will auto-deploy.")
    print("Running site audit in 60s...")
    print("="*60)

    import time
    time.sleep(60)
    run_step("Site audit", [python, "scripts/site_audit_playwright.py"], abort_on_fail=False)

