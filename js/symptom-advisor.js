const REVIEWED_AT = '2026-08-10';

const emergencyRules = [
  { pattern: /(突然|急に).*(激しい|ひどい|最悪).*(頭痛|頭が痛)|雷鳴.*頭痛|今まで.*(ない|違う).*頭痛/, message: 'それ、いつもの頭痛として流さないで。突然の激しい頭痛や、明らかにいつもと違う頭痛なら119を考えて。' },
  { pattern: /(胸.*(締め付け|圧迫|激痛)|胸が痛).*(息|冷や汗|吐き気)|(急な|突然).*(息苦し|呼吸困難)|息ができない/, message: '胸の強い痛みや急な息苦しさは、ここで様子見を勧められない。今すぐ119。ひとりなら玄関を開けて、無理に歩かないで。' },
  { pattern: /(ろれつ|言葉が出ない|顔.*(ゆが|しび)|片側.*(力が入ら|動か|しび)|突然.*二重に見)/, message: '片側の麻痺やしびれ、顔のゆがみ、ろれつの異常は脳卒中の可能性がある。発症時刻を確認して、今すぐ119。' },
  { pattern: /(じんましん|蕁麻疹|唇|舌|喉).*(息苦し|腫れ|意識|ふらつ)|(アナフィラキシー|喉が締ま|舌が腫)/, message: '皮膚症状に息苦しさ、喉・舌の腫れ、ふらつきが重なるならアナフィラキシーを疑う。処方されたアドレナリン自己注射があれば指示どおり使って119。' },
  { pattern: /(意識.*(もうろう|ない|遠の)|けいれん|痙攣|血を吐|黒い便|大量.*出血)/, message: '意識の異常、けいれん、吐血や黒い便は緊急性がある。今すぐ119。ひとりで移動しようとしないで。' }
];

const adviceRules = [
  { id: 'headache', pattern: /(頭痛|頭が痛|片頭痛|偏頭痛|ズキズキ)/, response: '頭痛か。まず暗く静かな場所で休んで、水分を少しずつ。いつもの片頭痛薬があるなら処方どおり早めに使って、同系統の鎮痛薬を重ねないで。突然の激痛、麻痺・ろれつ異常、発熱と首の硬さ、いつもと違う痛みなら救急相談だよ。' },
  { id: 'nausea', pattern: /(吐き気|むかむか|嘔吐|吐いた|気持ち悪)/, response: '吐き気があるんだね。横になるなら身体を横向きにして、水分は一口ずつ。何度も吐いて水分が保てない、血を吐く、強い頭痛や腹痛、意識の変化があるなら早めに受診して。' },
  { id: 'dizziness', pattern: /(めまい|眩暈|ふらつ|立ちくらみ|ぐるぐる)/, response: 'めまいなら、まず座るか横になって転倒を避けよう。急に立たず、水分を少しずつ。片側の麻痺、ろれつ異常、激しい頭痛、胸痛、失神が重なるなら119。症状が続くなら血圧と脈も測って記録して。' },
  { id: 'breathing', pattern: /(息苦し|息切れ|呼吸.*苦|喘鳴|ゼーゼー|喘息)/, response: '息苦しいなら、上体を起こして楽な姿勢を取って。喘息の発作時薬が処方されているなら指示どおり使う。会話が続かない、唇が青い、急に悪化した、胸痛があるなら119。改善しないならすぐ受診しよう。' },
  { id: 'abdominal', pattern: /(腹痛|お腹が痛|胃が痛|下腹部.*痛|生理痛)/, response: 'お腹の痛みか。場所、始まった時刻、波があるか、出血や嘔吐の有無を記録して。突然の激痛、痛みが続いて動けない、吐血・黒い便、大量出血、妊娠の可能性がある強い下腹部痛なら急いで受診して。' },
  { id: 'allergy', pattern: /(アレルギー|花粉|鼻水|鼻づまり|くしゃみ|蕁麻疹|じんましん|かゆみ|目がかゆ)/, response: 'アレルギー症状っぽいね。原因から離れて、皮膚や目はこすらず、処方薬は指示どおりに。抗ヒスタミン薬は種類によって眠気があるから運転は避けて。喉・舌の腫れ、息苦しさ、ふらつきが出たら119だよ。' },
  { id: 'fatigue', pattern: /(だるい|倦怠感|疲れた|しんどい|力が出ない)/, response: 'しんどいんだね。今日は休むのを予定に入れて、水分と食べられるものを少し。発熱、息苦しさ、胸痛、意識がぼんやりする感じがあれば測れる値を確認して受診を考えよう。急な悪化なら我慢しないで。' },
  { id: 'insomnia', pattern: /(眠れない|寝られない|不眠|寝つけない)/, response: '眠れないか。時計を見るのをやめて、照明と画面を落とそう。20分くらい眠れなければ一度ベッドを出て、静かなことをして眠気を待つ。息苦しさや強い痛みが眠れない原因なら、そっちを先に評価しよう。' }
];

