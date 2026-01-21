from pymongo import MongoClient
import certifi
import sys

import os
from dotenv import load_dotenv

from pathlib import Path
ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=ENV_PATH, override=True)

# Configuration from Environment Variables
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "OpuluxeAi")

_mongo_client = None

def get_db_client():
    """
    Establish a connection to MongoDB Atlas using the provided URI.
    Caches the client to avoid resource exhaustion.
    """
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client
        
    if not MONGO_URI:
        print("CRITICAL: MONGODB_URI not found in environment variables!")
        return None

    try:
        print(f"Connecting to MongoDB Atlas... (DB: {DB_NAME})")
        # Use certifi for SSL/TLS certificates and broader timeouts for stability
        _mongo_client = MongoClient(MONGO_URI, 
                             tlsCAFile=certifi.where(),
                             serverSelectionTimeoutMS=5000,
                             connectTimeoutMS=5000)
        # Test connection
        _mongo_client.admin.command('ping')
        print("MongoDB Atlas: Connection successful!")
        return _mongo_client
    except Exception as e:
        print(f"CRITICAL: Failed to connect to MongoDB Atlas: {e}")
        _mongo_client = None
        return None

def get_db():
    """
    Get the cloud database instance.
    """
    client = get_db_client()
    if client is not None:
        db = client[DB_NAME]
        db.status = "Connected (Atlas)"
        return db
    return None
