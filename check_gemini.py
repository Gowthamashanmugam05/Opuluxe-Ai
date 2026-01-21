import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

def list_full():
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        for model in client.models.list():
            if 'image' in model.name.lower():
                print(f"ID: {model.name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_full()
