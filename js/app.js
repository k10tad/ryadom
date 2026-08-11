import { db, makeId, openDatabase } from './db.js?v=0.9.0';
import { migrateLegacyData } from './migration.js';
import { APP_VERSION } from './config.js?v=1.8.1';
import { DialogueEngine } from './dialogue-engine.js?v=1.0.1';
import { typeLine, stopTyping } from './typewriter.js';
import { chooseIntelligentLine } from './ryadom-intelligence.js?v=1.0.2';
import { evaluateMedication, renderMedicationAssessment } from './medical-service.js';
import { addMedicationToProfile, getProfileBundle, saveProfile } from './profile-service.js';
import { conditionPanel, medicinePanel, rhythmPanel, sayPanel, settingsPanel } from './panels.js?v=1.4.1';
import { exportBackup, importBackup } from './backup-service.js?v=0.9.0';
import { clearWeatherCache, getWeather } from './weather-service.js?v=1.0.0';
import { adviseFromMessage } from './symptom-advisor.js?v=1.4.0';
import { emotionalSupportFromMessage } from './emotional-support.js?v=1.3.0';
import { cycleActionLine, deleteCycleRecord, getCycleCarePrompt, saveCycleRecord, saveCycleSettings, saveSelectedBoundary } from './menstrual-service.js?v=1.6.0';
import { cycleTrackerPanel } from './cycle-panel.js?v=1.6.0';
import { personalizeElement, personalizeText, setConfiguredName } from './personalization.js?v=1.8.1';
import { AmbientAudio } from './ambient-audio.js?v=1.8.2';
import { activityPeriodKey, buildTimeContext, timeOfDay } from './time-context.js?v=1.0.0';
import {
  bedtimeLineDelay,
  isNightWakeWindow,
  pickBedroomQuietLine,
  pickBedtimeLine,
  pickNightWakeLine,
  shouldTriggerNightWake
} from './bedroom-mode.js?v=1.1.0';

const app = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const sheetContent = document.querySelector('#sheet-content');
const onboarding = document.querySelector('#onboarding');
const onboardingForm = document.querySelector('#onboarding-form');
const alekLine = document.querySelector('#alek-line');
const alekImage = document.querySelector('#alek-image');
const nowAction = document.querySelector('#now-action');
const speechFlow = document.querySelector('.speech-flow');
const musicBoxButton = document.querySelector('#music-box');
const musicTitle = document.querySelector('#music-title');
const bedtimeButton = document.querySelector('#bedtime-button');
const bedtimeStatus = document.querySelector('#bedtime-status');

function syncViewportMetrics() {
  const viewport = window.visualViewport;
  const height = Math.round(viewport?.height || window.innerHeight);
  const offsetTop = Math.round(viewport?.offsetTop || 0);
  document.documentElement.style.setProperty('--app-viewport-height', `${height}px`);
  document.documentElement.style.setProperty('--app-viewport-top', `${offsetTop}px`);
}

syncViewportMetrics();
window.addEventListener('resize', syncViewportMetrics, { passive: true });
window.addEventListener('orientationchange', syncViewportMetrics, { passive: true });
window.visualViewport?.addEventListener('resize', syncViewportMetrics, { passive: true });
window.visualViewport?.addEventListener('scroll', syncViewportMetrics, { passive: true });

new MutationObserver(() => personalizeElement(sheetContent)).observe(sheetContent, {
  childList: true,
  subtree: true,
  characterData: true
});

const ambientAudio = new AmbientAudio({
  onTrackChange(title, playing) {
    musicBoxButton.classList.toggle('is-playing', playing);
    musicBoxButton.setAttribute('aria-pressed', String(playing));
    musicBoxButton.setAttribute('aria-label', playing ? 'オルゴールを止める' : 'オルゴールを再生');
    musicTitle.textContent = playing && title ? `♪ ${title}` : '';
  }
});

let engine;
let pendingMedication = null;
let currentLineAudio = null;
let activeVoice = null;
let voiceRequestVersion = 0;
let normalPortrait = null;
let currentActivityPeriod = '';
let bedtimeActive = false;
let bedtimeSpeechTimer = null;
let bedtimeNextSpeakAt = 0;
let lastBedtimeLineId = '';
let lastBedroomQuietLineId = '';
let lastNightWakeLineId = '';
const CARE_STATE_KEY = 'ryadom:care-conversation-v1';
const NIGHT_WAKE_ATTEMPT_PREFIX = 'ryadom:night-wake-attempt:';

