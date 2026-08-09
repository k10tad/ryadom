const app = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const sheetContent = document.querySelector('#sheet-content');
const alekLine = document.querySelector('#alek-line');
const alekImage = document.querySelector('#alek-image');
const nowAction = document.querySelector('#now-action');

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

const panels = {
  condition: ['Приём', '体調を伝える'],
  medicine: ['Лекарства', '薬の記録'],
  diary: ['Дневник', '今日の記録'],
  dialog: ['Диалог', 'アレクと話す'],
  settings: ['Настройки', 'Рядомの設定']
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function nowLabel(date = new Date()) {
  return date.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function updateClock() {
  const now = new Date();
  document.querySelector('#clock-time').textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  document.querySelector('#clock-date').textContent = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
}

function updateMedicineSummary() {
  const logs = store.get('medicineLogs', []);
  const today = new Date().toDateString();
  const todayLogs = logs.filter(log => new Date(log.at).toDateString() === today);
  document.querySelector('#medicine-summary').textContent = todayLogs.length ? `${todayLogs.length}件 記録済み` : '今日はまだ未記録';
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

function formTemplate(type) {
  if (type === 'medicine') return `
    <form class="form-grid" data-save="medicine">
      <label>薬の名前<input name="name" autocomplete="off" placeholder="例：ロメリジン" required></label>
      <label>服用量<input name="dose" autocomplete="off" placeholder="任意"></label>
      <button class="primary" type="submit">服薬を記録する</button>
    </form>
    <p class="medical-note">この試作版は服用記録のみです。薬剤同定・相互作用・禁忌判定はまだ行いません。</p>`;
  if (type === 'condition') return `
    <form class="form-grid" data-save="condition">
      <label>今の調子
        <select name="level"><option>落ち着いている</option><option>少し気になる</option><option>つらい</option></select>
      </label>
      <label>症状や気分<textarea name="note" placeholder="アレクに話すように書いてね" required></textarea></label>
      <button class="primary" type="submit">アレクに伝える</button>
    </form>`;
  if (type === 'diary') {
    const logs = store.get('dailyLogs', []).slice().reverse().slice(0, 6);
    return `<form class="form-grid" data-save="diary">
      <label>今日の記録<textarea name="note" placeholder="体調や出来事を残す" required></textarea></label>
      <button class="primary" type="submit">記録を残す</button>
    </form>${logs.length ? `<div class="log-list">${logs.map(log => `<article class="log-item"><small>${escapeHtml(nowLabel(new Date(log.at)))}</small><p>${escapeHtml(log.note)}</p></article>`).join('')}</div>` : ''}`;
  }
  if (type === 'dialog') return `
    <form class="form-grid" data-save="dialog">
      <label>メッセージ<textarea name="note" placeholder="アレクに話しかける" required></textarea></label>
      <button class="primary" type="submit">送る</button>
    </form>`;
  const profile = store.get('profile', { name: 'レイ', region: '' });
  return `<form class="form-grid" data-save="settings">
    <label>呼び名<input name="name" value="${escapeHtml(profile.name)}" required></label>
    <label>地域<input name="region" value="${escapeHtml(profile.region)}" placeholder="例：大阪府"></label>
    <button class="primary" type="submit">保存する</button>
  </form>`;
}

function openPanel(type) {
  if (!panels[type]) return;
  document.querySelector('#sheet-kicker').textContent = panels[type][0];
  document.querySelector('#sheet-title').textContent = panels[type][1];
  sheetContent.innerHTML = formTemplate(type);
  sheet.showModal();
  sheetContent.querySelector('form')?.addEventListener('submit', event => savePanel(event, type));
}

function savePanel(event, type) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  if (type === 'medicine') {
    const logs = store.get('medicineLogs', []);
    logs.push({ name: data.name.trim(), dose: data.dose.trim(), at: new Date().toISOString() });
    store.set('medicineLogs', logs);
    updateMedicineSummary();
    alekLine.textContent = `${data.name.trim()}、記録したよ。教えてくれてありがとう。`;
  } else if (type === 'condition') {
    const logs = store.get('conditionLogs', []);
    logs.push({ level: data.level, note: data.note.trim(), at: new Date().toISOString() });
    store.set('conditionLogs', logs);
    alekLine.textContent = 'うん、聞いたよ。今は無理に平気な顔をしなくていいからね。';
  } else if (type === 'diary') {
    const logs = store.get('dailyLogs', []);
    logs.push({ note: data.note.trim(), at: new Date().toISOString() });
    store.set('dailyLogs', logs);
    alekLine.textContent = '今日のこと、ちゃんと預かったよ。お疲れさま。';
  } else if (type === 'dialog') {
    alekLine.textContent = dialogue[Math.floor(Math.random() * dialogue.length)];
  } else {
    store.set('profile', { name: data.name.trim() || 'レイ', region: data.region.trim() });
    alekLine.textContent = `分かった。これからも、${data.name.trim() || 'レイ'}って呼ぶね。`;
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
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('is-active', item === button));
  if (button.dataset.tab === 'home') return;
  openPanel(button.dataset.tab);
}));
document.querySelector('#close-sheet').addEventListener('click', () => sheet.close());
sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
document.querySelector('#next-line').addEventListener('click', () => { alekLine.textContent = dialogue[Math.floor(Math.random() * dialogue.length)]; });
document.querySelector('#voice-button').addEventListener('click', speakCurrentLine);
document.querySelector('#beside-button').addEventListener('click', () => { app.classList.add('is-quiet'); document.querySelector('#quiet-mode').setAttribute('aria-hidden', 'false'); });
document.querySelector('#leave-quiet').addEventListener('click', () => { app.classList.remove('is-quiet'); document.querySelector('#quiet-mode').setAttribute('aria-hidden', 'true'); });

updateClock();
setInterval(updateClock, 30000);
updateMedicineSummary();
setRoom(store.get('room', 'living'));
