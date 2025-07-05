from os import path


class MusicPlayer:
    def __init__(self, music_directory="music") -> None:
        from pygame import mixer

        self.is_started = False
        self.is_playing = False
        self.music_directory = music_directory
        self.tracks: list[str] = []
        self.track_index: int = 0
        self.mixer = mixer

    @property
    def volume(self) -> float:
        return self.mixer.music.get_volume()

    def start(self) -> None:
        self.mixer.init()
        try:
            music_file = path.join(self.music_directory, self.tracks[self.track_index])
            self.mixer.music.load(music_file)
        except IndexError:
            pass

    def add(self, to_add: list[str] | str) -> None:
        if not isinstance(to_add, list):
            to_add = [to_add]

        for t in to_add:
            if t in self.tracks:
                self.tracks.remove(t)
            # Adding a just-deleted track will change its index
            self.tracks.append(t)

    def remove(self, to_remove: list[str] | str) -> None:
        if not isinstance(to_remove, list):
            to_remove = [to_remove]

        for t in to_remove:
            self.tracks.remove(t)
    
    def update_mixer_track(self) -> bool:
        try:
            music_file = path.join(self.music_directory, self.tracks[self.track_index])
            self.mixer.music.load(music_file)
            return True
        except IndexError:
            return False

    def next(self, by=1) -> None:
        self.track_index += by
        self.track_index %= len(self.tracks)
        if self.update_mixer_track():
            self.play()

    def prev(self, by=1) -> None:
        self.track_index -= by
        self.track_index %= len(self.tracks)
        if self.update_mixer_track():
            self.play()

    def pause(self) -> None:
        self.mixer.music.pause()
        self.is_playing = False

    def resume(self) -> None:
        if not self.is_started:
            self.play()
            return
        self.mixer.music.unpause()
        self.is_playing = True
    
    def stop(self) -> None:
        self.mixer.music.stop()
        self.is_playing = False
        self.is_started = False

    def play(self, track: int | None = None) -> None:
        if not self.tracks:
            return
        n = len(self.tracks)
        if track is not None:
            if track >= n:
                return
            self.track_index = track
        
        if self.update_mixer_track():
            self.mixer.music.play()
            self.is_playing = True
            self.is_started = True

    def raise_volume(self) -> None:
        volume = min(1.0, self.volume + 0.1)
        self.mixer.music.set_volume(volume)

    def lower_volume(self) -> None:
        volume = min(0.0, self.volume - 0.1)
        self.mixer.music.set_volume(volume)
