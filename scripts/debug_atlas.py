from pymongo import MongoClient
import certifi
import traceback

MONGO_URI = "mongodb+srv://gowthamashanmugam05_db_user:cheithu@opuluxeai.twdy6ec.mongodb.net/?appName=OpuluxeAi"

print("Starting Atlas Connection Test...")
try:
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=10000)
    print("Pinging...")
    client.admin.command('ping')
    print("SUCCESS: Connected to Atlas!")
except Exception as e:
    print("FAILED: Connection Error.")
    traceback.print_exc()
