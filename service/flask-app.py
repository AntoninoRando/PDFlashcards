from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import cv2
from gesture_recognizer import GestureRecognizer
import time

GESTURE_RECOGNIZER = GestureRecognizer()
gesture_command = None

# Camera control variables
camera_enabled = False
camera_thread = None
camera_stop_event = threading.Event()

# instantiate the app
app = Flask(__name__)
app.config.from_object(__name__)

# enable CORS
CORS(app, origins=['*'])

socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('connect')
def handle_connect():
    print('Client connected')

def send_notification(isPointing: bool, command: str):
    # Call this function when your event occurs
    socketio.emit('notification', {
        'isPointing': isPointing,
        'command': command
    })


# sanity check route
@app.route('/ping', methods=['GET'])
def ping_pong():
    return jsonify('pong!')

@app.route('/whatispointing', methods=['GET'])
def what_is_pointing():
    return jsonify(pointing_with_finger)

@app.route('/enable-camera', methods=['POST'])
def enable_camera():
    global camera_enabled, camera_thread, camera_stop_event
    
    if not camera_enabled:
        camera_enabled = True
        camera_stop_event.clear()
        camera_thread = threading.Thread(target=send_commands_via_gestures, daemon=True)
        camera_thread.start()
        return jsonify({
            'status': 'success',
            'message': 'Camera recognition enabled',
            'camera_enabled': True
        })
    else:
        return jsonify({
            'status': 'info',
            'message': 'Camera recognition is already enabled',
            'camera_enabled': True
        })

@app.route('/disable-camera', methods=['POST'])
def disable_camera():
    global camera_enabled, camera_thread, camera_stop_event
    
    if camera_enabled:
        camera_enabled = False
        camera_stop_event.set()
        if camera_thread and camera_thread.is_alive():
            camera_thread.join(timeout=2)  # Wait up to 2 seconds for thread to finish
        return jsonify({
            'status': 'success',
            'message': 'Camera recognition disabled',
            'camera_enabled': False
        })
    else:
        return jsonify({
            'status': 'info',
            'message': 'Camera recognition is already disabled',
            'camera_enabled': False
        })

@app.route('/camera-status', methods=['GET'])
def camera_status():
    return jsonify({
        'camera_enabled': camera_enabled,
        'thread_alive': camera_thread.is_alive() if camera_thread else False
    })

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

def index_pos(image_rgb, detection_result, recognition_result):
    for hand in detection_result.hand_landmarks:
        index_finger_base = hand[5]
        print(index_finger_base)
        return {
            'x': index_finger_base.x, 
            'y': index_finger_base.y,
            'z': index_finger_base.z
        }
    return {}

gesture_commands = {
    #'show': lambda image: GESTURE_RECOGNIZER.has_any_thumbs_up(cv2.cvtColor(image, cv2.COLOR_BGR2RGB)),
    'show': {
        "condition": lambda x, y, z: gesture('Open_Palm', x, y, z),
        "delay": None,
        "allow more": False,
        "allow during pointing": True,
    },
    'hide': {
        "condition": lambda x, y, z: gesture('Closed_Fist', x, y, z),
        "delay": None,
        "allow more": False,
        "allow during pointing": True,
    },
    'forgot': {
        "condition": lambda x, y, z: gesture('Thumb_Down', x, y, z),
        "delay": None,
        "allow more": False,
        "allow during pointing": False,
    },
    'bad': {
        "condition": lambda x, y, z: count_fingers(2, x, y, z),
        "delay": None,
        "allow more": False,
        "allow during pointing": False,
    },
    'not bad': {
        "condition": lambda x, y, z: count_fingers(3, x, y, z),
        "delay": None,
        "allow more": False,
        "allow during pointing": False,
    },
    'ok': {
        "condition": lambda x, y, z: gesture('Thumb_Up', x, y, z),
        "delay": None,
        "allow more": False,
        "allow during pointing": False,
    },
    'next page': {
        "condition": lambda x, y, z: gesture('Pointing_Up', x, y, z) and index_pos(x,y,z).get('x', 1) < 0.45,
        "delay": 1,
        "allow more": True,
        "allow during pointing": False,
    },
    'previous page': {
        "condition": lambda x, y, z: gesture('Pointing_Up', x, y, z) and index_pos(x,y,z).get('x', 0) > 0.55,
        "delay": 1,
        "allow more": True,
        "allow during pointing": False,
    },
}
#---

import mediapipe
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import math
base_options = python.BaseOptions(model_asset_path='hand_landmarker.task')
options = vision.HandLandmarkerOptions(base_options=base_options,
                                       num_hands=2)
detector = vision.HandLandmarker.create_from_options(options)

base_options_gst = python.BaseOptions(model_asset_path='gesture_recognizer.task')
options_gst = vision.GestureRecognizerOptions(base_options=base_options_gst)
recognizer = vision.GestureRecognizer.create_from_options(options_gst)

last_sent_command = None
last_sent_command_ts = None
pointing_with_finger = None
last_pointing_with_finger = None

def send_commands_via_gestures():
    global last_sent_command, last_sent_command_ts, pointing_with_finger, last_pointing_with_finger
    cap = cv2.VideoCapture(0)
    
    try:
        while camera_enabled and not camera_stop_event.is_set():
            success, image = cap.read()
            if not success:
                print('Unable to read video')
                break
            
            # Convert the image to RGB as mediapipe expects RGB input
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            # Create a mediapipe Image object
            mp_image = mediapipe.Image(image_format=mediapipe.ImageFormat.SRGB, data=image_rgb)
            
            detection_result = detector.detect(mp_image)
            recognition_result = recognizer.recognize(mp_image)
            
            for command, options in gesture_commands.items():
                condition = options['condition']
                allow_more = options.get('allow more', False)
                allow_during_pointing = options.get('allow during pointing', False)
                if not allow_during_pointing and pointing_with_finger:
                    continue
                if not allow_more and command == last_sent_command:
                    continue
                if last_sent_command_ts is not None and options['delay'] is not None:
                    time_elapsed = time.time() - last_sent_command_ts
                    if time_elapsed < options['delay']:
                        continue
                if condition(image_rgb, detection_result, recognition_result):
                    last_sent_command = command
                    last_sent_command_ts = time.time()
                    send_notification(False, command)
                    break
            
            if gesture('Pointing_Up',image_rgb, detection_result, recognition_result):
                for hand in detection_result.hand_landmarks:
                    index_finger_tip = hand[8]
                    index_finger_base = hand[5]
                    # Calculate the angle between the tip and base of the index finger
                    dx = index_finger_tip.x - index_finger_base.x
                    dy = index_finger_tip.y - index_finger_base.y
                    angle = math.degrees(math.atan2(dy, dx))
                    print(f"Angle between index finger tip and base: {angle:.2f} degrees")
                    print('Pointing', end=' ')
                    if angle >= -70:
                        pointing_with_finger = 'hide'
                    elif angle >= -80:
                        pointing_with_finger = 'forgot'
                    elif angle >= -90:
                        pointing_with_finger = 'bad'
                    elif angle >= -100:
                        pointing_with_finger = 'not bad'
                    elif angle >= -110:
                        pointing_with_finger = 'ok'
                    print(pointing_with_finger)
                    break
            else:
                pointing_with_finger = None
                
            if pointing_with_finger != last_pointing_with_finger:
                print('Sending pointing notification')
                last_pointing_with_finger = pointing_with_finger
                send_notification(True, pointing_with_finger)

            if cv2.waitKey(5) & 0xFF == 27:
                break
            time.sleep(0.1) # No need to exhaust cpu
    
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("Camera released and OpenCV windows closed")


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5001)