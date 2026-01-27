# 🏗️ Opuluxe AI - System Architecture

## Overview

Opuluxe AI is a full-stack web application that integrates **Gemini 3 Pro** for AI-powered fashion consulting and virtual try-on experiences. This document outlines the system architecture, data flow, and integration points.

---

## 🎯 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Login/      │  │  Dashboard   │  │  Settings    │         │
│  │  Signup      │  │  Chat UI     │  │  Profiles    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                     │
│                   Frontend (HTML/CSS/JS)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS/REST API
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                      DJANGO BACKEND                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    URL Routing                            │  │
│  │  /api/login/  /api/chat/  /api/tryon/  /api/profiles/   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    View Layer                             │  │
│  │  • Authentication  • Chat Handler  • Try-On Handler      │  │
│  │  • Profile Manager • Session Manager                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────┴───────────────────────────────┐  │
│  │              Business Logic Layer                         │  │
│  │  ┌─────────────────┐    ┌──────────────────────────┐    │  │
│  │  │ MongoDB Utils   │    │  Gemini 3 Integration    │    │  │
│  │  │ • User CRUD     │    │  • Fashion Consultant    │    │  │
│  │  │ • Profile CRUD  │    │  • Image Analysis        │    │  │
│  │  │ • Chat History  │    │  • Try-On Generation     │    │  │
│  │  └─────────────────┘    └──────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
┌─────────────┴──────────┐    ┌─────────────┴──────────────┐
│   MongoDB Atlas        │    │   Google AI APIs           │
│  ┌──────────────────┐  │    │  ┌──────────────────────┐  │
│  │ Users Collection │  │    │  │  Gemini 3 Pro API    │  │
│  │ Profiles Coll.   │  │    │  │  • Chat Completion   │  │
│  │ Chat Sessions    │  │    │  │  • Image Analysis    │  │
│  └──────────────────┘  │    │  └──────────────────────┘  │
│                        │    │  ┌──────────────────────┐  │
│  Cloud Database        │    │  │  Imagen 3.0 API      │  │
│  • Scalable            │    │  │  • Image Generation  │  │
│  • Persistent          │    │  │  • Virtual Try-On    │  │
│  • Secure              │    │  └──────────────────────┘  │
└────────────────────────┘    └────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### 1. User Authentication Flow

```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ User │────▶│ Frontend│────▶│  Django  │────▶│ MongoDB  │
└──────┘     └─────────┘     │  Views   │     │  Atlas   │
                              └──────────┘     └──────────┘
                                    │               │
                                    │  Verify       │
                                    │◀──────────────┘
                                    │
                                    │  Create Session
                                    ▼
                              ┌──────────┐
                              │ Session  │
                              │  Cookie  │
                              └──────────┘
```

### 2. AI Fashion Consultant Flow (Gemini 3 Pro)

```
┌──────┐                                    ┌──────────────┐
│ User │──── Text/Image Query ────────────▶│   Frontend   │
└──────┘                                    └──────────────┘
                                                   │
                                                   │ POST /api/chat/
                                                   ▼
                                            ┌──────────────┐
                                            │ Django Views │
                                            │  api_chat()  │
                                            └──────────────┘
                                                   │
                        ┌──────────────────────────┼──────────────────────────┐
                        │                          │                          │
                        ▼                          ▼                          ▼
                 ┌──────────────┐         ┌──────────────┐          ┌──────────────┐
                 │   MongoDB    │         │  Gemini 3    │          │   Session    │
                 │ Get History  │         │  Pro API     │          │  Management  │
                 └──────────────┘         └──────────────┘          └──────────────┘
                        │                          │                          │
                        │  Chat Context            │  AI Response             │
                        └────────────▶┌────────────┴──────────┐◀──────────────┘
                                      │   Process Response    │
                                      │  • Parse tags         │
                                      │  • Format markdown    │
                                      │  • Extract actions    │
                                      └───────────────────────┘
                                                   │
                                                   │  Save to DB
                                                   ▼
                                            ┌──────────────┐
                                            │   MongoDB    │
                                            │ Chat Session │
                                            └──────────────┘
                                                   │
                                                   │  Return JSON
                                                   ▼
                                            ┌──────────────┐
                                            │   Frontend   │
                                            │ Display Chat │
                                            └──────────────┘
```

### 3. Magic AI Try-On Flow (Gemini 3 Pro + Imagen 3)

