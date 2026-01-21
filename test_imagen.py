import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

try:
    # Attempting to use Imagen
    # Note: The 'predict' method is often used via vertexai, but google-generativeai 
    # might support it if the model is in the list.
    model = genai.ImageGenerationModel("imagen-3.0-generate-001") # Using 3.0 as it's more standard, or just try what was in the list
    # Let's try what was in the list: models/imagen-3.0-generate-001 or similar
    
    # Actually, the standard way to call Imagen 3 in the local SDK is:
    # res = model.generate_images(prompt="a blue shirt")
    
    # Let's check available image generation models again to be sure of the name
    print("Trying generation...")
    # I'll use a generic approach or try to find the exact model from the list
    # The list showed 'models/imagen-4.0-generate-001' which is surprising.
    
    # Let's try the common 'imagen-3' if it exists or 'imagen-4.0-generate-001'
    model_name = "imagen-3.0-generate-001" 
    # I'll use get_model to check if it's valid
    m = genai.get_model("models/" + model_name)
    print(f"Using model: {m.name}")
    
    # This might fail if the user's key is not enabled for Imagen in this SDK tier.
except Exception as e:
    print(f"Error: {e}")
