import { db } from './db.js?v=0.9.0';
import { getProfileBundle } from './profile-service.js';
import { dateTimeLabel, dateTimeLongLabel, emptyState, escapeHtml, localDateTimeValue } from './templates.js?v=0.9.0';

function profileStatus(item) {
  return item.status === 'identified' ? '' : '（辞書未確認）';
}

export async function settingsPanel() {
  const bundle = await getProfileBundle();
  const profile = bundle.profile || { name: '', region: '' };
  return `<form class="form-grid" data-form="settings">
    <label>名前<input name="name" required value="${escapeHtml(profile.name)}"></label>
    <label>地域<input name="region" required value="${escapeHtml(profile.region)}"></label>
    <label>現在使っている薬<textarea name="medications" placeholder="1行に1つ">${escapeHtml(bundle.medications.map(item => item.rawName).join('\n'))}</textarea></label>
    <label>診断されている持病<textarea name="conditions" placeholder="症状ではなく診断名を入力">${escapeHtml(bundle.conditions.map(item => item.rawName).join('\n'))}</textarea></label>
    <p class="medical-note">薬のプロフィールと実際の服用記録、診断された疾患とその日の症状は、それぞれ別に保存されます。</p>
    <button class="primary" type="submit">プロフィールを保存</button>
  </form>
  <section class="data-transfer">
    <h3>データの引き継ぎ</h3>
    <p>プロフィール、薬・持病、服薬・症状・周期の記録、予定、会話と設定をZIPで持ち運べます。</p>
    <div class="transfer-actions">
      <button type="button" data-export-backup>ZIPを書き出す</button>
      <button type="button" data-import-backup>ZIPを読み込む</button>
      <input type="file" data-backup-file accept=".zip,application/zip" hidden>
    </div>
    <p class="transfer-status" data-transfer-status aria-live="polite"></p>
  </section>
  <section class="profile-summary">
    <h3>辞書との照合状態</h3>
    <p><strong>薬：</strong>${bundle.medications.length ? bundle.medications.map(item => `${escapeHtml(item.rawName)}${profileStatus(item)}`).join('、') : '登録なし'}</p>
    <p><strong>持病：</strong>${bundle.conditions.length ? bundle.conditions.map(item => `${escapeHtml(item.rawName)}${profileStatus(item)}`).join('、') : '登録なし'}</p>
  </section>`;
}

export async function medicinePanel() {
  const [bundle, logs] = await Promise.all([getProfileBundle(), db.all('medicationLogs')]);
  const current = bundle.medications.length
    ? bundle.medications.map(item => `<span class="profile-chip${item.status === 'identified' ? '' : ' is-unresolved'}">${escapeHtml(item.rawName)}</span>`).join('')
    : '<span class="profile-chip is-empty">現在の薬は未登録</span>';
  const sortedLogs = logs.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
  return `<section class="current-profile"><small>現在の薬プロフィール</small><div class="profile-chips">${current}</div></section>
    <form class="form-grid" data-form="medicine">
      <label>薬の名前<input name="name" required placeholder="商品名・一般名・成分名"></label>
      <label>用量・規格<input name="dose" placeholder="5mg 1錠 など"></label>
      <label>服用した日時<input type="datetime-local" name="takenAt" value="${localDateTimeValue()}"></label>
      <button class="primary" type="submit">組み合わせを確認</button>
    </form>
    <p class="medical-note">初めての薬は内部辞書と照合し、登録薬との併用、登録疾患への禁忌・重要注意、重大な副作用だけを表示します。</p>
    <div id="medical-result"></div>
    <section class="log-list"><h3>最近の服用記録</h3>${sortedLogs.length ? sortedLogs.map(item =>
      `<article class="log-item"><small>${dateTimeLabel(item.at)}</small><p>${escapeHtml(item.name)}${item.dose ? ` · ${escapeHtml(item.dose)}` : ''}</p></article>`
    ).join('') : emptyState('服用記録はまだないよ。')}</section>`;
}

