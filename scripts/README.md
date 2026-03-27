# Instructions for Automated Image Migration and Update

1. Run `download_linapoint_images.py` to download all images from linapoint.com.
2. Upload all images in the `downloaded_images` folder to your chosen CDN (Supabase Storage recommended).
3. Create a mapping of old URLs to new CDN URLs in `update_image_urls.py` (fill in the `url_map` dictionary).
4. List all relevant files to update in `files_to_update` in `update_image_urls.py`.
5. Run `update_image_urls.py` to update all image references in your codebase.
6. Test your site locally to verify all images load from the new CDN.
7. Commit and deploy your changes.

---

For agentic UI/UX enhancements, see the AI/UX roadmap in your project documentation or request further automation.
