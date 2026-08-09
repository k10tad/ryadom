import { loadKnowledge, resolveDrug } from './knowledge-service.js';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

export async function evaluateMedication(input, profileBundle = {}) {
  const resolution = await resolveDrug(input);
  if (resolution.status !== 'identified') {
    return {
      status: resolution.status,
      identified: false,
      candidates: resolution.candidates || [],
      alek: resolution.status === 'ambiguous'
        ? 'その名前だと候補がいくつかあるな。規格か成分名、箱に書いてある名前をもう少し教えて。'
        : 'その薬、まだ特定できない。勝手には決めないから、規格か成分名を見せて。'
    };
  }

  const knowledge = await loadKnowledge();
  const drug = resolution.item;
  const registeredMedicationIds = new Set((profileBundle.medications || [])
    .filter(item => item.active !== false && item.drugId)
    .map(item => item.drugId));
  const registeredConditionIds = new Set((profileBundle.conditions || [])
    .filter(item => item.active !== false && item.conditionId)
    .map(item => item.conditionId));
  const unresolved = [
    ...(profileBundle.medications || []).filter(item => !item.drugId).map(item => item.rawName),
    ...(profileBundle.conditions || []).filter(item => !item.conditionId).map(item => item.rawName)
  ];

  const interactions = (knowledge.interactions.items || []).filter(rule => {
    if (rule.a !== drug.id && rule.b !== drug.id) return false;
    const otherId = rule.a === drug.id ? rule.b : rule.a;
    return registeredMedicationIds.has(otherId);
  }).map(rule => {
    const otherId = rule.a === drug.id ? rule.b : rule.a;
    const other = knowledge.drugs.items.find(item => item.id === otherId);
    return { ...rule, registeredDrugName: other?.name || otherId };
  });

  const conditionWarnings = (drug.conditionWarnings || [])
    .filter(item => registeredConditionIds.has(item.conditionId))
    .map(item => ({
      ...item,
      conditionName: knowledge.conditions.items.find(condition => condition.id === item.conditionId)?.name || item.conditionId
    }));

  let alek = 'こっちは大丈夫。ただ、この副作用は一応気をつけて。';
  if (interactions.length) alek = 'その薬、今のやつと組み合わせだけ見とくな。重要な注意がある。';
  else if (conditionWarnings.length) alek = 'それ、持病との相性ちょっと確認したほうがいい。';

  return {
    status: 'identified',
    identified: true,
    drug,
    isRegistered: registeredMedicationIds.has(drug.id),
    interactions,
    conditionWarnings,
    adverseEffects: drug.seriousAdverseEffects || drug.importantWarnings || [],
    alek,
    unresolved
  };
}

function sourceLabel(source) {
  if (!source) return '情報源未登録';
  return escapeHtml(source.label || source.url || String(source));
}

export function renderMedicationAssessment(result) {
  if (!result.identified) {
    const candidates = result.candidates?.length
      ? `<p class="candidate-note">候補：${result.candidates.map(item => escapeHtml(item.name)).join('、')}</p>`
      : '';
    return `<section class="assessment caution"><p class="alek-advice">${escapeHtml(result.alek)}</p>${candidates}</section>`;
  }

  const blocks = [`<p class="alek-advice">${escapeHtml(result.alek)}</p>`];
  if (result.interactions.length) {
    blocks.push(`<section class="assessment danger"><h3>登録薬との併用</h3>${result.interactions.map(item =>
      `<p><strong>${escapeHtml(item.registeredDrugName)}：${escapeHtml(item.label)}</strong><br>${escapeHtml(item.message)}</p>`
    ).join('')}</section>`);
  } else {
    blocks.push('<section class="assessment ok"><h3>登録薬との併用</h3><p>内部辞書では、登録薬との併用禁忌・重大な注意は見つからなかった。</p></section>');
  }

  if (result.conditionWarnings.length) {
    blocks.push(`<section class="assessment caution"><h3>登録している持病</h3>${result.conditionWarnings.map(item =>
      `<p><strong>${escapeHtml(item.conditionName)}</strong><br>${escapeHtml(item.message)}</p>`
    ).join('')}</section>`);
  } else {
    blocks.push('<section class="assessment ok"><h3>登録している持病</h3><p>内部辞書では、登録疾患に対する禁忌・重要な注意は見つからなかった。</p></section>');
  }

  blocks.push(`<section class="assessment"><h3>重大な副作用</h3>${result.adverseEffects.length
    ? `<ul>${result.adverseEffects.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p>内部辞書に登録された重大な副作用情報はない。</p>'}</section>`);
  if (result.unresolved.length) {
    blocks.push(`<p class="scope-note">辞書で未確認の登録項目（${result.unresolved.map(escapeHtml).join('、')}）は今回の照合対象外です。</p>`);
  }
  blocks.push(`<p class="source-note">情報源：${sourceLabel(result.drug.source)}<br>最終確認：${escapeHtml(result.drug.lastReviewed || result.drug.reviewedAt || '未登録')}</p>`);
  return blocks.join('');
}
