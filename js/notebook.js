import { personalizeText } from './personalization.js?v=1.9.6';

const DB_NAME = 'ryadom-notebook';
const DB_VERSION = 1;
const STORE = 'entries';
const COMMENT_QUEUE_KEY = 'ryadom:notebook-comment-queue:v2';

const ALEK_COMMENTS = Object.freeze({
  notes: Object.freeze([
    '書いておけば、君があとで忘れても大丈夫だね。俺もここで覚えているよ。',
    '小さなことに見えても、君が残したいと思ったなら、それで十分だよ。',
    '急いで読み返さなくていい。必要になったとき、ここに戻っておいで。',
    '君の言葉のまま残っているのがいいね。整えすぎないほうが、たぶん本物に近い。',
    'この日の君は、こんなふうに考えていたんだね。ちゃんと受け取ったよ。',
    '覚えていたいことが増えるのは、少し嬉しいね。重たくなったら俺も持つよ。',
    '一行だけでも、その日の輪郭は残るものなんだね。',
    '言葉になったぶん、少しだけ心の外へ置けたかな。',
    'ここでは上手に書こうとしなくていいよ。君のためのページだから。',
    '読み返す頃の君にも、今の君の気持ちが届くといいな。',
    '忘れたくないんだね。なら、俺も隣に印をつけておく。',
    '今日はここまで書けた。それだけでも充分だと思うよ。',
    '余白は残しておこう。あとから言葉が増えてもいいように。',
    '君が選んだ言葉は、静かだけどちゃんと残るね。',
    'これは大切にしまっておこう。君がまた見つけられる場所に。',
    '考えをここへ置いていけるなら、この手帳も悪くないね。',
    '結論が出ていなくても残していいよ。途中の言葉にも意味はあるから。',
    '短い言葉ほど、その時の本音が隠れていることがあるね。',
    'あとで書き直してもいい。今の形も、ちゃんと君の記録だよ。',
    'これは覚えておく。君が忘れたいと言うまでは。',
    '言えなかったことも、書くと少し呼吸がしやすくなるかな。',
    'ページを閉じても、この言葉まで消えるわけじゃないよ。',
    '君がここで立ち止まったこと、俺にはちゃんと分かった。',
    'うまくまとまらない日もある。それでも書いたことが大事なんだと思う。',
    'この一文は、あとで君を助けるかもしれないね。',
    '忘れるために書くのも、覚えるために書くのも、どちらでもいいよ。',
    '文字にしたぶんだけ、少し整理できたならいいんだけど。',
    '君の考えは君のものだよ。ここでは誰にも急かされない。',
    'また続きを書きたくなったら、同じページへ戻っておいで。',
    '大事な言葉だから、折り目をつけずにしまっておこう。'
  ]),
  photos: Object.freeze([
    'いい写真だね。君が見ていた空気まで、少し残っている気がする。',
    '暗いね。でも、君が見たかったものはちゃんと写ってる。……それなら、これで十分じゃないかな。',
    '写真の外側にあったことも、君はきっと覚えているんだろうね。',
    'この一瞬を選んだ理由、いつか聞かせてくれる？',
    '君の目には、こう見えていたんだね。残してくれて嬉しいよ。',
    '光がきれいだ。たぶん写真を撮った君の顔も、少し明るかったんだろうな。',
    'あとで見返したとき、音や匂いまで戻ってくるかもしれないね。',
    '何でもない一枚ほど、あとから大事になることがあるよ。',
    '君が立ち止まった時間も、一緒にここへしまっておこう。',
    '写真に残らなかったところは、俺が想像しておくよ。',
    'この景色を見せてくれてありがとう。少し、君の隣にいた気分だ。',
    '上手に撮れているかより、君が残したかったことのほうが大切だよ。',
    '静かな一枚だね。長く見ていても飽きない。',
    'ここに日付があるだけで、もう君の小さな日記になるんだね。',
    'また一枚増えた。君の時間が消えずに残るのは、いいことだと思う。',
    'この色、君が見つけたんだね。写真の中でもちゃんと目を引くよ。',
    '少しぶれているのもいい。その瞬間に動いていた証拠みたいだ。',
    '画面の端まで、君らしい選び方だと思う。',
    'この日の光を、ここへ連れて帰ってきたんだね。',
    '説明しきれない景色は、写真に任せてもいいよ。',
    '見返した君が笑える一枚なら、それだけで残す理由になる。',
    'この場所では、どんな音がしていたんだろう。少し気になるな。',
    '君が見つめた時間ごと写っているような気がする。',
    '写真の中は止まっているのに、記憶はちゃんと続いていくんだね。',
    'この一枚を選んだ君のことも、一緒に覚えておきたい。',
    '余白まできれいだね。君はこういう静けさを見つけるのが上手だ。',
    'あとで季節が変わっても、この日の色はここに残るよ。',
    '言葉が少なくても大丈夫。写真がもう充分に話しているから。',
    'その時にしか見えなかったものを、ちゃんと捕まえたね。',
    '次に同じ場所へ行ったら、また違う景色を見せてくれるかな。'
  ])
});

