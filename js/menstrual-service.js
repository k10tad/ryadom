import { db, makeId } from './db.js?v=0.9.0';

const DAY = 86400000;
const DEFAULT_CYCLE = 28;
const DEFAULT_DURATION = 5;
const DEFAULT_PMS_DAYS = 7;
const CARE_KEY = 'ryadom:cycle-care-v1';

function atNoon(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : atNoon(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value, amount) {
  const date = atNoon(value);
  if (!date) return null;
  date.setDate(date.getDate() + amount);
  return date;
}

function daysBetween(from, to) {
  const start = atNoon(from);
  const end = atNoon(to);
  return start && end ? Math.round((end - start) / DAY) : null;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function cycleRecords(logs) {
  return logs
    .filter(item => item.kind === 'menstrual-cycle' || item.startDate || item.kind === '周期')
    .map(item => ({
      ...item,
      startDate: item.startDate || item.date,
      endDate: item.endDate || null,
      kind: 'menstrual-cycle'
    }))
    .filter(item => atNoon(item.startDate))
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}

async function migrateLegacyCycle() {
  const [profile, logs] = await Promise.all([db.get('meta', 'cycle-profile'), db.all('cycleLogs')]);
  if (!profile?.lastStart || cycleRecords(logs).some(item => item.startDate === profile.lastStart)) return;
  await db.put('cycleLogs', {
    id: makeId('cycle'),
    kind: 'menstrual-cycle',
    startDate: profile.lastStart,
    endDate: null,
    source: 'legacy-cycle-profile',
    createdAt: profile.updatedAt || new Date().toISOString()
  });
}

export async function getCycleTracker() {
  await migrateLegacyCycle();
  const [rawLogs, settings] = await Promise.all([
    db.all('cycleLogs'),
    db.get('meta', 'cycle-settings')
  ]);
  const records = cycleRecords(rawLogs);
  const recent = records.slice(-7);
  const intervals = [];
  for (let index = 1; index < recent.length; index += 1) {
    const length = daysBetween(recent[index - 1].startDate, recent[index].startDate);
    if (length >= 15 && length <= 90) intervals.push(length);
  }
  const durations = recent
    .map(item => item.endDate ? daysBetween(item.startDate, item.endDate) + 1 : null)
    .filter(value => value >= 1 && value <= 15);
  const cycleLength = median(intervals) || DEFAULT_CYCLE;
  const periodDuration = median(durations) || DEFAULT_DURATION;
  const pmsDays = Math.min(10, Math.max(3, Number(settings?.pmsDays) || DEFAULT_PMS_DAYS));
  const last = records.at(-1) || null;
  const nextStart = last ? dateKey(addDays(last.startDate, cycleLength)) : null;
  const spread = intervals.length >= 2 ? Math.max(...intervals) - Math.min(...intervals) : null;
  const confidence = intervals.length < 2 ? 'provisional' : spread > 7 ? 'low' : spread > 3 ? 'medium' : 'good';
  return { records, cycleLength, periodDuration, pmsDays, nextStart, confidence, intervalCount: intervals.length, spread };
}

function rangesForTracker(tracker, from, to) {
  const menstrual = new Map();
  const predictions = new Map();
  const pms = new Set();
  const ovulation = new Set();

  for (const record of tracker.records) {
    const start = atNoon(record.startDate);
    let end = record.endDate ? atNoon(record.endDate) : null;
    if (!end) {
      const expectedEnd = addDays(start, tracker.periodDuration - 1);
      const today = atNoon(new Date());
      end = today < expectedEnd ? today : expectedEnd;
    }
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      menstrual.set(dateKey(cursor), record.id);
    }
  }

  const last = tracker.records.at(-1);
  if (last) {
    let predictedStart = addDays(last.startDate, tracker.cycleLength);
    while (predictedStart && predictedStart < addDays(from, -tracker.cycleLength)) predictedStart = addDays(predictedStart, tracker.cycleLength);
    let guard = 0;
    while (predictedStart && predictedStart <= addDays(to, tracker.cycleLength) && guard < 24) {
      const predictedKey = dateKey(predictedStart);
      for (let day = 0; day < tracker.periodDuration; day += 1) {
        const key = dateKey(addDays(predictedStart, day));
        if (!menstrual.has(key)) predictions.set(key, predictedKey);
      }
      for (let day = tracker.pmsDays; day >= 1; day -= 1) {
        const key = dateKey(addDays(predictedStart, -day));
        if (!menstrual.has(key) && !predictions.has(key)) pms.add(key);
      }
      const ovulationKey = dateKey(addDays(predictedStart, -14));
      if (!menstrual.has(ovulationKey) && !predictions.has(ovulationKey)) ovulation.add(ovulationKey);
      predictedStart = addDays(predictedStart, tracker.cycleLength);
      guard += 1;
    }
  }
  return { menstrual, predictions, pms, ovulation };
}

export async function calendarMonth(year, month) {
  const tracker = await getCycleTracker();
  const first = new Date(year, month, 1, 12);
  const gridStart = addDays(first, -first.getDay());
  const gridEnd = addDays(gridStart, 41);
  return { tracker, first, gridStart, gridEnd, markers: rangesForTracker(tracker, gridStart, gridEnd) };
}

export async function saveCycleRecord({ id, startDate, endDate }) {
  const start = atNoon(startDate);
  const end = endDate ? atNoon(endDate) : null;
  if (!start) throw new Error('開始日を選んで。覚えてる範囲で大丈夫。');
  if (end && end < start) throw new Error('終了日が開始日より前になってる。日付だけ、もう一回見てもらっていい？');
  if (end && daysBetween(start, end) > 14) throw new Error('生理期間が15日以上になってるな。入力違いじゃなければ、記録とは別に一度相談しよう。');
  const existing = id ? await db.get('cycleLogs', id) : null;
  const records = cycleRecords(await db.all('cycleLogs')).filter(item => item.id !== id);
  const conflict = records.find(item => {
    const itemStart = atNoon(item.startDate);
    const itemEnd = atNoon(item.endDate || item.startDate);
    const targetEnd = end || start;
    return start <= itemEnd && targetEnd >= itemStart;
  });
  if (conflict) throw new Error('その日付は、もう別の生理記録に入ってる。重なってないか見てみよ。');
  const now = new Date().toISOString();
  const record = {
    ...(existing || {}),
    id: existing?.id || makeId('cycle'),
    kind: 'menstrual-cycle',
    startDate: dateKey(start),
    endDate: end ? dateKey(end) : null,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await db.put('cycleLogs', record);
  return record;
}

export async function saveSelectedBoundary(date, boundary) {
  const key = dateKey(date);
  if (!key) throw new Error('日付を選んでから押してな。');
  if (boundary === 'start') return saveCycleRecord({ startDate: key, endDate: null });
  const records = cycleRecords(await db.all('cycleLogs'));
  const open = [...records].reverse().find(item => !item.endDate && item.startDate <= key);
  if (!open) throw new Error('先に生理の開始日を記録してな。そこから終了日をつなげるよ。');
  return saveCycleRecord({ id: open.id, startDate: open.startDate, endDate: key });
}

export async function deleteCycleRecord(id) {
  await db.remove('cycleLogs', id);
}

export async function saveCycleSettings(pmsDays) {
  const value = Math.min(10, Math.max(3, Number(pmsDays) || DEFAULT_PMS_DAYS));
  await db.put('meta', { id: 'cycle-settings', pmsDays: value, updatedAt: new Date().toISOString() });
  return value;
}

export async function cyclePhase(value = new Date()) {
  const tracker = await getCycleTracker();
  if (!tracker.records.length) return { phase: 'ordinary', tracker, day: null, predicted: false };
  const key = dateKey(value);
  const date = atNoon(value);
  const markers = rangesForTracker(tracker, addDays(date, -1), addDays(date, 1));
  if (markers.menstrual.has(key)) {
    const record = tracker.records.find(item => item.id === markers.menstrual.get(key));
    return { phase: 'menstrual', tracker, day: daysBetween(record.startDate, key) + 1, predicted: false };
  }
  if (markers.predictions.has(key)) {
    const start = markers.predictions.get(key);
    return { phase: 'menstrual', tracker, day: daysBetween(start, key) + 1, predicted: true };
  }
  if (markers.pms.has(key)) return { phase: 'premenstrual', tracker, day: null, predicted: true };
  if (markers.ovulation.has(key)) return { phase: 'ovulation_window', tracker, day: null, predicted: true };
  const tomorrow = dateKey(addDays(date, 1));
  const tomorrowMarkers = rangesForTracker(tracker, date, addDays(date, 2));
  return { phase: tomorrowMarkers.predictions.has(tomorrow) ? 'period_tomorrow' : 'ordinary', tracker, day: null, predicted: true };
}

function recentCycleSymptoms(logs, now = new Date()) {
  return logs.filter(log => Math.abs(now - new Date(log.at)) <= 36 * 60 * 60 * 1000);
}

function includesAny(text, terms) {
  return terms.some(term => text.includes(term));
}

function pick(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function careMemory() {
  try { return JSON.parse(localStorage.getItem(CARE_KEY) || '{}'); } catch { return {}; }
}

export async function getCycleCarePrompt({ markShown = true, force = false } = {}) {
  const phase = await cyclePhase();
  if (phase.phase === 'ordinary' || !phase.tracker.records.length) return null;
  const symptoms = recentCycleSymptoms(await db.all('symptomLogs'));
  const text = symptoms.map(item => `${item.note || ''} ${item.level || ''}`).join(' ');
  const maxPain = Math.max(-1, ...symptoms.map(item => Number.isFinite(Number(item.pain)) ? Number(item.pain) : -1));
  const urgent = maxPain >= 8 || includesAny(text, ['大量出血', '失神', '気を失', '立てない', '動けない', '激痛']);
  let kind = phase.phase;
  let lines = [];

  if (urgent && (phase.phase === 'menstrual' || phase.phase === 'premenstrual')) {
    kind = 'cycle-urgent';
    lines = ['いつもの生理痛で片づけない方がいい。立てないほどの痛み、失神しそうな感じ、かなり多い出血があるなら、今日は受診しよう。ひとりで抱えなくていい。'];
  } else if (phase.phase === 'period_tomorrow') {
    lines = [
      '明日あたり予定日だな。鎮痛薬とか温めるもの、必要なら今のうちに手の届くところへ置いとこ。準備したら、あとは休んでいいよ。',
      'そろそろ予定日だな。必要なものだけ先に揃えとこ。全部きちんとやらなくていい、{{user}}が少し楽になる準備だけで十分。'
    ];
  } else if (phase.phase === 'premenstrual' && includesAny(text, ['不安', '落ち込', '情緒', 'イライラ', '寂し', '泣'])) {
    kind = 'pms-emotional';
    lines = [
      '今日は気持ちが落ち着かない日か。理由をきれいに説明しなくていいよ。ここにいるから、話せそうなところから話しな。',
      '気持ちが揺れてるな。周期のせいって決めつけはしないけど、しんどいのは本物だ。今日は自分に厳しくするの、少し休みにしよ。'
    ];
  } else if (phase.phase === 'premenstrual' && includesAny(text, ['頭痛', '片頭痛'])) {
    kind = 'pms-headache';
    lines = [
      'この時期に頭痛が重なること、前にもあったかな。いつもの感じに近い？　違う痛みなら、そこだけ先に教えて。',
      '頭痛も来たか。周期と重なってはいるけど、それだけで片づけないでおこ。普段の痛みと違うところがあれば俺に教えて。'
    ];
  } else if (phase.phase === 'premenstrual') {
    lines = [
      'そろそろ調子が揺れやすい頃かもな。何もなければそれでよし。ちょっと違うなって思ったら、無理する前に教えて。',
      '生理前の目安に入ってる。眠気とか頭痛とか、いつもと違うことがあったら残しといて。あとで一緒に見よう。',
      '今は少し波が出やすい頃かも。元気ならそのままでいいし、しんどければ遠慮なく予定を減らそ。'
    ];
  } else if (phase.phase === 'menstrual' && includesAny(text, ['腹痛', '生理痛'])) {
    kind = 'period-pain';
    lines = [
      '腹、痛む？　動ける程度でも我慢大会は開催しなくていいからな。温めて、少し休も。強くなるようなら呼んで。',
      '痛みが来てるな。薬を使うならいつもの指示どおりに。効かない、急に強い、普段と違うなら我慢せず教えて。'
    ];
  } else if (phase.phase === 'menstrual' && includesAny(text, ['だる', '倦怠', '疲れ', '眠'])) {
    kind = 'period-fatigue';
    lines = [
      '今日は電池の減りが早い日だな。怠けてるんじゃなくて、身体がちゃんと働いてる。最低限だけ済ませたら、こっち来な。',
      'だるい日は、普段の速度で動かなくていいよ。今日の{{user}}に合う速さまで落とそ。俺は急かさないから。'
    ];
  } else if (phase.phase === 'menstrual') {
    kind = phase.predicted ? 'period-predicted' : 'period-active';
    lines = phase.predicted ? [
      '今日は生理の予測日に入ってる。まだ始まってないなら、予測は予測のままで大丈夫。始まったら開始日だけ教えてな。',
      'カレンダーでは生理の目安の日だな。身体の方が正解だから、日付に合わせようとしなくていいよ。'
    ] : [
      `生理${phase.day || 1}日目だな。今日は普段どおりに動ける前提で予定を詰めなくていい。身体の方を先にしよ。`,
      '始まってる間は、平気な顔の完成度を競わなくていいからな。痛みや出血がいつもと違ったら、そこだけ残しといて。'
    ];
  } else if (phase.phase === 'ovulation_window' && symptoms.length) {
    kind = 'ovulation-symptom';
    lines = [
      '排卵日の目安と体調の変化が重なってるな。原因と決めつけず、今回の記録として残しておこ。続くなら次の周期とも比べよう。',
      '花の時期に不調が出てる。日付だけで断定はしないけど、あとで見返せるよう俺が覚えとくよ。'
    ];
  } else return null;

  const today = dateKey();
  const memory = careMemory();
  if (!force && memory.date === today && memory.kind === kind) return null;
  if (markShown) localStorage.setItem(CARE_KEY, JSON.stringify({ date: today, kind, at: new Date().toISOString() }));
  return { kind, text: pick(lines), urgent };
}

export function cycleActionLine(action) {
  const lines = {
    start: ['開始日、記録しといた。今日は無理して平気な顔しなくていいからな。', '始まったんだな。覚えたよ。今日は身体の方を先にしよ。'],
    end: ['終了日まで記録した。今周期もお疲れさま。少しずつ普段の調子へ戻そ。', '終わった日、つないでおいたよ。次の予測も{{user}}の記録で計算し直すな。'],
    past: ['前の分も記録した。履歴が増えたぶん、予測も少し{{user}}向けになったよ。', '過去の周期、覚えた。曖昧なところは無理に埋めなくて大丈夫だからな。'],
    update: ['日付を直しておいた。身体の記録は、思い出した時に整えれば十分。', '変更したよ。これで次の予測も計算し直してある。'],
    delete: ['その周期記録は外したよ。残ってる履歴だけで予測を組み直しておくな。'],
    settings: ['PMS期の幅、変えておいた。{{user}}の感覚に合う方で見ていこう。']
  };
  return pick(lines[action] || ['うん、記録しておいたよ。']);
}
