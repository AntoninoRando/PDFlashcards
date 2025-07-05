import time
import flet as ft
import threading
import logging
import cv2


from music_player.player import MusicPlayer
import music_player.commands as cmd
from voice_recognizer import VoiceRecognizer
from gesture_recognizer import GestureRecognizer


logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s - %(message)s",
)

audioSystem_logger = logging.getLogger("AudioSystem")
audioSystem_logger.setLevel(logging.DEBUG)
log_handler = logging.StreamHandler()
log_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter("[%(name)s / %(levelname)s] %(message)s")
log_handler.setFormatter(formatter)
audioSystem_logger.addHandler(log_handler)

MUSIC_PLAYER = MusicPlayer()
MUSIC_PLAYER.add([f'track{i}.mp3' for i in range(1, 6)])

VOICE_RECOGNIZER = VoiceRecognizer()
GESTURE_RECOGNIZER = GestureRecognizer()

gesture_command = None
command_lock = threading.Lock()

def convert_fingers_to_cmd(open_count):
    if open_count == 4:
        return cmd.STOP
    elif open_count == 3:
        return cmd.RESUME
    elif open_count == 2:
        return cmd.VOLUME_DOWN
    elif open_count == 1:
        return cmd.VOLUME_UP
    return None


def main(page: ft.Page):
    global voice_command
    global gesture_command
    global command_lock

    MUSIC_PLAYER.start()

    threading.Thread(target=VOICE_RECOGNIZER.listen, daemon=True).start()
    cap = cv2.VideoCapture(0)

    page.title = "Music Player"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.bgcolor = "#F9F9F9"
    page.window.width = 1000        # window's width is 200 px
    page.window.height = 500       # window's height is 200 px
    page.window.resizable = False  # window is not resizable
    page.padding = 20
    
    # Sample track data - replace with your actual track list
    tracks = []
    for song in MUSIC_PLAYER.tracks:
        color = "FFFFFF"
        n = len(song) % 6
        for i, char in enumerate(song):
            x = ord(char) % 16
            for j in range(x):
                color = color[:n] + hex(x * j % 16)[2] + color[n+1:]
                n = (n+1)% 6
        tracks.append({"title": song, "artist": "Artist 1", "color": f'#{color}25'})
    
    # Current track index
    current_track = 0
    playing_track: int | None = None
    
    # Track squares at the bottom
    track_squares = []
    music_icons = []
    
    def create_track_square(track, index):
        def on_track_click(e):
            nonlocal current_track
            current_track = index
            update_current_track_display()
            # Update all squares to show current selection
            for i, square in enumerate(track_squares):
                if i == current_track:
                    square.border = ft.border.all(3, "#000000")
                else:
                    square.border = ft.border.all(1, "#000000")
            page.update()
        
        music_icon = ft.Icon(ft.Icons.MUSIC_NOTE, size=20, color="#000000")
        music_icon.visible = False
        music_icons.append(music_icon)
        
        square = ft.Container(
            content=ft.Column([
                music_icon,
                ft.Text(track["title"], size=10, color="#000000", text_align=ft.TextAlign.CENTER),
            ], spacing=5, horizontal_alignment=ft.CrossAxisAlignment.CENTER),
            width=80,
            height=80,
            bgcolor=track["color"],
            border_radius=8,
            border=ft.border.all(5, "#1F1F1F") if index == 0 else ft.border.all(0, "#000000"),
            on_click=on_track_click,
            padding=8
        )
        return square
    
    # Create track squares
    for i, track in enumerate(tracks):
        track_squares.append(create_track_square(track, i))
    
    # Current track display
    current_track_display = ft.Text(
        f"Now Playing: {tracks[current_track]['title']} - {tracks[current_track]['artist']}",
        size=16,
        color="#000000",
        text_align=ft.TextAlign.CENTER
    )
    
    def update_current_track_display():
        current_track_display.value = f"Now Playing: {tracks[current_track]['title']} - {tracks[current_track]['artist']}"
    
    # Control buttons
    def on_play_pause_click(_):
        nonlocal playing_track
        if playing_track is not None and current_track != playing_track:
            MUSIC_PLAYER.play(current_track)
            playing_track = current_track
            music_icons[current_track].visible = True
            play_pause_btn.icon = ft.Icons.PLAY_ARROW
        elif playing_track == current_track:
            music_icons[current_track].visible = False
            MUSIC_PLAYER.pause()
            play_pause_btn.icon = ft.Icons.PAUSE
        else:
            music_icons[current_track].visible = False
            MUSIC_PLAYER.stop()
            MUSIC_PLAYER.play(current_track)
            music_icons[current_track].visible = True
            playing_track = current_track
            play_pause_btn.icon = ft.Icons.PLAY_ARROW
        page.update()
    
    def on_previous_click(_):
        nonlocal current_track, playing_track
        current_track = (current_track - 1) % len(tracks)
        playing_track = current_track
        update_current_track_display()
        update_track_selection()
        MUSIC_PLAYER.prev()
        page.update()
    
    def on_next_click(_):
        nonlocal current_track, playing_track
        current_track = (current_track + 1) % len(tracks)
        playing_track = current_track
        update_current_track_display()
        update_track_selection()
        MUSIC_PLAYER.next()
        page.update()
    
    def update_track_selection(to_update: int | None = None):
        if not to_update:
            to_update = current_track
        for i, square in enumerate(track_squares):
            if i == to_update:
                square.border = ft.border.all(3, "#000000")
            else:
                square.border = ft.border.all(1, "#000000")
    
    play_pause_btn = ft.IconButton(
        icon=ft.Icons.PLAY_ARROW,
        icon_size=40,
        on_click=on_play_pause_click,
        icon_color="#000000"
    )
    
    previous_btn = ft.IconButton(
        icon=ft.Icons.SKIP_PREVIOUS,
        icon_size=35,
        on_click=on_previous_click,
        icon_color="#000000"
    )
    
    next_btn = ft.IconButton(
        icon=ft.Icons.SKIP_NEXT,
        icon_size=35,
        on_click=on_next_click,
        icon_color="#000000"
    )
    
    # Control panel
    controls = ft.Row([
        previous_btn,
        play_pause_btn,
        next_btn
    ], alignment=ft.MainAxisAlignment.CENTER, spacing=20)
    
    # Track squares row
    tracks_row = ft.Row(
        track_squares,
        alignment=ft.MainAxisAlignment.CENTER,
        spacing=10,
        scroll=ft.ScrollMode.AUTO
    )
    
    # Main layout
    page.add(
        ft.Column([
            ft.Container(height=50),  # Spacer
            current_track_display,
            ft.Container(height=30),  # Spacer
            controls,
            ft.Container(height=50),  # Spacer
            ft.Text("Your Tracks", size=18, color="#000000", text_align=ft.TextAlign.CENTER),
            ft.Container(height=20),  # Spacer
            tracks_row,
        ], spacing=0, horizontal_alignment=ft.CrossAxisAlignment.CENTER)
    )

    def execute_command(command):
        global tracks
        global track_index

        if command in ["play", "resume", "continue", cmd.PLAY]:
            on_play_pause_click(None)
            #MUSIC_PLAYER.resume()
            audioSystem_logger.info("Playing music")
        elif command in ["pause", "stop", "block", "alt", "interrupt", cmd.STOP]:
            on_play_pause_click(None)
            #MUSIC_PLAYER.pause()
            audioSystem_logger.info("Pausing music")
        elif command in ["next", cmd.NEXT]:
            on_next_click(None)
            #MUSIC_PLAYER.next()
            audioSystem_logger.info("Next track")
        elif command in ["previous", cmd.PREVIOUS]:
            on_previous_click(None)
            #MUSIC_PLAYER.prev()
            audioSystem_logger.info("Previous track")
        elif command in ["volume up", cmd.VOLUME_UP]:
            MUSIC_PLAYER.raise_volume()
            audioSystem_logger.info(f"Volume: {MUSIC_PLAYER.volume * 100}%")
        elif command in ["volume down", cmd.VOLUME_DOWN]:
            MUSIC_PLAYER.lower_volume()
            audioSystem_logger.info(f"Volume: {MUSIC_PLAYER.volume * 100}%")
        else:
            audioSystem_logger.info(f"Unrecognized command {command}")

    while True:
        with command_lock:
            if not VOICE_RECOGNIZER.cmd_queue.empty():
                voice_command = VOICE_RECOGNIZER.cmd_queue.get()
                logging.info(f"Run VOICE command: {voice_command}")
                execute_command(voice_command)
            if not GESTURE_RECOGNIZER.cmd_queue.empty():
                gesture_command = GESTURE_RECOGNIZER.cmd_queue.get()
                logging.info(f'Run GESTURE command: {gesture_command}')
                execute_command(gesture_command)
        
        success, image = cap.read()
        if not success:
            logging.error('Unable to read video')
            exit(1)

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = GESTURE_RECOGNIZER.process_hands(image_rgb)

        if result.multi_hand_landmarks:
            for hand_landmarks in result.multi_hand_landmarks:
                # mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                # fingers = GESTURE_RECOGNIZER.count_fingers(hand_landmarks)
                
                if GESTURE_RECOGNIZER.is_thumbs_up(hand_landmarks):
                    if playing_track != current_track:
                        music_icons[current_track].visible = False
                        MUSIC_PLAYER.stop()
                        MUSIC_PLAYER.play(current_track)
                        music_icons[current_track].visible = True
                        playing_track = current_track
                        play_pause_btn.icon = ft.Icons.PLAY_ARROW
                        page.update()
                else:
                    x, _ = GESTURE_RECOGNIZER.get_index_pos(hand_landmarks)
                    x = 1 - x
                    n = len(tracks)
                    original_track = current_track
                    for i in range(n):
                        if x < (i+1)/n:
                            current_track = i
                            break
                    
                    if current_track != original_track:
                        update_track_selection(current_track)
                        page.update()
                # cmd = convert_fingers_to_cmd(fingers)
                # if cmd:
                #     GESTURE_RECOGNIZER.cmd_queue.put(cmd)


        if cv2.waitKey(5) & 0xFF == 27:
            break
        time.sleep(0.1) # No need to exhaust cpu

if __name__ == "__main__":
    ft.app(target=main)