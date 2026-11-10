"""Minimal seed for idempotency repro: one user, one contact, one campaign."""
import sys
sys.path.insert(0, "..")
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

MONGO_URI = os.environ["MONGODB_URI"]

db = MongoClient(MONGO_URI).connectsphere

user_id = ObjectId()
contact_id = ObjectId()
campaign_id = ObjectId()

db.users.insert_one({
    "_id": user_id, "email": "repro-user@test.local", "name": "Repro User",
    "password_hash": "x", "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow(),
})
db.contacts.insert_one({
    "_id": contact_id, "user_id": user_id, "name": "Idempotency Target",
    "email": "target@test.local", "title": "Staff Engineer", "company": "TestCo",
    "source": "manual", "strength_score": 50, "deleted_at": None,
    "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow(),
})
db.campaigns.insert_one({
    "_id": campaign_id, "user_id": user_id, "name": "Repro Campaign",
    "goal": "Test idempotency on redelivery", "status": "active", "deleted_at": None,
    "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow(),
})

print(f"user_id={user_id}")
print(f"contact_id={contact_id}")
print(f"campaign_id={campaign_id}")
