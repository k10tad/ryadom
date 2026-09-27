const STORAGE_KEY = 'ryadom:current-activity:v1';
const WORK_CYCLE_KEY = 'ryadom:work-cycle:v1';
const MINUTE = 60 * 1000;

const ACTIVITIES = {
  home: { id: 'home', src: 'assets/alek/alek-home.jpg', alt: 'こちらを見つめるアレク', action: '{{user}}と居る。', soundScene: 'home', duration: [45, 95] },
  shower: { id: 'shower', src: 'assets/alek/alek-shower.jpg', alt: '不規則な時間にシャワーを浴びるアレク', action: 'シャワー中', soundScene: 'shower', duration: [22, 42] },
  asleep: { id: 'asleep', src: 'assets/alek/alek-asleep.jpg', alt: '夜勤明けに眠るアレク', action: '夜勤明けでうたた寝', soundScene: 'asleep', duration: [45, 95] },
  work: { id: 'work', src: 'assets/alek/alek-work.jpg', alt: '資料を確認するアレク', action: '論文と格闘中', soundScene: 'work', duration: [70, 130] },
  violin: { id: 'violin', src: 'assets/alek/alek-violin.jpg', fallbackSrc: 'assets/alek/alek-home.jpg', alt: '自宅で静かにヴァイオリンを弾くアレク', action: 'リビングでヴァイオリンを弾いている', soundScene: 'violin', duration: [55, 105] },
  organ: { id: 'organ', src: 'assets/alek/alek-organ.jpg', fallbackSrc: 'assets/alek/alek-home.jpg', alt: '古い教会でパイプオルガンを弾くアレク', action: '古い教会でオルガンを弾いている', soundScene: 'organMonastery', duration: [50, 90] },
  fugue: { id: 'fugue', src: 'assets/alek/alek-organ-fugue.jpg', fallbackSrc: 'assets/alek/alek-home.jpg', alt: '古い教会でパイプオルガンを弾くアレク', action: '……フーガを弾いている。', soundScene: 'organFugue', duration: [48, 78] }
};

const BEDROOM_ACTIVITY = { id: 'bedroom', src: 'assets/alek/alek-bed.jpg', alt: '寝室で横になるアレク', action: '一緒に休むところ', soundScene: 'bedroom' };
const PREVIEWS = { violin: ACTIVITIES.violin, organ: ACTIVITIES.organ, fugue: ACTIVITIES.fugue };

const add = (pool, name, weight) => {
  for (let index = 0; index < weight; index += 1) pool.push(name);
};

export class RyadomActivity {
  constructor({ onChange = () => {}, preview = '' } = {}) {
    this.onChange = onChange;
    this.preview = PREVIEWS[preview] ? preview : '';
    this.room = 'living';
    this.current = null;
    this.changeTimer = null;
  }

  readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || !ACTIVITIES[saved.id] || !Number.isFinite(saved.until)) return null;
      return saved;
    } catch {
      return null;
    }
  }

  save(id, until) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, until }));
  }

  cycleInfo(date = new Date()) {
    const shifted = new Date(date);
    shifted.setHours(shifted.getHours() - 4);
    const year = shifted.getFullYear();
    const month = shifted.getMonth();
    const day = shifted.getDate();
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      ordinal: Math.floor(Date.UTC(year, month, day) / 86400000)
    };
  }

  readWorkCycle() {
    try {
      const saved = JSON.parse(localStorage.getItem(WORK_CYCLE_KEY) || 'null');
      if (!saved || !['onCall', 'postCall', 'regular', 'off'].includes(saved.profile)) return null;
      return saved;
    } catch {
      return null;
    }
  }

  pickWorkCycle(previous, ordinal) {
    if (previous?.ordinal === ordinal - 1 && previous.profile === 'onCall') return 'postCall';
    const roll = Math.random() * 100;
    if (roll < 32) return 'onCall';
    if (roll < 68) return 'regular';
    return 'off';
  }

  workCycleFor(date = new Date()) {
    const { key, ordinal } = this.cycleInfo(date);
    const saved = this.readWorkCycle();
    if (saved?.key === key) return saved.profile;
    const profile = this.pickWorkCycle(saved, ordinal);
    localStorage.setItem(WORK_CYCLE_KEY, JSON.stringify({ key, ordinal, profile }));
    return profile;
  }

  weightedPool(date = new Date()) {
    const hour = date.getHours();
    const profile = this.workCycleFor(date);
    const earlyMorning = hour >= 4 && hour < 10;
    const daytime = hour >= 10 && hour < 18;
    const evening = hour >= 18 && hour < 21;
    const night = hour >= 21 || hour < 3;
    const deepNight = hour >= 23 || hour < 3;
    const pool = [];

    if (profile === 'onCall') {
      if (night || hour >= 20) {
        add(pool, 'work', 110);
        add(pool, 'asleep', 12);
        add(pool, 'home', 8);
      } else if (earlyMorning) {
        add(pool, 'work', 70);
        add(pool, 'shower', 28);
        add(pool, 'home', 10);
      } else {
        add(pool, 'work', 125);
        add(pool, 'home', 10);
      }
    } else if (profile === 'postCall') {
      if (earlyMorning) {
        add(pool, 'shower', 48);
        add(pool, 'asleep', 32);
        add(pool, 'home', 20);
      } else if (daytime) {
        add(pool, 'asleep', 78);
        add(pool, 'violin', 44);
        add(pool, 'shower', 18);
        add(pool, 'home', 22);
        add(pool, 'work', 8);
      } else if (evening) {
        add(pool, 'home', 38);
        add(pool, 'asleep', 28);
        add(pool, 'violin', 24);
      } else if (night) {
        add(pool, 'organ', deepNight ? 26 : 34);
        add(pool, 'fugue', deepNight ? 38 : 8);
        add(pool, 'home', 30);
        add(pool, 'asleep', 16);
      }
    } else if (profile === 'regular') {
      if (earlyMorning) {
        add(pool, 'shower', 36);
        add(pool, 'home', 24);
        add(pool, 'work', 12);
      } else if (daytime) {
        add(pool, 'work', 98);
        add(pool, 'home', 18);
        add(pool, 'asleep', 8);
      } else if (evening) {
        add(pool, 'work', 30);
        add(pool, 'home', 42);
      } else if (night) {
        add(pool, 'organ', deepNight ? 26 : 38);
        add(pool, 'fugue', deepNight ? 40 : 7);
        add(pool, 'work', 14);
        add(pool, 'home', 28);
      }
    } else {
      if (earlyMorning) {
        add(pool, 'asleep', 52);
        add(pool, 'shower', 24);
        add(pool, 'home', 20);
      } else if (daytime) {
        add(pool, 'violin', 48);
        add(pool, 'asleep', 34);
        add(pool, 'shower', 16);
        add(pool, 'work', 18);
        add(pool, 'home', 38);
      } else if (evening) {
        add(pool, 'violin', 30);
        add(pool, 'work', 12);
        add(pool, 'home', 42);
      } else if (night) {
        add(pool, 'organ', deepNight ? 28 : 40);
        add(pool, 'fugue', deepNight ? 44 : 9);
        add(pool, 'work', 10);
        add(pool, 'home', 24);
      }
    }

    // 03:00-04:00 is a deliberately quiet handover hour.
    if (!pool.length) {
      add(pool, 'home', 38);
      add(pool, 'asleep', 30);
      add(pool, 'shower', 18);
    }

    return pool.length ? pool : ['home'];
  }

  pickNext(date = new Date()) {
    const weighted = this.weightedPool(date);
    const alternatives = weighted.filter(id => id !== this.current?.id);
    const pool = alternatives.length ? alternatives : weighted;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  durationFor(id) {
    const [min, max] = ACTIVITIES[id].duration;
    return (min + Math.random() * (max - min)) * MINUTE;
  }

  scheduleChange(until) {
    clearTimeout(this.changeTimer);
    if (this.preview || this.room !== 'living') return;
    this.changeTimer = setTimeout(() => this.refresh(), Math.max(1000, until - Date.now()));
  }

  setCurrent(id, { until = null, persist = true } = {}) {
    const activity = ACTIVITIES[id] || ACTIVITIES.home;
    const nextUntil = until || Date.now() + this.durationFor(activity.id);
    this.current = { ...activity, until: nextUntil };
    if (persist) this.save(activity.id, nextUntil);
    this.scheduleChange(nextUntil);
    this.onChange(this.current);
    return this.current;
  }

  setRoom(room) {
    this.room = room === 'bedroom' ? 'bedroom' : 'living';
    clearTimeout(this.changeTimer);
    if (this.room === 'bedroom') {
      this.onChange(BEDROOM_ACTIVITY);
      return BEDROOM_ACTIVITY;
    }
    return this.refresh();
  }

  refresh(date = new Date()) {
    if (this.room !== 'living') {
      this.onChange(BEDROOM_ACTIVITY);
      return BEDROOM_ACTIVITY;
    }
    if (this.preview) {
      const activity = { ...PREVIEWS[this.preview], until: null, preview: true };
      this.current = activity;
      this.onChange(activity);
      return activity;
    }

    const saved = this.readSaved();
    if (saved && saved.until > Date.now()) {
      this.current = { ...ACTIVITIES[saved.id], until: saved.until };
      this.scheduleChange(saved.until);
      this.onChange(this.current);
      return this.current;
    }
    return this.setCurrent(this.pickNext(date));
  }

  getCurrent() {
    return this.current;
  }
}
