const REVIEWED_AT = '2026-08-10';

export const TRIAGE_DISEASES = [
  { id: 'meniere_disease', name: 'メニエール病', pattern: /(メニエール|耳鳴り.*めまい|難聴.*めまい|耳が詰ま.*めまい)/, question: '顔や手足の片側のしびれ・力が入らない、ろれつが回らない、立てないほどのふらつき、突然の激しい頭痛、意識が遠のく感じはある？', detail: 'めまいは何分くらい続いている？ 耳鳴り、聞こえにくさ、耳の詰まりは一緒にある？', advice: 'メニエール病の発作に似るけれど、チャットだけではほかのめまいと区別できない。安全な場所で横になり、急な頭の動きを避けて。耳症状を伴う反復性のめまいは耳鼻科へ相談しよう。' },
  { id: 'bppv', name: '良性発作性頭位めまい症', pattern: /(良性発作性頭位|BPPV|寝返り.*めまい|頭を動か.*めまい|起き上が.*回る)/i, question: '片側のしびれや麻痺、ろれつの異常、二重に見える、立てない、突然の激しい頭痛、意識が遠のく感じはある？', detail: '寝返りや起き上がりなど特定の頭の向きで始まり、1分以内に弱くなる？ 初めてか、以前診断されたものと同じ感じかも教えて。', advice: '頭の位置で誘発される短いめまいはBPPVに似るけれど、自己判断で決めつけないで。転倒しない場所で動作をゆっくりにして、初回・長引く・いつもと違う場合は耳鼻科や医療機関へ相談しよう。' },
  { id: 'orthostatic_dysregulation', name: '起立性調節障害', pattern: /(起立性調節障害|起立性調節|朝.*起きられ|立つと.*(めまい|ふらつ|気持ち悪)|起立時.*動悸)/, question: '失神した、胸が痛い、息苦しい、片側のしびれや麻痺、激しい頭痛、転倒してけがをした、のどれかはある？', detail: '横になっている時は楽で、立つと悪化する？ 測れるなら5分休んだ後と立って1〜3分後の血圧・脈拍を、無理のない範囲で教えて。', advice: '起立時に悪化する症状は起立性調節障害や血圧変動に似るけれど、脱水・貧血・心臓の問題などもある。急に立たず、水分を少しずつ取り、繰り返す場合は測定記録を持って受診しよう。' },
  { id: 'hypertension', name: '高血圧', pattern: /(高血圧|血圧が高|血圧\s*\d{2,3}\s*[\/／]\s*\d{2,3})/, question: '胸痛、息苦しさ、激しい頭痛、ろれつの異常、片側のしびれ・麻痺、視界の異常、意識がぼんやりする感じはある？', detail: '椅子に座って1〜2分安静にして、もう一度血圧を測れる？ 「血圧160/95」のように教えて。処方薬の飲み忘れがあるかも教えて。', advice: '血圧は一回の値だけで断定できない。安静後も高い状態が続くなら、測定時刻と値を記録して医療機関へ相談しよう。処方薬を自己判断で追加したり倍量にしたりしないで。' },
  { id: 'hypotension', name: '低血圧', pattern: /(低血圧|血圧が低|上が\s*(?:80|70|60)|血圧\s*(?:[6-8]\d)\s*[\/／])/, question: '失神した、胸痛、息苦しさ、冷汗、意識がぼんやりする、大量の出血、黒い便、激しい嘔吐や下痢はある？', detail: '横になって休んだ状態で血圧と脈拍を測れる？ 水分は取れている？ 立った時だけ悪化するかも教えて。', advice: '低い血圧にめまいやだるさが伴うなら、横になって転倒を避け、水分を少しずつ取って。繰り返す、薬を飲んだ後に悪化した、安静でもつらい場合は医療機関へ相談しよう。' },
  { id: 'epilepsy', name: 'てんかん', pattern: /(てんかん|癲癇|けいれん|痙攣|発作が起き|意識を失っ.*発作)/, question: '発作は今も続いている、5分以上続いた、短い間隔で繰り返して意識が戻らない、呼吸がおかしい、大きなけがをした、のどれかはある？', detail: '発作は何分くらいで、今は普段どおり受け答えできる？ 処方された発作時の薬を使ったか、いつもの発作と同じかも教えて。', advice: '発作が止まり意識が戻っていても、初めて・いつもと違う・けががある・服薬を中断した場合は早めに主治医へ連絡して。発作中は押さえつけず、口に物を入れず、周囲の危険物を避けて時間を測ろう。' },
  { id: 'fibromyalgia', name: '線維筋痛症', pattern: /(線維筋痛|全身.*痛|体中.*痛|広い範囲.*痛)/, question: '突然の片側の麻痺、力が入らない、胸痛、息苦しさ、高熱、意識の変化、黒い便や大量出血はある？', detail: '痛みはいつからで、0〜10ならどれくらい？ いつもの痛みと同じか、場所や強さが明らかに違うかも教えて。', advice: '線維筋痛症の痛みの悪化に似ていても、新しい病気や薬の影響は除外が必要だよ。処方どおりの薬を守り、無理のない範囲で休息と軽い動きを調整して。新しい痛みや急な悪化は受診相談を。' },
  { id: 'hypothyroidism', name: '甲状腺機能低下症', pattern: /(甲状腺機能低下|橋本病|寒がり.*だる|甲状腺.*薬.*飲み忘)/, question: '強い眠気で起こしても反応しにくい、意識がぼんやりする、呼吸が遅い、体温が35℃未満、脈が極端に遅い、全身が強くむくむ感じはある？', detail: 'だるさ・寒がり・むくみ・便秘などはいつから？ レボチロキシンなどの処方薬を普段どおり飲めているか、直近のTSHやFT4が分かれば教えて。', advice: '甲状腺機能は症状だけでは判断できず、TSH・FT4などの検査が必要だよ。処方薬を自己判断で増減せず、飲み忘れや症状の変化を記録して主治医へ相談しよう。' },
  { id: 'panic_attack', name: 'パニック発作', pattern: /(パニック発作|パニックにな|強い不安.*動悸|息が吸えない.*不安|このまま死ぬ.*怖)/, question: '初めての強い胸痛、失神、片側のしびれ・麻痺、唇が青い、呼吸が明らかに苦しい、自分を傷つけたい気持ちはある？', detail: '今いる場所は安全？ 症状は何分くらい続いている？ 息を無理に深くせず、足の裏の感覚と周りに見えるものをゆっくり確認できそう？', advice: 'パニック発作に似ていても、初回やいつもと違う胸痛・呼吸苦は身体の病気を除外する必要がある。安全な場所で吐く息を長めにして、続く・繰り返す場合は精神科・心療内科やかかりつけへ相談しよう。' }
];