const number = text => Number(String(text).replace('．', '.').match(/-?\d{2,3}(?:\.\d)?/)?.[0]);
const has = (text, pattern) => pattern.test(text);

function feverResult(text, previous = {}) {
  const temp = Number.isFinite(number(text)) ? number(text) : previous.temperature;
  if (!Number.isFinite(temp)) {
    return follow('fever-temperature', '体温を測れる？ 「38.2度」みたいに教えて。息苦しさ、意識がぼんやりする、水分が取れない、強い頭痛と首の硬さがあるなら、そのことも一緒に書いて。');
  }
  const danger = has(text, /(息苦し|呼吸困難|意識.*(ぼんやり|もうろう)|水分.*(取れない|飲めない)|首.*硬|けいれん|唇.*青)/);
  const log = { kind: '体温', note: `体温 ${temp.toFixed(1)}℃`, temperature: temp };
  if (danger || temp < 35) return done(`体温は${temp.toFixed(1)}℃だね。${temp < 35 ? '35℃未満の体温低下' : '危険な随伴症状'}があるなら、今は自宅で様子を見ないで119。ひとりなら近くの人にも知らせて。`, true, log);
  if (temp >= 40) return done(`体温は${temp.toFixed(1)}℃。40℃以上なら早急な医療評価が必要だよ。意識の変化、呼吸苦、けいれん、水分が取れない状態なら119。それがなくても今すぐ#7119か医療機関へ連絡して。`, true, log);
  if (previous.step !== 'fever-redflags' && !/(なし|ない|ある|あり|息苦し|意識|水分|首.*硬|けいれん)/.test(text)) {
    const level = temp >= 39 ? '高熱' : temp >= 37.5 ? '微熱〜発熱' : '今は発熱域ではない';
    return follow('fever-redflags', `体温${temp.toFixed(1)}℃、${level}だね。息苦しさ、意識がぼんやりする、水分が取れない、強い頭痛と首の硬さ、けいれんはある？ 「全部なし」でもいいよ。`, { temperature: temp, step: 'fever-redflags' });
  }
  if (temp >= 39) return done(`体温は${temp.toFixed(1)}℃。高熱だから、今日は医療機関へ相談しよう。水分を少量ずつ取り、薄着で楽にして休んで。呼吸苦、意識の変化、けいれん、水分が取れない状態へ変わったら119。`, false, log);
  if (temp >= 37.5) return done(`体温は${temp.toFixed(1)}℃。微熱〜発熱の範囲だね。水分を少量ずつ、暑くしすぎない服装で休んで、数時間後に再測定しよう。解熱薬は処方・説明どおりに。悪化する、数日続く、基礎疾患があってつらいなら受診して。`, false, log);
  return done(`体温は${temp.toFixed(1)}℃で、今の測定では発熱域ではないね。寒気やだるさがあるなら休んで水分を取り、1〜2時間後にもう一度測ろう。症状が強い、または悪化するなら体温だけで判断せず相談して。`, false, log);
}

