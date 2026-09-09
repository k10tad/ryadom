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
  work: [
    { src: 'sound/keyboard.mp3', volume: .13 },
    { src: 'sound/printer.mp3', volume: .1 },
    { src: 'sound/paper.mp3', volume: .11 },
    { src: 'sound/doubleclick.mp3', volume: .09 },
    { src: 'sound/phone.mp3', volume: .08 }
  ],
  shower: [
    { src: 'sound/shower.mp3', volume: .12 },
    { src: 'sound/bathtub.mp3', volume: .1 }
  ],
  asleep: [
    { src: 'sound/paper.mp3', volume: .08 },
    { src: 'sound/vibe.mp3', volume: .055 }
  ],
  violin: [{ src: 'music/violin_solo.mp3', volume: .085, loop: true }],
  organMonastery: [{ src: 'music/monastery.mp3', volume: .075, loop: true }],
  organFugue: [{ src: 'music/fugueg.mp3', volume: .07, loop: true }],
  bedroom: [],
  bedtime: [{ src: 'sound/heartbeat.mp3', volume: .045, loop: true }],
  quiet: []
};

const between = (min, max) => Math.round(min + Math.random() * (max - min));
const RECITAL_SCENES = new Set(['violin', 'organMonastery', 'organFugue']);

export class AmbientAudio {
  constructor({ onTrackChange } = {}) {
    this.onTrackChange = onTrackChange || (() => {});
    this.scene = 'home';
    this.unlocked = false;
    this.ambientTimer = null;
    this.musicTimer = null;
    this.musicEnabled = false;
    this.lastTrack = -1;
    this.voiceActive = false;
    this.sceneVersion = 0;
    this.lastAmbientIndex = {};
    this.playedOnce = new Set();
    this.ambientActive = false;
    this.musicActive = false;
    this.isPriming = false;

    // Haven / Senda と同様、以後の再生で生成し直さない専用プレイヤー。
    this.ambient = this.createPlayer();
    this.music = this.createPlayer();
  }

  createPlayer() {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.playsInline = true;
    return audio;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.isPriming = true;
    this.configureBackgroundPlayback();
    Promise.all([
      this.primePlayer(this.ambient, 'sound/paper.mp3'),
      this.primePlayer(this.music, TRACKS[0].src)
    ]).finally(() => {
      this.isPriming = false;
      if (this.musicEnabled) this.playNextTrack();
      if (RECITAL_SCENES.has(this.scene) && !document.hidden) {
        clearTimeout(this.ambientTimer);
        this.ambientTimer = null;
        this.playAmbient();
      }
      else this.scheduleAmbient(1800);
    });
  }

