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


gesture_commands = {
    'Show flashcard': lambda image: GESTURE_RECOGNIZER.has_any_thumbs_up(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
}


def send_commands_via_gestures():
    cap = cv2.VideoCapture(0)
    while True:
        success, image = cap.read()
        if not success:
            print('Unable to read video')
            exit(1)
        
        for command, condition in gesture_commands.items():
            if condition(image):
                socketio.emit('notification', command)


        if cv2.waitKey(5) & 0xFF == 27:
            break
        time.sleep(0.1) # No need to exhaust cpu


if __name__ == '__main__':
    threading.Thread(target=send_commands_via_gestures, daemon=True).start()
    app.run(host='0.0.0.0', debug=True, port=5001)