function getCareState() {
  try { return JSON.parse(localStorage.getItem(CARE_STATE_KEY) || 'null'); } catch { return null; }
}

function setCareState(state) {
  if (state) localStorage.setItem(CARE_STATE_KEY, JSON.stringify(state));
  else localStorage.removeItem(CARE_STATE_KEY);
}

async function saveCareMeasurement(log, at) {
  if (!log) return;
  await db.put('symptomLogs', {
    id: makeId('symptom'), kind: log.kind || '症状', level: 'uneasy', note: log.note,
    temperature: log.temperature, systolic: log.systolic, diastolic: log.diastolic,
    pulse: log.pulse, at, source: 'alek-conversation'
  });
}

const panels = {
  rhythm: ['РИТМ · RHYTHM', '身体のリズム'],
  say: ['СКАЖИ · MESSAGE', '何でも話して'],
  condition: ['ПРИЁМ · CHECK-IN', '体調を伝える'],
  medicine: ['ЛЕКАРСТВА · LOG', '服薬を照合・記録'],
  settings: [`НАСТРОЙКИ · v${APP_VERSION}`, 'Рядомの設定']
};

const panelOtters = {
  rhythm: { code: 'c', src: 'assets/icons/otter-c.png', viewBox: '0 0 496 552', width: 496, height: 552 },
  say: { code: 'b', src: 'assets/icons/otter-b.png', viewBox: '0 0 500 472', width: 500, height: 472 },
  condition: { code: 'b', src: 'assets/icons/otter-b.png', viewBox: '0 0 500 472', width: 500, height: 472 },
  settings: { code: 'a', src: 'assets/icons/otter-a.png', viewBox: '0 0 448 520', width: 448, height: 520 }
};

function dialogueContext(context = {}) {
  const date = context.date instanceof Date ? context.date : new Date();
  return {
    room: app.dataset.room,
    activity: app.dataset.activity,
    ...buildTimeContext(date),
    ...context
  };
}

function updateBedtimeButton() {
  bedtimeButton.setAttribute('aria-pressed', String(bedtimeActive));
  bedtimeStatus.textContent = bedtimeActive ? '少し離れる。' : 'アレクの胸に耳を当てる。';
}

function clearBedtimeSpeechTimer() {
  clearTimeout(bedtimeSpeechTimer);
  bedtimeSpeechTimer = null;
}

function scheduleBedtimeLine() {
  clearBedtimeSpeechTimer();
  if (!bedtimeActive || app.dataset.room !== 'bedroom') return;
  if (!bedtimeNextSpeakAt) bedtimeNextSpeakAt = Date.now() + bedtimeLineDelay();
  if (document.hidden) return;
  const remaining = Math.max(250, bedtimeNextSpeakAt - Date.now());
  bedtimeSpeechTimer = setTimeout(() => speakBedtimeLine(), remaining);
}

async function speakBedtimeLine() {
  if (!bedtimeActive || app.dataset.room !== 'bedroom') return null;
  clearBedtimeSpeechTimer();
  bedtimeNextSpeakAt = 0;
  const line = pickBedtimeLine(lastBedtimeLineId);
  if (!line) return null;
  lastBedtimeLineId = line.id;
  await showText(line.text, line.audio, true);
  bedtimeNextSpeakAt = Date.now() + bedtimeLineDelay();
  scheduleBedtimeLine();
  return line;
}

async function startBedtimeMode() {
  if (app.dataset.room !== 'bedroom') return;
  bedtimeActive = true;
  app.classList.add('is-bedtime');
  updateBedtimeButton();
  ambientAudio.unlock();
  ambientAudio.setScene('bedtime', { immediate: true });
  await speakBedtimeLine();
}

function stopBedtimeMode({ restoreScene = true } = {}) {
  if (!bedtimeActive) return;
  bedtimeActive = false;
  clearBedtimeSpeechTimer();
  bedtimeNextSpeakAt = 0;
  stopActiveVoice();
  app.classList.remove('is-bedtime');
  updateBedtimeButton();
  if (restoreScene) ambientAudio.setScene(app.dataset.room === 'bedroom' ? 'bedroom' : (app.dataset.activity || 'home'));
}

function nightWakeAttemptKey(date) {
  return NIGHT_WAKE_ATTEMPT_PREFIX + buildTimeContext(date).dateKey;
}