  primePlayer(audio, src) {
    const wasMuted = audio.muted;
    audio.onended = null;
    audio.onerror = null;
    audio.loop = false;
    audio.src = src;
    audio.muted = true;
    return audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = wasMuted;
    }).catch(() => {
      audio.muted = wasMuted;
    });
  }

  configureBackgroundPlayback() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {}
  }

  updateMediaSession(title = 'Рядом') {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist: 'Алексей Новак', album: 'Рядом' });
      navigator.mediaSession.playbackState = 'playing';
    } catch {}
  }

  clearMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try { navigator.mediaSession.playbackState = 'none'; } catch {}
  }

  setScene(scene, { immediate = false } = {}) {
    const nextScene = SCENES[scene] ? scene : 'home';
    if (nextScene !== this.scene) this.playedOnce.delete(nextScene);
    this.scene = nextScene;
    this.sceneVersion += 1;
    this.stopAmbient();
    if (RECITAL_SCENES.has(this.scene) && this.musicEnabled) this.stopMusic();
    if (!this.unlocked) return;
    if (immediate && SCENES[this.scene]?.length && !document.hidden) this.playAmbient();
    else this.scheduleAmbient(between(1600, 3200));
  }

  scheduleAmbient(delay = 1800) {
    clearTimeout(this.ambientTimer);
    if (!this.unlocked || document.hidden || !SCENES[this.scene]?.length) return;
    this.ambientTimer = setTimeout(() => this.playAmbient(), delay);
  }

  playAmbient() {
    if (this.isPriming) return;
    clearTimeout(this.ambientTimer);
    this.ambientTimer = null;
    const choices = SCENES[this.scene] || SCENES.home;
    if (!choices.length) return;
    let choiceIndex = Math.floor(Math.random() * choices.length);
    if (choices.length > 1 && choiceIndex === this.lastAmbientIndex[this.scene]) choiceIndex = (choiceIndex + 1) % choices.length;
    this.lastAmbientIndex[this.scene] = choiceIndex;
    const choice = choices[choiceIndex];
    const onceKey = `${this.scene}:${choice.src}`;
    if (choice.once && this.playedOnce.has(onceKey)) return;
    if (choice.once) this.playedOnce.add(onceKey);

    const sceneAtStart = this.scene;
    const versionAtStart = this.sceneVersion;
    const audio = this.ambient;
    audio.pause();
    audio.onended = null;
    audio.onerror = null;
    audio.src = choice.src;
    audio.loop = Boolean(choice.loop);
    audio._ryadomBaseVolume = choice.volume * (this.musicEnabled ? .4 : 1);
    audio.volume = audio._ryadomBaseVolume * (this.voiceActive ? .35 : 1);
    this.ambientActive = true;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (this.ambient === audio) this.ambientActive = false;
      if (!choice.once && this.unlocked && !document.hidden && this.scene === sceneAtStart && this.sceneVersion === versionAtStart) {
        const delay = sceneAtStart === 'asleep' ? between(28000, 58000) : between(13000, 36000);
        this.scheduleAmbient(delay);
      }
    };
    if (!choice.loop) audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(() => {
      if (choice.once) this.playedOnce.delete(onceKey);
      finish();
    });
    if (choice.loop) {
      const titles = { violin: 'ヴァイオリン', organMonastery: 'パイプオルガン', organFugue: 'フーガ', bedtime: '眠るまで' };
      this.updateMediaSession(titles[this.scene] || 'Рядом');
    }
    if (!choice.loop && !choice.fullTrack) {
      setTimeout(() => {
        if (!this.ambientActive || this.ambient !== audio) return;
        audio.pause();
        audio.currentTime = 0;
        finish();
      }, 10000);
    }
  }

  stopAmbient() {
    clearTimeout(this.ambientTimer);
    this.ambientTimer = null;
    this.ambient.pause();
    this.ambient.currentTime = 0;
    this.ambient.onended = null;
    this.ambient.onerror = null;
    this.ambientActive = false;
    if (!this.musicActive) this.clearMediaSession();
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
    if (!this.musicEnabled || this.isPriming) return;
    const index = this.nextTrackIndex();
    const track = TRACKS[index];
    this.lastTrack = index;
    const audio = this.music;
    audio.pause();
    audio.onended = null;
    audio.onerror = null;
    audio.src = track.src;
    audio.loop = true;
    audio.volume = this.voiceActive ? .018 : .03;
    this.musicActive = true;
    this.onTrackChange(track.title, true);
    this.updateMediaSession(`オルゴール · ${track.title}`);
    audio.onerror = () => {
      this.musicActive = false;
      if (this.musicEnabled) this.musicTimer = setTimeout(() => this.playNextTrack(), 2000);
    };
    audio.play().catch(() => {
      this.musicActive = false;
      this.musicEnabled = false;
      this.onTrackChange('', false);
      if (!this.ambientActive) this.clearMediaSession();
    });
  }

  stopMusic() {
    this.musicEnabled = false;
    clearTimeout(this.musicTimer);
    this.musicTimer = null;
    this.music.pause();
    this.music.currentTime = 0;
    this.music.onended = null;
    this.music.onerror = null;
    this.musicActive = false;
    this.onTrackChange('', false);
    if (!this.ambientActive) this.clearMediaSession();
  }

  setVoiceActive(active) {
    this.voiceActive = Boolean(active);
    if (this.musicActive) this.music.volume = this.voiceActive ? .018 : .03;
    if (this.ambientActive) this.ambient.volume = this.ambient._ryadomBaseVolume * (this.voiceActive ? .35 : 1);
  }

  resume() {
    if (!this.unlocked) return;
    if (!this.ambientActive && SCENES[this.scene]?.length) this.scheduleAmbient(between(1800, 4200));
    if (this.musicEnabled && this.musicActive && this.music.paused) this.music.play().catch(() => {});
  }
}
