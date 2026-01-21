import os
import base64
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

def generate_tryon_image(item_name, gender, original_photo_data=None):
    """
    Generates a fashion preview image using Gemini Imagen 3/4.
    Args:
        item_name (str): The name of the clothing item.
        gender (str): 'men' or 'women'.
        original_photo_data (str, optional): Base64 string of user's photo. (Unused for now as Imagen doesn't support VTON directly publicly yet easily).
    Returns:
        str: URL or Base64 of generated image, or None if failed.
    """
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        # Enhanced Prompting for Magic Try-On
        prompt = (
            f"FASHION TRY-ON: Edit this photo to dress the person in the following item: {item_name}. "
            f"The original person and pose must be preserved exactly. Only the clothing should be changed. "
            f"Ensure ultra-realistic texture and high-end fashion catalog quality."
        )

        print(f"Applying Magic Try-On with Nano Banana Pro for: {item_name}")

        # Use the specific models requested by the user
        models = [
            'nano-banana-pro-preview',
            'gemini-3-pro-image-preview'
        ]
        
        generated_image = None
        
        for model_id in models:
            try:
                # If we have an original photo, we do an 'image - image edit'
                if original_photo_data:
                    # Strip base64 prefix if present
                    if ',' in original_photo_data:
                        original_photo_data = original_photo_data.split(',')[1]
                    
                    # Convert base64 to bytes
                    image_bytes = base64.b64decode(original_photo_data)
                    
                    # Using the latest SDK's image editing capability
                    # For Nano Banana Pro / Gemini 3, we use multimodal input
                    response = client.models.generate_content(
                        model=model_id,
                        contents=[
                            types.Part.from_bytes(data=image_bytes, mime_type='image/png'),
                            prompt
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type='image/png' # Requesting image output
                        )
                    )
                    # Some models return the image in parts[0].inline_data
                    if response.candidates[0].content.parts[0].inline_data:
                        generated_image_bytes = response.candidates[0].content.parts[0].inline_data.data
                    else:
                        # Fallback for different response structures
                        print(f"Model {model_id} returned no inline image data.")
                        continue
                else:
                    # Regular generation if no photo provided
                    response = client.models.generate_images(
                        model='imagen-3.0-generate-001', # Use stable Imagen for text-to-image fallback
                        prompt=f"A fashion catalog shot of a model wearing {item_name}",
                        config=types.GenerateImagesConfig(numberOfImages=1)
                    )
                    generated_image_bytes = response.generated_images[0].image_bytes
                
                generated_image = generated_image_bytes
                break
            except Exception as e:
                print(f"Model {model_id} failed: {e}")
                continue
        
        if generated_image:
            img_b64 = base64.b64encode(generated_image).decode('utf-8')
            return f"data:image/png;base64,{img_b64}"
            
    except Exception as e:
        print(f"Generative AI Error: {e}")
        return None
    
    return None