async function maybeShowNightWake(date = new Date()) {
  if (app.dataset.room !== 'bedroom' || !isNightWakeWindow(date)) return false;
  const key = nightWakeAttemptKey(date);
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, 'checked');
  } catch {}
  if (!shouldTriggerNightWake(date)) return false;
  const line = pickNightWakeLine(lastNightWakeLineId);
  if (!line) return false;
  lastNightWakeLineId = line.id;
  await showText(line.text, line.audio, true);
  return true;
}

function stopActiveVoice() {
  voiceRequestVersion += 1;
  if (activeVoice) {
    activeVoice.pause();
    activeVoice.currentTime = 0;
    activeVoice = null;
  }
  ambientAudio.setVoiceActive(false);
}

function playVoice(source, useFallback = false) {
  if (!source) return;
  stopActiveVoice();
  const requestVersion = voiceRequestVersion;
  const sources = [source];
  if (source.startsWith('voice/')) sources.push(`Voice/${source.slice(6)}`);
  let sourceIndex = 0;
  const fallback = () => {
    if (requestVersion !== voiceRequestVersion) return;
    sourceIndex += 1;
    if (sourceIndex < sources.length) {
      startAudio();
      return;
    }
    if (!useFallback || !('speechSynthesis' in window)) {
      ambientAudio.setVoiceActive(false);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(alekLine.textContent);
    utterance.lang = 'ja-JP';
    utterance.rate = .9;
    utterance.pitch = .8;
    utterance.volume = 1;
    utterance.addEventListener('end', () => ambientAudio.setVoiceActive(false), { once: true });
    utterance.addEventListener('error', () => ambientAudio.setVoiceActive(false), { once: true });
    speechSynthesis.speak(utterance);
  };
  function startAudio() {
    if (requestVersion !== voiceRequestVersion) return;
    const audio = new Audio(sources[sourceIndex]);
    activeVoice = audio;
    audio.volume = 1;
    ambientAudio.setVoiceActive(true);
    const restoreSound = () => {
      if (activeVoice === audio) {
        activeVoice = null;
        ambientAudio.setVoiceActive(false);
      }
    };
    audio.addEventListener('ended', restoreSound, { once: true });
    audio.addEventListener('error', fallback, { once: true });
    audio.play().catch(fallback);
  }
  startAudio();
}

async function showText(text, audio = null, autoplay = false) {
  stopTyping();
  currentLineAudio = audio;
  if (autoplay && audio) playVoice(audio);
  await typeLine(alekLine, personalizeText(text), speechFlow);
}

async function showLine(context = {}) {
  const line = await chooseIntelligentLine(engine, dialogueContext(context));
  await showText(line.text, line.audio, true);
  return line;
}

async function showNextLine() {
  if (bedtimeActive) return speakBedtimeLine();
  return showLine({ manual: true });
}

function updateClock() {
  const now = new Date();
  document.querySelector('#clock-time').textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  document.querySelector('#clock-date').textContent = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  refreshActivityForTime(now);
}

function chooseActivity(room, date = new Date()) {
  if (room === 'bedroom') return { src: 'assets/alek/alek-bed.jpg', alt: '寝室で横になるアレク', action: '一緒に休むところ', soundScene: 'bedroom' };
  const weekday = date.getDay() >= 1 && date.getDay() <= 5;
  const hour = date.getHours();
  const roll = Math.random();
  if ((hour < 7 && roll < .34) || (hour >= 7 && hour < 10 && roll < .16)) return { src: 'assets/alek/alek-shower.jpg', alt: '不規則な時間にシャワーを浴びるアレク', action: 'シャワー中', soundScene: 'shower' };
  if (weekday && hour >= 11 && hour < 19 && roll < .38) {
    return { src: 'assets/alek/alek-asleep.jpg', alt: '夜勤明けに眠るアレク', action: '夜勤明けでうたた寝', soundScene: 'asleep' };
  }
  if (weekday && hour >= 8 && hour < 21 && roll < .76) {
    return { src: 'assets/alek/alek-work.jpg', alt: '資料を確認するアレク', action: '論文と格闘中', soundScene: 'work' };
  }
  return { src: 'assets/alek/alek-home.jpg', alt: 'こちらを見つめるアレク', action: 'レイと居る。', soundScene: 'home' };
}

function applyPortrait(activity) {
  normalPortrait = activity;
  app.dataset.activity = activity.soundScene || 'home';
  alekImage.src = activity.src;
  alekImage.alt = activity.alt;
  nowAction.textContent = personalizeText(activity.action);
  if (!bedtimeActive) ambientAudio.setScene(activity.soundScene || 'home');
}

function refreshActivityForTime(date = new Date()) {
  if (!normalPortrait) return;
  const period = activityPeriodKey(app.dataset.room, date);
  if (period === currentActivityPeriod) return;
  applyPortrait(chooseActivity(app.dataset.room, date));
  currentActivityPeriod = period;
}

function setRoom(room, persist = true) {
  const bedroom = room === 'bedroom';
  if (!bedroom && bedtimeActive) stopBedtimeMode({ restoreScene: false });
  app.dataset.room = bedroom ? 'bedroom' : 'living';
  const now = new Date();
  applyPortrait(chooseActivity(app.dataset.room, now));
  currentActivityPeriod = activityPeriodKey(app.dataset.room, now);
  document.querySelectorAll('[data-room-button]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.roomButton === app.dataset.room);
  });
  if (persist) localStorage.setItem('ryadom:room-v2', app.dataset.room);
}

