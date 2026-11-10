import sys
sys.path.insert(0, ".")
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone

USER_ID = sys.argv[1]
db = MongoClient(os.environ["MONGODB_URI"]).connectsphere
campaign_id = ObjectId()
db.campaigns.insert_one({
    "_id": campaign_id, "user_id": ObjectId(USER_ID), "name": "Repro Campaign 2",
    "goal": "Round 2", "status": "active", "deleted_at": None,
    "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc),
})
print(f"campaign_id={campaign_id}")
