const TRACKS = [
  { title: '紡ぎ歌', src: 'music/elmenreich_tsumugiuta.mp3' },
  { title: '精霊の踊り', src: 'music/gluck_seireinoodori.mp3' },
  { title: 'ソルヴェイグの歌', src: 'music/grieg_solveigssong.mp3' },
  { title: '森の入口', src: 'music/schumann_morinoiriguchi.mp3' },
  { title: 'アンネン・ポルカ', src: 'music/straussII_annenpolka.mp3' },
  { title: '花から花へ', src: 'music/veldy_hanakarahanahe.mp3' }
];

const SCENES = {
  home: [],
  work: [{ src: 'sound/keyboard.mp3', volume: .13 }],
  shower: [
    { src: 'sound/shower.mp3', volume: .12 },
    { src: 'sound/bathtub.mp3', volume: .1 }
  ],
  asleep: [{ src: 'sound/heartbeat.mp3', volume: .065 }],
  bedroom: [{ src: 'sound/heartbeat.mp3', volume: .065 }],
  quiet: []
};

const between = (min, max) => Math.round(min + Math.random() * (max - min));

export class AmbientAudio {
  constructor({ onTrackChange } = {}) {
    this.onTrackChange = onTrackChange || (() => {});
    this.scene = 'home';
    this.unlocked = false;
    this.ambientTimer = null;
    this.ambient = null;
    this.musicTimer = null;
    this.music = null;
    this.musicEnabled = false;
    this.lastTrack = -1;
    this.voiceActive = false;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.scheduleAmbient(1800);
  }

  setScene(scene) {
    this.scene = SCENES[scene] ? scene : 'home';
    this.stopAmbient();
    if (this.unlocked) this.scheduleAmbient(between(1600, 3200));
  }

  scheduleAmbient(delay = 1800) {
    clearTimeout(this.ambientTimer);
    if (!this.unlocked || document.hidden || !SCENES[this.scene]?.length) return;
    this.ambientTimer = setTimeout(() => this.playAmbient(), delay);
  }

  playAmbient() {
    const choices = SCENES[this.scene] || SCENES.home;
    if (!choices.length) return;
    const choice = choices[Math.floor(Math.random() * choices.length)];
    const audio = new Audio(choice.src);
    this.ambient = audio;
    audio._ryadomBaseVolume = choice.volume * (this.musicEnabled ? .4 : 1);
    audio.volume = audio._ryadomBaseVolume * (this.voiceActive ? .35 : 1);
    const finish = () => {
      if (this.ambient === audio) this.ambient = null;
    };
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', finish, { once: true });
    audio.play().catch(finish);
    setTimeout(() => {
      if (this.ambient !== audio) return;
      audio.pause();
      audio.currentTime = 0;
      finish();
    }, 10000);
  }

  stopAmbient() {
    clearTimeout(this.ambientTimer);
    this.ambientTimer = null;
    if (this.ambient) {
      this.ambient.pause();
      this.ambient.currentTime = 0;
      this.ambient = null;
    }
  }

  toggleMusic() {
    this.unlock();
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) this.playNextTrack();
    else this.stopMusic();
    return this.musicEnabled;
  }

  nextTrackIndex() {
    if (TRACKS.length < 2) return 0;
    let index = this.lastTrack;
    while (index === this.lastTrack) index = Math.floor(Math.random() * TRACKS.length);
    return index;
  }

  playNextTrack() {
    clearTimeout(this.musicTimer);
    if (!this.musicEnabled) return;
    const index = this.nextTrackIndex();
    const track = TRACKS[index];
    this.lastTrack = index;
    const audio = new Audio(track.src);
    this.music = audio;
    audio.volume = this.voiceActive ? .035 : .11;
    this.onTrackChange(track.title, true);
    const follow = () => {
      if (this.music === audio) this.music = null;
      if (this.musicEnabled) this.musicTimer = setTimeout(() => this.playNextTrack(), between(12000, 28000));
    };
    audio.addEventListener('ended', follow, { once: true });
    audio.addEventListener('error', follow, { once: true });
    audio.play().catch(() => {
      this.musicEnabled = false;
      this.onTrackChange('', false);
    });
  }

  stopMusic() {
    this.musicEnabled = false;
    clearTimeout(this.musicTimer);
    this.musicTimer = null;
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
      this.music = null;
    }
    this.onTrackChange('', false);
  }

  setVoiceActive(active) {
    this.voiceActive = Boolean(active);
    if (this.music) this.music.volume = this.voiceActive ? .035 : .11;
    if (this.ambient) this.ambient.volume = this.ambient._ryadomBaseVolume * (this.voiceActive ? .35 : 1);
  }

  suspend() {
    this.stopAmbient();
    if (this.music) this.music.pause();
  }

  resume() {
    if (!this.unlocked) return;
    if (this.musicEnabled && this.music) this.music.play().catch(() => {});
  }
}
