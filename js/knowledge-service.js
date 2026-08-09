import { DATA_PATHS } from './config.js';

let knowledgePromise;

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Knowledge file could not be loaded: ${path}`);
  return response.json();
}

export function normalizeMedicalName(value = '') {
  return String(value).normalize('NFKC').toLowerCase().replace(/[\s・･_―—-]+/g, '');
}

export function loadKnowledge({ refresh = false } = {}) {
  if (refresh) knowledgePromise = null;
  if (!knowledgePromise) {
    knowledgePromise = Promise.all([
      loadJson(DATA_PATHS.drugs),
      loadJson(DATA_PATHS.conditions),
      loadJson(DATA_PATHS.interactions)
    ]).then(([drugs, conditions, interactions]) => ({ drugs, conditions, interactions }));
  }
  return knowledgePromise;
}

function resolveName(value, items) {
  const needle = normalizeMedicalName(value);
  if (!needle) return { status: 'unknown', item: null, candidates: [] };

  const exact = items.find(item => [item.name, ...(item.aliases || [])]
    .some(alias => normalizeMedicalName(alias) === needle));
  if (exact) return { status: 'identified', item: exact, candidates: [exact] };

  const candidates = items.filter(item => [item.name, ...(item.aliases || [])]
    .some(alias => {
      const normalized = normalizeMedicalName(alias);
      return normalized.includes(needle) || needle.includes(normalized);
    }));
  return candidates.length
    ? { status: 'ambiguous', item: null, candidates }
    : { status: 'unknown', item: null, candidates: [] };
}

export async function resolveDrug(value) {
  const { drugs } = await loadKnowledge();
  return resolveName(value, drugs.items || []);
}

export async function resolveCondition(value) {
  const { conditions } = await loadKnowledge();
  return resolveName(value, conditions.items || []);
}
