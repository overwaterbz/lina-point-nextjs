from dotenv import load_dotenv
import os
from supabase import create_client

# Load environment variables from .env.local
load_dotenv('.env.local')

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase = create_client(url, key)
print(supabase.table("tours").select("*").limit(1).execute())
