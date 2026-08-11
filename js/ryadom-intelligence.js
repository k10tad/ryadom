import { getMemory, rememberLine } from './memory-service.js';
import { inferCategories, isCoolingDown } from './reasoning.js';
import { dialogueTags } from './time-context.js?v=1.0.0';
import { BEDROOM_SAFE_LINE_IDS } from './bedroom-mode.js?v=1.0.0';

function useBedroomDialogueOnly(context) {
  return context.room === 'bedroom'
    && !context.warning
    && !context.symptom
    && !context.medication
    && !context.cycle
    && !context.distress
    && context.level !== 'bad';
}

export async function chooseIntelligentLine(engine, context = {}) {
  const memory = await getMemory();
  const categories = inferCategories(context);
  const category = categories.find(item => item === 'warning' || !isCoolingDown(item, memory)) || 'everyday';
  const tags = dialogueTags(context);
  const allowedIds = useBedroomDialogueOnly(context) ? BEDROOM_SAFE_LINE_IDS : null;
  const line = engine.pick(category, { exclude: memory.recent || [], tags, allowedIds });
  await rememberLine(line, category);
  return line;
}
