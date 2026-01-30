import os
import sys
import asyncio
import json

# Add project root to path so we can import from core
sys.path.append(os.getcwd())

# Import the MCP integration functions
from core.mcp_integration import get_fashion_trends_sync, get_style_tips_sync, get_seasonal_recommendations_sync

def test_mcp_trends():
    print("\n" + "="*50)
    print("Testing MCP Fashion Trends Integration")
    print("="*50)
    
    # Test 1: Men's Trends
    print("\n🔍 Test 1: Fetching Men's Trends...")
    try:
        trends = get_fashion_trends_sync("men")
        print("✅ Result:")
        print(json.dumps(trends, indent=2))
    except Exception as e:
        print(f"❌ Failed: {e}")

    # Test 2: Women's Trends
    print("\n🔍 Test 2: Fetching Women's Trends...")
    try:
        trends = get_fashion_trends_sync("women")
        print("✅ Result:")
        print(json.dumps(trends, indent=2))
    except Exception as e:
        print(f"❌ Failed: {e}")

    # Test 3: Style Tips
    print("\n🔍 Test 3: Fetching Style Tips for 'party'...")
    try:
        tip = get_style_tips_sync("party")
        print("✅ Result:")
        print(tip)
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    import sys
    # Redirect stdout to a file with utf-8 encoding
    sys.stdout = open('test_mcp_output.txt', 'w', encoding='utf-8')
    test_mcp_trends()
    sys.stdout.close()
