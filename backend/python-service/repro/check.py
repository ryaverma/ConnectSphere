import sys
sys.path.insert(0, ".")
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from pymongo import MongoClient
from bson import ObjectId

CONTACT_ID = sys.argv[1]
CAMPAIGN_ID = sys.argv[2]

db = MongoClient(os.environ["MONGODB_URI"]).connectsphere

docs = list(db.messages.find({
    "contact_id": ObjectId(CONTACT_ID),
    "campaign_id": ObjectId(CAMPAIGN_ID),
    "variant": "short",
}))

print(f"Message docs matching (contact_id, campaign_id, variant='short'): {len(docs)}")
for d in docs:
    print(f"  _id={d['_id']}  created={d.get('createdAt') or d.get('_id').generation_time}")
