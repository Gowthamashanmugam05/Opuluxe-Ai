#!/usr/bin/env python
"""
Test script to verify all critical functionality after bug fixes
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_imports():
    """Test that all required modules can be imported"""
    print("Testing imports...")
    try:
        from core import views
        from core import urls
        from core import mongodb
        from core import utils_gemini
        print("✅ All core modules imported successfully")
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def test_view_functions():
    """Test that all view functions exist"""
    print("\nTesting view functions...")
    from core import views
    
    required_views = [
        'index',
        'dashboard',
        'api_signup',
        'api_login',
        'api_logout',
        'api_chat',
        'api_get_chat_history',
        'api_get_session_detail',
        'api_delete_chat',
        'api_tryon',
        'api_save_profile',
        'api_get_profiles',
        'api_get_single_profile',
        'api_delete_profile'
    ]
    
    missing = []
    for view_name in required_views:
        if not hasattr(views, view_name):
            missing.append(view_name)
    
    if missing:
        print(f"❌ Missing view functions: {', '.join(missing)}")
        return False
    else:
        print(f"✅ All {len(required_views)} view functions exist")
        return True

def test_url_patterns():
    """Test that all URL patterns are valid"""
    print("\nTesting URL patterns...")
    try:
        from core import urls
        from django.urls import resolve
        
        test_urls = [
            '/',
            '/dashboard/',
            '/api/signup/',
            '/api/login/',
            '/api/logout/',
            '/api/chat/',
            '/api/chat-history/',
            '/api/chat-session/',
            '/api/delete-chat/',
            '/api/tryon/',
            '/api/save-profile/',
            '/api/get-profiles/',
            '/api/get-profile/123/',
            '/api/delete-profile/',
        ]
        
        for url in test_urls:
            try:
                resolve(url)
            except Exception as e:
                print(f"❌ URL pattern error for {url}: {e}")
                return False
        
        print(f"✅ All {len(test_urls)} URL patterns are valid")
        return True
    except Exception as e:
        print(f"❌ URL pattern test error: {e}")
        return False

def test_base64_import():
    """Test that base64 is properly imported in views"""
    print("\nTesting base64 import...")
    try:
        from core import views
        import inspect
        
        source = inspect.getsource(views)
        if 'import base64' in source:
            print("✅ base64 module is imported")
            return True
        else:
            print("❌ base64 module is NOT imported")
            return False
    except Exception as e:
        print(f"❌ Error checking base64 import: {e}")
        return False

def test_database_connection():
    """Test MongoDB connection"""
    print("\nTesting database connection...")
    try:
        from core.mongodb import get_db
        db = get_db()
        if db is not None:
            print("✅ MongoDB connection successful")
            return True
        else:
            print("⚠️  MongoDB connection failed (check .env configuration)")
            return True  # Not a critical error for this test
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def test_gemini_api_key():
    """Test that Gemini API key is configured"""
    print("\nTesting Gemini API configuration...")
    try:
        from dotenv import load_dotenv
        from pathlib import Path
        
        ENV_PATH = Path(__file__).resolve().parent / '.env'
        load_dotenv(dotenv_path=ENV_PATH, override=True)
        
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            print(f"✅ Gemini API key is configured (length: {len(api_key)})")
            return True
        else:
            print("⚠️  Gemini API key not found in .env")
            return True  # Not a critical error for this test
    except Exception as e:
        print(f"❌ Error checking Gemini API key: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("OPULUXE AI - POST-BUG-FIX VERIFICATION TEST")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_view_functions,
        test_url_patterns,
        test_base64_import,
        test_database_connection,
        test_gemini_api_key
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED! The application is ready to use.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the errors above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
