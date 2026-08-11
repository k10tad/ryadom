const WEEKDAY_TAGS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function timeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'lateNight';
  if (hour < 11) return 'morning';
  if (hour < 17) return 'day';
  if (hour < 22) return 'evening';
  return 'night';
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildTimeContext(date = new Date()) {
  const weekdayIndex = date.getDay();
  return {
    timeOfDay: timeOfDay(date),
    dayType: weekdayIndex === 0 || weekdayIndex === 6 ? 'weekend' : 'weekday',
    dayOfWeek: WEEKDAY_TAGS[weekdayIndex],
    dateKey: localDateKey(date),
    hour: date.getHours(),
    minute: date.getMinutes()
  };
}

export function dialogueTags(context = {}) {
  return [context.room, context.timeOfDay, context.dayType, context.dayOfWeek, context.activity].filter(Boolean);
}

export function activityPeriodKey(room, date = new Date()) {
  return `${room}:${localDateKey(date)}:${timeOfDay(date)}`;
}
