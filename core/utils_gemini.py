import os
import base64
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

def generate_tryon_image(item_name, gender, original_photo_data=None):
    """
    Generates a fashion preview image using Gemini's multimodal capabilities.
    Args:
        item_name (str): The name of the clothing item.
        gender (str): 'men' or 'women'.
        original_photo_data (str, optional): Base64 string of user's photo.
    Returns:
        str: Base64 data URL of generated image, or None if failed.
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("GEMINI_API_KEY not found in environment")
            return None
            
        client = genai.Client(api_key=api_key)
        
        print(f"[Magic Try-On] Processing: {item_name} for {gender}")
        
        # If we have an original photo, use a two-step approach:
        # 1. Analyze the original photo with Gemini
        # 2. Generate a new image based on the analysis
        
        if original_photo_data:
            # Strip base64 prefix if present
            if ',' in original_photo_data:
                original_photo_data = original_photo_data.split(',')[1]
            
            # Convert base64 to bytes
            image_bytes = base64.b64decode(original_photo_data)
            
            # Step 1: Analyze the original photo
            print("[Magic Try-On] Step 1: Analyzing original photo...")
            analysis_prompt = (
                f"Analyze this photo in detail. Describe:\n"
                f"1. The person's appearance (gender, age range, body type, skin tone, hair)\n"
                f"2. Their current pose and position\n"
                f"3. The background and setting\n"
                f"4. The lighting conditions\n"
                f"Be very specific and detailed."
            )
            
            try:
                analysis_response = client.models.generate_content(
                    model='gemini-2.5-flash',  # Using latest Gemini 2.5, will upgrade to Gemini 3 when available
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type='image/png'),
                        analysis_prompt
                    ]
                )
                
                photo_description = analysis_response.text
                print(f"[Magic Try-On] Photo analysis complete: {photo_description[:100]}...")
                
            except Exception as e:
                print(f"[Magic Try-On] Analysis failed: {e}")
                # Use a generic description if analysis fails
                photo_description = f"A {gender} person in a neutral pose"
            
            # Step 2: Generate new image with the outfit
            print("[Magic Try-On] Step 2: Generating try-on image...")
            generation_prompt = (
                f"Create a high-quality fashion catalog photo based on this description:\n\n"
                f"PERSON DETAILS:\n{photo_description}\n\n"
                f"OUTFIT TO WEAR:\n{item_name}\n\n"
                f"REQUIREMENTS:\n"
                f"- The person should be wearing EXACTLY: {item_name}\n"
                f"- Maintain the same person characteristics (gender, age, body type, skin tone)\n"
                f"- Keep a similar pose if possible\n"
                f"- Use professional fashion photography lighting\n"
                f"- Clean, professional background suitable for fashion catalog\n"
                f"- Ultra-realistic, high-end fashion quality\n"
                f"- Focus on showing how the {item_name} looks when worn\n"
                f"- Make sure the outfit matches the description EXACTLY"
            )
            
        else:
            # No original photo - generate from scratch
            print("[Magic Try-On] Generating from scratch (no original photo)...")
            generation_prompt = (
                f"Create a professional fashion catalog photo of a {gender} model wearing {item_name}. "
                f"Ultra-realistic, high-end fashion photography quality. "
                f"Clean background, professional lighting, full body shot showing the outfit clearly."
            )
        
        # Generate the image using Imagen
        try:
            print(f"[Magic Try-On] Calling Imagen with prompt: {generation_prompt[:100]}...")
            
            response = client.models.generate_images(
                model='imagen-3.0-generate-001',
                prompt=generation_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    safety_filter_level="block_only_high",
                    person_generation="allow_adult",
                    aspect_ratio="3:4"  # Good for fashion photos
                )
            )
            
            if response.generated_images and len(response.generated_images) > 0:
                generated_image_bytes = response.generated_images[0].image.image_bytes
                img_b64 = base64.b64encode(generated_image_bytes).decode('utf-8')
                print("[Magic Try-On] ✓ Image generated successfully!")
                return f"data:image/png;base64,{img_b64}"
            else:
                print("[Magic Try-On] No images in response")
                return None
                
        except Exception as gen_error:
            print(f"[Magic Try-On] Imagen generation failed: {gen_error}")
            return None
            
    except Exception as e:
        print(f"[Magic Try-On] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        return None
        