export const RELATED_MEDICATIONS = {
  meniere_disease: ['ベタヒスチン', 'イソソルビド', 'ジフェニドール'],
  bppv: ['原因治療は耳石置換法が中心。薬は急性期の吐き気・めまいに対する対症療法として処方されることがある'],
  orthostatic_dysregulation: ['ミドドリン', 'アメジニウム', 'ドロキシドパ'],
  hypertension: ['アムロジピン', 'エナラプリル', 'ロサルタン', 'テルミサルタン', '利尿薬', 'β遮断薬'],
  hypotension: ['ミドドリン', 'アメジニウム', 'ドロキシドパ'],
  epilepsy: ['レベチラセタム', 'バルプロ酸', 'カルバマゼピン', 'ラモトリギン', 'フェニトイン'],
  fibromyalgia: ['プレガバリン', 'デュロキセチン', 'アミトリプチリン', 'ミルナシプラン'],
  hypothyroidism: ['レボチロキシン'],
  panic_attack: ['セルトラリン', 'エスシタロプラム', 'パロキセチン', '抗不安薬（短期・医師管理）']
};

const noDanger = text => /(全部|どれも)?\s*(なし|ない|ありません|大丈夫)|該当なし/.test(text);
const dangerMention = /(ある|あり|続いて|戻らない|できない|おかしい|ひどい|強い|自傷|死にたい|5分以上|意識.*(ぼんやり|遠|戻ら)|胸.*痛|息苦し|呼吸困難|麻痺|ろれつ|失神|大量.*出血|黒い便|体温.*3[0-4])/;
const bloodPressure = text => {
  const match = text.normalize('NFKC').match(/(?:血圧)?\s*(\d{2,3})\s*[\/／]\s*(\d{2,3})/);
  return match ? { systolic: Number(match[1]), diastolic: Number(match[2]) } : null;
};

