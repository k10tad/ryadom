const app = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const sheetContent = document.querySelector('#sheet-content');
const alekLine = document.querySelector('#alek-line');
const alekImage = document.querySelector('#alek-image');
const nowAction = document.querySelector('#now-action');
const speechCard = document.querySelector('.speech-card');
let typewriterTimer = null;

const store = {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(`ryadom:${key}`)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(`ryadom:${key}`, JSON.stringify(value)); }
};

const dialogue = [
  'おかえり、レイ。今日はどんな一日だった？',
  '顔を見たら少し安心した。無理はしてない？',
  'ちゃんと休むのも仕事だよ。俺と一緒に、少しゆっくりしよう。',
  '来てくれたんだ。うん、ここにいるよ。',
  'しんどい時は、上手く説明しなくていい。俺がゆっくり聞くから。',
  '頑張ったぶんくらい、ここでは甘えていいんじゃない？'
];

function characterDelay(character) {
  if ('。！？!?'.includes(character)) return 300;
  if ('、，,；;：:'.includes(character)) return 150;
  if ('…'.includes(character)) return 220;
  return 72;
}

function setAlekLine(value, { instant = false } = {}) {
  const text = String(value ?? '');
  window.clearTimeout(typewriterTimer);
  speechCard.classList.remove('is-typing');

  if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    alekLine.textContent = text;
    return;
  }

  alekLine.textContent = '';
  speechCard.classList.add('is-typing');
  let index = 0;
  const writeNext = () => {
    alekLine.textContent += text[index] || '';
    index += 1;
    if (index < text.length) typewriterTimer = window.setTimeout(writeNext, characterDelay(text[index - 1]));
    else speechCard.classList.remove('is-typing');
  };
  writeNext();
}

const panels = {
  rhythm: ['РИТМ · RHYTHM', '身体のリズム'],
  say: ['СКАЖИ · MESSAGE', '何でも話して'],
  condition: ['ПРИЁМ · CHECK-IN', '体調を伝える'],
  medicine: ['ЛЕКАРСТВА · LOG', '服薬を記録'],
  settings: ['НАСТРОЙКИ', 'Рядомの設定']
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function nowLabel(date = new Date()) {
  return date.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function dateLabel(value) {
  if (!value) return '未登録';
  return new Date(`${value}T00:00:00`).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

function nextCycleDate(start, length) {
  if (!start) return null;
  const date = new Date(`${start}T00:00:00`);
  date.setDate(date.getDate() + Number(length || 28));
  return date;
}

function updateClock() {
  const now = new Date();
  document.querySelector('#clock-time').textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  document.querySelector('#clock-date').textContent = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
}

function setRoom(room) {
  const bedroom = room === 'bedroom';
  app.dataset.room = bedroom ? 'bedroom' : 'living';
  alekImage.src = bedroom ? 'assets/alek/alek-bed.jpg' : 'assets/alek/alek-home.jpg';
  alekImage.alt = bedroom ? '寝室で横になるアレク' : 'こちらを見つめるアレク';
  nowAction.textContent = bedroom ? '一緒に休むところ' : 'レイを待ってる';
  document.querySelectorAll('[data-room-button]').forEach(button => button.classList.toggle('is-active', button.dataset.roomButton === app.dataset.room));
  store.set('room', app.dataset.room);
}

function cyclePane() {
  const cycle = store.get('cycleProfile', { lastStart: '', length: 28 });
  const estimate = nextCycleDate(cycle.lastStart, cycle.length);
  return `
    <div class="summary-card">
      <small>NEXT ESTIMATE</small>
      <strong>${estimate ? estimate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }) + 'ごろ' : 'まだ計算できません'}</strong>
      <p>${cycle.lastStart ? `最終開始日 ${escapeHtml(dateLabel(cycle.lastStart))}・周期 ${Number(cycle.length)}日` : '開始日を登録すると、次回の目安を表示します。'}</p>
    </div>
    <form class="form-grid" data-save="cycle">
      <label>今回／直近の開始日<input type="date" name="lastStart" value="${escapeHtml(cycle.lastStart)}" required></label>
      <label>平均周期（日）<input type="number" name="length" min="15" max="60" value="${Number(cycle.length || 28)}" required></label>
      <button class="primary" type="submit">周期を記録する</button>
    </form>
    <p class="medical-note">予測日は目安です。診断や避妊の判断には使用しないでください。</p>`;
}

function schedulePane() {
  const schedules = store.get('medicineSchedules', []);
  const list = schedules.length ? `<div class="schedule-list">${schedules.map(item => `
    <article class="schedule-item">
      <span class="schedule-time">${escapeHtml(item.time)}</span>
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.dose || '用量未登録')}</small></div>
      <button type="button" data-delete-schedule="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)}の予定を削除">×</button>
    </article>`).join('')}</div>` : '<p class="empty-state">服薬予定はまだありません。</p>';
  return `
    <form class="form-grid" data-save="schedule">
      <label>薬の名前<input name="name" autocomplete="off" placeholder="例：ロメリジン" required></label>
      <label>予定時刻<input type="time" name="time" required></label>
      <label>服用量<input name="dose" autocomplete="off" placeholder="例：5mg"></label>
      <button class="primary" type="submit">予定を追加する</button>
    </form>
    ${list}
    <p class="medical-note">ここに保存するのは服薬の予定です。「実際に飲んだ記録」とは別に管理されます。</p>`;
}

function recordsPane() {
  const medicine = store.get('medicineLogs', []).map(item => ({ ...item, kind: '服薬' }));
  const condition = store.get('conditionLogs', []).map(item => ({ ...item, name: item.level, dose: item.note, kind: '体調' }));
  const cycle = store.get('cycleLogs', []).map(item => ({ ...item, name: '生理開始', dose: dateLabel(item.date), kind: '周期' }));
  const records = [...medicine, ...condition, ...cycle].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12);
  return records.length ? `<div class="log-list">${records.map(item => `
    <article class="log-item"><small>${escapeHtml(item.kind)} · ${escapeHtml(nowLabel(new Date(item.at)))}</small><p>${escapeHtml(item.name)}${item.dose ? ` · ${escapeHtml(item.dose)}` : ''}</p></article>`).join('')}</div>` : '<p class="empty-state">記録はまだありません。</p>';
}