async function panelTemplate(name) {
  if (name === 'rhythm') return cycleTrackerPanel();
  if (name === 'say') return sayPanel();
  if (name === 'condition') return conditionPanel();
  if (name === 'medicine') return medicinePanel();
  return settingsPanel();
}

async function openPanel(name) {
  if (!panels[name]) return;
  const [kicker, title] = panels[name];
  document.querySelector('#sheet-kicker').textContent = kicker;
  document.querySelector('#sheet-title').textContent = title;
  const sheetOtter = document.querySelector('#sheet-otter');
  const sheetOtterImage = document.querySelector('#sheet-otter-image');
  const otter = panelOtters[name];
  sheetOtter.toggleAttribute('hidden', !otter);
  if (otter) {
    sheetOtter.dataset.otter = otter.code;
    sheetOtter.setAttribute('viewBox', otter.viewBox);
    sheetOtterImage.setAttribute('href', otter.src);
    sheetOtterImage.setAttribute('width', otter.width);
    sheetOtterImage.setAttribute('height', otter.height);
  } else {
    delete sheetOtter.dataset.otter;
  }
  sheetContent.innerHTML = personalizeText(await panelTemplate(name));
  sheet.classList.toggle('is-settings', name === 'settings');
  sheet.classList.toggle('is-chat', name === 'say');
  syncViewportMetrics();
  if (!sheet.open) sheet.showModal();
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.nav === name);
  });
  requestAnimationFrame(() => {
    syncViewportMetrics();
    const history = document.querySelector('#chat-history');
    if (history) history.scrollTop = history.scrollHeight;
  });
}

async function saveProfileForm(values, isOnboarding = false) {
  await saveProfile({
    name: values.name,
    region: values.region,
    medications: values.medications,
    conditions: values.conditions,
    onboardingComplete: true
  });
  setConfiguredName(values.name);
  if (isOnboarding) {
    onboarding.close();
    await showText(`${values.name.trim()}、覚えたよ。薬と持病はプロフィールに、飲んだ記録と症状は別々に残すね。`);
  } else {
    sheetContent.innerHTML = '<p class="saved-message">覚えたよ。薬のプロフィールと服用記録、持病と症状は分けて保存した。</p>';
    await showLine({ medication: true });
  }
}

