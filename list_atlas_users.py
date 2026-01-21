from pymongo import MongoClient
import certifi

MONGO_URI = "mongodb+srv://gowthamashanmugam05_db_user:cheithu@opuluxeai.twdy6ec.mongodb.net/?appName=OpuluxeAi"

try:
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client['OpuluxeAi']
    users = db['users']
    count = users.count_documents({})
    print(f"Total Users in Atlas: {count}")
    for u in users.find():
        print(f"User: {u.get('email')}")
except Exception as e:
    print(f"Error: {e}")