function rhythmTemplate(active = 'cycle') {
  const pane = active === 'schedule' ? schedulePane() : active === 'records' ? recordsPane() : cyclePane();
  return `
    <div class="rhythm-tabs" role="tablist" aria-label="身体のリズム">
      <button class="${active === 'cycle' ? 'is-active' : ''}" type="button" data-rhythm-tab="cycle">Цикл<br>周期</button>
      <button class="${active === 'schedule' ? 'is-active' : ''}" type="button" data-rhythm-tab="schedule">Лекарства<br>服薬予定</button>
      <button class="${active === 'records' ? 'is-active' : ''}" type="button" data-rhythm-tab="records">Записи<br>記録</button>
    </div>
    <section class="rhythm-pane">${pane}</section>`;
}

function sayTemplate() {
  const messages = store.get('messages', []);
  const history = messages.length ? messages.map(item => `<div class="chat-bubble ${item.from === 'user' ? 'user' : ''}">${escapeHtml(item.text)}<small>${escapeHtml(nowLabel(new Date(item.at)))}</small></div>`).join('') : '<div class="chat-bubble">来てくれたんだ。今日は何を話す？</div>';
  return `
    <div class="chat-history" id="chat-history">${history}</div>
    <form class="form-grid" data-save="say">
      <label>アレクに伝える<textarea name="note" placeholder="体調のことでも、今日あったことでも" required></textarea></label>
      <button class="primary" type="submit">送る</button>
    </form>`;
}

function formTemplate(type) {
  if (type === 'rhythm') return rhythmTemplate();
  if (type === 'say') return sayTemplate();
  if (type === 'medicine') {
    const schedules = store.get('medicineSchedules', []);
    const options = schedules.map(item => `<option value="${escapeHtml(item.name)}" data-dose="${escapeHtml(item.dose || '')}">${escapeHtml(item.name)} ${escapeHtml(item.time)}</option>`).join('');
    return `<form class="form-grid" data-save="medicine">
      <label>薬の名前<input name="name" list="scheduled-medicines" autocomplete="off" placeholder="例：ロメリジン" required><datalist id="scheduled-medicines">${options}</datalist></label>
      <label>服用量<input name="dose" autocomplete="off" placeholder="任意"></label>
      <button class="primary" type="submit">今飲んだ記録を残す</button>
    </form><p class="medical-note">この試作版は服用記録のみです。薬剤同定・相互作用・禁忌判定はまだ行いません。</p>`;
  }
  if (type === 'condition') return `<form class="form-grid" data-save="condition">
    <label>今の調子<select name="level"><option>落ち着いている</option><option>少し気になる</option><option>つらい</option></select></label>
    <label>症状や気分<textarea name="note" placeholder="アレクに話すように書いてね" required></textarea></label>
    <button class="primary" type="submit">アレクに伝える</button>
  </form>`;
  const profile = store.get('profile', { name: 'レイ', region: '' });
  return `<form class="form-grid" data-save="settings">
    <label>呼び名<input name="name" value="${escapeHtml(profile.name)}" required></label>
    <label>地域<input name="region" value="${escapeHtml(profile.region)}" placeholder="例：大阪府"></label>
    <button class="primary" type="submit">保存する</button>
  </form>`;
}