```
┌──────┐                                    ┌──────────────┐
│ User │──── Select Item + Profile ───────▶│   Frontend   │
└──────┘                                    └──────────────┘
                                                   │
                                                   │ POST /api/tryon/
                                                   ▼
                                            ┌──────────────┐
                                            │ Django Views │
                                            │ api_tryon()  │
                                            └──────────────┘
                                                   │
                                                   │ Call utils_gemini.py
                                                   ▼
                                       ┌───────────────────────┐
                                       │ generate_tryon_image()│
                                       └───────────────────────┘
                                                   │
                        ┌──────────────────────────┼──────────────────────────┐
                        │                          │                          │
                        ▼                          ▼                          ▼
              ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
              │   Gemini 3 Pro   │      │   Gemini 3 Pro   │      │    Imagen 3.0    │
              │  STEP 1: Analyze │      │  STEP 2: Create  │      │  STEP 3: Generate│
              │  User Photo      │─────▶│  Detailed Prompt │─────▶│  Try-On Image    │
              │  • Pose          │      │  • Person desc.  │      │  • Photorealistic│
              │  • Lighting      │      │  • Outfit desc.  │      │  • High quality  │
              │  • Body type     │      │  • Requirements  │      │  • 3:4 aspect    │
              └──────────────────┘      └──────────────────┘      └──────────────────┘
                                                                            │
                                                                            │ Base64 Image
                                                                            ▼
                                                                   ┌──────────────────┐
                                                                   │   Return to      │
                                                                   │   Frontend       │
                                                                   │  • Original      │
                                                                   │  • Generated     │
                                                                   └──────────────────┘
```

---

## 📦 Component Details

### Frontend Components

#### 1. **Authentication UI** (`core/templates/core/index.html`)
- Login/Signup forms
- GSAP animations
- Form validation
- Session management

#### 2. **Dashboard UI** (`core/templates/core/dashboard.html`)
- Chat interface
- Sidebar navigation
- Settings modal
- Profile management modal
- Try-on overlay

#### 3. **JavaScript Modules**

**`auth.js`**
- Handles login/signup
- Form validation
- API communication
- Session storage

**`dashboard.js`**
- Chat functionality
- File upload handling
- Message rendering
- Try-on modal
- Profile management
- Shopping integration

**`translations.js`**
- Multi-language support
- Dynamic text replacement
- Language switching

### Backend Components

#### 1. **Views** (`core/views.py`)

**Authentication Views:**
```python
def api_signup(request)
def api_login(request)
def api_logout(request)
```

**Chat Views:**
```python
def api_chat(request)  # Gemini 3 Pro integration
def api_get_chat_history(request)
def api_get_session_detail(request)
def api_delete_chat(request)
```

**Try-On Views:**
```python
def api_tryon(request)  # Gemini 3 + Imagen 3
```

**Profile Views:**
```python
def api_save_profile(request)
def api_get_profiles(request)
def api_get_single_profile(request, profile_id)
def api_delete_profile(request)
```

#### 2. **Gemini 3 Integration** (`core/utils_gemini.py`)

```python
def generate_tryon_image(item_name, gender, original_photo_data):
    """
    Three-step AI try-on process:
    1. Analyze user photo with Gemini 3 Pro
    2. Generate detailed prompt
    3. Create image with Imagen 3
    """
    # Step 1: Gemini 3 Pro analysis
    analysis = client.models.generate_content(
        model='gemini-3-pro',
        contents=[image_bytes, analysis_prompt]
    )
    
    # Step 2: Build generation prompt
    generation_prompt = create_prompt(analysis, item_name)
    
    # Step 3: Imagen 3 generation
    result = client.models.generate_images(
        model='imagen-3.0-generate-001',
        prompt=generation_prompt,
        config=GenerateImagesConfig(...)
    )
    
    return base64_image
```

#### 3. **Database Layer** (`core/mongodb.py`)

```python
def get_db_client():
    """MongoDB Atlas connection with caching"""
    
def get_db():
    """Get database instance"""
```

**Collections:**
- `users` - User accounts (email, hashed password)
- `user_profiles` - Measurement profiles (measurements, photos, preferences)
- `chat_sessions` - Conversation history (messages, session_id, user_email)

---

## 🔐 Security Architecture

### 1. **Authentication**
- Django session-based authentication
- Password hashing with `make_password()`
- CSRF protection with `@csrf_exempt` for API endpoints
- Session cookies with 2-week expiry

