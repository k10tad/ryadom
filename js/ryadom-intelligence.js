import { getMemory, rememberLine } from './memory-service.js';
import { inferCategories, isCoolingDown } from './reasoning.js';

export async function chooseIntelligentLine(engine, context = {}) {
  const memory = await getMemory();
  const categories = inferCategories(context);
  const category = categories.find(item => item === 'warning' || !isCoolingDown(item, memory)) || 'everyday';
  const tags = [context.room, context.timeOfDay].filter(Boolean);
  const line = engine.pick(category, { exclude: memory.recent || [], tags });
  await rememberLine(line, category);
  return line;
}
