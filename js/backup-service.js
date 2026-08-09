import { zipSync, unzipSync, strToU8, strFromU8 } from './fflate.js';
import { DATA_STORES, db } from './db.js?v=0.9.0';

const FORMAT = 'ryadom-personal-backup';
const FORMAT_VERSION = 1;

function safeFileDate(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function downloadBytes(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function collectPersonalData() {
  const stores = {};
  for (const name of DATA_STORES) stores[name] = await db.all(name);
  const localSettings = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('ryadom:')) localSettings[key] = localStorage.getItem(key);
  }
  return { stores, localSettings };
}

function makeArchive(payload) {
  const createdAt = new Date().toISOString();
  const manifest = { format: FORMAT, formatVersion: FORMAT_VERSION, createdAt, app: 'Рядом' };
  return zipSync({
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'personal-data.json': strToU8(JSON.stringify(payload, null, 2))
  }, { level: 6 });
}

export async function exportBackup({ prefix = 'Ryadom-backup' } = {}) {
  const bytes = makeArchive(await collectPersonalData());
  downloadBytes(bytes, `${prefix}-${safeFileDate()}.zip`);
  return bytes;
}

function parseArchive(bytes) {
  let files;
  try { files = unzipSync(new Uint8Array(bytes)); }
  catch { throw new Error('ZIPを開けませんでした。破損している可能性があります。'); }
  if (!files['manifest.json'] || !files['personal-data.json']) throw new Error('РядомのバックアップZIPではありません。');
  let manifest;
  let data;
  try {
    manifest = JSON.parse(strFromU8(files['manifest.json']));
    data = JSON.parse(strFromU8(files['personal-data.json']));
  } catch { throw new Error('バックアップ内のJSONを読み取れませんでした。'); }
  if (manifest.format !== FORMAT || manifest.formatVersion !== FORMAT_VERSION) throw new Error('対応していないバックアップ形式です。');
  if (!data || typeof data !== 'object' || !data.stores || typeof data.stores !== 'object') throw new Error('個人データの構造が正しくありません。');
  for (const name of DATA_STORES) {
    if (!Array.isArray(data.stores[name])) throw new Error(`データ領域「${name}」が不足しています。`);
    if (data.stores[name].some(item => !item || typeof item !== 'object' || typeof item.id !== 'string')) {
      throw new Error(`データ領域「${name}」に不正な記録があります。`);
    }
  }
  if (data.localSettings != null && (typeof data.localSettings !== 'object' || Array.isArray(data.localSettings))) {
    throw new Error('設定データの構造が正しくありません。');
  }
  return { manifest, data };
}

async function replacePersonalData(data) {
  for (const name of DATA_STORES) await db.clear(name);
  for (const name of DATA_STORES) {
    for (const item of data.stores[name]) await db.put(name, item);
  }
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('ryadom:')) localStorage.removeItem(key);
  }
  for (const [key, value] of Object.entries(data.localSettings || {})) {
    if (key.startsWith('ryadom:') && typeof value === 'string') localStorage.setItem(key, value);
  }
}

export async function importBackup(file) {
  if (!file || file.size > 25 * 1024 * 1024) throw new Error('バックアップZIPは25MB以下にしてください。');
  const { manifest, data } = parseArchive(await file.arrayBuffer());
  const current = await collectPersonalData();
  downloadBytes(makeArchive(current), `Ryadom-before-restore-${safeFileDate()}.zip`);
  try {
    await replacePersonalData(data);
  } catch (error) {
    await replacePersonalData(current).catch(() => {});
    throw new Error(`復元に失敗したため元のデータへ戻しました。${error?.message || ''}`);
  }
  return manifest;
}
