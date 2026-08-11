import { getMemory, rememberLine } from './memory-service.js';
import { inferCategories, isCoolingDown } from './reasoning.js';
import { dialogueTags } from './time-context.js?v=1.0.0';

export async function chooseIntelligentLine(engine, context = {}) {
  const memory = await getMemory();
  const categories = inferCategories(context);
  const category = categories.find(item => item === 'warning' || !isCoolingDown(item, memory)) || 'everyday';
  const tags = dialogueTags(context);
  const line = engine.pick(category, { exclude: memory.recent || [], tags });
  await rememberLine(line, category);
  return line;
}
