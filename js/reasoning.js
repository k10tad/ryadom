const PRIORITY = ['warning', 'symptoms', 'medical', 'cycle', 'care', 'sweet', 'contextual', 'everyday'];

export function inferCategories(context = {}) {
  const categories = [];
  if (context.warning) categories.push('warning');
  if (context.symptom) categories.push('symptoms');
  if (context.medication) categories.push('medical');
  if (context.cycle) categories.push('cycle');
  if (context.distress || context.level === 'bad') categories.push('care');
  if (context.room === 'bedroom' || context.quiet) categories.push('sweet');
  if (context.timeOfDay) categories.push('contextual');
  categories.push('everyday');
  return [...new Set(categories)].sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b));
}

export function isCoolingDown(category, memory, now = Date.now()) {
  const durations = { warning: 30 * 60e3, symptoms: 5 * 60e3, medical: 3 * 60e3, sweet: 2 * 60e3 };
  return now - (memory.cooldowns?.[category] || 0) < (durations[category] || 45e3);
}

