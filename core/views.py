import json
import os
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .mongodb import get_db
from groq import Groq
from dotenv import load_dotenv
from django.contrib.auth.hashers import make_password, check_password

# Load environment variables
load_dotenv()

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
    if db is not None:
        db_status = getattr(db, 'status', 'Connected')
        
    return render(request, 'core/index.html', {
        'db_status': db_status,
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
from groq import Groq
import os

@csrf_exempt
def api_chat(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_text = data.get('message', '')
            history = data.get('history', [])

            if not user_text:
                return JsonResponse({'success': False, 'error': 'Empty message'})

            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                return JsonResponse({'success': False, 'error': 'API key not configured'})
                
            client = Groq(api_key=api_key)
            
            # Prepare strict fashion-focused system prompt
            system_prompt = (
                "You are the Opuluxe AI Fashion Consultant. "
                "CRITICAL RULE: You ONLY answer questions related to fashion, style, clothing, accessories, and grooming. "
                "If the user asks about anything else (e.g., math, coding, politics, general knowledge), "
                "politely explain that you are specialized in fashion and can only assist with style-related queries. "
                "Keep your tone elegant, premium, and helpful. "
                "PERSONALIZATION RULE: If the user is asking for specific recommendations (like 'what should I wear?' or 'does this fit?'), "
                "and you don't have their measurements yet, encourage them to select a profile by including the tag [NEED_PROFILE_SELECTION] at the very end of your response. "
                "CONSULTATION FLOW: Once measurements ARE provided, you MUST ask for their shopping preferences (Budget, Platform, Brands) by including the tag [NEED_SHOPPING_DETAILS] at the very end of your response. "
                "Do not give final clothing links until these preferences are clarified."
            )
            
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add history (last 5 messages to avoid token bloat)
            for h in history[-5:]:
                messages.append({"role": h['role'], "content": h['text']})
            
            # Add current user message
            messages.append({"role": "user", "content": user_text})

            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )

            response_text = completion.choices[0].message.content

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
                                'title': user_text[:30] + '...',
                                'messages': [
                                    {'role': 'user', 'text': user_text, 'image': data.get('image')},
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
                                                {'role': 'user', 'text': user_text, 'image': data.get('image')},
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
            return JsonResponse({'success': False, 'error': str(e)})
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
