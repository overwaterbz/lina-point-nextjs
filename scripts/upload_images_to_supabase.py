import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv('.env.local')

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET_NAME = "lp"  # Default bucket name, change if needed
IMAGES_FOLDER = "images_to_upload"  # Default folder, change if needed

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Ensure the folder exists
if not os.path.isdir(IMAGES_FOLDER):
    raise Exception(f"Image folder '{IMAGES_FOLDER}' does not exist. Please update the script with the correct path.")

for filename in os.listdir(IMAGES_FOLDER):
    file_path = os.path.join(IMAGES_FOLDER, filename)
    if os.path.isfile(file_path):
        with open(file_path, "rb") as f:
            res = supabase.storage().from_(BUCKET_NAME).upload(filename, f, upsert=True)
            print(f"Uploaded: {filename} | Result: {res}")
            # Get public URL
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{filename}"
            print(f"Public URL: {public_url}")
