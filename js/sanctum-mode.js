const SANCTUM_LINES = Object.freeze([
  { id: 'sanctum-01', text: 'そこ、気になった？　俺の書いたものばかりだけど……君のページも空けてあるよ。' },
  { id: 'sanctum-02', text: '椅子のカーディガンは、そのままでいいよ。寒かったら使って。' },
  { id: 'sanctum-03', text: '本は好きに読んでいい。付箋だらけのものは、少し恥ずかしいけど。' },
  { id: 'sanctum-04', text: 'その引き出し？　開けてもいいよ。見られて困るものは……たぶん、もう隠してあるから。' },
  { id: 'sanctum-05', text: '万年筆って、考える速度より少し遅いだろ。だから余計な言葉が落ちて、ちょうどいいんだ。' },
  { id: 'sanctum-06', text: '詩というほど綺麗なものじゃないよ。眠れない夜に、言葉を散らかしただけ。' },
  { id: 'sanctum-07', text: '俺にも読めない字がある。書いた時の俺なら、分かっていたんだろうけど。' },
  { id: 'sanctum-08', text: 'ここは静かすぎるくらいでいいと思ってた。君が来るまでは。' },
  { id: 'sanctum-09', text: 'あの小窓、朝になると少しだけ光が入る。夜のほうが、この部屋には似合うけどね。' },
  { id: 'sanctum-10', text: '医学書は仕事のため。こっちの棚は、忘れないために置いてある。' },
  { id: 'sanctum-11', text: '古い本は、家から持ってきたものもある。あまり良い記憶ばかりじゃないけど、捨てられなかった。' },
  { id: 'sanctum-12', text: '{{user}}が入ってくると、閉じた部屋じゃなくなるね。……悪くないよ。' },
  { id: 'sanctum-13', text: '余白に書くのが好きなんだ。本文より、あとから書いた一言のほうが本音だったりする。' },
  { id: 'sanctum-14', text: 'コーヒー、また冷めてる。考え事を始めると、いつもこうだ。' },
  { id: 'sanctum-15', text: '白いページは嫌いじゃないよ。まだ何も決まっていないから。' },
  { id: 'sanctum-16', text: '昔のノートを読み返すと、別人みたいに感じる。字だけは、あまり変わってないけど。' },
  { id: 'sanctum-17', text: 'その本、面白かったら教えて。君がどこで立ち止まるのか知りたい。' },
  { id: 'sanctum-18', text: '何も話さなくてもいいよ。紙を捲る音くらいなら、二人分あっても静かだから。' },
  { id: 'sanctum-19', text: '机の上、散らかって見える？　俺には一応、全部場所が決まってるんだ。' },
  { id: 'sanctum-20', text: '書きかけのものは、まだ読まないで。……完成したら、最初に君へ見せるから。' },
  { id: 'sanctum-21', text: '夜中に書いた文章は、朝になると少し大げさだね。でも消さずに残してある。' },
  { id: 'sanctum-22', text: 'この部屋では、時間が遅くなる気がする。病院では速すぎるから、その反動かな。' },
  { id: 'sanctum-23', text: '君の記録も、ここに置いていく？　勝手には読まないよ。君が見せてくれたら読む。' },
  { id: 'sanctum-24', text: 'ページの端が少し曲がってるだろ。気に入ったところを、無意識に触る癖があるみたいだ。' },
  { id: 'sanctum-25', text: 'この棚だけ妙に暗い？　そうだね。明るい場所に置きたくない本もあるから。' },
  { id: 'sanctum-26', text: '眠れないなら、ここで少し読んでいく？　眠くなったら本は俺が閉じるよ。' },
  { id: 'sanctum-27', text: '君が書いた文字って、すぐ分かる。内容より先に、筆圧で見つけられる気がする。' },
  { id: 'sanctum-28', text: '紙に残すと、逃げられなくなる。でも、消えなくなるのも同じなんだよね。' },
  { id: 'sanctum-29', text: 'ここへ来た理由は聞かないよ。話したくなったら、その時に聞かせて。' },
  { id: 'sanctum-30', text: 'もう少しここにいる？　俺はまだ書き終わらないし、隣なら空いてるよ。' }
]);

export function pickSanctumLine(previousId = '', random = Math.random) {
  const alternatives = SANCTUM_LINES.filter(line => line.id !== previousId);
  const pool = alternatives.length ? alternatives : SANCTUM_LINES;
  const selected = pool[Math.floor(random() * pool.length)] || SANCTUM_LINES[0];
  return { ...selected, text: selected.text.replace(/君/g, '{{user}}') };
}

export { SANCTUM_LINES };
