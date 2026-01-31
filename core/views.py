import json
import os
import base64
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .mongodb import get_db
from google import genai
from google.genai import types
from dotenv import load_dotenv
from django.contrib.auth.hashers import make_password, check_password

# Load environment variables
from pathlib import Path
ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=ENV_PATH, override=True)

from .utils_gemini import generate_tryon_image

@csrf_exempt
def api_tryon(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            item_name = data.get('item', 'fashion item')
            gender = data.get('gender', 'person')
            user_photo = data.get('user_photo', None)

            # Generate image using Gemini
            image_data = generate_tryon_image(item_name, gender, user_photo)
            
            if image_data:
                return JsonResponse({'success': True, 'image': image_data})
            else:
                return JsonResponse({'success': False, 'error': 'Generation failed'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})

def index(request):
    # If already logged in, go to dashboard
    if request.session.get('user_email'):
        from django.shortcuts import redirect
        return redirect('dashboard')
        
    db = get_db()
    db_status = "Disconnected"
    db_connected = False
    if db is not None:
        db_status = getattr(db, 'status', 'Connected')
        db_connected = True
        
    return render(request, 'core/index.html', {
        'db_status': db_status,
        'db_connected': db_connected,
        'clear_stale_session': True
    })

def dashboard(request):
    # If not logged in, go to login page (index)
    if not request.session.get('user_email'):
        from django.shortcuts import redirect
        return redirect('index')
    return render(request, 'core/dashboard.html')

@csrf_exempt
def api_signup(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return JsonResponse({'success': False, 'error': 'Missing fields'})
            
            db = get_db()
            if db is None:
                return JsonResponse({'success': False, 'error': 'Database connection failed'})
            
            users_col = db['users']
            
            # Check if user exists
            if users_col.find_one({'email': email}):
                return JsonResponse({'success': False, 'error': 'User already exists'})
            
            # Store user with hashed password
            users_col.insert_one({
                'email': email,
                'password': make_password(password)
            })
            
            # Set session
            request.session['user_email'] = email
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})

