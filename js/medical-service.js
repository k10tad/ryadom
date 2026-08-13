import { loadKnowledge, resolveDrug } from './knowledge-service.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

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
      ? '見逃したくない注意がある。飲む前に内容を確認して。'
      : '辞書では特定できたよ。箱の用法・用量も一緒に確認してから記録しよう。'
  };
}

export function renderMedicationAssessment(result) {
  if (result.status === 'ambiguous') {
    return `<section class="medical-assessment is-ambiguous"><h3>どの商品か選んで</h3><p>「${escapeHtml(result.query)}」には成分の異なる種類があります。</p><div class="drug-candidates">${result.candidates.map(item =>
      `<button type="button" class="drug-candidate" data-select-drug="${escapeHtml(item.name)}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.otc?.category || item.name)}</small></button>`
    ).join('')}</div><p class="medical-note">箱と一致しない場合は、箱にある商品名を省略せず入力してください。</p></section>`;
  }
  if (!result.identified) {
    return `<section class="medical-assessment is-unresolved"><h3>薬を特定できませんでした</h3><p>${escapeHtml(result.query)}</p><p>シリーズ名、末尾の英字、錠・顆粒・カプセルまで確認してください。</p></section>`;
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
    ...result.duplicates.map(name => `<li><strong>成分重複：</strong>${escapeHtml(name)}が登録薬と重なります。</li>`),
    ...result.interactions.map(item => `<li><strong>${escapeHtml(item.label)}：</strong>${escapeHtml(item.message)}</li>`),
    ...result.conditionWarnings.map(item => `<li><strong>登録疾患への注意：</strong>${escapeHtml(item.message)}</li>`)
  ];
  const cautions = (drug.importantWarnings || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<section class="medical-assessment"><h3>${escapeHtml(drug.name)}</h3>${flags ? `<div class="profile-chips">${flags}</div>` : ''}${ingredients}${alerts.length ? `<div class="medical-alert"><strong>確認が必要</strong><ul>${alerts.join('')}</ul></div>` : '<p class="saved-message">登録薬・持病との既知の重大な警告は見つかりませんでした。</p>'}${cautions ? `<details><summary>この薬の主な注意</summary><ul>${cautions}</ul></details>` : ''}<p class="medical-note">辞書の判定は添付文書や薬剤師の確認に代わるものではありません。外箱の成分・用法が表示と一致するか確認してください。</p></section>`;
}