function bindSheetActions(type) {
  sheetContent.querySelectorAll('[data-rhythm-tab]').forEach(button => button.addEventListener('click', () => {
    sheetContent.innerHTML = rhythmTemplate(button.dataset.rhythmTab);
    bindSheetActions('rhythm');
  }));
  sheetContent.querySelectorAll('[data-delete-schedule]').forEach(button => button.addEventListener('click', () => {
    const schedules = store.get('medicineSchedules', []).filter(item => item.id !== button.dataset.deleteSchedule);
    store.set('medicineSchedules', schedules);
    sheetContent.innerHTML = rhythmTemplate('schedule');
    bindSheetActions('rhythm');
  }));
  sheetContent.querySelector('form')?.addEventListener('submit', event => savePanel(event, event.currentTarget.dataset.save || type));
}

function openPanel(type) {
  if (!panels[type]) return;
  document.querySelector('#sheet-kicker').textContent = panels[type][0];
  document.querySelector('#sheet-title').textContent = panels[type][1];
  sheetContent.innerHTML = formTemplate(type);
  sheet.showModal();
  bindSheetActions(type);
}

function savePanel(event, type) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  if (type === 'cycle') {
    const profile = { lastStart: data.lastStart, length: Number(data.length) };
    store.set('cycleProfile', profile);
    const logs = store.get('cycleLogs', []);
    if (!logs.some(item => item.date === data.lastStart)) logs.push({ date: data.lastStart, at: new Date().toISOString() });
    store.set('cycleLogs', logs);
    setAlekLine('周期を記録したよ。予定日は目安にして、変化があったらまた教えて。');
    sheetContent.innerHTML = rhythmTemplate('cycle');
    bindSheetActions('rhythm');
    return;
  }
  if (type === 'schedule') {
    const schedules = store.get('medicineSchedules', []);
    schedules.push({ id: `${Date.now()}`, name: data.name.trim(), time: data.time, dose: data.dose.trim() });
    store.set('medicineSchedules', schedules);
    setAlekLine(`${data.name.trim()}は${data.time}だね。予定として覚えておくよ。`);
    sheetContent.innerHTML = rhythmTemplate('schedule');
    bindSheetActions('rhythm');
    return;
  }
  if (type === 'medicine') {
    const logs = store.get('medicineLogs', []);
    logs.push({ name: data.name.trim(), dose: data.dose.trim(), at: new Date().toISOString() });
    store.set('medicineLogs', logs);
    setAlekLine(`${data.name.trim()}、今飲んだ記録を残したよ。教えてくれてありがとう。`);
  } else if (type === 'condition') {
    const logs = store.get('conditionLogs', []);
    logs.push({ level: data.level, note: data.note.trim(), at: new Date().toISOString() });
    store.set('conditionLogs', logs);
    setAlekLine('うん、聞いたよ。今は無理に平気な顔をしなくていいからね。');
  } else if (type === 'say') {
    const messages = store.get('messages', []);
    const response = dialogue[Math.floor(Math.random() * dialogue.length)];
    const at = new Date().toISOString();
    messages.push({ from: 'user', text: data.note.trim(), at }, { from: 'alek', text: response, at: new Date().toISOString() });
    store.set('messages', messages);
    setAlekLine(response);
    sheetContent.innerHTML = sayTemplate();
    bindSheetActions('say');
    requestAnimationFrame(() => { const history = document.querySelector('#chat-history'); if (history) history.scrollTop = history.scrollHeight; });
    return;
  } else {
    store.set('profile', { name: data.name.trim() || 'レイ', region: data.region.trim() });
    setAlekLine(`分かった。これからも、${data.name.trim() || 'レイ'}って呼ぶね。`);
  }
  sheetContent.innerHTML = '<p class="saved-message">うん、受け取ったよ。<br>教えてくれてありがとう。</p>';
}

function speakCurrentLine() {
  const src = app.dataset.room === 'bedroom' ? 'voice/alek-bed-01.mp3' : 'voice/alek-home-01.mp3';
  const audio = new Audio(src);
  let fellBack = false;
  const fallback = () => {
    if (fellBack || !('speechSynthesis' in window)) return;
    fellBack = true;
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

document.querySelectorAll('[data-room-button]').forEach(button => button.addEventListener('click', () => setRoom(button.dataset.roomButton)));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openPanel(button.dataset.open)));
document.querySelector('#close-sheet').addEventListener('click', () => sheet.close());
sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
document.querySelector('#next-line').addEventListener('click', () => setAlekLine(dialogue[Math.floor(Math.random() * dialogue.length)]));
document.querySelector('#voice-button').addEventListener('click', speakCurrentLine);
document.querySelector('#beside-button').addEventListener('click', () => { app.classList.add('is-quiet'); document.querySelector('#quiet-mode').setAttribute('aria-hidden', 'false'); });
document.querySelector('#leave-quiet').addEventListener('click', () => { app.classList.remove('is-quiet'); document.querySelector('#quiet-mode').setAttribute('aria-hidden', 'true'); });
document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-nav]').forEach(item => item.classList.toggle('is-active', item === button));
  if (button.dataset.nav === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
}));

updateClock();
setInterval(updateClock, 30000);
setRoom(store.get('room', 'living'));
setAlekLine(alekLine.textContent);