@csrf_exempt
def api_login(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username') # This is the email
            password = data.get('password')
            
            db = get_db()
            if db is None:
                return JsonResponse({'success': False, 'error': 'Database connection failed'})
            
            users_col = db['users']
            user = users_col.find_one({'email': username})
            
            if user:
                is_valid = False
                # Try Django hash check first
                try:
                    is_valid = check_password(password, user['password'])
                except:
                    is_valid = False
                
                # Fallback: check if stored password is plain text (for legacy users)
                if not is_valid and password == user['password']:
                    is_valid = True
                    # Optional: Migrate to hash now
                    users_col.update_one({'_id': user['_id']}, {'$set': {'password': make_password(password)}})

                if is_valid:
                    # Set session
                    request.session['user_email'] = username
                    return JsonResponse({'success': True})
                else:
                    return JsonResponse({'success': False, 'error': 'Invalid credentials'})
            else:
                return JsonResponse({'success': False, 'error': 'Invalid credentials'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})

@csrf_exempt
def api_logout(request):
    if request.method == 'POST':
        try:
            # Clear the session
            request.session.flush()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid method'})

@csrf_exempt
def api_chat(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_text = data.get('message', '')
            history = data.get('history', [])
            image_data = data.get('image') # Base64 image if uploaded

            if not user_text and not image_data:
                return JsonResponse({'success': False, 'error': 'Empty message'})

            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                return JsonResponse({'success': False, 'error': 'Gemini API key not configured'})
                
            client = genai.Client(api_key=api_key)
            
            # 🔥 MCP INTEGRATION: Enhance user query with real-time fashion trend data
            mcp_context = ""
            user_text_lower = user_text.lower()
            
            try:
                from .mcp_integration import get_fashion_trends_sync, get_style_tips_sync
                
                # Check if user is asking about trends
                if any(keyword in user_text_lower for keyword in ['trend', 'trending', 'popular', 'latest', 'current', 'hot']):
                    print("[MCP] Fetching real-time fashion trends...")
                    
                    # Determine category from user query
                    category = "all"
                    if "men" in user_text_lower or "male" in user_text_lower:
                        category = "men"
                    elif "women" in user_text_lower or "female" in user_text_lower or "ladies" in user_text_lower:
                        category = "women"
                    elif "accessories" in user_text_lower or "accessory" in user_text_lower:
                        category = "accessories"
                    
                    trends_data = get_fashion_trends_sync(category)
                    if "error" not in trends_data:
                        mcp_context = f"\\n\\n[REAL-TIME TREND DATA via MCP]: {json.dumps(trends_data, indent=2)}\\n"
                        print(f"[MCP] ✓ Trends data fetched for category: {category}")
                
                # Check if user is asking for style tips
                elif any(keyword in user_text_lower for keyword in ['occasion', 'event', 'party', 'wedding', 'office', 'casual', 'formal']):
                    print("[MCP] Fetching style tips...")
                    
                    # Determine occasion
                    occasion = "casual"
                    if "office" in user_text_lower or "work" in user_text_lower:
                        occasion = "office"
                    elif "formal" in user_text_lower or "business" in user_text_lower:
                        occasion = "formal"
                    elif "party" in user_text_lower:
                        occasion = "party"
                    elif "wedding" in user_text_lower:
                        occasion = "wedding"
                    
                    style_tip = get_style_tips_sync(occasion)
                    mcp_context = f"\\n\\n[STYLE TIP via MCP]: {style_tip}\\n"
                    print(f"[MCP] ✓ Style tip fetched for occasion: {occasion}")
                    
            except Exception as mcp_error:
                print(f"[MCP] Warning: Could not fetch MCP data: {mcp_error}")
                # Continue without MCP data - graceful degradation
            
            # Prepare strict fashion-focused system prompt optimized for latest Gemini
            system_prompt = (
                "You are the Opuluxe AI Fashion Consultant powered by advanced Gemini AI. "
                "CRITICAL RULE: You ONLY answer questions related to fashion, style, clothing, accessories, and grooming. "
                "If the user asks about anything else (e.g., math, coding, politics, general knowledge), "
                "politely explain that you are specialized in fashion and can only assist with style-related queries. "
                "Keep your tone elegant, premium, and helpful. "
                "PERSONALIZATION RULE: If the user is asking for specific recommendations (like 'what should I wear?' or 'does this fit?'), "
                "and you don't have their measurements yet, encourage them to select a profile by including the tag [NEED_PROFILE_SELECTION] at the very end of your response. "
                "CONSULTATION FLOW: Once measurements ARE provided, you MUST ask for their shopping preferences (Budget, Platform, Brands) by including the tag [NEED_SHOPPING_DETAILS] at the very end of your response. "
                "Do not give final clothing links until these preferences are clarified. "
                "AI CAPABILITIES: Leverage your enhanced reasoning to provide deeply personalized fashion advice, "
                "analyze images with superior accuracy, and understand complex style preferences with nuanced context. "
                "\\n\\n"
                "PRODUCT RECOMMENDATION FORMAT (CRITICAL): When recommending specific clothing items or products, ALWAYS format them as follows:\\n"
                "1. Use numbered lists (1., 2., 3., etc.)\\n"
                "2. Make the product name/brand BOLD using **double asterisks**\\n"
                "3. Include a brief description after the product name\\n"
                "4. Optionally mention price range or key features\\n"
                "\\n"
                "EXAMPLE FORMAT:\\n"
                "1. **Nike Air Max 270** - Comfortable running shoes with excellent cushioning\\n"
                "   - Price: ₹12,000 - ₹15,000\\n"
                "   - Available in multiple colors\\n"
                "\\n"
                "2. **Levi's 511 Slim Fit Jeans** - Classic denim with modern slim cut\\n"
                "   - Price: ₹3,500 - ₹5,000\\n"
                "   - Perfect for casual and semi-formal occasions\\n"
                "\\n"
                "This formatting is ESSENTIAL as it enables the 'Magic Try-On' and 'Shop Now' features for users."
            )
            
            # Build conversation contents for Gemini
            contents = []
            
            # Add images if any
            image_part = None
            if image_data:
                try:
                    if ',' in image_data:
                        base64_data = image_data.split(',')[1]
                    else:
                        base64_data = image_data
                    image_bytes = base64.b64decode(base64_data)
                    image_part = types.Part.from_bytes(data=image_bytes, mime_type='image/png')
                except Exception as img_err:
                    print(f"Error processing image for Gemini: {img_err}")

            # Add History
            for h in history[-10:]: # Gemini has larger context, we can afford more
                role = "user" if h['role'] == 'user' else "model"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h['text'])]))
            
            # Add current message (with MCP context if available)
            current_parts = []
            if image_part:
                current_parts.append(image_part)
            if user_text:
                # Append MCP context to user text for enhanced AI responses
                enhanced_user_text = user_text + mcp_context
                current_parts.append(types.Part.from_text(text=enhanced_user_text))
            
            contents.append(types.Content(role="user", parts=current_parts))

            # Call Gemini 2.5 Flash (latest available, ready for Gemini 3 upgrade)
            response = client.models.generate_content(
                model='gemini-2.5-flash',  # Using latest Gemini 2.5, will upgrade to Gemini 3 when available
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7,
                    max_output_tokens=2048
                )
            )

            response_text = response.text

            # Save to Database if user is logged in
            user_email = request.session.get('user_email')
            if user_email:
                try:
                    db = get_db()
                    if db is not None:
                        sessions_col = db['chat_sessions']
                        session_id = data.get('session_id')
                        
                        if not session_id:
                            # Create new session
                            session_id = str(os.urandom(8).hex())
                            sessions_col.insert_one({
                                'user_email': user_email,
                                'session_id': session_id,
                                'title': user_text[:30] + '...' if user_text else 'Visual Search',
                                'messages': [
                                    {'role': 'user', 'text': user_text, 'image': image_data},
                                    {'role': 'assistant', 'text': response_text}
                                ]
                            })
                        else:
                            # Update existing session
                            sessions_col.update_one(
                                {'user_email': user_email, 'session_id': session_id},
                                {
                                    '$push': {
                                        'messages': {
                                            '$each': [
                                                {'role': 'user', 'text': user_text, 'image': image_data},
                                                {'role': 'assistant', 'text': response_text}
                                            ]
                                        }
                                    }
                                }
                            )
                        return JsonResponse({'success': True, 'reply': response_text, 'session_id': session_id})
                except Exception as db_err:
                    print(f"Database Error: {db_err}")

            return JsonResponse({'success': True, 'reply': response_text})

        except Exception as e:
            error_msg = str(e)
            if "PERMISSION_DENIED" in error_msg or "leaked" in error_msg.lower() or "403" in error_msg:
                 return JsonResponse({'success': False, 'error': "System security alert: The AI credential has been invalidated. Please contact the administrator to update the API Key."})
            return JsonResponse({'success': False, 'error': error_msg})
    return JsonResponse({'success': False, 'error': 'Invalid method'})