async function handleSubmit(form) {
  const values = Object.fromEntries(new FormData(form));
  const type = form.dataset.form;
  const now = new Date().toISOString();

  if (type === 'onboarding') {
    await saveProfileForm(values, true);
    return;
  }
  if (type === 'settings') {
    clearWeatherCache();
    await saveProfileForm(values);
    await updateWeather(values.region, true);
    return;
  }
  if (type === 'cycle-record') {
    const wasEditing = Boolean(values.id);
    const record = await saveCycleRecord(values);
    sheetContent.innerHTML = await cycleTrackerPanel({ month: record.startDate.slice(0, 7), selectedDate: record.startDate });
    await showText(cycleActionLine(wasEditing ? 'update' : 'past'));
    return;
  }
  if (type === 'cycle-settings') {
    await saveCycleSettings(values.pmsDays);
    sheetContent.innerHTML = await cycleTrackerPanel();
    await showText(cycleActionLine('settings'));
    return;
  }
  if (type === 'schedule') {
    await db.put('schedules', { id: makeId('schedule'), name: values.name.trim(), time: values.time, dose: values.dose.trim(), createdAt: now });
    sheetContent.innerHTML = await rhythmPanel('schedule');
    return;
  }
  if (type === 'condition') {
    const pain = values.hasPain === 'yes' ? Number(values.pain) : null;
    const existing = values.id ? await db.get('symptomLogs', values.id) : null;
    const at = values.at ? new Date(values.at).toISOString() : (existing?.at || now);
    await db.put('symptomLogs', {
      ...(existing || {}),
      id: existing?.id || makeId('symptom'),
      kind: '症状',
      level: values.level,
      note: values.note.trim(),
      pain: Number.isInteger(pain) && pain >= 0 && pain <= 10 ? pain : null,
      at,
      updatedAt: existing ? now : undefined
    });
    sheetContent.innerHTML = `<p class="saved-message">${existing ? '症状記録を更新したよ。変更前と同じ記録として保存してある。' : 'うん、症状として残したよ。持病のプロフィールとは分けてある。'}</p>`;
    await showLine({ symptom: values.note.trim() || values.level, level: values.level, distress: values.level === 'bad' });
    return;
  }
  if (type === 'medicine') {
    const profileBundle = await getProfileBundle();
    const assessment = await evaluateMedication(values.name.trim(), profileBundle);
    pendingMedication = assessment.identified ? {
      drug: assessment.drug,
      rawName: values.name.trim(),
      dose: values.dose.trim(),
      at: values.takenAt ? new Date(values.takenAt).toISOString() : now,
      isNew: !assessment.isRegistered
    } : null;

    let controls = '';
    if (pendingMedication) {
      controls = `<label class="profile-choice"><input type="checkbox" data-add-to-profile ${pendingMedication.isNew ? 'checked' : ''}><span>${pendingMedication.isNew ? 'この薬を現在の薬プロフィールにも追加する' : '登録済みの薬プロフィールを維持する'}</span></label><button class="primary confirm-log" type="button" data-confirm-medicine>確認して服用記録を残す</button>`;
    }
    document.querySelector('#medical-result').innerHTML = renderMedicationAssessment(assessment) + controls;
    await showText(assessment.alek);
    return;
  }
  if (type === 'say') {
    const note = values.note.trim();
    const userMessage = { id: makeId('message'), from: 'user', text: note, at: now, readAt: null };
    await db.put('messages', userMessage);
    sheetContent.innerHTML = await sayPanel();
    requestAnimationFrame(() => {
      const history = document.querySelector('#chat-history');
      if (history) history.scrollTop = history.scrollHeight;
    });
    await new Promise(resolve => setTimeout(resolve, 280));
    userMessage.readAt = new Date().toISOString();
    await db.put('messages', userMessage);
    sheetContent.innerHTML = await sayPanel({ typing: true });
    requestAnimationFrame(() => {
      const history = document.querySelector('#chat-history');
      if (history) history.scrollTop = history.scrollHeight;
    });
    await new Promise(resolve => setTimeout(resolve, 720));
    const cancelled = /^(キャンセル|中止|やめる|もう大丈夫)$/.test(note);
    if (cancelled) setCareState(null);
    const care = cancelled ? null : adviseFromMessage(note, getCareState());
    if (care) {
      setCareState(care.state || null);
      await saveCareMeasurement(care.log, now);
    }
    const emotional = care ? null : emotionalSupportFromMessage(note);
    const response = care || emotional || await chooseIntelligentLine(engine, dialogueContext({
      distress: /つら|しんど|痛|怖|不安/.test(note)
    }));
    await db.put('messages', { id: makeId('message'), from: 'alek', kind: response.kind || 'dialogue', urgent: Boolean(response.urgent), text: response.text, at: new Date().toISOString() });
    await showText(response.text, response.audio || null, Boolean(response.audio));
    sheetContent.innerHTML = await sayPanel();
    requestAnimationFrame(() => {
      const history = document.querySelector('#chat-history');
      if (history) history.scrollTop = history.scrollHeight;
      document.querySelector('.chat-composer textarea')?.focus();
    });
  }
}

function speakCurrentLine() {
  if (currentLineAudio) {
    playVoice(currentLineAudio, true);
    return;
  }
  const source = app.dataset.room === 'bedroom' ? 'voice/alek-bed-01.mp3' : 'voice/alek-home-01.mp3';
  playVoice(source, true);
}

