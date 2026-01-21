import speech_recognition as sr
import os
from datetime import datetime

class VoiceToTextConverter:
    """
    A senior-level Python class to handle Voice to Text conversion.
    Supports English (India) and Tamil languages.
    """

    def __init__(self):
        # Initialize the recognizer
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        
        # Language codes
        self.languages = {
            "1": ("English (India)", "en-IN"),
            "2": ("Tamil", "ta-IN")
        }

    def calibrate(self):
        """Calibrates the microphone for ambient noise."""
        print("\n[INFO] Calibrating microphone... Please hold for 2 seconds.")
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=2)
        print("[INFO] Calibration complete. Ready to listen!")

    def listen_and_convert(self, lang_code):
        """
        Listens to the microphone and converts speech to text.
        """
        try:
            with self.microphone as source:
                print("\n>>> Listening... (Speak now)")
                # listen(source, timeout, phrase_time_limit)
                audio = self.recognizer.listen(source, timeout=10, phrase_time_limit=15)
                
            print(">>> Processing speech...")
            
            # Use Google Speech Recognition API (Free tier)
            text = self.recognizer.recognize_google(audio, language=lang_code)
            return text

        except sr.WaitTimeoutError:
            print("[ERROR] No speech detected (Timeout).")
        except sr.UnknownValueError:
            print("[ERROR] Could not understand the audio.")
        except sr.RequestError as e:
            print(f"[ERROR] Network failure or API unavailable: {e}")
        except Exception as e:
            print(f"[ERROR] An unexpected error occurred: {e}")
        
        return None

    def save_to_file(self, text, filename=None):
        """Saves the converted text into a .txt file."""
        if not text:
            return

        if not filename:
            # Generate a default filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"converted_text_{timestamp}.txt"

        try:
            with open(filename, "a", encoding="utf-8") as f:
                f.write(f"--- Recorded at {datetime.now()} ---\n")
                f.write(text + "\n\n")
            print(f"[SUCCESS] Text saved to: {os.path.abspath(filename)}")
        except Exception as e:
            print(f"[ERROR] Failed to save file: {e}")

    def run(self):
        """Main execution loop."""
        print("="*40)
        print("   VOICE TO TEXT CONVERTER (INDIA)")
        print("="*40)
        
        print("\nSelect Language:")
        print("1. English (India)")
        print("2. Tamil")
        
        choice = input("\nEnter choice (1 or 2): ").strip()
        
        if choice not in self.languages:
            print("[ERROR] Invalid choice. Defaulting to English (India).")
            lang_name, lang_code = self.languages["1"]
        else:
            lang_name, lang_code = self.languages[choice]

        print(f"\n[MODE] Language set to: {lang_name}")
        
        self.calibrate()

        while True:
            converted_text = self.listen_and_convert(lang_code)
            
            if converted_text:
                print(f"\n[LIVE OUTPUT]: {converted_text}")
                
                # Ask to save
                save_choice = input("\nSave this to file? (y/n) | Press 'q' to quit: ").lower().strip()
                if save_choice == 'y':
                    self.save_to_file(converted_text)
                elif save_choice == 'q':
                    break
            else:
                retry = input("\nTry again? (y/n) | Press 'q' to quit: ").lower().strip()
                if retry != 'y':
                    break

        print("\n[EXIT] Thank you for using Opuluxe Voice Converter!")

if __name__ == "__main__":
    app = VoiceToTextConverter()
    app.run()
