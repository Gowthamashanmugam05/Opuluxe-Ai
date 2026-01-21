from core.mongodb import get_db
import sys

def check_user(email):
    db = get_db()
    if db is None:
        print("Failed to connect to DB")
        return
    
    users_col = db['users']
    user = users_col.find_one({'email': email})
    
    if user:
        print(f"User found: {email}")
    else:
        print(f"User not found: {email}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_user(sys.argv[1])
    else:
        print("Provide email")
