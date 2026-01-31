
import os
import base64
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

def generate_tryon_image(item_name, gender, original_photo_data=None):
    """
    Generates a fashion preview image using OpenAI (GPT-4o + DALL-E 3).
    Args:
        item_name (str): The name of the clothing item.
        gender (str): 'men' or 'women'.
        original_photo_data (str, optional): Base64 data string of user's photo.
    Returns:
        str: Base64 data URL of generated image, or None if failed.
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY") # User put OpenAI key in this var
        # Check if it starts with 'sk-' just to be safe, though we know user did so.
        if not api_key:
             # Fallback to OPENAI_API_KEY if they change it later
             api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            print("AI API Key not found")
            return None
        
        client = OpenAI(api_key=api_key)
        
        print(f"[OpenAI Try-On] Processing: {item_name} for {gender}")
        
        photo_description = f"A {gender} model posing for a fashion catalog"
        
        if original_photo_data:
            # Step 1: Analyze original photo using GPT-4o
            print("[OpenAI Try-On] Step 1: Analyzing original photo...")
            
            # Ensure proper data URI format for valid checking, though OpenAI wants URL or base64.
            # If original_photo_data comes as "data:image/png;base64,..." we pass it directly.
            # If just base64, we need to add prefix? user sent "data:image..." usually.
            # Actually, GPT-4o Vision accepts base64 url.
            
            image_url = original_photo_data
            if not image_url.startswith("data:"):
                # Assume png if raw base64
                image_url = f"data:image/png;base64,{original_photo_data}"
                
            try:
                analysis_response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Describe this person's physical appearance (body type, skin tone, hair, age), pose, and the lighting in detail. This is for generating a new fashion photo of them."},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": image_url
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=300
                )
                photo_description = analysis_response.choices[0].message.content
                print(f"[OpenAI Try-On] Analysis: {photo_description[:100]}...")
            except Exception as e:
                print(f"[OpenAI Try-On] Analysis failed: {e}")
                # Fallback
        
        # Step 2: Generate with DALL-E 3
        print("[OpenAI Try-On] Step 2: Generating image...")
        
        prompt = (
            f"A professional hyper-realistic fashion photo of {photo_description}. "
            f"The person is wearing {item_name}. "
            f"Ensure the clothing ({item_name}) is fully visible and looks high-quality. "
            f"Fashion catalog style, clean background, 8k resolution."
        )
        
        try:
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
                response_format="b64_json"
            )
            
            image_b64 = response.data[0].b64_json
            return f"data:image/png;base64,{image_b64}"
            
        except Exception as img_err:
             print(f"[OpenAI Try-On] Generation failed: {img_err}")
             return None

    except Exception as e:
        print(f"[OpenAI Try-On] Critical Error: {e}")
        return None
