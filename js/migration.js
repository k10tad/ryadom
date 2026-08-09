import { db, makeId } from './db.js';
import { resolveCondition, resolveDrug } from './knowledge-service.js';

function legacyValue(key) {
  try { return JSON.parse(localStorage.getItem(`ryadom:${key}`)); }
  catch { return null; }
}

async function importMedicationNames(names = []) {
  for (const rawName of names) {
    const resolved = await resolveDrug(rawName);
    const id = resolved.status === 'identified' ? `drug-${resolved.item.id}` : makeId('drug-unresolved');
    await db.put('userMedications', {
      id,
      rawName,
      drugId: resolved.status === 'identified' ? resolved.item.id : null,
      status: resolved.status,
      active: true,
      addedAt: new Date().toISOString()
    });
  }
}

async function importConditionNames(names = []) {
  for (const rawName of names) {
    const resolved = await resolveCondition(rawName);
    const id = resolved.status === 'identified' ? `condition-${resolved.item.id}` : makeId('condition-unresolved');
    await db.put('userConditions', {
      id,
      rawName,
      conditionId: resolved.status === 'identified' ? resolved.item.id : null,
      status: resolved.status,
      active: true,
      addedAt: new Date().toISOString()
    });
  }
}

export async function migrateLegacyData() {
  if ((await db.get('meta', 'migration-v2'))?.done) return;

  const oldProfile = await db.get('profile', 'current') || legacyValue('profile');
  if (oldProfile) {
    const medications = Array.isArray(oldProfile.medications) ? oldProfile.medications : [];
    const conditions = Array.isArray(oldProfile.conditions) ? oldProfile.conditions : [];
    await db.put('profile', {
      id: 'current',
      name: oldProfile.name || 'レイ',
      region: oldProfile.region || '',
      onboardingComplete: Boolean(oldProfile.onboardingComplete || oldProfile.name),
      createdAt: oldProfile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (!(await db.all('userMedications')).length) await importMedicationNames(medications);
    if (!(await db.all('userConditions')).length) await importConditionNames(conditions);
  }

  const legacyLogs = await db.all('medicineLogs').catch(() => []);
  for (const item of legacyLogs) {
    await db.put('medicationLogs', { id: item.id || makeId('medication'), ...item });
  }

  const localMappings = [
    ['medicineLogs', 'medicationLogs', 'medication'],
    ['conditionLogs', 'symptomLogs', 'symptom'],
    ['cycleLogs', 'cycleLogs', 'cycle'],
    ['medicineSchedules', 'schedules', 'schedule'],
    ['messages', 'messages', 'message']
  ];
  for (const [key, target, prefix] of localMappings) {
    for (const item of legacyValue(key) || []) {
      await db.put(target, { id: item.id || makeId(prefix), ...item });
    }
  }

  const cycle = legacyValue('cycleProfile');
  if (cycle) await db.put('meta', { id: 'cycle-profile', ...cycle });
  await db.put('meta', { id: 'migration-v2', done: true, migratedAt: new Date().toISOString() });
}
