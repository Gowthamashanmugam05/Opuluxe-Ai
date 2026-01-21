
import os

content = """GROQ_API_KEY=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
GEMINI_API_KEY=AIzaSyBSS9PL50tKj8qXKNY6aMjK3ykRwT-0Lls"""

with open('.env', 'w', encoding='utf-8') as f:
    f.write(content)

print("Wrote .env with utf-8")
