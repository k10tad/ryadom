import { calendarMonth, dateKey } from './menstrual-service.js?v=1.9.6';
import { emptyState, escapeHtml } from './templates.js?v=0.9.0';

function confidenceText(tracker) {
  if (tracker.confidence === 'provisional') return 'まだ記録が少ないから、今は28日周期・5日間で仮に出してる。何回か記録してくれたら、{{user}}の周期に合わせて計算し直すよ。';
  if (tracker.confidence === 'low') return `周期に${tracker.spread}日くらい幅があるな。無理に一日に決めず、この辺りって見ておく方がよさそう。`;
  return `過去${tracker.intervalCount + 1}周期の中央値で計算中。平均周期は${tracker.cycleLength}日、生理期間は${tracker.periodDuration}日くらいだな。`;
}

function requestedMonth(value) {
  if (/^\d{4}-\d{2}$/.test(value || '')) {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1, 12);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 12);
}

function dayCell(date, first, markers, selectedDate) {
  const key = dateKey(date);
  const actual = markers.menstrual.has(key);
  const marks = [
    actual ? '<i class="cycle-symbol drop actual"></i>' : '',
    !actual && markers.predictions.has(key) ? '<i class="cycle-symbol drop predicted"></i>' : '',
    markers.pms.has(key) ? '<i class="cycle-symbol bud"></i>' : '',
    markers.ovulation.has(key) ? '<i class="cycle-symbol flower"></i>' : ''
  ].join('');
  return `<button type="button" class="cycle-day${date.getMonth() !== first.getMonth() ? ' is-outside' : ''}${key === selectedDate ? ' is-selected' : ''}${key === dateKey() ? ' is-today' : ''}" data-cycle-date="${key}" aria-label="${date.getMonth() + 1}月${date.getDate()}日"><span>${date.getDate()}</span><b>${marks}</b></button>`;
}

function cycleTabs() {
  return `<nav class="rhythm-tabs"><button type="button" data-rhythm-tab="cycle" class="is-active">周期</button><button type="button" data-rhythm-tab="schedule">服薬予定</button><button type="button" data-rhythm-tab="history">記録</button></nav>`;
}

export async function cycleTrackerPanel(options = {}) {
  const display = requestedMonth(options.month);
  const { tracker, first, gridStart, markers } = await calendarMonth(display.getFullYear(), display.getMonth());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(date.getDate() + index);
    return dayCell(date, first, markers, options.selectedDate);
  }).join('');
  const previous = new Date(first.getFullYear(), first.getMonth() - 1, 1, 12);
  const next = new Date(first.getFullYear(), first.getMonth() + 1, 1, 12);
  const edit = options.editId ? tracker.records.find(item => item.id === options.editId) : null;
  const nextLabel = tracker.nextStart ? new Date(`${tracker.nextStart}T12:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }) + 'ごろ' : 'まだ予測できない';
  const history = [...tracker.records].reverse();
  const selected = options.selectedDate ? `<section class="selected-cycle-date"><small>選択中</small><strong>${new Date(`${options.selectedDate}T12:00:00`).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</strong><p>この日を開始日か終了日として記録できるよ。</p><div><button type="button" data-cycle-boundary="start" data-cycle-selected="${options.selectedDate}">生理開始</button><button type="button" data-cycle-boundary="end" data-cycle-selected="${options.selectedDate}">生理終了</button></div></section>` : '';

  return cycleTabs() + `<div class="rhythm-pane cycle-tracker">
    <section class="summary-card cycle-summary"><small>NEXT CYCLE</small><strong>${nextLabel}</strong><p>${confidenceText(tracker)}</p></section>
    <section class="cycle-calendar" data-cycle-month="${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}">
      <header><button type="button" data-cycle-month-nav="${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}" aria-label="前の月">‹</button><h3>${first.getFullYear()}年 ${first.getMonth() + 1}月</h3><button type="button" data-cycle-month-nav="${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}" aria-label="次の月">›</button></header>
      <div class="cycle-weekdays"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div><div class="cycle-days">${days}</div>
    </section>
    <div class="cycle-legend"><p><i class="cycle-symbol drop actual"></i><span><strong>生理中</strong><small>濃いしずくは記録済み、淡いしずくは予測だよ。</small></span></p><p><i class="cycle-symbol bud"></i><span><strong>PMS期</strong><small>生理前の不調が出やすい時期の目安。</small></span></p><p><i class="cycle-symbol flower"></i><span><strong>排卵日予測</strong><small>花の日は推定。ぴったり確定する日付じゃないからな。</small></span></p></div>
    ${selected}
    <section class="cycle-entry"><h3>${edit ? '周期記録を修正' : '過去の周期を追加'}</h3><p>${edit ? '日付を直したら、その記録を使って予測も組み直すよ。' : '前の分も覚えてる範囲で大丈夫。記録が増えれば、そのぶん予測も{{user}}向けになる。'}</p><form class="form-grid" data-form="cycle-record"><input type="hidden" name="id" value="${escapeHtml(edit?.id || '')}"><label>生理開始日<input type="date" name="startDate" required value="${escapeHtml(edit?.startDate || '')}"></label><label>生理終了日<input type="date" name="endDate" value="${escapeHtml(edit?.endDate || '')}"><small>まだ続いているなら空欄でいいよ。</small></label><div class="form-actions"><button class="primary" type="submit">${edit ? '変更を保存' : '周期を追加'}</button>${edit ? '<button class="secondary" type="button" data-cancel-cycle-edit>キャンセル</button>' : ''}</div></form></section>
    <details class="cycle-settings"><summary>予測の設定</summary><form class="form-grid" data-form="cycle-settings"><label>PMS期を生理予定日の何日前から表示する？<input type="number" name="pmsDays" min="3" max="10" value="${tracker.pmsDays}"></label><button class="primary" type="submit">設定を保存</button></form></details>
    <p class="cycle-disclaimer">このカレンダーは記録からの目安な。排卵日の確定や避妊、診断には使えない。いつもより強い痛み、失神しそうな感じ、かなり多い出血があるなら、日付より身体を優先して受診しよう。</p>
    <section class="cycle-history"><h3>過去のサイクル</h3>${history.length ? history.map(item => `<article><span><strong>${new Date(`${item.startDate}T12:00:00`).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}</strong><small>${item.endDate ? `〜 ${new Date(`${item.endDate}T12:00:00`).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}` : '進行中・終了日未登録'}</small></span><span><button type="button" data-edit-cycle="${escapeHtml(item.id)}">編集</button><button type="button" data-delete-cycle="${escapeHtml(item.id)}">削除</button></span></article>`).join('') : emptyState('周期記録はまだないよ。')}</section>
  </div>`;
}
