from groq import Groq
import os

# Professional Groq Chatbot in Python
class GroqChatbot:
    def __init__(self, api_key):
        # Initialize the Groq client
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.1-8b-instant"  # Latest instant model
        self.history = [
            {"role": "system", "content": "You are a helpful, senior AI assistant created by Opuluxe AI. Respond concisely and professionally."}
        ]

    def get_response(self, user_input):
        """Sends user input to Groq and returns the AI response."""
        # Add user message to history
        self.history.append({"role": "user", "content": user_input})

        try:
            # Create the chat completion
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=self.history,
                temperature=0.7,
                max_tokens=1024,
                top_p=1,
                stream=False,
                stop=None,
            )

            # Get the response content
            response_text = completion.choices[0].message.content
            
            # Add AI personality response to history for context
            self.history.append({"role": "assistant", "content": response_text})
            
            return response_text

        except Exception as e:
            return f"Error: {str(e)}"

    def start_chat(self):
        """Starts an interactive chat loop with real-time streaming."""
        print("="*50)
        print("   OPULUXE AI - GROQ STREAMING CHATBOT")
        print("="*50)
        print("Press Ctrl+C or type 'quit' to exit.\n")

        while True:
            try:
                user_input = input("You: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    print("\nAssistant: Goodbye!")
                    break

                if not user_input:
                    continue

                self.history.append({"role": "user", "content": user_input})
                
                print("\nAssistant: ", end="", flush=True)
                
                # Full response accumulator for history
                full_response = ""
                
                # Streaming call
                completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=self.history,
                    temperature=0.7,
                    stream=True,
                )

                for chunk in completion:
                    content = chunk.choices[0].delta.content
                    if content:
                        print(content, end="", flush=True)
                        full_response += content
                
                print("\n") # New line after stream ends
                self.history.append({"role": "assistant", "content": full_response})

            except KeyboardInterrupt:
                print("\n\nAssistant: Chat interrupted. Goodbye!")
                break
            except Exception as e:
                print(f"\n[ERROR]: {e}")

if __name__ == "__main__":
    # Your GROQ API KEY
    API_KEY = "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"
    
    bot = GroqChatbot(API_KEY)
    bot.start_chat()