document.addEventListener('click', async event => {
  const medicationPreset = event.target.closest('[data-medication-preset]');
  if (medicationPreset) {
    const form = sheetContent.querySelector('[data-form="medicine"]');
    const nameInput = form?.elements.namedItem('name');
    const doseInput = form?.elements.namedItem('dose');
    if (nameInput instanceof HTMLInputElement) {
      nameInput.value = medicationPreset.dataset.medicationPreset || '';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      if (doseInput instanceof HTMLInputElement) doseInput.focus({ preventScroll: true });
    }
    return;
  }

  const exportButton = event.target.closest('[data-export-backup]');
  if (exportButton) {
    const status = document.querySelector('[data-transfer-status]');
    exportButton.disabled = true;
    try {
      await exportBackup();
      if (status) status.textContent = '個人データのバックアップZIPを書き出したよ。';
    } catch (error) {
      if (status) status.textContent = `書き出せなかったよ。${error.message}`;
    } finally { exportButton.disabled = false; }
    return;
  }

  const importButton = event.target.closest('[data-import-backup]');
  if (importButton) {
    document.querySelector('[data-backup-file]')?.click();
    return;
  }

  const roomButton = event.target.closest('[data-room-button]');
  if (roomButton) {
    const room = roomButton.dataset.roomButton;
    if (room === 'bedroom' && bedtimeActive) return;
    setRoom(room);
    const nightWakeShown = room === 'bedroom' && await maybeShowNightWake();
    if (!nightWakeShown) await showLine({ room });
    return;
  }

  const opener = event.target.closest('[data-open]');
  if (opener) {
    await openPanel(opener.dataset.open);
    return;
  }

  const rhythmTab = event.target.closest('[data-rhythm-tab]');
  if (rhythmTab) {
    sheetContent.innerHTML = rhythmTab.dataset.rhythmTab === 'cycle' ? await cycleTrackerPanel() : await rhythmPanel(rhythmTab.dataset.rhythmTab);
    return;
  }

  const conditionTab = event.target.closest('[data-condition-tab]');
  if (conditionTab) {
    sheetContent.innerHTML = personalizeText(await conditionPanel(null, conditionTab.dataset.conditionTab));
    sheetContent.scrollTop = 0;
    return;
  }

  const monthNavigation = event.target.closest('[data-cycle-month-nav]');
  if (monthNavigation) { sheetContent.innerHTML = await cycleTrackerPanel({ month: monthNavigation.dataset.cycleMonthNav }); return; }
  const cycleDate = event.target.closest('[data-cycle-date]');
  if (cycleDate) { sheetContent.innerHTML = await cycleTrackerPanel({ month: cycleDate.closest('[data-cycle-month]')?.dataset.cycleMonth, selectedDate: cycleDate.dataset.cycleDate }); return; }
  const cycleBoundary = event.target.closest('[data-cycle-boundary]');
  if (cycleBoundary) {
    try {
      const record = await saveSelectedBoundary(cycleBoundary.dataset.cycleSelected, cycleBoundary.dataset.cycleBoundary);
      sheetContent.innerHTML = await cycleTrackerPanel({ month: record.startDate.slice(0, 7), selectedDate: cycleBoundary.dataset.cycleSelected });
      await showText(cycleActionLine(cycleBoundary.dataset.cycleBoundary));
    } catch (error) {
      await showText(error.message);
      document.querySelector('.selected-cycle-date')?.insertAdjacentHTML('beforeend', `<p class="cycle-error">${String(error.message).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]))}</p>`);
    }
    return;
  }
  const cycleEdit = event.target.closest('[data-edit-cycle]');
  if (cycleEdit) { sheetContent.innerHTML = await cycleTrackerPanel({ editId: cycleEdit.dataset.editCycle }); sheetContent.querySelector('.cycle-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (event.target.closest('[data-cancel-cycle-edit]')) { sheetContent.innerHTML = await cycleTrackerPanel(); return; }
  const cycleDelete = event.target.closest('[data-delete-cycle]');
  if (cycleDelete) {
    if (!confirm('この周期記録を削除する？ 予測も残った履歴で計算し直すよ。')) return;
    await deleteCycleRecord(cycleDelete.dataset.deleteCycle);
    sheetContent.innerHTML = await cycleTrackerPanel();
    await showText(cycleActionLine('delete'));
    return;
  }

  const deletion = event.target.closest('[data-delete-schedule]');
  if (deletion) {
    await db.remove('schedules', deletion.dataset.deleteSchedule);
    sheetContent.innerHTML = await rhythmPanel('schedule');
    return;
  }

  const symptomEdit = event.target.closest('[data-edit-symptom]');
  if (symptomEdit) {
    sheetContent.innerHTML = await conditionPanel(symptomEdit.dataset.editSymptom);
    sheetContent.scrollTop = 0;
    return;
  }

  const symptomEditCancel = event.target.closest('[data-cancel-symptom-edit]');
  if (symptomEditCancel) {
    sheetContent.innerHTML = await conditionPanel();
    return;
  }

  const symptomDelete = event.target.closest('[data-delete-symptom]');
  if (symptomDelete) {
    if (!confirm('この症状記録を削除する？ この操作は元に戻せません。')) return;
    await db.remove('symptomLogs', symptomDelete.dataset.deleteSymptom);
    sheetContent.innerHTML = await conditionPanel();
    return;
  }

  const confirmation = event.target.closest('[data-confirm-medicine]');
  if (confirmation && pendingMedication) {
    if (pendingMedication.isNew && document.querySelector('[data-add-to-profile]')?.checked) {
      await addMedicationToProfile(pendingMedication.drug, pendingMedication.rawName);
    }
    await db.put('medicationLogs', {
      id: makeId('medication'),
      kind: '服薬',
      name: pendingMedication.drug.name,
      rawName: pendingMedication.rawName,
      drugId: pendingMedication.drug.id,
      dose: pendingMedication.dose,
      at: pendingMedication.at
    });
    pendingMedication = null;
    sheetContent.innerHTML = '<p class="saved-message">服用記録を残したよ。薬プロフィールや予定とは別に保存してある。</p>';
    return;
  }

  const home = event.target.closest('[data-nav="home"]');
  if (home) {
    sheet.close();
    document.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('is-active', button === home));
  }
});

sheetContent.addEventListener('change', async event => {
  if (event.target.matches('[data-pain-toggle]')) {
    const scale = document.querySelector('[data-pain-scale]');
    const range = document.querySelector('[data-pain-range]');
    if (scale && range) {
      scale.hidden = !event.target.checked;
      range.disabled = !event.target.checked;
    }
    return;
  }
  if (event.target.matches('[data-backup-file]') && event.target.files?.[0]) {
    const status = document.querySelector('[data-transfer-status]');
    const confirmed = confirm('現在の個人データをバックアップしてから、ZIP内のデータへ置き換えます。復元しますか？');
    if (!confirmed) { event.target.value = ''; return; }
    try {
      if (status) status.textContent = 'ZIPを検査して復元しています…';
      const manifest = await importBackup(event.target.files[0]);
      if (status) status.textContent = `${new Date(manifest.createdAt).toLocaleString('ja-JP')}のバックアップを復元したよ。再読み込みします。`;
      setTimeout(() => location.reload(), 900);
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally { event.target.value = ''; }
  }
});

sheetContent.addEventListener('input', event => {
  if (event.target.matches('[data-form="medicine"] input[name="name"]')) {
    const selectedName = event.target.value.trim().toLocaleLowerCase('ja-JP');
    sheetContent.querySelectorAll('[data-medication-preset]').forEach(button => {
      const selected = (button.dataset.medicationPreset || '').trim().toLocaleLowerCase('ja-JP') === selectedName;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  if (event.target.matches('[data-pain-range]')) {
    const output = document.querySelector('[data-pain-output]');
    if (output) output.textContent = `${event.target.value} / 10`;
  }
});

sheetContent.addEventListener('submit', async event => {
  event.preventDefault();
  try { await handleSubmit(event.target); }
  catch (error) {
    if (event.target.matches('[data-form^="cycle"]')) {
      await showText(error.message || '日付を保存できなかった。入力を一緒に見直そ。');
      event.target.querySelector('.cycle-error')?.remove();
      event.target.insertAdjacentHTML('beforeend', `<p class="cycle-error">${String(error.message || '保存できませんでした').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]))}</p>`);
      return;
    }
    throw error;
  }
});
onboardingForm.addEventListener('submit', async event => {
  event.preventDefault();
  await handleSubmit(event.target);
});
onboarding.addEventListener('cancel', event => event.preventDefault());
function closeSheetToHome() {
  sheet.close();
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.nav === 'home');
  });
}

document.querySelector('#close-sheet').addEventListener('click', closeSheetToHome);
sheet.addEventListener('click', event => { if (event.target === sheet) closeSheetToHome(); });
document.querySelector('#next-line').addEventListener('click', () => showNextLine());
document.querySelector('#voice-button').addEventListener('click', speakCurrentLine);
bedtimeButton.addEventListener('click', async () => {
  if (bedtimeActive) stopBedtimeMode();
  else await startBedtimeMode();
});
async function showQuietLine() {
  stopTyping();
  const inBedroom = app.dataset.room === 'bedroom';
  const line = inBedroom
    ? pickBedroomQuietLine(lastBedroomQuietLineId)
    : await chooseIntelligentLine(engine, dialogueContext({ quiet: true }));
  if (inBedroom && line) lastBedroomQuietLineId = line.id;
  if (!line) return null;
  currentLineAudio = line.audio || null;
  if (line.audio) playVoice(line.audio);
  await typeLine(document.querySelector('#quiet-line'), personalizeText(line.text), document.querySelector('.quiet-copy'));
  return line;
}

document.querySelector('#beside-button').addEventListener('click', async () => {
  if (bedtimeActive) stopBedtimeMode({ restoreScene: false });
  ambientAudio.unlock();
  ambientAudio.setScene('quiet');
  alekImage.src = 'assets/alek/alek-ryadom.jpg';
  alekImage.alt = '静かにそばにいるアレク';
  nowAction.textContent = personalizeText('レイのそばにいる');
  app.classList.add('is-quiet');
  document.querySelector('#quiet-mode').setAttribute('aria-hidden', 'false');
  await showQuietLine();
});
document.querySelector('#quiet-portrait').addEventListener('click', showQuietLine);
musicBoxButton.addEventListener('click', event => {
  event.stopPropagation();
  ambientAudio.toggleMusic();
});
document.querySelector('#leave-quiet').addEventListener('click', () => {
  ambientAudio.stopMusic();
  app.classList.remove('is-quiet');
  document.querySelector('#quiet-mode').setAttribute('aria-hidden', 'true');
  if (normalPortrait) applyPortrait(normalPortrait);
});

document.addEventListener('pointerdown', () => ambientAudio.unlock(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    ambientAudio.suspend();
    clearBedtimeSpeechTimer();
  } else {
    ambientAudio.resume();
    if (bedtimeActive) scheduleBedtimeLine();
  }
});

async function updateWeather(region, force = false) {
  const location = document.querySelector('#weather-location');
  const condition = document.querySelector('#weather-condition');
  const temperature = document.querySelector('#weather-temperature');
  const pressure = document.querySelector('#weather-pressure');
  if (!region) return;
  location.textContent = region;
  condition.textContent = '天気を確認中';
  try {
    const weather = await getWeather(region, force);
    location.textContent = weather.location || region;
    condition.textContent = `${weather.weather}・体感 ${Math.round(weather.apparentTemperature)}°`;
    temperature.textContent = `${Math.round(weather.temperature)}°`;
    const delta = weather.trend.delta;
    const deltaText = delta === null ? '' : ` ${delta > 0 ? '+' : ''}${delta} / 3h`;
    pressure.textContent = `気圧 ${Math.round(weather.pressure)} hPa・${weather.trend.label}${deltaText}`;
    document.querySelector('#weather-strip').classList.toggle('is-falling', delta !== null && delta <= -2);
  } catch (error) {
    condition.textContent = error.message;
    temperature.textContent = '--°';
    pressure.textContent = '設定から地域を確認';
  }
}

async function start() {
  await openDatabase();
  await migrateLegacyData();
  engine = await DialogueEngine.create();
  const { profile } = await getProfileBundle();
  setConfiguredName(profile?.name || '');
  updateClock();
  setInterval(updateClock, 30000);
  setRoom(localStorage.getItem('ryadom:room-v2') || 'living', false);
  if (!profile?.onboardingComplete || !profile.name || !profile.region) {
    alekLine.textContent = '最初に、君のことを少し教えて。';
    onboarding.showModal();
  } else {
    const cycleCare = await getCycleCarePrompt();
    if (cycleCare) await showText(cycleCare.text);
    else {
      const nightWakeShown = app.dataset.room === 'bedroom' && await maybeShowNightWake();
      if (!nightWakeShown) await showLine();
    }
    updateWeather(profile.region);
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

start().catch(error => {
  console.error(error);
  alekLine.textContent = '少し読み込みに失敗したみたい。記録は消していないよ。ページを再読み込みしてみて。';
});
