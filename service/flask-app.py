from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import cv2
from gesture_recognizer import GestureRecognizer
import time

GESTURE_RECOGNIZER = GestureRecognizer()
gesture_command = None


# instantiate the app
app = Flask(__name__)
app.config.from_object(__name__)

# enable CORS
CORS(app, origins=['*'])

socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('connect')
def handle_connect():
    print('Client connected')

def send_notification(data):
    # Call this function when your event occurs
    socketio.emit('notification', data)


# sanity check route
@app.route('/ping', methods=['GET'])
def ping_pong():
    send_notification('pong with websocket!')
    return jsonify('pong!')

#---
def count_fingers(tgt, image_rgb, detection_result, recognition_result) -> bool:
    count = GESTURE_RECOGNIZER.count_open_fingers(image_rgb)
    return count == tgt

def hand_LFT(image_rgb, detection_result, recognition_result) -> bool:
    return GESTURE_RECOGNIZER.detect_left_to_right_movement(image_rgb)

def gesture(tgt, image_rgb, detection_result, recognition_result) -> bool:
    try:
        top_gesture = recognition_result.gestures[0][0]
        gst = top_gesture.category_name
        return gst == tgt
    except IndexError:
        return False

gesture_commands = {
    #'show': lambda image: GESTURE_RECOGNIZER.has_any_thumbs_up(cv2.cvtColor(image, cv2.COLOR_BGR2RGB)),
    'show': {
        "condition": lambda x, y, z: gesture('Open_Palm', x, y, z),
        "delay": None,
        "allow more": False
    },
    'hide': {
        "condition": lambda x, y, z: gesture('Closed_Fist', x, y, z),
        "delay": None,
        "allow more": False
    },
    'forgot': {
        "condition": lambda x, y, z: count_fingers(1, x, y, z),
        "delay": None,
        "allow more": False
    },
    'bad': {
        "condition": lambda x, y, z: count_fingers(2, x, y, z),
        "delay": None,
        "allow more": False
    },
    'not bad': {
        "condition": lambda x, y, z: count_fingers(3, x, y, z),
        "delay": None,
        "allow more": False
    },
    'ok': {
        "condition": lambda x, y, z: count_fingers(4, x, y, z) and not open_palm,
        "delay": None,
        "allow more": False
    },
    'next page': {
        "condition": lambda x, y, z: gesture('Thumb_Up', x, y, z),
        "delay": 1,
        "allow more": True
    },
    'previous page': {
        "condition": lambda x, y, z: gesture('Thumb_Down', x, y, z),
        "delay": 1,
        "allow more": True
    },
}
#---

import mediapipe
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
base_options = python.BaseOptions(model_asset_path='hand_landmarker.task')
options = vision.HandLandmarkerOptions(base_options=base_options,
                                       num_hands=2)
detector = vision.HandLandmarker.create_from_options(options)

base_options_gst = python.BaseOptions(model_asset_path='gesture_recognizer.task')
options_gst = vision.GestureRecognizerOptions(base_options=base_options_gst)
recognizer = vision.GestureRecognizer.create_from_options(options_gst)

last_sent_command = None
last_sent_command_ts = None

def send_commands_via_gestures():
    global last_sent_command, last_sent_command_ts
    cap = cv2.VideoCapture(0)
    while True:
        success, image = cap.read()
        if not success:
            print('Unable to read video')
            exit(1)
        
        # Convert the image to RGB as mediapipe expects RGB input
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        # Create a mediapipe Image object
        mp_image = mediapipe.Image(image_format=mediapipe.ImageFormat.SRGB, data=image_rgb)
        
        detection_result = detector.detect(mp_image)
        recognition_result = recognizer.recognize(mp_image)
        
        for command, options in gesture_commands.items():
            condition = options['condition']
            allow_more = options.get('allow more', False)
            if not allow_more and command == last_sent_command:
                continue
            if last_sent_command_ts is not None and options['delay'] is not None:
                time_elapsed = time.time() - last_sent_command_ts
                if time_elapsed < options['delay']:
                    continue
            if condition(image_rgb, detection_result, recognition_result):
                last_sent_command = command
                last_sent_command_ts = time.time()
                socketio.emit('notification', command)
                break
        

        # # Retrieve and print palm positions for each detected hand
        # for hand in detection_result.hand_landmarks:
        #     # The palm position is typically the wrist landmark (landmark 0)
        #     palm_landmark = hand[12]
        #     print(f"Palm position (x={palm_landmark.x}, y={palm_landmark.y}, z={palm_landmark.z})")
        


        if cv2.waitKey(5) & 0xFF == 27:
            break
        time.sleep(0.1) # No need to exhaust cpu


if __name__ == '__main__':
    threading.Thread(target=send_commands_via_gestures, daemon=True).start()
    app.run(host='0.0.0.0', debug=True, port=5001)