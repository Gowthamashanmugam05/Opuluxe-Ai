from pymongo import MongoClient
import certifi
import sys

# Original URI provided by the user
MONGO_URI = "mongodb+srv://gowthamashanmugam05_db_user:cheithu@opuluxeai.twdy6ec.mongodb.net/?appName=OpuluxeAi"

_mongo_client = None

def get_db_client():
    """
    Establish a connection to MongoDB Atlas using the provided URI.
    Caches the client to avoid resource exhaustion.
    """
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client
        
    try:
        # Use certifi for SSL/TLS certificates and broader timeouts for stability
        _mongo_client = MongoClient(MONGO_URI, 
                             tlsCAFile=certifi.where(),
                             serverSelectionTimeoutMS=10000,
                             connectTimeoutMS=10000,
                             heartbeatFrequencyMS=10000)
        # Test connection
        _mongo_client.admin.command('ping')
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
        db = client['OpuluxeAi']
        db.status = "Connected (Atlas)"
        return db
    return None
