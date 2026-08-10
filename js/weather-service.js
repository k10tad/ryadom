const CACHE_KEY = 'ryadom:weather-cache-v1';
const CACHE_MS = 30 * 60 * 1000;

const WEATHER_LABELS = {
  0: '快晴', 1: '晴れ', 2: '一部くもり', 3: 'くもり',
  45: '霧', 48: '霧氷', 51: '弱い霧雨', 53: '霧雨', 55: '強い霧雨',
  61: '小雨', 63: '雨', 65: '強い雨', 71: '小雪', 73: '雪', 75: '強い雪',
  80: 'にわか雨', 81: 'にわか雨', 82: '激しいにわか雨', 85: 'にわか雪', 86: '強いにわか雪',
  95: '雷雨', 96: '雷雨・雹', 99: '強い雷雨・雹'
};

function readCache(region) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached?.region === region && Date.now() - cached.savedAt < CACHE_MS) return cached.data;
  } catch {}
  return null;
}

function normalizeRegion(region) {
  return String(region || '').trim().replace(/[都道府県]$/, '');
}

async function geocode(region) {
  const query = normalizeRegion(region);
  if (query.length < 2) throw new Error('地域名をもう少し詳しく入力してね。');
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name: query, count: '8', language: 'ja', format: 'json', countryCode: 'JP' });
  const response = await fetch(url);
  if (!response.ok) throw new Error('地域を確認できなかったよ。');
  const json = await response.json();
  const candidates = json.results || [];
  const match = candidates.find(item => item.admin1 === region || item.name === query) || candidates[0];
  if (!match) throw new Error('地域が見つからなかったよ。市区町村名で試してね。');
  return match;
}

function pressureTrend(times, values, currentTime, currentPressure) {
  if (!Array.isArray(times) || !Array.isArray(values)) return { delta: null, label: '変化不明' };
  const currentIndex = times.findIndex(time => time >= currentTime);
  const index = currentIndex < 0 ? times.length - 1 : currentIndex;
  const past = values[Math.max(0, index - 3)];
  const delta = Number.isFinite(past) ? Number((currentPressure - past).toFixed(1)) : null;
  if (delta === null) return { delta, label: '変化不明' };
  if (delta <= -2) return { delta, label: '下降中' };
  if (delta >= 2) return { delta, label: '上昇中' };
  return { delta, label: '安定' };
}

export async function getWeather(region, force = false) {
  if (!force) {
    const cached = readCache(region);
    if (cached) return cached;
  }
  const place = await geocode(region);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(place.latitude), longitude: String(place.longitude), timezone: 'auto',
    current: 'temperature_2m,apparent_temperature,weather_code,pressure_msl',
    hourly: 'pressure_msl', past_hours: '4', forecast_hours: '4'
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error('天気を取得できなかったよ。');
  const json = await response.json();
  const current = json.current || {};
  const trend = pressureTrend(json.hourly?.time, json.hourly?.pressure_msl, current.time, current.pressure_msl);
  const data = {
    location: [place.name, place.admin1].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('・'),
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    pressure: current.pressure_msl,
    weather: WEATHER_LABELS[current.weather_code] || '天気不明',
    trend,
    updatedAt: current.time
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify({ region, savedAt: Date.now(), data }));
  return data;
}

export function clearWeatherCache() {
  localStorage.removeItem(CACHE_KEY);
}
