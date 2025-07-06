class GestureRecognizer:
    def __init__(self) -> None:
        from mediapipe import solutions as mp_solutions
        from queue import Queue
        from collections import deque
        import time

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
        
        # For movement tracking
        self.hand_positions = deque(maxlen=10)  # Store last 10 positions
        self.movement_threshold = 0.1  # Minimum movement distance
        self.consecutive_frames = 5    # Frames needed for consistent movement

        self.frames = 0
        self.last_frame_reset = time.time()
        self.store_threshold = 1/10
    

    def _store_hand_position(self, pos):
        self.hand_positions.append(pos)
    
    def _get_hand_position(self, multi_hand_landmarks):
        # Get the first hand's center position (palm center)
        hand_landmarks = multi_hand_landmarks[0]
        landmarks = hand_landmarks.landmark
        
        # Calculate hand center using wrist and middle finger base
        wrist = landmarks[0]
        middle_mcp = landmarks[9]
        hand_center_x = (wrist.x + middle_mcp.x) / 2
        hand_center_y = (wrist.y + middle_mcp.y) / 2
        return hand_center_x, hand_center_y
    

    def has_any_thumbs_up(self, image_rgb):
        result = self.process_hands(image_rgb)
        if result.multi_hand_landmarks:
            for hand_landmarks in result.multi_hand_landmarks:
                if self.is_thumbs_up(hand_landmarks):
                    return True
        return False
    
    def count_open_fingers(self, image_rgb):
        count = 0
        result = self.process_hands(image_rgb)
        if result.multi_hand_landmarks:
            for hand_landmarks in result.multi_hand_landmarks:
                count += self.count_fingers(hand_landmarks)
        return count

    def detect_left_to_right_movement(self, image_rgb):
        """
        Detect if hand moved from left to right
        Returns True if left-to-right movement is detected
        """
        result = self.process_hands(image_rgb)
        
        if result.multi_hand_landmarks:
            hand_center_x, hand_center_y = self._get_hand_position(result.multi_hand_landmarks)
            print(hand_center_x, hand_center_y)
            
            # Store current position with timestamp
            import time
            current_time = time.time()
            elapsed_time = current_time - self.last_frame_reset
            if elapsed_time > self.store_threshold:
                self._store_hand_position((hand_center_x, hand_center_y))
                self.last_frame_reset = current_time
            
            # Check if we have enough positions to detect movement
            if len(self.hand_positions) >= self.consecutive_frames:
                return self._analyze_movement_pattern()
        else:
            # No hand detected, clear positions
            self.hand_positions.clear()
        
        return False

    def _analyze_movement_pattern(self):
        """
        Analyze stored hand positions to detect left-to-right movement
        """
        if len(self.hand_positions) < self.consecutive_frames:
            return False
        
        # Get recent positions
        recent_positions = list(self.hand_positions)[-self.consecutive_frames:]
        
        # Calculate total horizontal movement
        start_x = recent_positions[0][0]
        end_x = recent_positions[-1][0]
        total_movement = end_x - start_x
        
        # Check if movement is significant and rightward
        if total_movement < self.movement_threshold:
            return False
        
        # Verify consistent rightward movement
        rightward_movements = 0
        for i in range(1, len(recent_positions)):
            prev_x = recent_positions[i-1][0]
            curr_x = recent_positions[i][0]
            
            if curr_x > prev_x:  # Moving right
                rightward_movements += 1
        
        # Require at least 70% of movements to be rightward
        consistency_threshold = len(recent_positions) * 0.7
        return rightward_movements >= consistency_threshold

    def set_movement_sensitivity(self, threshold=0.1, frames=5):
        """
        Adjust movement detection sensitivity
        
        Args:
            threshold: Minimum movement distance (0.0 to 1.0)
            frames: Number of consecutive frames to analyze
        """
        self.movement_threshold = threshold
        self.consecutive_frames = frames
        self.hand_positions = deque(maxlen=max(frames * 2, 10))


    
    
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
