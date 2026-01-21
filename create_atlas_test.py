from pymongo import MongoClient
import certifi

MONGO_URI = "mongodb+srv://gowthamashanmugam05_db_user:cheithu@opuluxeai.twdy6ec.mongodb.net/?appName=OpuluxeAi"

try:
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client['OpuluxeAi']
    users = db['users']
    
    # Try to insert a real test user they can use
    test_user = {'email': 'admin@opuluxe.ai', 'password': 'password123'}
    if not users.find_one({'email': test_user['email']}):
        users.insert_one(test_user)
        print("Created test user: admin@opuluxe.ai / password123")
    else:
        print("Test user already exists.")
except Exception as e:
    print(f"Error: {e}")
