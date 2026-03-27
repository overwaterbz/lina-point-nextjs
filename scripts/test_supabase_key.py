from dotenv import load_dotenv
load_dotenv('.env.local')
from supabase import create_client
import os

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase = create_client(url, key)
print(supabase.table("tours").select("*").limit(1).execute())
