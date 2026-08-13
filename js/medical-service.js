import { loadKnowledge, resolveDrug } from './knowledge-service.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

function alekTone(value = '') {
  return String(value)
    .replace(/自己判断で併用しないでください。?/g, '自己判断では一緒に飲まないで。')
    .replace(/同時に扱わず/g, '一緒には飲まず')
    .replace(/併用しないでください。?/g, '一緒には飲まないで。')
    .replace(/服用できません。?/g, 'これは飲めないよ。')
    .replace(/服用しないでください。?/g, '飲まないで。')
    .replace(/避けてください。?/g, '避けよう。')
    .replace(/注意してください。?/g, '気をつけて。')
    .replace(/確認してください。?/g, '確認しよう。')
    .replace(/相談してください。?/g, '相談しよう。')
    .replace(/必要です。?/g, '必要だよ。')
    .replace(/該当し得ます。?/g, '当てはまることがある。')
    .replace(/あります。?/g, 'あるよ。')
    .replace(/です。?/g, 'だよ。');
}

function componentIds(drug) {
  return new Set([drug.id, ...(drug.components || [])]);
}

function registeredIds(bundle, byId) {
  const ids = new Set();
  for (const entry of bundle.medications || []) {
    if (!entry.drugId) continue;
    ids.add(entry.drugId);
    for (const component of byId.get(entry.drugId)?.components || []) ids.add(component);
  }
  return ids;
}

export async function evaluateMedication(rawName, profileBundle) {
  const [{ drugs, interactions }, resolution] = await Promise.all([loadKnowledge(), resolveDrug(rawName)]);
  if (resolution.status === 'ambiguous') {
    return {
      identified: false,
      status: 'ambiguous',
      query: rawName,
      candidates: resolution.candidates.slice(0, 16),
      alek: '同じシリーズでも中身が違うんだ。箱と同じ名前を選んで。ここは俺も勘で決めないよ。'
    };
  }
  if (resolution.status !== 'identified') {
    return {
      identified: false,
      status: 'unknown',
      query: rawName,
      candidates: [],
      alek: 'その名前では特定できなかった。箱に書かれた正式な商品名をもう一度見せて。'
    };
  }

  const drug = resolution.item;
  const byId = new Map((drugs.items || []).map(item => [item.id, item]));
  const selected = componentIds(drug);
  const registered = registeredIds(profileBundle, byId);
  const foundInteractions = (interactions.items || []).filter(rule =>
    (selected.has(rule.a) && registered.has(rule.b)) || (selected.has(rule.b) && registered.has(rule.a))
  );
  const duplicateComponents = [...selected].filter(id => id !== drug.id && registered.has(id));
  const conditionIds = new Set((profileBundle.conditions || []).map(item => item.conditionId).filter(Boolean));
  const conditionWarnings = [drug, ...(drug.components || []).map(id => byId.get(id)).filter(Boolean)]
    .flatMap(item => item.conditionWarnings || [])
    .filter(warning => conditionIds.has(warning.conditionId));
  const isRegistered = (profileBundle.medications || []).some(item => item.drugId === drug.id);

  const hasAlerts = foundInteractions.length || duplicateComponents.length || conditionWarnings.length;
  return {
    identified: true,
    status: 'identified',
    drug,
    isRegistered,
    interactions: foundInteractions,
    duplicates: duplicateComponents.map(id => byId.get(id)?.name || id),
    conditionWarnings,
    alek: hasAlerts
      ? 'ちょっと待って。見逃したくない注意があるから、飲む前に一緒に見ておこう。'
      : '辞書では特定できたよ。箱の用法・用量も一緒に確認してから記録しよう。'
  };
}

export function renderMedicationAssessment(result) {
  if (result.status === 'ambiguous') {
    return `<section class="medical-assessment is-ambiguous"><h3>どの商品か選んで</h3><p>「${escapeHtml(result.query)}」は、種類によって中身が違うんだ。</p><div class="drug-candidates">${result.candidates.map(item =>
      `<button type="button" class="drug-candidate" data-select-drug="${escapeHtml(item.name)}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.otc?.category || item.name)}</small></button>`
    ).join('')}</div><p class="medical-note">同じものがなければ、箱の商品名を省略せずに入れてみて。</p></section>`;
  }
  if (!result.identified) {
    return `<section class="medical-assessment is-unresolved"><h3>まだ薬を特定できないな</h3><p>${escapeHtml(result.query)}</p><p>シリーズ名や末尾の英字、それから錠・顆粒・カプセルまで、箱を見ながら確かめよう。</p></section>`;
  }

  const drug = result.drug;
  const ingredients = drug.ingredientLabels?.length
    ? `<p><strong>主な有効成分：</strong>${drug.ingredientLabels.map(escapeHtml).join('、')}</p>` : '';
  const flags = [
    drug.otc?.classification,
    drug.otc?.drowsiness ? '眠気・運転注意' : '',
    drug.otc?.abusePrevention ? '指定濫用防止医薬品' : ''
  ].filter(Boolean).map(x => `<span class="profile-chip is-unresolved">${escapeHtml(x)}</span>`).join('');
  const alerts = [
    ...result.duplicates.map(name => `<li><strong>${escapeHtml(name)}が重なってる。</strong><br>登録してある薬にも同じ成分が入ってる。これは追加で飲まず、間隔と一日の総量を確認しよう。</li>`),
    ...result.interactions.map(item => `<li><strong>${escapeHtml(item.label)}：</strong>${escapeHtml(alekTone(item.message))}</li>`),
    ...result.conditionWarnings.map(item => `<li><strong>持病との相性も確認しよう：</strong>${escapeHtml(alekTone(item.message))}</li>`)
  ];
  const cautions = (drug.importantWarnings || []).map(item => `<li>${escapeHtml(alekTone(item))}</li>`).join('');
  const assessment = alerts.length
    ? `<div class="medical-alert"><strong>ここは一緒に確認しよう</strong><ul>${alerts.join('')}</ul></div>`
    : '<p class="saved-message">登録してある薬や持病との間に、辞書で分かる大きな注意は見つからなかったよ。</p>';
  return `<section class="medical-assessment"><h3>${escapeHtml(drug.name)}</h3>${flags ? `<div class="profile-chips">${flags}</div>` : ''}${ingredients}<p class="alek-advice">${escapeHtml(result.alek)}</p>${assessment}${cautions ? `<details class="assessment"><summary>この薬そのものの注意も見ておこう</summary><ul>${cautions}</ul></details>` : ''}<p class="medical-note">ここでの照合は、添付文書や薬剤師の確認に代わるものじゃないよ。最後に、手元の箱と成分・用法が同じか確認しよう。</p></section>`;
}