const follow = (disease, step, text, data = {}) => ({ matched: true, kind: 'symptom-care', text, state: { topic: 'clinical-triage', disease: disease.id, step, data }, reviewedAt: REVIEWED_AT });
const done = (disease, text, urgent, log = null, level = 'consult') => ({ matched: true, urgent, kind: 'symptom-care', symptom: disease.id, text, state: null, log, triageLevel: level, reviewedAt: REVIEWED_AT });

function urgentMessage(disease) {
  if (disease.id === 'epilepsy') return 'その発作は緊急対応が必要だよ。今すぐ119。発作中なら押さえつけず、口に物を入れず、周囲の危険物を避けて開始時刻を伝えて。';
  if (disease.id === 'panic_attack') return '強い胸痛・失神・明らかな呼吸困難・片側の麻痺、または自分を傷つけたい気持ちがあるなら、パニックだけと決めつけないで今すぐ119。ひとりなら近くの人にも知らせて。';
  return `${disease.name}だけで説明できない危険な症状が含まれている。ここで様子見は勧められないよ。今すぐ119。自分で運転せず、安全な姿勢で待って。`;
}

export function adviseClinicalTriage(rawText, conversationState = null) {
  const text = String(rawText || '').normalize('NFKC').trim();
  if (!text) return null;
  let disease = conversationState?.topic === 'clinical-triage'
    ? TRIAGE_DISEASES.find(item => item.id === conversationState.disease)
    : TRIAGE_DISEASES.find(item => item.pattern.test(text));
  if (!disease) return null;

  const initialBp = bloodPressure(text);
  if (!conversationState && disease.id === 'hypertension' && initialBp && (initialBp.systolic >= 180 || initialBp.diastolic >= 120)) {
    return done(disease, `血圧${initialBp.systolic}/${initialBp.diastolic}は非常に高い値だよ。胸痛、息苦しさ、激しい頭痛、麻痺、ろれつや視界の異常があれば119。なくても今すぐ#7119か医療機関へ連絡して、自己判断で薬を追加しないで。`, true, { kind: '血圧', note: `血圧 ${initialBp.systolic}/${initialBp.diastolic}`, ...initialBp }, 'urgent');
  }

  if (conversationState?.step === 'redflags') {
    if (!noDanger(text) && dangerMention.test(text)) return done(disease, urgentMessage(disease), true, { kind: 'トリアージ', note: `${disease.name}・危険徴候あり` }, 'emergency');
    return follow(disease, 'details', disease.detail, { ...conversationState.data, redFlagsDenied: noDanger(text) });
  }

  if (conversationState?.step === 'details') {
    const bp = bloodPressure(text);
    if (disease.id === 'hypertension' && bp && (bp.systolic >= 180 || bp.diastolic >= 120)) {
      return done(disease, `血圧${bp.systolic}/${bp.diastolic}は非常に高い値だよ。胸痛、息苦しさ、激しい頭痛、麻痺、ろれつや視界の異常があれば119。なくても今すぐ#7119か医療機関へ連絡して、自己判断で薬を追加しないで。`, true, { kind: '血圧', note: `血圧 ${bp.systolic}/${bp.diastolic}`, ...bp }, 'urgent');
    }
    if (disease.id === 'hypotension' && bp && bp.systolic < 90) {
      return done(disease, `血圧${bp.systolic}/${bp.diastolic}を記録した。横になって転倒を避け、水分を少しずつ。意識の変化、胸痛、呼吸苦、冷汗、出血があれば119。症状が続くなら今すぐ#7119か医療機関へ相談して。`, false, { kind: '血圧', note: `血圧 ${bp.systolic}/${bp.diastolic}`, ...bp }, 'urgent-consult');
    }
    const note = `${disease.name}について相談：${text}`;
    return done(disease, `${disease.advice}\n\n今聞いた内容は症状記録に残すね。悪化したり危険症状が出たら、今の案内より119を優先して。`, false, { kind: 'トリアージ', note }, 'consult');
  }

  if (disease.id === 'epilepsy' && /(5分以上|今も.*続|繰り返.*意識.*戻ら|呼吸.*おかし)/.test(text)) return done(disease, urgentMessage(disease), true, { kind: 'トリアージ', note: 'てんかん発作・緊急徴候あり' }, 'emergency');
  return follow(disease, 'redflags', `${disease.name}に関係する症状か確認するね。診断ではなく、まず緊急性を見るよ。\n\n${disease.question}`, { initial: text });
}
