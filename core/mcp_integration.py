"""
MCP Integration Layer for Opuluxe AI
Connects Django backend with Model Context Protocol servers
"""

import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import os
import sys

class OpuluxeMCPClient:
    """MCP Client for Opuluxe AI fashion intelligence"""
    
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.mcp_servers_dir = os.path.join(self.base_dir, 'mcp_servers')
    
    async def get_fashion_trends(self, category="all"):
        """
        Get current fashion trends using MCP
        
        Args:
            category (str): Fashion category (men/women/accessories/all)
            
        Returns:
            dict: Fashion trends data
        """
        try:
            server_script = os.path.join(self.mcp_servers_dir, 'fashion_trends_server.py')
            
            server_params = StdioServerParameters(
                command=sys.executable,  # Use current Python interpreter
                args=[server_script],
                env=None
            )
            
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    
                    # Call the MCP tool
                    result = await session.call_tool(
                        "get_fashion_trends",
                        arguments={"category": category}
                    )
                    
                    # Parse the response
                    if result.content and len(result.content) > 0:
                        trends_text = result.content[0].text
                        return json.loads(trends_text)
                    
                    return {"error": "No trends data received"}
                    
        except Exception as e:
            print(f"[MCP] Error fetching fashion trends: {e}")
            return {"error": str(e)}
    
    async def get_style_tips(self, occasion="casual"):
        """
        Get style tips for specific occasions using MCP
        
        Args:
            occasion (str): Occasion type (office/casual/formal/party/wedding)
            
        Returns:
            str: Style tip
        """
        try:
            server_script = os.path.join(self.mcp_servers_dir, 'fashion_trends_server.py')
            
            server_params = StdioServerParameters(
                command=sys.executable,
                args=[server_script],
                env=None
            )
            
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    
                    result = await session.call_tool(
                        "get_style_tips",
                        arguments={"occasion": occasion}
                    )
                    
                    if result.content and len(result.content) > 0:
                        return result.content[0].text
                    
                    return "No style tips available"
                    
        except Exception as e:
            print(f"[MCP] Error fetching style tips: {e}")
            return f"Error: {str(e)}"
    
    async def get_seasonal_recommendations(self, category="men"):
        """
        Get seasonal fashion recommendations using MCP
        
        Args:
            category (str): Fashion category (men/women/accessories)
            
        Returns:
            str: Seasonal recommendations
        """
        try:
            server_script = os.path.join(self.mcp_servers_dir, 'fashion_trends_server.py')
            
            server_params = StdioServerParameters(
                command=sys.executable,
                args=[server_script],
                env=None
            )
            
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    
                    result = await session.call_tool(
                        "get_seasonal_recommendations",
                        arguments={"category": category}
                    )
                    
                    if result.content and len(result.content) > 0:
                        return result.content[0].text
                    
                    return "No seasonal recommendations available"
                    
        except Exception as e:
            print(f"[MCP] Error fetching seasonal recommendations: {e}")
            return f"Error: {str(e)}"

# Singleton instance
mcp_client = OpuluxeMCPClient()

# Synchronous wrappers for Django views
def get_fashion_trends_sync(category="all"):
    """Synchronous wrapper for get_fashion_trends"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(mcp_client.get_fashion_trends(category))
        loop.close()
        return result
    except Exception as e:
        print(f"[MCP] Sync wrapper error: {e}")
        return {"error": str(e)}

def get_style_tips_sync(occasion="casual"):
    """Synchronous wrapper for get_style_tips"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(mcp_client.get_style_tips(occasion))
        loop.close()
        return result
    except Exception as e:
        print(f"[MCP] Sync wrapper error: {e}")
        return f"Error: {str(e)}"

def get_seasonal_recommendations_sync(category="men"):
    """Synchronous wrapper for get_seasonal_recommendations"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(mcp_client.get_seasonal_recommendations(category))
        loop.close()
        return result
    except Exception as e:
        print(f"[MCP] Sync wrapper error: {e}")
        return f"Error: {str(e)}"
