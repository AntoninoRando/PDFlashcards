class GestureRecognizer:
    def __init__(self) -> None:
        from mediapipe import solutions as mp_solutions
        from queue import Queue
        
        self.cmd_queue = Queue()
        self.mp_hands = mp_solutions.hands #type:ignore
        self.mp_drawing = mp_solutions.drawing_utils #type:ignore
        self.hands = self.mp_hands.Hands(min_detection_confidence=0.7)
        self.hands_for_thumb = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
    
    
    def process_hands(self, image_rgb):
        return self.hands.process(image_rgb)
        

    def count_fingers(self, hand_landmarks):
        finger_tips = [8, 12, 16, 20]  
        fingers_up = 0
        landmarks = hand_landmarks.landmark
        
        for tip in finger_tips:
            if landmarks[tip].y < landmarks[tip - 2].y: 
                fingers_up += 1

        return fingers_up


    def detect_thumb(self, hand_landmarks):
        landmarks = hand_landmarks.landmark
        if landmarks[4].y < landmarks[1].y:  
            return 1
        return 0
    
    def get_index_pos(self, hand_landmarks):
        landmarks = hand_landmarks.landmark
        return (landmarks[8].x, landmarks[8].y)

    def is_thumbs_up(self, hand_landmarks):
        """
        Detect thumbs up gesture based on hand landmarks
        Returns True if thumbs up is detected
        """
        landmarks = hand_landmarks.landmark
        # Get landmark positions
        thumb_tip = landmarks[4]      # Thumb tip
        thumb_ip = landmarks[3]       # Thumb IP joint
        thumb_mcp = landmarks[2]      # Thumb MCP joint
        
        index_tip = landmarks[8]      # Index finger tip
        index_pip = landmarks[6]      # Index finger PIP joint
        
        middle_tip = landmarks[12]    # Middle finger tip
        middle_pip = landmarks[10]    # Middle finger PIP joint
        
        ring_tip = landmarks[16]      # Ring finger tip
        ring_pip = landmarks[14]      # Ring finger PIP joint
        
        pinky_tip = landmarks[20]     # Pinky tip
        pinky_pip = landmarks[18]     # Pinky PIP joint
        
        # Check if thumb is extended (pointing up)
        thumb_extended = thumb_tip.y < thumb_ip.y < thumb_mcp.y
        
        # Check if other fingers are folded (tips below PIP joints)
        index_folded = index_tip.y > index_pip.y
        middle_folded = middle_tip.y > middle_pip.y
        ring_folded = ring_tip.y > ring_pip.y
        pinky_folded = pinky_tip.y > pinky_pip.y
        
        # Thumbs up: thumb extended and other fingers folded
        return (thumb_extended and index_folded and 
                middle_folded and ring_folded and pinky_folded)