### 2. **Data Protection**
- Environment variables for sensitive data (`.env`)
- MongoDB Atlas with TLS/SSL encryption
- API key security (not exposed to frontend)
- Input validation and sanitization

### 3. **API Security**
- Rate limiting (to be implemented)
- Request validation
- Error handling without exposing internals
- CORS configuration

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
├── Django Dev Server (localhost:8000)
├── MongoDB Atlas (cloud)
└── Gemini 3 API (cloud)
```

### Production (Recommended)
```
┌─────────────────────────────────────┐
│         Firebase Hosting            │
│  • Static files (HTML/CSS/JS)       │
│  • CDN distribution                 │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      Cloud Run / App Engine         │
│  • Django application               │
│  • Auto-scaling                     │
│  • HTTPS                            │
└─────────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    ▼                       ▼
┌──────────┐        ┌──────────────┐
│ MongoDB  │        │  Gemini 3    │
│  Atlas   │        │  API         │
└──────────┘        └──────────────┘
```

---

## 📊 Data Models

### User Model
```python
{
    "_id": ObjectId,
    "email": str,
    "password": str (hashed)
}
```

### Profile Model
```python
{
    "_id": ObjectId,
    "user_email": str,
    "id": int (timestamp),
    "name": str,
    "category": str ("men" | "women"),
    "photo": str (base64),
    "measurements": {
        "chest": str,
        "waist": str,
        "hips": str,
        "inseam": str,
        "shoulder": str,
        "sleeve": str,
        "neck": str,
        "height": str,
        "weight": str
    },
    "fit": {
        "type": str,
        "comfort": str,
        "waist": str,
        "length": str,
        "notes": str
    },
    "timestamp": str (ISO 8601)
}
```

### Chat Session Model
```python
{
    "_id": ObjectId,
    "user_email": str,
    "session_id": str,
    "title": str,
    "messages": [
        {
            "role": str ("user" | "assistant"),
            "text": str,
            "image": str (base64, optional)
        }
    ]
}
```

---

## 🎨 UI/UX Architecture

### Design System
- **Color Palette**: Dark mode with accent colors
- **Typography**: System fonts with fallbacks
- **Spacing**: 8px grid system
- **Components**: Modular, reusable
- **Animations**: GSAP for smooth transitions

### Responsive Breakpoints
```css
/* Mobile */
@media (max-width: 768px)

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px)

/* Desktop */
@media (min-width: 1025px)
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/signup/` | POST | Create new user | No |
| `/api/login/` | POST | Authenticate user | No |
| `/api/logout/` | POST | End session | Yes |
| `/api/chat/` | POST | Send message to AI | Yes |
| `/api/chat-history/` | GET | Get chat sessions | Yes |
| `/api/chat-session/` | GET | Get session detail | Yes |
| `/api/delete-chat/` | POST | Delete chat session | Yes |
| `/api/tryon/` | POST | Generate try-on image | Yes |
| `/api/save-profile/` | POST | Save/update profile | Yes |
| `/api/get-profiles/` | GET | Get all profiles | Yes |
| `/api/get-profile/<id>/` | GET | Get single profile | Yes |
| `/api/delete-profile/` | POST | Delete profile | Yes |

---

## 🧪 Testing Strategy

### Unit Tests
- Model validation
- View logic
- Utility functions
- API responses

### Integration Tests
- End-to-end user flows
- API endpoint testing
- Database operations
- Gemini 3 integration

### Manual Testing
- UI/UX testing
- Cross-browser compatibility
- Mobile responsiveness
- Performance testing

---

## 📈 Performance Optimization

### Frontend
- Lazy loading images
- Minified CSS/JS
- GZIP compression
- Browser caching

### Backend
- MongoDB connection pooling
- Query optimization
- Response caching
- Async operations (future)

### AI Integration
- Efficient prompt engineering
- Image compression before upload
- Response streaming (future)
- Caching common queries (future)

---

## 🔮 Future Enhancements

### Technical
- [ ] WebSocket for real-time chat
- [ ] Redis caching layer
- [ ] Celery for background tasks
- [ ] GraphQL API
- [ ] Progressive Web App (PWA)

### Features
- [ ] AR try-on with WebXR
- [ ] Voice assistant integration
- [ ] Social sharing features
- [ ] Wardrobe management
- [ ] Style transfer
- [ ] Trend analysis dashboard

---

**Architecture Version:** 1.0  
**Last Updated:** January 27, 2026  
**Built for:** Google DeepMind Gemini 3 Hackathon
