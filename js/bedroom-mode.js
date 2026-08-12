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

const BEDROOM_QUIET_RECORDINGS = Object.freeze([
  ['まだ眠くない？', 'Тебе ещё не хочется спать?', 'alek_bed_line_01.mp3'],
  ['そんなに頑張って目開けなくていいって。', 'Не надо так стараться держать глаза открытыми.', 'alek_bed_line_02.mp3'],
  ['明日のことは明日考えればいいよ。', 'О завтрашнем подумаешь завтра.', 'alek_bed_line_03.mp3'],
  ['その顔、まだ何か考えてるのバレバレ。', 'По твоему лицу сразу видно — ты всё ещё о чём-то думаешь.', 'alek_bed_line_04.mp3'],
  ['眠れなくても、横になってるだけでいい。', 'Даже если не спится, можно просто полежать.', 'alek_bed_line_05.mp3'],
  ['寝るって言ってから何分起きてるんだろうな、俺たち。', 'Интересно, сколько мы уже не спим с тех пор, как сказали: «Пора спать».', 'alek_bed_line_06.mp3'],
  ['部屋、もう少し暗くする？', 'Сделать в комнате ещё потемнее?', 'alek_bed_line_07.mp3'],
  ['水、飲んだ？', 'Воды попила?', 'alek_bed_line_08.mp3'],
  ['布団ちゃんとかけて。……夜中に蹴飛ばすなよ？', 'Укройся как следует. И не скидывай одеяло среди ночи, ладно?', 'alek_bed_line_09.mp3'],
  ['寒くない？ 手だけ冷えてたりしない？', 'Тебе не холодно? Может, только руки холодные?', 'alek_bed_line_10.mp3'],
  ['今日は何が一番疲れた？', 'Что тебя сегодня больше всего утомило?', 'alek_bed_line_11.mp3'],
  ['話したくなったら聞くよ。', 'Захочешь поговорить — я выслушаю.', 'alek_bed_line_12.mp3'],
  ['話したくないなら、それでもいい。', 'Не хочешь говорить — тоже нормально.', 'alek_bed_line_13.mp3'],
  ['静かな方がいい？　それとも少し話す？', 'Тебе лучше в тишине? Или немного поговорим?', 'alek_bed_line_14.mp3'],
  ['眠そうな顔してる。', 'У тебя сонный вид.', 'alek_bed_line_15.mp3'],
  ['……そのまま寝てもいいよ。', '…Можешь так и уснуть.', 'alek_bed_line_16.mp3'],
  ['俺はもう少し起きてるから、気にしなくていい。', 'Я ещё немного побуду здесь, так что не переживай.', 'alek_bed_line_17.mp3'],
  ['目閉じたら、たぶん思ってるより早く寝るよ。', 'Закрой глаза — уснёшь, наверное, быстрее, чем думаешь.', 'alek_bed_line_18.mp3'],
  ['今日の反省会は終了、強制終了。ちなみに俺も終了したところ。', 'На сегодня разбор полётов окончен. Принудительно. Я, кстати, тоже уже всё.', 'alek_bed_line_19.mp3'],
  ['夜中に人生の結論出すの禁止。', 'Запрещаю принимать судьбоносные решения посреди ночи.', 'alek_bed_line_20.mp3'],
  ['俺ももう少ししたら寝る。たぶん。', 'Я тоже скоро лягу. Наверное.', 'alek_bed_line_21.mp3'],
  ['眠れない夜って、妙に頭だけ元気になるよな。', 'Бессонной ночью голова почему-то особенно бодрая, да?', 'alek_bed_line_22.mp3'],
  ['考え事が止まらないなら、ひとつだけ聞く。', 'Если мысли никак не останавливаются, я задам всего один вопрос.', 'alek_bed_line_23.mp3'],
  ['そんな顔してても、今寝落ちしたらちゃんと明日笑うからな。', 'Даже с таким лицом — если сейчас уснёшь, завтра всё равно будешь улыбаться.', 'alek_bed_line_24.mp3'],
  ['……別に答えなくても分かるけど。', '…Хотя можешь не отвечать. Я и так понимаю.', 'alek_bed_line_25.mp3'],
  ['こっち来る？ 少し狭くなるけど。', 'Иди ко мне. Будет немного тесно, правда.', 'alek_bed_line_26.mp3'],
  ['時計、見なくていいんじゃない？ あいつ無駄にうるさいし。', 'Не смотри на часы. От них только лишний шум.', 'alek_bed_line_27.mp3'],
  ['もう少しだけ起きててもいい。でも無茶はなし。', 'Можешь ещё немного не спать. Только без геройства.', 'alek_bed_line_28.mp3'],
  ['朝になったら、今より少し楽になってるといいな。', 'Надеюсь, утром тебе станет хоть немного легче.', 'alek_bed_line_29.mp3'],
  ['夜中って、どうでもいいことまで大きく見えるよな。', 'Ночью даже всякая ерунда кажется огромной, да?', 'alek_bed_line_30.mp3']
]);

const QUIET_ONLY_LINE_NUMBERS = new Set([7, 8, 11, 14, 23, 25]);

export const BEDROOM_QUIET_LINES = Object.freeze(BEDROOM_QUIET_RECORDINGS.map(([text, russian, audioFile], index) => {
  const number = index + 1;
  return Object.freeze({
    id: `bedroom-quiet-${String(number).padStart(2, '0')}`,
    text,
    russian,
    audio: `voice/${audioFile}`,
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