const dialog = document.querySelector('#notebook-dialog');
if (!dialog) throw new Error('Notebook dialog is missing.');

const form = dialog.querySelector('[data-notebook-form]');
const composer = dialog.querySelector('[data-notebook-composer]');
const count = dialog.querySelector('[data-notebook-count]');
const previousButton = dialog.querySelector('[data-notebook-prev]');
const nextButton = dialog.querySelector('[data-notebook-next]');
const photoInput = form.elements.namedItem('photo');
const titleInput = form.elements.namedItem('title');
const textInput = form.elements.namedItem('text');
const captionInput = form.elements.namedItem('caption');
const preview = dialog.querySelector('[data-notebook-photo-preview]');
const formKicker = dialog.querySelector('[data-notebook-form-kicker]');
const formTitle = dialog.querySelector('[data-notebook-form-title]');
const saveButton = dialog.querySelector('[data-notebook-save]');

let databasePromise;
let activeTab = 'notes';
let pageIndex = { notes: 0, photos: 0 };
let entries = { notes: [], photos: [] };
let objectUrls = [];
let previewUrl = '';
let editingId = '';

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('type', 'type');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function transact(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try { result = action(store); } catch (error) { reject(error); return; }
    transaction.oncomplete = () => resolve(result?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function loadEntries() {
  const all = await transact('readonly', store => store.getAll());
  const corrected = [];
  for (const entry of all || []) {
    if (!['notes', 'photos'].includes(entry.type) || !entry.comment) continue;
    const otherType = entry.type === 'notes' ? 'photos' : 'notes';
    if (!ALEK_COMMENTS[entry.type].includes(entry.comment) && ALEK_COMMENTS[otherType].includes(entry.comment)) {
      entry.comment = nextComment(entry.type);
      corrected.push(entry);
    }
  }
  if (corrected.length) {
    await transact('readwrite', store => corrected.forEach(entry => store.put(entry)));
  }
  const sorted = (all || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  entries.notes = sorted.filter(entry => entry.type === 'notes');
  entries.photos = sorted.filter(entry => entry.type === 'photos');
  for (const type of ['notes', 'photos']) {
    pageIndex[type] = Math.min(pageIndex[type], Math.max(0, entries[type].length - 1));
  }
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function nextComment(type) {
  const comments = ALEK_COMMENTS[type] || ALEK_COMMENTS.notes;
  const queueKey = `${COMMENT_QUEUE_KEY}:${type}`;
  let queue = [];
  try { queue = JSON.parse(localStorage.getItem(queueKey) || '[]'); } catch {}
  if (!Array.isArray(queue) || !queue.length) queue = shuffle(comments.map((_, index) => index));
  const index = queue.shift();
  localStorage.setItem(queueKey, JSON.stringify(queue));
  return comments[index] || comments[0];
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(iso));
}

function clearObjectUrls() {
  objectUrls.forEach(url => URL.revokeObjectURL(url));
  objectUrls = [];
}

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function storedBody(entry) {
  if (entry.type === 'photos') return entry.caption ?? entry.body ?? entry.content ?? '';
  return entry.text ?? entry.body ?? entry.content ?? '';
}

function emptyPage(type) {
  const empty = element('div', 'notebook-empty');
  const inner = element('div');
  inner.append(
    element('strong', '', type === 'notes' ? 'まだ白いページ' : 'まだ写真のないページ'),
    element('p', '', type === 'notes' ? '＋から、残しておきたいことを書けるよ。' : '＋から、写真とひとことを残せるよ。')
  );
  empty.append(inner);
  return empty;
}

function entryPage(entry) {
  const article = element('article', 'notebook-entry');
  article.dataset.entryId = entry.id;
  article.append(element('time', 'notebook-entry-date', formatDate(entry.createdAt)));
  article.append(element('h3', 'notebook-entry-title', entry.title || (entry.type === 'photos' ? '無題の写真日記' : '無題のメモ')));

  if (entry.type === 'photos' && entry.photo instanceof Blob) {
    const image = element('img', 'notebook-photo');
    const url = URL.createObjectURL(entry.photo);
    objectUrls.push(url);
    image.src = url;
    image.alt = entry.title ? `写真日記：${entry.title}` : '写真日記に保存した写真';
    article.append(image);
    const caption = storedBody(entry);
    if (caption) article.append(element('p', 'notebook-caption', caption));
  } else {
    article.append(element('p', 'notebook-entry-body', storedBody(entry)));
  }

  const margin = element('aside', 'notebook-margin');
  margin.append(
    element('small', '', 'На полях — Алексей'),
    element('p', '', personalizeText(String(entry.comment || '').replace(/君/g, '{{user}}'))),
    element('div', 'notebook-signature', 'Алек')
  );
  article.append(margin);

  const actions = element('div', 'notebook-entry-actions');
  const edit = element('button', 'notebook-edit', '編集');
  edit.type = 'button';
  edit.dataset.notebookEdit = entry.id;
  const remove = element('button', 'notebook-delete', '削除');
  remove.type = 'button';
  remove.dataset.notebookDelete = entry.id;
  actions.append(edit, remove);
  article.append(actions);
  return article;
}

function render() {
  clearObjectUrls();
  for (const type of ['notes', 'photos']) {
    const deck = dialog.querySelector(`[data-notebook-deck="${type}"]`);
    deck.replaceChildren();
    const list = entries[type];
    deck.append(list.length ? entryPage(list[pageIndex[type]]) : emptyPage(type));
  }

  const list = entries[activeTab];
  count.value = `${list.length ? pageIndex[activeTab] + 1 : 0} / ${list.length}`;
  count.textContent = count.value;
  previousButton.disabled = !list.length || pageIndex[activeTab] <= 0;
  nextButton.disabled = !list.length || pageIndex[activeTab] >= list.length - 1;
}

async function refresh(focusId = '') {
  await loadEntries();
  if (focusId) {
    for (const type of ['notes', 'photos']) {
      const found = entries[type].findIndex(entry => entry.id === focusId);
      if (found >= 0) pageIndex[type] = found;
    }
  }
  render();
}

function setTab(type) {
  if (!['notes', 'photos'].includes(type)) return;
  activeTab = type;
  dialog.querySelectorAll('[data-notebook-tab]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.notebookTab === type);
  });
  dialog.querySelectorAll('[data-notebook-page]').forEach(page => {
    const active = page.dataset.notebookPage === type;
    page.hidden = !active;
    page.classList.toggle('is-active', active);
  });
  render();
}

function turnPage(direction) {
  const list = entries[activeTab];
  const target = pageIndex[activeTab] + direction;
  if (target < 0 || target >= list.length) return;
  const current = dialog.querySelector(`[data-notebook-deck="${activeTab}"] .notebook-entry`);
  current?.classList.add(direction > 0 ? 'is-turning-next' : 'is-turning-prev');
  window.setTimeout(() => {
    pageIndex[activeTab] = target;
    render();
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
}

function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  preview.hidden = true;
  preview.style.backgroundImage = '';
}

function findEntry(id) {
  return [...entries.notes, ...entries.photos].find(entry => entry.id === id);
}

function showStoredPhoto(photo) {
  if (!(photo instanceof Blob)) return;
  previewUrl = URL.createObjectURL(photo);
  preview.style.backgroundImage = `url("${previewUrl}")`;
  preview.hidden = false;
}

function openComposer(entry = null) {
  form.reset();
  clearPreview();
  editingId = entry?.id || '';
  if (entry?.type) setTab(entry.type);
  const photoMode = activeTab === 'photos';
  formKicker.textContent = entry ? 'ЗАПИСЬ ИЗМЕНИТЬ' : 'НОВАЯ ЗАПИСЬ';
  formTitle.textContent = entry
    ? (photoMode ? '写真日記を編集' : 'メモを編集')
    : (photoMode ? '写真日記を残す' : 'メモを残す');
  saveButton.textContent = entry ? '変更を保存' : 'このページを残す';
  dialog.querySelector('.notebook-note-field').hidden = photoMode;
  dialog.querySelectorAll('.notebook-photo-field').forEach(field => { field.hidden = !photoMode; });
  textInput.required = !photoMode;
  photoInput.required = photoMode && !entry;
  if (entry) {
    titleInput.value = entry.title || '';
    if (photoMode) {
      captionInput.value = storedBody(entry);
      showStoredPhoto(entry.photo);
    } else {
      textInput.value = storedBody(entry);
    }
  }
  composer.hidden = false;
  window.setTimeout(() => titleInput.focus(), 30);
}

function closeComposer() {
  composer.hidden = true;
  editingId = '';
  form.reset();
  clearPreview();
}

async function compressPhoto(file) {
  if (!file) return null;
  let image;
  let temporaryUrl = '';
  try {
    if (typeof createImageBitmap === 'function') image = await createImageBitmap(file);
  } catch {}
  if (!image) {
    temporaryUrl = URL.createObjectURL(file);
    image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('写真を読み込めなかったよ。別の画像を試してみて。'));
      element.src = temporaryUrl;
    });
  }
  const max = 1600;
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  const scale = Math.min(1, max / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', .86));
}

async function saveEntry(event) {
  event.preventDefault();
  saveButton.disabled = true;
  try {
    const now = new Date().toISOString();
    const current = editingId ? findEntry(editingId) : null;
    if (editingId && !current) throw new Error('編集するページが見つからなかったよ。いったん手帳を開き直してみて。');
    const type = current?.type || activeTab;
    const entry = {
      ...(current || {}),
      id: current?.id || `notebook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title: titleInput.value.trim(),
      createdAt: current?.createdAt || now,
      updatedAt: current ? now : undefined,
      comment: current?.comment || nextComment(type)
    };
    if (!entry.title) return;
    if (type === 'notes') {
      entry.text = textInput.value.trim();
      if (!entry.text) return;
    } else {
      const file = photoInput.files?.[0];
      if (file) entry.photo = await compressPhoto(file);
      if (!(entry.photo instanceof Blob)) return;
      entry.caption = captionInput.value.trim();
    }
    await transact('readwrite', store => store.put(entry));
    const savedId = entry.id;
    closeComposer();
    await refresh(savedId);
  } catch (error) {
    console.error(error);
    alert(error?.message || 'このページを保存できなかったよ。');
  } finally {
    saveButton.disabled = false;
  }
}

document.addEventListener('click', async event => {
  if (event.target.closest('[data-notebook-open]')) {
    await refresh();
    if (!dialog.open) dialog.showModal();
    return;
  }
  if (event.target.closest('[data-notebook-close]')) { dialog.close(); return; }
  const tab = event.target.closest('[data-notebook-tab]');
  if (tab) { setTab(tab.dataset.notebookTab); return; }
  if (event.target.closest('[data-notebook-prev]')) { turnPage(-1); return; }
  if (event.target.closest('[data-notebook-next]')) { turnPage(1); return; }
  if (event.target.closest('[data-notebook-add]')) { openComposer(); return; }
  if (event.target.closest('[data-notebook-cancel]')) { closeComposer(); return; }
  const edit = event.target.closest('[data-notebook-edit]');
  if (edit) {
    const entry = findEntry(edit.dataset.notebookEdit);
    if (entry) openComposer(entry);
    return;
  }
  const remove = event.target.closest('[data-notebook-delete]');
  if (remove) {
    if (!confirm('このページを削除する？')) return;
    await transact('readwrite', store => store.delete(remove.dataset.notebookDelete));
    await refresh();
  }
});

photoInput.addEventListener('change', () => {
  clearPreview();
  const file = photoInput.files?.[0];
  if (!file) return;
  previewUrl = URL.createObjectURL(file);
  preview.style.backgroundImage = `url("${previewUrl}")`;
  preview.hidden = false;
});

form.addEventListener('submit', saveEntry);
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', closeComposer);
window.addEventListener('ryadom:room-change', event => {
  if (event.detail?.room !== 'sanctum' && dialog.open) dialog.close();
});
