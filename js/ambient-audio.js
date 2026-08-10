const TRACKS = [
  { title: '紡ぎ歌', src: 'music/elmenreich_tsumugiuta.mp3' },
  { title: '精霊の踊り', src: 'music/gluck_seireinoodori.mp3' },
  { title: 'ソルヴェイグの歌', src: 'music/grieg_solveigssong.mp3' },
  { title: '森の入口', src: 'music/schumann_morinoiriguchi.mp3' },
  { title: 'アンネン・ポルカ', src: 'music/straussII_annenpolka.mp3' },
  { title: '花から花へ', src: 'music/veldy_hanakarahanahe.mp3' }
];

const SCENES = {
  home: [
    { src: 'sound/paper.mp3', volume: .2 },
    { src: 'sound/phone.mp3', volume: .15 },
    { src: 'sound/vibe.mp3', volume: .12 }
  ],
  work: [
    { src: 'sound/keyboard.mp3', volume: .18 },
    { src: 'sound/paper.mp3', volume: .2 },
    { src: 'sound/printer.mp3', volume: .14 },
    { src: 'sound/phone.mp3', volume: .13 },
    { src: 'sound/vibe.mp3', volume: .1 }
  ],
  shower: [
    { src: 'sound/shower.mp3', volume: .2 },
    { src: 'sound/bathtub.mp3', volume: .16 }
  ],
  asleep: [{ src: 'sound/heartbeat.mp3', volume: .1 }],
  bedroom: [
    { src: 'sound/heartbeat.mp3', volume: .09 },
    { src: 'sound/paper.mp3', volume: .12 }
  ],
  quiet: [
    { src: 'sound/heartbeat.mp3', volume: .08 },
    { src: 'sound/paper.mp3', volume: .1 }
  ]
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
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.scheduleAmbient(1200);
  }

  setScene(scene) {
    this.scene = SCENES[scene] ? scene : 'home';
    this.stopAmbient();
    if (this.unlocked) this.scheduleAmbient(between(1200, 3500));
  }

  scheduleAmbient(delay = between(14000, 36000)) {
    clearTimeout(this.ambientTimer);
    if (!this.unlocked || document.hidden) return;
    this.ambientTimer = setTimeout(() => this.playAmbient(), delay);
  }

  playAmbient() {
    const choices = SCENES[this.scene] || SCENES.home;
    const choice = choices[Math.floor(Math.random() * choices.length)];
    const audio = new Audio(choice.src);
    this.ambient = audio;
    audio.volume = choice.volume * (this.musicEnabled ? .55 : 1);
    const continueLater = () => {
      if (this.ambient === audio) this.ambient = null;
      this.scheduleAmbient(this.scene === 'work' ? between(10000, 27000) : between(17000, 44000));
    };
    audio.addEventListener('ended', continueLater, { once: true });
    audio.addEventListener('error', continueLater, { once: true });
    audio.play().catch(continueLater);
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

  playEffect() {
    if (!this.unlocked) return;
    const effect = new Audio('sound/doubleclick.mp3');
    effect.volume = .16;
    effect.play().catch(() => {});
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
    audio.volume = .3;
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

  suspend() {
    this.stopAmbient();
    if (this.music) this.music.pause();
  }

  resume() {
    if (!this.unlocked) return;
    this.scheduleAmbient(900);
    if (this.musicEnabled && this.music) this.music.play().catch(() => {});
  }
}
