import { db, makeId, openDatabase } from './core/db.js';
import { migrateLegacyData } from './core/migration.js';
import { APP_VERSION } from './core/config.js';
import { DialogueEngine } from './dialogue/dialogue-engine.js';
import { typeLine, stopTyping } from './dialogue/typewriter.js';
import { chooseIntelligentLine } from './intelligence/ryadom-intelligence.js';
import { evaluateMedication, renderMedicationAssessment } from './services/medical-service.js';
import { addMedicationToProfile, getProfileBundle, saveProfile } from './services/profile-service.js';
import { conditionPanel, medicinePanel, rhythmPanel, sayPanel, settingsPanel } from './ui/panels.js';

const app = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const sheetContent = document.querySelector('#sheet-content');
const onboarding = document.querySelector('#onboarding');
const onboardingForm = document.querySelector('#onboarding-form');
const alekLine = document.querySelector('#alek-line');
const alekImage = document.querySelector('#alek-image');
const nowAction = document.querySelector('#now-action');
const speechFlow = document.querySelector('.speech-flow');

let engine;
let pendingMedication = null;

const panels = {
  rhythm: ['РИТМ · RHYTHM', '身体のリズム'],
  say: ['СКАЖИ · MESSAGE', '何でも話して'],
  condition: ['ПРИЁМ · CHECK-IN', '体調を伝える'],
  medicine: ['ЛЕКАРСТВА · LOG', '服薬を照合・記録'],
  settings: [`НАСТРОЙКИ · v${APP_VERSION}`, 'Рядомの設定']
};

function timeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'lateNight';
  if (hour < 11) return 'morning';
  if (hour < 17) return 'day';
  if (hour < 22) return 'evening';
  return 'night';
}

async function showText(text) {
  stopTyping();
  await typeLine(alekLine, text, speechFlow);
}

async function showLine(context = {}) {
  const line = await chooseIntelligentLine(engine, {
    room: app.dataset.room,
    timeOfDay: timeOfDay(),
    ...context
  });
  await showText(line.text);
  return line;
}

function updateClock() {
  const now = new Date();
  document.querySelector('#clock-time').textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  document.querySelector('#clock-date').textContent = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
}

function setRoom(room, persist = true) {
  const bedroom = room === 'bedroom';
  app.dataset.room = bedroom ? 'bedroom' : 'living';
  alekImage.src = bedroom ? 'assets/alek/alek-bed.jpg' : 'assets/alek/alek-home.jpg';
  alekImage.alt = bedroom ? '寝室で横になるアレク' : 'こちらを見つめるアレク';
  nowAction.textContent = bedroom ? '一緒に休むところ' : 'レイを待ってる';
  document.querySelectorAll('[data-room-button]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.roomButton === app.dataset.room);
  });
  if (persist) localStorage.setItem('ryadom:room-v2', app.dataset.room);
}

async function panelTemplate(name) {
  if (name === 'rhythm') return rhythmPanel();
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
  sheetContent.innerHTML = await panelTemplate(name);
  if (!sheet.open) sheet.showModal();
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.nav === name);
  });
  requestAnimationFrame(() => {
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
    await saveProfileForm(values);
    return;
  }
  if (type === 'cycle') {
    await db.put('meta', { id: 'cycle-profile', lastStart: values.lastStart, length: Number(values.length), updatedAt: now });
    await db.put('cycleLogs', { id: makeId('cycle'), kind: '周期', date: values.lastStart, at: now });
    sheetContent.innerHTML = await rhythmPanel('cycle');
    await showLine({ cycle: true });
    return;
  }
  if (type === 'schedule') {
    await db.put('schedules', { id: makeId('schedule'), name: values.name.trim(), time: values.time, dose: values.dose.trim(), createdAt: now });
    sheetContent.innerHTML = await rhythmPanel('schedule');
    return;
  }
  if (type === 'condition') {
    await db.put('symptomLogs', { id: makeId('symptom'), kind: '症状', level: values.level, note: values.note.trim(), at: now });
    sheetContent.innerHTML = '<p class="saved-message">うん、症状として残したよ。持病のプロフィールとは分けてある。</p>';
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
    await db.put('messages', { id: makeId('message'), from: 'user', text: values.note.trim(), at: now });
    const response = await chooseIntelligentLine(engine, {
      room: app.dataset.room,
      timeOfDay: timeOfDay(),
      distress: /つら|しんど|痛|怖|不安/.test(values.note)
    });
    await db.put('messages', { id: makeId('message'), from: 'alek', text: response.text, at: new Date().toISOString() });
    await showText(response.text);
    sheetContent.innerHTML = await sayPanel();
  }
}

function speakCurrentLine() {
  const source = app.dataset.room === 'bedroom' ? 'voice/alek-bed-01.mp3' : 'voice/alek-home-01.mp3';
  const audio = new Audio(source);
  const fallback = () => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(alekLine.textContent);
    utterance.lang = 'ja-JP';
    utterance.rate = .9;
    utterance.pitch = .8;
    speechSynthesis.speak(utterance);
  };
  audio.addEventListener('error', fallback, { once: true });
  audio.play().catch(fallback);
}

document.addEventListener('click', async event => {
  const roomButton = event.target.closest('[data-room-button]');
  if (roomButton) {
    setRoom(roomButton.dataset.roomButton);
    await showLine({ room: roomButton.dataset.roomButton });
    return;
  }

  const opener = event.target.closest('[data-open]');
  if (opener) {
    await openPanel(opener.dataset.open);
    return;
  }

  const rhythmTab = event.target.closest('[data-rhythm-tab]');
  if (rhythmTab) {
    sheetContent.innerHTML = await rhythmPanel(rhythmTab.dataset.rhythmTab);
    return;
  }

  const deletion = event.target.closest('[data-delete-schedule]');
  if (deletion) {
    await db.remove('schedules', deletion.dataset.deleteSchedule);
    sheetContent.innerHTML = await rhythmPanel('schedule');
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

sheetContent.addEventListener('submit', async event => {
  event.preventDefault();
  await handleSubmit(event.target);
});
onboardingForm.addEventListener('submit', async event => {
  event.preventDefault();
  await handleSubmit(event.target);
});
onboarding.addEventListener('cancel', event => event.preventDefault());
document.querySelector('#close-sheet').addEventListener('click', () => sheet.close());
sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
document.querySelector('#next-line').addEventListener('click', () => showLine());
document.querySelector('#voice-button').addEventListener('click', speakCurrentLine);
document.querySelector('#beside-button').addEventListener('click', async () => {
  app.classList.add('is-quiet');
  document.querySelector('#quiet-mode').setAttribute('aria-hidden', 'false');
  await showLine({ quiet: true });
  document.querySelector('#quiet-line').textContent = alekLine.textContent;
});
document.querySelector('#leave-quiet').addEventListener('click', () => {
  app.classList.remove('is-quiet');
  document.querySelector('#quiet-mode').setAttribute('aria-hidden', 'true');
});

async function start() {
  await openDatabase();
  await migrateLegacyData();
  engine = await DialogueEngine.create();
  updateClock();
  setInterval(updateClock, 30000);
  setRoom(localStorage.getItem('ryadom:room-v2') || 'living', false);
  const { profile } = await getProfileBundle();
  if (!profile?.onboardingComplete || !profile.name || !profile.region) {
    alekLine.textContent = '最初に、君のことを少し教えて。';
    onboarding.showModal();
  } else {
    await showLine();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

start().catch(error => {
  console.error(error);
  alekLine.textContent = '少し読み込みに失敗したみたい。記録は消していないよ。ページを再読み込みしてみて。';
});
