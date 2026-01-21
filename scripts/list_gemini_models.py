import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def list_models():
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    with open('models_list.txt', 'w') as f:
        for m in client.models.list():
            f.write(f"Name: {m.name}, Actions: {m.supported_actions}\n")

if __name__ == "__main__":
    list_models()
