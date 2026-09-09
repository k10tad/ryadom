const STORAGE_KEY = 'ryadom:current-activity:v1';
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

  weightedPool(date = new Date()) {
    const hour = date.getHours();
    const weekday = date.getDay() >= 1 && date.getDay() <= 5;
    const pool = [];

    if (!weekday && hour >= 15 && hour < 23) {
      add(pool, 'organ', 34);
      add(pool, 'fugue', 4);
    } else if (weekday && hour >= 18 && hour < 23) {
      add(pool, 'organ', 16);
      add(pool, 'fugue', 2);
    }

    if (weekday && (hour >= 20 || (hour === 0 && date.getMinutes() <= 30))) add(pool, 'violin', 55);
    if ((hour < 7) || (hour >= 7 && hour < 10)) add(pool, 'shower', hour < 7 ? 34 : 16);
    if (weekday && hour >= 11 && hour < 19) add(pool, 'asleep', 38);
    if (weekday && hour >= 8 && hour < 21) add(pool, 'work', 76);
    add(pool, 'home', 42);

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
