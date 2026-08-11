export const BEDROOM_SAFE_LINE_IDS = Object.freeze([
  'sweet-01', 'sweet-02', 'sweet-03', 'sweet-04', 'sweet-05',
  'sweet-08', 'sweet-09', 'sweet-10', 'sweet-11', 'sweet-13',
  'sweet-14', 'sweet-17', 'sweet-18', 'sweet-21', 'sweet-23',
  'sweet-25', 'contextual-08', 'contextual-13', 'contextual-29',
  'contextual-33'
]);

export const BEDTIME_LINES = Object.freeze([
  {
    id: 'bedtime-still-awake',
    text: 'まだ起きてる？',
    russian: 'Ты ещё не спишь?',
    audio: 'voice/alek_bed_still_awake.mp3'
  },
  {
    id: 'bedtime-no-need-reply',
    text: '返事しなくていいよ。',
    russian: 'Можешь не отвечать.',
    audio: 'voice/alek_bed_no_need_reply.mp3'
  },
  {
    id: 'bedtime-just-sleep',
    text: '眠くなったら、そのまま寝ていいよ。',
    russian: 'Если захочется спать, просто засыпай.',
    audio: 'voice/alek_bed_just_sleep.mp3'
  },
  {
    id: 'bedtime-im-near',
    text: '……俺はそばにいるよ。',
    russian: '…Я рядом.',
    audio: 'voice/alek_bed_im_near.mp3'
  },
  {
    id: 'bedtime-enough-thinking',
    text: '今日はもう考えるのやめよう。',
    russian: 'На сегодня хватит думать.',
    audio: 'voice/alek_bed_enough_thinking.mp3'
  },
  {
    id: 'bedtime-close-eyes',
    text: '目、閉じていいよ。',
    russian: 'Закрывай глаза.',
    audio: 'voice/alek_bed_close_eyes.mp3'
  }
]);

export const NIGHT_WAKE_LINES = Object.freeze([
  {
    id: 'night-wake-woke-up',
    text: '……起きた？',
    russian: '…Проснулась?',
    audio: 'voice/alek_night_woke_up.mp3'
  },
  {
    id: 'night-wake-cant-sleep',
    text: '眠れない？',
    russian: 'Не спится?',
    audio: 'voice/alek_night_cant_sleep.mp3'
  },
  {
    id: 'night-wake-come-here',
    text: 'こっちおいで。少しだけ話そうか。',
    russian: 'Иди сюда. Поболтаем немного.',
    audio: 'voice/alek_night_come_here.mp3'
  }
]);

function pickWithoutImmediateRepeat(lines, previousId = '', random = Math.random) {
  const pool = lines.filter(line => line.id !== previousId);
  const choices = pool.length ? pool : lines;
  const roll = Math.max(0, Math.min(.999999, Number(random()) || 0));
  return choices[Math.floor(roll * choices.length)] || null;
}

export function pickBedtimeLine(previousId = '', random = Math.random) {
  return pickWithoutImmediateRepeat(BEDTIME_LINES, previousId, random);
}

export function pickNightWakeLine(previousId = '', random = Math.random) {
  return pickWithoutImmediateRepeat(NIGHT_WAKE_LINES, previousId, random);
}

export function bedtimeLineDelay(random = Math.random) {
  const roll = Math.max(0, Math.min(1, Number(random()) || 0));
  return Math.round(150000 + roll * 120000);
}

export function isNightWakeWindow(date = new Date()) {
  const hour = date.getHours();
  return hour >= 2 && hour < 6;
}

export function shouldTriggerNightWake(date = new Date(), random = Math.random, chance = .24) {
  return isNightWakeWindow(date) && random() < chance;
}
