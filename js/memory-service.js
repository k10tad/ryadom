import { db } from './db.js';

const MEMORY_ID = 'dialogue-memory';

export async function getMemory() {
  return await db.get('memory', MEMORY_ID) || { id: MEMORY_ID, recent: [], cooldowns: {} };
}

export async function rememberLine(line, category) {
  const memory = await getMemory();
  const recent = [line.id, ...(memory.recent || []).filter(id => id !== line.id)].slice(0, 12);
  await db.put('memory', {
    ...memory,
    id: MEMORY_ID,
    recent,
    cooldowns: { ...(memory.cooldowns || {}), [category]: Date.now() },
    updatedAt: new Date().toISOString()
  });
}
