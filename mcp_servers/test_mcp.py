"""
MCP Integration Test Script
Tests if Model Context Protocol is working correctly in Opuluxe AI
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 60)
print("🧪 TESTING MCP INTEGRATION FOR OPULUXE AI")
print("=" * 60)
print()

# Test 1: Check MCP Installation
print("📦 Test 1: Checking MCP Installation...")
try:
    import mcp
    print(f"   ✅ MCP installed successfully (version: {mcp.__version__ if hasattr(mcp, '__version__') else 'unknown'})")
except ImportError as e:
    print(f"   ❌ MCP not installed: {e}")
    print("   Run: pip install mcp")
    sys.exit(1)

print()

# Test 2: Check MCP Server File
print("📂 Test 2: Checking MCP Server Files...")
server_file = os.path.join(os.path.dirname(__file__), 'fashion_trends_server.py')
if os.path.exists(server_file):
    print(f"   ✅ Fashion Trends Server found: {server_file}")
else:
    print(f"   ❌ Fashion Trends Server not found")
    sys.exit(1)

print()

# Test 3: Test MCP Server Directly
print("🔧 Test 3: Testing MCP Server Directly...")
try:
    import asyncio
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    
    async def test_mcp_server():
        server_params = StdioServerParameters(
            command=sys.executable,
            args=[server_file],
            env=None
        )
        
        print("   🔄 Starting MCP server...")
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                print("   🔄 Initializing session...")
                await session.initialize()
                
                print("   🔄 Listing available tools...")
                tools = await session.list_tools()
                print(f"   ✅ Found {len(tools.tools)} MCP tools:")
                for tool in tools.tools:
                    print(f"      - {tool.name}: {tool.description}")
                
                print()
                print("   🔄 Testing 'get_fashion_trends' tool...")
                result = await session.call_tool(
                    "get_fashion_trends",
                    arguments={"category": "men"}
                )
                
                if result.content and len(result.content) > 0:
                    print("   ✅ MCP Server Response:")
                    print("   " + "-" * 56)
                    response_text = result.content[0].text
                    for line in response_text.split('\n')[:10]:  # Show first 10 lines
                        print(f"   {line}")
                    print("   " + "-" * 56)
                    return True
                else:
                    print("   ❌ No response from MCP server")
                    return False
    
    success = asyncio.run(test_mcp_server())
    if success:
        print("   ✅ MCP Server working correctly!")
    else:
        print("   ❌ MCP Server test failed")
        
except Exception as e:
    print(f"   ❌ Error testing MCP server: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()

# Test 4: Test Django Integration
print("🔗 Test 4: Testing Django MCP Integration...")
try:
    # Import Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    import django
    django.setup()
    
    from core.mcp_integration import get_fashion_trends_sync, get_style_tips_sync
    
    print("   🔄 Testing get_fashion_trends_sync()...")
    trends = get_fashion_trends_sync("women")
    
    if "error" in trends:
        print(f"   ⚠️  MCP returned error: {trends['error']}")
    else:
        print("   ✅ Fashion trends fetched successfully!")
        print(f"   📊 Category: {trends.get('category', 'N/A')}")
        if 'trends' in trends:
            print(f"   📊 Number of trends: {len(trends['trends'])}")
            print("   📊 Sample trends:")
            for trend in trends['trends'][:3]:
                print(f"      - {trend}")
    
    print()
    print("   🔄 Testing get_style_tips_sync()...")
    style_tip = get_style_tips_sync("office")
    print(f"   ✅ Style tip: {style_tip}")
    
except Exception as e:
    print(f"   ❌ Error testing Django integration: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("✅ MCP INTEGRATION TEST COMPLETE!")
print("=" * 60)
print()
print("🎯 Next Steps:")
print("   1. Start Django server: python manage.py runserver")
print("   2. Ask AI: 'What's trending in men's fashion?'")
print("   3. Watch server logs for: [MCP] Fetching real-time fashion trends...")
print("   4. AI response will include current trend data!")
print()
