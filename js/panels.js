import { db } from './db.js?v=0.9.0';
import { getProfileBundle } from './profile-service.js';
import { dateTimeLabel, dateTimeLongLabel, emptyState, escapeHtml, localDateTimeValue } from './templates.js?v=0.9.0';
import { baselineDifference, healthOverview } from './health-context.js?v=1.5.0';

function profileStatus(item) {
  return item.status === 'identified' ? '' : '（辞書未確認）';
}

export async function settingsPanel() {
  const bundle = await getProfileBundle();
  const profile = bundle.profile || { name: '', region: '' };
  return `<section class="settings-intro"><small>PROFILE & AREA</small><p>名前、登録薬、既往歴、天気を確認する地域をここで変更できます。過去の服薬・症状記録は消えません。</p></section>
  <form class="form-grid" data-form="settings">
    <label>名前<input name="name" required value="${escapeHtml(profile.name)}"></label>
    <label>天気・気圧を表示する地域<input name="region" required value="${escapeHtml(profile.region)}" placeholder="市 または 都道府県></label>
    <small class="field-help">市まで入力すると、より正確な気象データを取得できます。</small>
    <label>常時服用している薬・現在使っている薬<textarea name="medications" placeholder="1行に1つ">${escapeHtml(bundle.medications.map(item => item.rawName).join('\n'))}</textarea></label>
    <label>既往歴・診断されている持病<textarea name="conditions" placeholder="症状ではなく診断名を1行に1つ">${escapeHtml(bundle.conditions.map(item => item.rawName).join('\n'))}</textarea></label>
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
    ? bundle.medications.map(item => `<button class="profile-chip${item.status === 'identified' ? '' : ' is-unresolved'}" type="button" data-medication-preset="${escapeHtml(item.rawName)}" aria-pressed="false">${escapeHtml(item.rawName)}</button>`).join('')
    : '<span class="profile-chip is-empty">現在の薬は未登録</span>';
  const sortedLogs = logs.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
  return `<section class="current-profile"><small>現在の薬プロフィール</small><div class="profile-chips">${current}</div>${bundle.medications.length ? '<p class="profile-preset-help">薬名を押すと、下の入力欄に入ります。</p>' : ''}</section>
    <form class="form-grid" data-form="medicine">
      <label>薬の名前<input name="name" required placeholder=""成分名、または商品名" autocomplete="off"></label>
      <label>用量・規格<input name="dose" placeholder="5mg 1錠 など"></label>
      <label>服用した日時<input type="datetime-local" name="takenAt" value="${localDateTimeValue()}"></label>
      <button class="primary" type="submit">組み合わせを確認</button>
    </form>
    <p class="medical-note">シリーズ名だけでも検索できます。種類で成分が異なる場合は、候補から箱と同じ商品名を選んでください。</p>
    <div id="medical-result"></div>
    <section class="log-list"><h3>最近の服用記録</h3>${sortedLogs.length ? sortedLogs.map(item =>
      `<article class="log-item"><small>${dateTimeLabel(item.at)}</small><p>${escapeHtml(item.name)}${item.dose ? ` · ${escapeHtml(item.dose)}` : ''}</p></article>`
    ).join('') : emptyState('服用記録はまだないよ。')}</section>`;
}

export async function conditionPanel(editId = null, activeTab = 'record') {
  const [bundle, logs] = await Promise.all([getProfileBundle(), db.all('symptomLogs')]);
  const editing = editId ? logs.find(item => item.id === editId) : null;
  const conditions = bundle.conditions.length
    ? bundle.conditions.map(item => `<span class="profile-chip${item.status === 'identified' ? '' : ' is-unresolved'}">${escapeHtml(item.rawName)}</span>`).join('')
    : '<span class="profile-chip is-empty">持病は未登録</span>';
  const sortedLogs = logs.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
  const level = editing?.level || 'good';
  const painEnabled = Number.isInteger(editing?.pain);
  const pain = painEnabled ? editing.pain : 5;
  const tabs = `<nav class="condition-tabs"><button type="button" data-condition-tab="record" class="${activeTab === 'record' ? 'is-active' : ''}">記録</button><button type="button" data-condition-tab="course" class="${activeTab === 'course' ? 'is-active' : ''}">経過</button><button type="button" data-condition-tab="report" class="${activeTab === 'report' ? 'is-active' : ''}">受診まとめ</button></nav>`;
  if (activeTab === 'course') return tabs + await courseView();
  if (activeTab === 'report') return tabs + await reportView(bundle);
  return tabs + `<section class="current-profile"><small>登録している疾患</small><div class="profile-chips">${conditions}</div></section>
    ${editing ? '<p class="edit-banner">この症状記録を編集中。保存すると同じ記録へ上書きするよ。</p>' : ''}
    <form class="form-grid" data-form="condition">
      <input type="hidden" name="id" value="${escapeHtml(editing?.id || '')}">
      <label>記録日時<input type="datetime-local" name="at" value="${localDateTimeValue(editing?.at ? new Date(editing.at) : new Date())}"></label>
      <label>いまの調子<select name="level"><option value="good" ${level === 'good' ? 'selected' : ''}>落ち着いている</option><option value="uneasy" ${level === 'uneasy' ? 'selected' : ''}>少し気になる</option><option value="bad" ${level === 'bad' ? 'selected' : ''}>つらい</option></select></label>
      <label>症状・気分<textarea name="note" placeholder="頭痛、吐き気、息苦しさ、不安など">${escapeHtml(editing?.note || '')}</textarea></label>
      <label class="pain-toggle"><input type="checkbox" name="hasPain" value="yes" data-pain-toggle ${painEnabled ? 'checked' : ''}><span>痛みの程度も記録する</span></label>
      <div class="pain-scale" data-pain-scale ${painEnabled ? '' : 'hidden'}>
        <div><span>痛みなし</span><output data-pain-output>${pain} / 10</output><span>最も強い痛み</span></div>
        <input type="range" name="pain" min="0" max="10" step="1" value="${pain}" ${painEnabled ? '' : 'disabled'} data-pain-range aria-label="痛みの程度">
        <div class="pain-ticks" aria-hidden="true"><span>0</span><span>5</span><span>10</span></div>
      </div>
      <div class="form-actions"><button class="primary" type="submit">${editing ? '変更を保存' : '症状として記録'}</button>${editing ? '<button class="secondary" type="button" data-cancel-symptom-edit>キャンセル</button>' : ''}</div>
    </form>
    <p class="medical-note">ここへ入れた内容は症状ログです。診断された持病プロフィールには追加されません。</p>
    <section class="log-list">${sortedLogs.length ? sortedLogs.map(item =>
      `<article class="log-item"><div class="log-item-head"><small>${dateTimeLongLabel(item.at)}</small><span class="log-actions"><button type="button" data-edit-symptom="${escapeHtml(item.id)}">編集</button><button type="button" data-delete-symptom="${escapeHtml(item.id)}">削除</button></span></div><p>${escapeHtml(item.note || item.level)}</p>${Number.isInteger(item.pain) ? `<strong class="pain-log">痛み ${item.pain}/10</strong>` : ''}${measurementLine(item)}</article>`
    ).join('') : emptyState('症状の記録はまだないよ。')}</section>`;
}

function measurementLine(item) {
  const values = [];
  if (Number.isFinite(Number(item.temperature))) values.push(`${Number(item.temperature)}℃`);
  if (Number.isFinite(Number(item.systolic)) && Number.isFinite(Number(item.diastolic))) values.push(`血圧 ${item.systolic}/${item.diastolic}`);
  if (Number.isFinite(Number(item.pulse))) values.push(`脈 ${item.pulse}/分`);
  return values.length ? `<small class="measurement-line">${values.join(' · ')}</small>` : '';
}

async function courseView() {
  const overview = await healthOverview();
  return `<div class="course-view"><section class="summary-card"><small>PERSONAL BASELINE</small><strong>レイの記録から見る平常値</strong><p>${baselineText(overview.baselines)}</p></section>${overview.patterns.length ? `<section class="insight-card"><h3>関連の候補</h3>${overview.patterns.map(text => `<p>${escapeHtml(text)}</p>`).join('')}</section>` : ''}<section class="episode-list">${overview.episodes.length ? overview.episodes.slice(0, 12).map(episode => {
    const latest = episode.logs[0];
    const first = episode.logs[episode.logs.length - 1];
    const difference = baselineDifference(latest, overview.baselines);
    return `<article class="episode-card ${episode.status === 'active' ? 'is-active' : ''}"><header><div><small>${dateTimeLongLabel(first.at)} から</small><strong>${escapeHtml(latest.note || latest.kind || '症状')}</strong></div><span>${episode.status === 'active' ? '経過中' : '終了'}</span></header><p>${episode.logs.length}件の記録${difference ? ` · ${escapeHtml(difference)}` : ''}</p><div class="episode-timeline">${episode.logs.slice().reverse().map(log => `<div><i></i><small>${dateTimeLabel(log.at)}</small><span>${escapeHtml(log.note || log.level)}</span></div>`).join('')}</div><button type="button" data-episode-status="${episode.status === 'active' ? 'closed' : 'active'}" data-episode-id="${escapeHtml(episode.id)}">${episode.status === 'active' ? '改善・終了として閉じる' : '経過を再開する'}</button></article>`;
  }).join('') : emptyState('経過としてまとめられた症状はまだないよ。')}</section></div>`;
}

async function reportView(bundle) {
  const overview = await healthOverview();
  const recent = overview.symptoms.slice(0, 12);
  return `<article class="visit-report" id="visit-report"><header><small>VISIT SUMMARY</small><h3>受診時に見せるまとめ</h3><p>${new Date().toLocaleString('ja-JP')} 作成</p></header><section><h4>登録情報</h4><p><strong>既往歴：</strong>${bundle.conditions.length ? bundle.conditions.map(x => escapeHtml(x.rawName)).join('、') : '登録なし'}</p><p><strong>常用薬：</strong>${bundle.medications.length ? bundle.medications.map(x => escapeHtml(x.rawName)).join('、') : '登録なし'}</p></section><section><h4>個人基準</h4><p>${baselineText(overview.baselines)}</p></section><section><h4>最近の症状と経過</h4>${recent.length ? recent.map(log => `<div class="report-row"><strong>${dateTimeLongLabel(log.at)}</strong><span>${escapeHtml(log.note || log.level)}${Number.isInteger(log.pain) ? `（痛み${log.pain}/10）` : ''}</span>${measurementLine(log)}${contextLine(log)}</div>`).join('') : '<p>記録なし</p>'}</section>${overview.patterns.length ? `<section><h4>関連候補</h4>${overview.patterns.map(x => `<p>${escapeHtml(x)}</p>`).join('')}</section>` : ''}<p class="medical-note">この画面は診断ではありません。気圧・周期・服薬との表示は時系列上の候補で、因果関係を断定しません。</p></article><button class="primary report-copy" type="button" data-copy-report>まとめをコピー</button>`;
}

function baselineText(base) {
  const items = [];
  if (Number.isFinite(base.temperature)) items.push(`体温 ${base.temperature.toFixed(1)}℃`);
  if (Number.isFinite(base.systolic) && Number.isFinite(base.diastolic)) items.push(`血圧 ${Math.round(base.systolic)}/${Math.round(base.diastolic)}mmHg`);
  if (Number.isFinite(base.pulse)) items.push(`脈拍 ${Math.round(base.pulse)}/分`);
  return items.length ? `直近30件の中央値：${items.join('、')}` : '測定値が増えると、レイ自身の中央値をここに表示します。';
}

function contextLine(log) {
  const parts = [];
  if (Number.isFinite(Number(log.context?.weather?.pressure))) parts.push(`気圧 ${Math.round(log.context.weather.pressure)}hPa`);
  if (log.context?.cycle?.label) parts.push(log.context.cycle.label);
  if (log.context?.nearbyMedication?.length) parts.push(`前後6時間の服薬：${log.context.nearbyMedication.map(x => x.name).join('、')}`);
  return parts.length ? `<small>${escapeHtml(parts.join(' · '))}</small>` : '';
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

export async function sayPanel({ typing = false, editId = null } = {}) {
  const messages = (await db.all('messages')).sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(-20);
  const editing = editId ? messages.find(item => item.id === editId && item.from === 'user') : null;
  return `<section class="chat-app">
    <header class="chat-contact"><span class="chat-avatar" aria-hidden="true">A</span><span><strong>Алек</strong><small><i></i>そばにいる</small></span></header>
    <div class="chat-history" id="chat-history">${messages.map(item =>
      `<div class="chat-message ${item.from === 'user' ? 'user' : 'alek'}" data-message-id="${escapeHtml(item.id)}"><div class="chat-message-body"><article class="chat-bubble${item.kind === 'symptom-care' ? ' care' : ''}${item.kind === 'emotional-care' ? ' emotional-care' : ''}${item.urgent ? ' urgent' : ''}">${item.kind === 'symptom-care' ? '<p class="care-label">SYMPTOM CARE</p>' : ''}${item.kind === 'emotional-care' ? '<p class="care-label">EMOTIONAL CARE</p>' : ''}<p>${escapeHtml(item.text)}</p><small>${dateTimeLabel(item.at)}${item.editedAt ? '<span class="chat-edited-state">編集済み</span>' : ''}${item.from === 'user' ? `<span class="chat-read-state">${item.readAt ? '既読' : '送信済み'}</span>` : ''}</small></article>${item.from === 'user' ? `<div class="chat-message-actions"><button type="button" data-edit-message="${escapeHtml(item.id)}">編集</button><button type="button" data-delete-message="${escapeHtml(item.id)}">削除</button></div>` : ''}</div></div>`
    ).join('')}${typing ? '<div class="chat-message alek is-typing"><article class="chat-bubble typing-bubble" aria-label="アレクが入力中"><span></span><span></span><span></span><small>入力中</small></article></div>' : ''}</div>
    <form class="chat-composer${editing ? ' is-editing' : ''}" data-form="say">${editing ? `<div class="chat-edit-banner"><span>メッセージを編集中</span><button type="button" data-cancel-message-edit>キャンセル</button></div><input type="hidden" name="editId" value="${escapeHtml(editing.id)}">` : ''}<label><span class="visually-hidden">アレクに話す</span><textarea name="note" required rows="1" placeholder="メッセージを入力">${editing ? escapeHtml(editing.text) : ''}</textarea></label><button type="submit" aria-label="${editing ? '編集を保存' : '送る'}">${editing ? '✓' : '↑'}</button></form>
    <small class="chat-help">問診を終えるときは「キャンセル」と送ってね。測定値は症状記録にも残ります。</small>
  </section>`;
}