@csrf_exempt
def api_get_chat_history(request):
    user_email = request.session.get('user_email')
    if not user_email:
        return JsonResponse({'success': False, 'error': 'Not logged in'})
    
    try:
        db = get_db()
        if db is None:
            return JsonResponse({'success': False, 'error': 'Database connection failed'})
            
        sessions_col = db['chat_sessions']
        sessions = list(sessions_col.find({'user_email': user_email}, {'_id': 0, 'session_id': 1, 'title': 1}).sort('_id', -1))
        
        return JsonResponse({'success': True, 'history': sessions})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
def api_get_session_detail(request):
    user_email = request.session.get('user_email')
    session_id = request.GET.get('id')
    if not user_email or not session_id:
        return JsonResponse({'success': False})
        
    db = get_db()
    session = db['chat_sessions'].find_one({'user_email': user_email, 'session_id': session_id}, {'_id': 0})
    if session:
        return JsonResponse({'success': True, 'messages': session.get('messages', [])})
    return JsonResponse({'success': False})

@csrf_exempt
def api_delete_chat(request):
    user_email = request.session.get('user_email')
    data = json.loads(request.body)
    session_id = data.get('id')
    if not user_email or not session_id:
        return JsonResponse({'success': False})
        
    db = get_db()
    db['chat_sessions'].delete_one({'user_email': user_email, 'session_id': session_id})
    return JsonResponse({'success': True})

@csrf_exempt
def api_save_profile(request):
    user_email = request.session.get('user_email')
    if not user_email: return JsonResponse({'success': False, 'error': 'Not logged in'})
    
    try:
        data = json.loads(request.body)
        profile = data.get('profile')
        if not profile: return JsonResponse({'success': False})
        
        db = get_db()
        # Profiles collection
        profiles_col = db['user_profiles']
        
        # Check if exists by ID
        existing = profiles_col.find_one({'user_email': user_email, 'id': profile['id']})
        
        profile['user_email'] = user_email # Ensure ownership
        
        if existing:
            profiles_col.update_one({'user_email': user_email, 'id': profile['id']}, {'$set': profile})
        else:
            profiles_col.insert_one(profile)
            
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
def api_get_profiles(request):
    user_email = request.session.get('user_email')
    if not user_email: return JsonResponse({'success': False, 'history': []}) # fallback format
    
    try:
        db = get_db()
        profiles = list(db['user_profiles'].find({'user_email': user_email}, {'_id': 0}))
        return JsonResponse({'success': True, 'profiles': profiles})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
def api_get_single_profile(request, profile_id):
    user_email = request.session.get('user_email')
    if not user_email: return JsonResponse({'success': False, 'error': 'Not logged in'})
    
    try:
        db = get_db()
        # id is stored as int/float in frontend (Date.now()), but let's check how we stored it.
        # JSON loads usually keeps numbers as numbers.
        # However, URL parameters are strings. We might need to try both or cast.
        
        # Try finding as string first (if stored from URL) or int
        query = {'user_email': user_email}
        
        # Simple logical OR query for ID type safety
        try:
           pid_int = int(profile_id)
           query['$or'] = [{'id': profile_id}, {'id': pid_int}]
        except:
           query['id'] = profile_id

        profile = db['user_profiles'].find_one(query, {'_id': 0})
        
        if profile:
            return JsonResponse({'success': True, 'profile': profile})
        else:
             return JsonResponse({'success': False, 'error': 'Profile not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
def api_delete_profile(request):
    user_email = request.session.get('user_email')
    if not user_email: return JsonResponse({'success': False})
    
    data = json.loads(request.body)
    profile_id = data.get('id')
    
    db = get_db()
    db['user_profiles'].delete_one({'user_email': user_email, 'id': profile_id})
    return JsonResponse({'success': True})
