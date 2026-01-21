import os
import base64
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

def try_generate():
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Let's try 'imagen-3.0-generate-001' again but with 'models/' prefix
    # and also check the exact list we got:
    # ID: models/imagen-4.0-generate-001
    
    prompt = "A high-end Zara fashion photoshoot of a person wearing a slim fit oxford shirt, professional studio lighting, 8k resolution."
    
    models_to_try = [
        'imagen-3.0-generate-001',
        'imagen-3.0-fast-generate-001',
        'imagen-4.0-generate-001', # from our list!
    ]
    
    for model_name in models_to_try:
        print(f"Testing model: {model_name}...")
        try:
            response = client.models.generate_images(
                model=model_name,
                prompt=prompt,
                config=types.GenerateImagesConfig(numberOfImages=1)
            )
            print(f"SUCCESS with {model_name}!")
            with open(f"gen_{model_name.replace('-','_')}.png", "wb") as f:
                f.write(response.generated_images[0].image_bytes)
            return
        except Exception as e:
            print(f"FAILED {model_name}: {e}")

if __name__ == "__main__":
    try_generate()