function palpitationResult(text, previous = {}) {
  const normalized = text.normalize('NFKC');
  const bp = normalized.match(/(?:血圧)?\s*(\d{2,3})\s*[\/／]\s*(\d{2,3})/);
  const pulse = normalized.match(/(?:脈拍|脈|心拍)\s*(?:は|:|：)?\s*(\d{2,3})/) || normalized.match(/(\d{2,3})\s*(?:回\/分|bpm)/i);
  const temperature = normalized.match(/(?:体温|熱)\s*(?:は|:|：)?\s*(\d{2}(?:\.\d)?)/);
  const data = {
    systolic: bp ? Number(bp[1]) : previous.systolic,
    diastolic: bp ? Number(bp[2]) : previous.diastolic,
    pulse: pulse ? Number(pulse[1]) : previous.pulse,
    temperature: temperature ? Number(temperature[1]) : previous.temperature
  };
  if (/測れない|計れない|機械がない/.test(normalized) && previous.step !== 'palpitation-symptoms') {
    return follow('palpitation-symptoms', '測れないんだね。無理に探し回らなくていい。胸痛、息苦しさ、失神しそうな感じ、冷汗、吐き気、咳き込み、体温低下や強い寒気はある？ 「全部なし」でも大丈夫。', { measurementUnavailable: true, step: 'palpitation-symptoms' });
  }
  if (previous.measurementUnavailable && previous.step === 'palpitation-symptoms') {
    const redFlagWithoutVitals = has(normalized, /(胸痛|胸が痛|胸.*圧迫|息苦し|呼吸困難|失神|気を失|意識.*遠|冷汗|冷や汗|唇.*青)/);
    if (redFlagWithoutVitals) return done('測定できなくても、胸痛・呼吸苦・失神感・冷汗がある動悸は緊急だよ。今すぐ119。自分で運転せず、座るか横になって待って。', true, { kind: '症状', note: '動悸・バイタル測定不可・危険症状あり' });
    return done('測定できない状態なら、安静でも動悸が続く・脈が明らかに不規則・吐き気や咳き込みが強い場合は#7119か医療機関へ今すぐ相談して。胸痛、呼吸苦、失神感、冷汗が出たら119だよ。', false, { kind: '症状', note: '動悸・バイタル測定不可' });
  }
  if (!Number.isFinite(data.pulse) || !Number.isFinite(data.systolic)) {
    return follow('palpitation-vitals', 'まず座って安静にして、血圧と脈拍を測って記録しよう。「血圧110/70、脈拍120」みたいに教えて。測れなければ「測れない」でいい。胸痛、息苦しさ、失神しそう、冷汗、吐き気、咳き込み、体温低下や強い寒気があるかも一緒に教えて。', data);
  }
  const redFlag = has(normalized, /(胸痛|胸が痛|胸.*圧迫|息苦し|呼吸困難|失神|気を失|意識.*遠|冷汗|冷や汗|唇.*青)/);
  const concerningAssociated = has(normalized, /(吐き気|嘔吐|咳き込|強い寒気|体温.*低)/);
  const severeVitals = data.systolic < 90 || data.pulse >= 150 || data.pulse <= 40 || (Number.isFinite(data.temperature) && data.temperature < 35);
  const note = [`動悸`, `血圧 ${data.systolic}/${data.diastolic}`, `脈拍 ${data.pulse}/分`, Number.isFinite(data.temperature) ? `体温 ${data.temperature.toFixed(1)}℃` : ''].filter(Boolean).join('・');
  const log = { kind: 'バイタル', note, ...data };
  if (redFlag || severeVitals) return done(`血圧${data.systolic}/${data.diastolic}、脈拍${data.pulse}/分だね。${redFlag ? '胸痛・呼吸苦・失神感などの危険症状' : '危険域の測定値'}がある。今すぐ119。自分で運転せず、座るか横になって、可能なら玄関を開けて待って。`, true, log);
  if (previous.step !== 'palpitation-symptoms' && !/(なし|ない|ある|あり|胸痛|息苦し|失神|冷汗|冷や汗|吐き気|咳き込|寒気|体温.*低)/.test(normalized)) {
    return follow('palpitation-symptoms', `血圧${data.systolic}/${data.diastolic}、脈拍${data.pulse}/分は記録した。胸痛、息苦しさ、失神しそうな感じ、冷汗、吐き気、咳き込み、体温低下や強い寒気はある？ 「全部なし」でも大丈夫。`, { ...data, step: 'palpitation-symptoms' });
  }
  if (data.pulse >= 120 || data.systolic < 100 || concerningAssociated) return done(`血圧${data.systolic}/${data.diastolic}、脈拍${data.pulse}/分を記録した。安静でもこの状態が続く、脈が不規則、吐き気や咳き込みが強いなら、今すぐ#7119か医療機関へ相談して。胸痛、呼吸苦、失神感、冷汗が加わったら119。`, false, log);
  return done(`血圧${data.systolic}/${data.diastolic}、脈拍${data.pulse}/分を記録したよ。5〜10分安静にして再測定し、開始時刻と脈の規則性も残そう。動悸が続く・繰り返すなら受診相談。胸痛、呼吸苦、失神感、冷汗が出たら119だよ。`, false, log);
}

function follow(step, text, data = {}) { return { matched: true, kind: 'symptom-care', text, state: { topic: step.startsWith('fever') ? 'fever' : 'palpitation', step, data }, reviewedAt: REVIEWED_AT }; }
function done(text, urgent, log) { return { matched: true, urgent, kind: 'symptom-care', text, state: null, log, reviewedAt: REVIEWED_AT }; }

export function adviseFromMessage(rawText, conversationState = null) {
  const text = String(rawText || '').normalize('NFKC').trim();
  if (!text) return null;
  const emergency = emergencyRules.find(rule => rule.pattern.test(text));
  if (emergency) return done(emergency.message, true, null);
  if (conversationState?.topic === 'fever') return feverResult(text, { ...conversationState.data, step: conversationState.step });
  if (conversationState?.topic === 'palpitation') return palpitationResult(text, { ...conversationState.data, step: conversationState.step });
  if (/(発熱|熱がある|高熱|微熱|寒気|悪寒)/.test(text)) return feverResult(text);
  if (/(動悸|脈が速|脈が飛|不整脈|心臓.*ドキドキ)/.test(text)) return palpitationResult(text);
  const matched = adviceRules.filter(rule => rule.pattern.test(text));
  if (!matched.length) return null;
  const primary = matched[0];
  const extra = matched.length > 1 ? ' 複数の不調が重なっているから、悪化するか水分が取れないなら早めに受診しよう。' : '';
  return { matched: true, urgent: false, kind: 'symptom-care', symptom: primary.id, text: primary.response + extra, state: null, reviewedAt: REVIEWED_AT };
}
