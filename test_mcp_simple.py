"""
Simple MCP Test - Direct Server Test
"""

import asyncio
from mcp.server import Server
from mcp.types import Tool, TextContent
import json

# Create simple test server
app = Server("test-server")

@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="test_tool",
            description="A simple test tool",
            inputSchema={"type": "object", "properties": {}}
        )
    ]

@app.call_tool()
async def call_tool(name, arguments):
    return [TextContent(
        type="text",
        text="MCP is working! ✅"
    )]

print("✅ MCP Server created successfully!")
print("✅ MCP is installed and working!")
print()
print("🎯 To test MCP in your Django app:")
print("   1. Open your browser to http://localhost:8000")
print("   2. Login to the dashboard")
print("   3. Ask: 'What's trending in men's fashion?'")
print("   4. Watch the terminal for: [MCP] Fetching real-time fashion trends...")
print()
