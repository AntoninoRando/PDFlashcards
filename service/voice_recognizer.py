import speech_recognition as sr
import time

class VoiceRecognizer:
    def __init__(self):
        from queue import Queue
        
        self.cmd_queue = Queue()
        self.last_command = None
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.awake = True

        self.recognizer.energy_threshold = 300  # Lower threshold for quieter speech
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.5  # Shorter pause between phrases
        self.recognizer.phrase_threshold = 0.3  # Minimum audio before considering phrase
        self.recognizer.non_speaking_duration = 0.3  # How long to wait after speech stops

        print("Adjusting for ambient noise... Please wait.")
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=2)
        print("Ready to listen!")
    

    def listen(self):
        """Continuously listen for voice input"""
        while self.awake:
            try:
                with self.microphone as source:
                    audio = self.recognizer.listen(source, timeout=0.5, phrase_time_limit=8)
                
                try:
                    text = self.recognizer.recognize_google(audio).lower() # type:ignore
                    for x in text.split(' '):
                        if x == self.last_command:
                            continue
                        self.cmd_queue.put(x)
                        self.last_command = x
                    
                except sr.UnknownValueError:
                    print("?", end="", flush=True)
                except sr.RequestError as e:
                    print(f"Error with speech recognition service: {e}")
                    time.sleep(1)
                    
            except sr.WaitTimeoutError:
                print(".", end="", flush=True)
                pass
            except Exception as e:
                print(f"Error in listening: {e}")
                time.sleep(1)
