from core.mongodb import get_db
import sys

def inspect_user(email):
    db = get_db()
    if db is None:
        print("Failed to connect to DB")
        return
    
    users_col = db['users']
    user = users_col.find_one({'email': email})
    
    if user:
        pwd = user.get('password', '')
        print(f"User: {email}")
        print(f"Password field starts with: {pwd[:15]}...")
        if pwd.startswith('pbkdf2_sha256$'):
            print("Looks like a valid Django hash.")
        else:
            print("Does NOT look like a standard Django hash.")
    else:
        print(f"User not found: {email}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inspect_user(sys.argv[1])
    else:
        print("Provide email")