export async function conditionPanel() {
  const [bundle, logs] = await Promise.all([getProfileBundle(), db.all('symptomLogs')]);
  const conditions = bundle.conditions.length
    ? bundle.conditions.map(item => `<span class="profile-chip${item.status === 'identified' ? '' : ' is-unresolved'}">${escapeHtml(item.rawName)}</span>`).join('')
    : '<span class="profile-chip is-empty">持病は未登録</span>';
  const sortedLogs = logs.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
  return `<section class="current-profile"><small>登録している疾患</small><div class="profile-chips">${conditions}</div></section>
    <form class="form-grid" data-form="condition">
      <label>いまの調子<select name="level"><option value="good">落ち着いている</option><option value="uneasy">少し気になる</option><option value="bad">つらい</option></select></label>
      <label>症状・気分<textarea name="note" placeholder="頭痛、吐き気、息苦しさ、不安など"></textarea></label>
      <label class="pain-toggle"><input type="checkbox" name="hasPain" value="yes" data-pain-toggle><span>痛みの程度も記録する</span></label>
      <div class="pain-scale" data-pain-scale hidden>
        <div><span>痛みなし</span><output data-pain-output>5 / 10</output><span>最も強い痛み</span></div>
        <input type="range" name="pain" min="0" max="10" step="1" value="5" disabled data-pain-range aria-label="痛みの程度">
        <div class="pain-ticks" aria-hidden="true"><span>0</span><span>5</span><span>10</span></div>
      </div>
      <button class="primary" type="submit">症状として記録</button>
    </form>
    <p class="medical-note">ここへ入れた内容は症状ログです。診断された持病プロフィールには追加されません。</p>
    <section class="log-list">${sortedLogs.length ? sortedLogs.map(item =>
      `<article class="log-item"><small>${dateTimeLongLabel(item.at)}</small><p>${escapeHtml(item.note || item.level)}</p>${Number.isInteger(item.pain) ? `<strong class="pain-log">痛み ${item.pain}/10</strong>` : ''}</article>`
    ).join('') : emptyState('症状の記録はまだないよ。')}</section>`;
}

function addDays(dateString, days) {
  if (!dateString) return null;
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 28));
  return date;
}

export async function rhythmPanel(activeTab = 'cycle') {
  const [cycle, schedules, medicationLogs] = await Promise.all([
    db.get('meta', 'cycle-profile'), db.all('schedules'), db.all('medicationLogs')
  ]);
  const tabs = `<nav class="rhythm-tabs">
    <button type="button" data-rhythm-tab="cycle" class="${activeTab === 'cycle' ? 'is-active' : ''}">周期</button>
    <button type="button" data-rhythm-tab="schedule" class="${activeTab === 'schedule' ? 'is-active' : ''}">服薬予定</button>
    <button type="button" data-rhythm-tab="history" class="${activeTab === 'history' ? 'is-active' : ''}">記録</button>
  </nav>`;

  if (activeTab === 'schedule') {
    return tabs + `<div class="rhythm-pane"><form class="form-grid" data-form="schedule">
      <label>薬の名前<input name="name" required></label><label>時刻<input type="time" name="time" required></label>
      <label>用量<input name="dose" placeholder="1錠"></label><button class="primary" type="submit">予定を追加</button>
    </form><div class="schedule-list">${schedules.length ? schedules.sort((a, b) => a.time.localeCompare(b.time)).map(item =>
      `<article class="schedule-item"><span class="schedule-time">${escapeHtml(item.time)}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.dose)}</small></div><button type="button" data-delete-schedule="${escapeHtml(item.id)}" aria-label="削除">×</button></article>`
    ).join('') : emptyState('服薬予定はまだないよ。')}</div></div>`;
  }

  if (activeTab === 'history') {
    const sorted = medicationLogs.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 30);
    return tabs + `<div class="rhythm-pane log-list">${sorted.length ? sorted.map(item =>
      `<article class="log-item"><small>${dateTimeLabel(item.at)}</small><p>${escapeHtml(item.name)}${item.dose ? ` · ${escapeHtml(item.dose)}` : ''}</p></article>`
    ).join('') : emptyState('服用実績はまだないよ。')}</div>`;
  }

  const next = addDays(cycle?.lastStart, cycle?.length);
  return tabs + `<div class="rhythm-pane">
    <section class="summary-card"><small>NEXT CYCLE</small><strong>${next ? next.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }) + 'ごろ' : 'まだ予測できない'}</strong><p>開始日と平均周期からの目安です。</p></section>
    <form class="form-grid" data-form="cycle"><label>直近の開始日<input type="date" name="lastStart" required value="${escapeHtml(cycle?.lastStart || '')}"></label>
      <label>平均周期（日）<input type="number" name="length" min="20" max="60" required value="${escapeHtml(cycle?.length || 28)}"></label>
      <button class="primary" type="submit">周期を保存</button></form></div>`;
}

export async function sayPanel() {
  const messages = (await db.all('messages')).sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(-20);
  return `<div class="chat-history" id="chat-history">${messages.map(item =>
    `<article class="chat-bubble ${item.from === 'user' ? 'user' : ''}">${escapeHtml(item.text)}<small>${dateTimeLabel(item.at)}</small></article>`
  ).join('')}</div><form class="form-grid" data-form="say"><label>アレクに話す<textarea name="note" required placeholder="今日はちょっと疲れた、など"></textarea></label><button class="primary" type="submit">送る</button></form>`;
}
