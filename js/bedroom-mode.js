export const BEDROOM_SAFE_LINE_IDS = Object.freeze([
  'sweet-01', 'sweet-02', 'sweet-03', 'sweet-04', 'sweet-05',
  'sweet-08', 'sweet-09', 'sweet-10', 'sweet-11', 'sweet-13',
  'sweet-14', 'sweet-17', 'sweet-18', 'sweet-21', 'sweet-23',
  'sweet-25', 'contextual-08', 'contextual-13', 'contextual-29',
  'contextual-33'
]);

const CORE_BEDTIME_LINES = Object.freeze([
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

const BEDROOM_QUIET_TEXTS = Object.freeze([
  'まだ眠くない？',
  'そんなに頑張って目開けなくていいって。',
  '明日のことは明日考えればいいよ。',
  'その顔、まだ何か考えてるのバレバレ。',
  '眠れなくても、横になってるだけでいい。',
  '寝るって言ってから何分起きてるんだろうな、俺たち。',
  '部屋、もう少し暗くする？',
  '水、飲んだ？',
  '布団ちゃんとかけて。……夜中に蹴飛ばすなよ？',
  '寒くない？ 手だけ冷えてたりしない？',
  '今日は何が一番疲れた？',
  '話したくなったら聞くよ。',
  '話したくないなら、それでもいい。',
  '静かな方がいい？　それとも少し話す？',
  '眠そうな顔してる。',
  '……そのまま寝てもいいよ。',
  '俺はもう少し起きてるから、気にしなくていい。',
  '目閉じたら、たぶん思ってるより早く寝るよ。',
  '今日の反省会は終了、強制終了。ちなみに俺も終了したところ。',
  '夜中に人生の結論出すの禁止。',
  '俺ももう少ししたら寝る。たぶん。',
  '眠れない夜って、妙に頭だけ元気になるよな。',
  '考え事が止まらないなら、ひとつだけ聞く。',
  'そんな顔してても、今寝落ちしたらちゃんと明日笑うからな。',
  '……別に答えなくても分かるけど。',
  'こっち来る？ 少し狭くなるけど。',
  '時計、見なくていいんじゃない？ あいつ無駄にうるさいし。',
  'もう少しだけ起きててもいい。でも無茶はなし。',
  '朝になったら、今より少し楽になってるといいな。',
  '夜中って、どうでもいいことまで大きく見えるよな。'
]);

const QUIET_ONLY_LINE_NUMBERS = new Set([7, 8, 11, 14, 23, 25]);

export const BEDROOM_QUIET_LINES = Object.freeze(BEDROOM_QUIET_TEXTS.map((text, index) => {
  const number = index + 1;
  return Object.freeze({
    id: `bedroom-quiet-${String(number).padStart(2, '0')}`,
    text,
    audio: `voice/alek_bed_line_${String(number).padStart(2, '0')}.mp3`,
    bedtime: !QUIET_ONLY_LINE_NUMBERS.has(number)
  });
}));

export const BEDTIME_LINES = Object.freeze([
  ...CORE_BEDTIME_LINES,
  ...BEDROOM_QUIET_LINES.filter(line => line.bedtime)
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

export function pickBedroomQuietLine(previousId = '', random = Math.random) {
  return pickWithoutImmediateRepeat(BEDROOM_QUIET_LINES, previousId, random);
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
