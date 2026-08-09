import { db, makeId } from './db.js';
import { resolveCondition, resolveDrug } from './knowledge-service.js';

export function splitList(value = '') {
  return String(value).split(/[,、\n]/).map(item => item.trim())
    .filter(item => item && !['なし', '無し', 'なし。', '無し。'].includes(item));
}

async function replaceMedicationProfile(names) {
  await db.clear('userMedications');
  for (const rawName of names) {
    const result = await resolveDrug(rawName);
    await db.put('userMedications', {
      id: result.status === 'identified' ? `drug-${result.item.id}` : makeId('drug-unresolved'),
      rawName,
      drugId: result.status === 'identified' ? result.item.id : null,
      status: result.status,
      active: true,
      addedAt: new Date().toISOString()
    });
  }
}

async function replaceConditionProfile(names) {
  await db.clear('userConditions');
  for (const rawName of names) {
    const result = await resolveCondition(rawName);
    await db.put('userConditions', {
      id: result.status === 'identified' ? `condition-${result.item.id}` : makeId('condition-unresolved'),
      rawName,
      conditionId: result.status === 'identified' ? result.item.id : null,
      status: result.status,
      active: true,
      addedAt: new Date().toISOString()
    });
  }
}

export async function saveProfile({ name, region, medications = '', conditions = '', onboardingComplete = true }) {
  const existing = await db.get('profile', 'current');
  const now = new Date().toISOString();
  await db.put('profile', {
    id: 'current',
    name: String(name).trim(),
    region: String(region).trim(),
    onboardingComplete,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });
  await replaceMedicationProfile(splitList(medications));
  await replaceConditionProfile(splitList(conditions));
}

export async function addMedicationToProfile(drug, rawName = drug.name) {
  await db.put('userMedications', {
    id: `drug-${drug.id}`,
    rawName,
    drugId: drug.id,
    status: 'identified',
    active: true,
    addedAt: new Date().toISOString()
  });
}

export async function getProfileBundle() {
  const [profile, medications, conditions] = await Promise.all([
    db.get('profile', 'current'),
    db.all('userMedications'),
    db.all('userConditions')
  ]);
  return {
    profile,
    medications: medications.filter(item => item.active !== false),
    conditions: conditions.filter(item => item.active !== false)
  };
}
