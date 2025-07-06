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


def send_gesture_recognition():
    cap = cv2.VideoCapture(0)
    while True:
        success, image = cap.read()
        if not success:
            print('Unable to read video')
            exit(1)

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = GESTURE_RECOGNIZER.process_hands(image_rgb)

        if result.multi_hand_landmarks:
            for hand_landmarks in result.multi_hand_landmarks:
                if GESTURE_RECOGNIZER.is_thumbs_up(hand_landmarks):
                    socketio.emit('notification', 'Thumbs up')


        if cv2.waitKey(5) & 0xFF == 27:
            break
        time.sleep(0.1) # No need to exhaust cpu


if __name__ == '__main__':
    threading.Thread(target=send_gesture_recognition, daemon=True).start()
    app.run(host='0.0.0.0', debug=True, port=5001)