import { db, makeId } from './db.js?v=0.9.0';

const WEATHER_CACHE_KEY = 'ryadom:weather-cache-v1';
const EPISODE_GAP = 36 * 60 * 60 * 1000;

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function words(note = '') {
  const known = ['頭痛', '片頭痛', '吐き気', 'めまい', '動悸', '息苦しさ', '発熱', '腹痛', '生理痛', '咳', '蕁麻疹', '不安', '不眠', '倦怠感'];
  return known.filter(word => String(note).includes(word));
}

function cycleContext(at, cycle) {
  if (!cycle?.lastStart || !cycle?.length) return { phase: 'ordinary', day: null, label: '周期情報なし' };
  const date = new Date(at);
  const start = new Date(`${cycle.lastStart}T12:00:00`);
  const length = Number(cycle.length);
  const elapsed = Math.floor((date - start) / 86400000);
  const day = ((elapsed % length) + length) % length + 1;
  if (day <= 6) return { phase: 'menstrual', day, label: `月経期 ${day}日目` };
  if (day >= length - 4) return { phase: 'premenstrual', day, label: `月経前の目安（周期${day}日目）` };
  if (Math.abs(day - Math.round(length / 2)) <= 2) return { phase: 'ovulation_window', day, label: `排卵期の目安（周期${day}日目）` };
  return { phase: 'ordinary', day, label: `周期${day}日目` };
}

function cachedWeather() {
  try {
    const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
    if (!cached?.data) return null;
    return { pressure: cached.data.pressure, pressureDelta: cached.data.trend?.delta ?? null, weather: cached.data.weather, capturedAt: cached.data.updatedAt };
  } catch { return null; }
}

export async function contextualizeSymptom(log) {
  const [logs, medicationLogs, cycle] = await Promise.all([
    db.all('symptomLogs'), db.all('medicationLogs'), db.get('meta', 'cycle-profile')
  ]);
  const at = new Date(log.at || Date.now());
  const keys = words(log.note);
  const related = logs
    .filter(item => item.episodeId && item.episodeStatus !== 'closed' && Math.abs(at - new Date(item.at)) <= EPISODE_GAP)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .find(item => !keys.length || words(item.note).some(word => keys.includes(word)));
  const nearbyMedication = medicationLogs
    .filter(item => Math.abs(at - new Date(item.at)) <= 6 * 60 * 60 * 1000)
    .sort((a, b) => Math.abs(at - new Date(a.at)) - Math.abs(at - new Date(b.at)))
    .slice(0, 3)
    .map(item => ({ name: item.name || item.rawName, at: item.at }));
  return {
    ...log,
    episodeId: log.episodeId || related?.episodeId || makeId('episode'),
    episodeStatus: log.episodeStatus || 'active',
    context: { weather: cachedWeather(), cycle: cycleContext(at, cycle), nearbyMedication }
  };
}

export async function setEpisodeStatus(episodeId, status) {
  const logs = await db.all('symptomLogs');
  const updatedAt = new Date().toISOString();
  for (const item of logs.filter(log => log.episodeId === episodeId)) {
    await db.put('symptomLogs', { ...item, episodeStatus: status, updatedAt });
  }
}

export async function healthOverview() {
  const [symptoms, medications] = await Promise.all([db.all('symptomLogs'), db.all('medicationLogs')]);
  const sorted = symptoms.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const recent = sorted.slice(0, 30);
  const baselines = {
    temperature: median(recent.map(x => Number(x.temperature))),
    systolic: median(recent.map(x => Number(x.systolic))),
    diastolic: median(recent.map(x => Number(x.diastolic))),
    pulse: median(recent.map(x => Number(x.pulse)))
  };
  const episodes = new Map();
  for (const log of sorted) {
    const id = log.episodeId || log.id;
    if (!episodes.has(id)) episodes.set(id, { id, status: log.episodeStatus || 'closed', logs: [] });
    episodes.get(id).logs.push(log);
  }
  const patterns = [];
  const falling = recent.filter(x => Number(x.context?.weather?.pressureDelta) <= -2);
  if (falling.length >= 2) patterns.push(`気圧下降時の症状記録が${falling.length}件あります。関連候補で、原因の断定ではありません。`);
  const premenstrual = recent.filter(x => x.context?.cycle?.phase === 'premenstrual');
  if (premenstrual.length >= 2) patterns.push(`月経前の目安期間に症状記録が${premenstrual.length}件あります。普段との差を見る材料にしよう。`);
  const afterMedication = recent.filter(x => x.context?.nearbyMedication?.length);
  if (afterMedication.length >= 2) patterns.push(`服薬前後6時間以内の症状記録が${afterMedication.length}件あります。薬との因果関係を示すものではありません。`);
  return { symptoms: sorted, medications, baselines, episodes: [...episodes.values()], patterns };
}

export function baselineDifference(log, baselines) {
  const parts = [];
  if (Number.isFinite(Number(log.temperature)) && Number.isFinite(baselines.temperature)) parts.push(`体温は普段の中央値より${signed(Number(log.temperature) - baselines.temperature)}℃`);
  if (Number.isFinite(Number(log.pulse)) && Number.isFinite(baselines.pulse)) parts.push(`脈拍は普段より${signed(Math.round(Number(log.pulse) - baselines.pulse))}/分`);
  if (Number.isFinite(Number(log.systolic)) && Number.isFinite(baselines.systolic)) parts.push(`収縮期血圧は普段より${signed(Math.round(Number(log.systolic) - baselines.systolic))}mmHg`);
  return parts.join('、');
}

function signed(value) { return `${value >= 0 ? '+' : ''}${Number(value.toFixed?.(1) ?? value)}`; }
