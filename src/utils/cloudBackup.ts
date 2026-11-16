import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { buildBackup, parseBackup, summarize, type BackupPayload, type BackupSummary } from '@/utils/backup';

/**
 * 云端备份：用微信云开发数据库存「自己的」备份，读写只对本人可见。
 *
 * 说明：
 * - 不用云存储，是因为「所有用户可读」属于付费能力；数据库的「仅创建者可读写」免费可用。
 * - 单条记录有 1MB 上限，所以按字节切片，一条备份由多条分片记录组成。
 * - 微信云开发在 iOS 上实测远达不到 1MB：100KB 的写入就报 data exceed max size，
 *   所以切成 16KB 的小片，逐条写入。
 * - 需要先在云开发控制台建好集合 fitlog_backups（权限：仅创建者可读写）。
 */
const COLLECTION = 'fitlog_backups';
/** 单片大小：按 UTF-8 字节算，16KB 足够小，iOS 上也能稳定写入 */
const CHUNK_BYTES = 16 * 1024;
/** 每份备份最多 60 片（约 1MB），超过就建议用文件备份 */
const MAX_CHUNKS = 60;
/** 云端只保留最近几份，避免无限增长 */
const KEEP_BACKUPS = 3;
/** 自动同步固定用这一份，每次覆盖，不占额外空间 */
const AUTO_BACKUP_ID = 'auto';
/** 集合不存在时不再反复重试，等用户手动操作 */
let collectionMissing = false;
/** 同步进行中，避免定时器和切后台同时写导致分片错乱 */
let syncing = false;
/** 上次同步成功的时间，存在本地用于「我的」页展示 */
const LAST_SYNC_KEY = 'fitlog.cloudLastSync';

export interface CloudBackupMeta {
  backupId: string;
  name: string;
  createdAt: number;
  summary: BackupSummary;
  size: number;
  chunkCount: number;
}

/** 上次同步成功的时间戳，0 表示还没同步过 */
export function getLastSyncAt(): number {
  try {
    return Number(Taro.getStorageSync(LAST_SYNC_KEY)) || 0;
  } catch {
    return 0;
  }
}

function markSynced(at: number): void {
  try {
    Taro.setStorageSync(LAST_SYNC_KEY, String(at));
  } catch {
    // 记录失败不影响备份本身
  }
}

/** 当前环境能不能用云备份（只有小程序有云开发） */
export function cloudAvailable(): boolean {
  return process.env.TARO_ENV === 'weapp' && Boolean(Taro.cloud);
}

function collection() {
  return Taro.cloud.database().collection(COLLECTION);
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const size = code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    if (bytes + size > CHUNK_BYTES && i > start) {
      chunks.push(text.slice(start, i));
      start = i;
      bytes = 0;
    }
    bytes += size;
  }
  if (start < text.length) chunks.push(text.slice(start));
  return chunks.length ? chunks : [''];
}

/** 云端错误转成人话；认不出来的把原始错误码和文案带出来，方便定位 */
function friendlyError(error: unknown, sizeHint = ''): string {
  const err = error as { errCode?: number | string; errMsg?: string; message?: string };
  const msg = String(err?.errMsg ?? err?.message ?? '') || String(error ?? '');
  const code = err?.errCode === undefined ? '' : String(err.errCode);
  const brief = msg.replace(/^[\w.]*:fail\s*/, '').trim().slice(0, 60);
  if (
    msg.includes('collection not exists') ||
    msg.includes('DATABASE_COLLECTION_NOT_EXIST') ||
    code === '-502005'
  ) {
    collectionMissing = true;
    return '云端还没有备份空间，请先在云开发控制台创建 fitlog_backups 集合';
  }
  if (msg.includes('permission denied') || code === '-502003') {
    return '云端拒绝了写入，请把 fitlog_backups 的数据权限改成「仅创建者可读写」';
  }
  if (msg.includes('timeout') || msg.includes('network') || msg.includes('request:fail')) {
    return '网络不太好，稍后再试';
  }
  if (msg.includes('exceed') || msg.includes('too large')) {
    return `云端说数据超限：${brief || '无描述'}${sizeHint}`;
  }
  if (!brief && !code) return '云端操作失败，稍后再试';
  return `云端操作失败（${code || '无错误码'}：${brief || '无描述'}）`;
}

/** 小程序端单次 get 最多 20 条，这里按页取完 */
async function fetchRows(
  build: (query: any) => any,
  max = 40
): Promise<Array<{ backupId: string; chunkIndex: number; chunk: string; _id: string; name: string; createdAt: number; summary: BackupSummary; size: number; chunkCount: number }>> {
  const rows: any[] = [];
  for (let skip = 0; skip < max; skip += 20) {
    const res = await build(collection()).skip(skip).limit(20).get();
    rows.push(...res.data);
    if (res.data.length < 20) break;
  }
  return rows;
}

/** 读出云端已有的备份列表（按时间倒序，同一个 backupId 只算一份） */
export async function listCloudBackups(): Promise<CloudBackupMeta[]> {
  const rows = await fetchRows((query) => query.orderBy('createdAt', 'desc'), 200);
  const map = new Map<string, CloudBackupMeta>();
  rows.forEach((row) => {
    if (!row.backupId || map.has(row.backupId)) return;
    map.set(row.backupId, {
      backupId: row.backupId,
      name: row.name,
      createdAt: row.createdAt,
      summary: row.summary,
      size: row.size,
      chunkCount: row.chunkCount
    });
  });
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/** 把当前数据备份到云端 */
export async function uploadCloudBackup(): Promise<CloudBackupMeta> {
  const payload = buildBackup();
  const text = JSON.stringify(payload);
  const chunks = chunkText(text);
  if (chunks.length > MAX_CHUNKS) {
    throw new Error('数据太大，请改用「导出备份」保存成文件');
  }

  const createdAt = Date.now();
  const meta: CloudBackupMeta = {
    backupId: `b${createdAt}`,
    name: `fitlog-backup-${dayjs(createdAt).format('YYYYMMDD-HHmm')}`,
    createdAt,
    summary: summarize(payload.data),
    size: text.length,
    chunkCount: chunks.length
  };

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      await collection().add({
        data: {
          ...meta,
          chunkIndex: index,
          chunk: chunks[index]
        }
      });
    }
    await pruneOldBackups(meta.backupId);
    markSynced(createdAt);
    return meta;
  } catch (error) {
    console.warn('[cloudBackup] 上传失败', error);
    throw new Error(friendlyError(error, `（本次 ${chunks.length} 片 / 压缩后 ${Math.round(text.length / 1024)}K）`));
  }
}

/** 只保留最近 KEEP_BACKUPS 份：多出来的分片逐条删掉（自动同步那份永远保留） */
async function pruneOldBackups(latestId: string): Promise<void> {
  try {
    const list = await listCloudBackups();
    const keep = new Set<string>([latestId, AUTO_BACKUP_ID]);
    list
      .filter((item) => item.backupId !== latestId && item.backupId !== AUTO_BACKUP_ID)
      .slice(0, KEEP_BACKUPS - 1)
      .forEach((item) => keep.add(item.backupId));
    const stale = list.filter((item) => !keep.has(item.backupId));
    for (const item of stale) {
      await deleteCloudBackup(item.backupId);
    }
  } catch (error) {
    // 清理失败不影响本次备份
    console.warn('[cloudBackup] 清理旧备份失败', error);
  }
}

/**
 * 自动同步：固定覆盖 'auto' 这一份。
 * 只在小程序端、集合可用、数据量没超标时执行；失败静默，不打扰用户。
 */
export async function autoSyncToCloud(): Promise<void> {
  if (!cloudAvailable() || collectionMissing || syncing) return;
  syncing = true;
  try {
    const payload = buildBackup();
    const data = payload.data;
    // 本地完全是空数据时不上传，避免把云端的备份覆盖成空
    const hasData =
      data.sessions.length > 0 ||
      data.plans.length > 0 ||
      Object.keys(data.dietDays).length > 0 ||
      data.bodyRecords.length > 0;
    if (!hasData) return;

    const text = JSON.stringify(payload);
    const chunks = chunkText(text);
    if (chunks.length > MAX_CHUNKS) return;

    const createdAt = Date.now();
    const meta = {
      backupId: AUTO_BACKUP_ID,
      name: `自动同步 ${dayjs(createdAt).format('M/D HH:mm')}`,
      createdAt,
      summary: summarize(payload.data),
      size: text.length,
      chunkCount: chunks.length
    };

    // 先清掉上一份自动同步，再写新的
    await deleteCloudBackup(AUTO_BACKUP_ID);
    for (let index = 0; index < chunks.length; index += 1) {
      await collection().add({
        data: { ...meta, chunkIndex: index, chunk: chunks[index] }
      });
    }
    markSynced(createdAt);
  } catch (error) {
    console.warn('[cloudBackup] 自动同步失败', error);
    friendlyError(error);
  } finally {
    syncing = false;
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** 数据变动后延迟同步：连续操作只上传最后一次 */
export function scheduleCloudSync(delay = 60 * 1000): void {
  if (!cloudAvailable() || collectionMissing) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void autoSyncToCloud();
  }, delay);
}

/** 判断云端有没有可恢复的备份（自动同步那份也算） */
export async function hasCloudBackup(): Promise<boolean> {
  if (!cloudAvailable() || collectionMissing) return false;
  try {
    const list = await listCloudBackups();
    return list.length > 0;
  } catch (error) {
    friendlyError(error);
    return false;
  }
}

/** 删除一份云端备份（逐条删，小程序端不支持批量 remove） */
export async function deleteCloudBackup(backupId: string): Promise<void> {
  const rows = await fetchRows((query) => query.where({ backupId }), 120);
  for (const row of rows) {
    await collection().doc(row._id).remove({});
  }
}

/** 取回一份云端备份，校验格式后返回 */
export async function downloadCloudBackup(backupId: string): Promise<BackupPayload> {
  try {
    const rows = await fetchRows((query) => query.where({ backupId }).orderBy('chunkIndex', 'asc'), 120);
    if (!rows.length) throw new Error('这份备份已经不存在了');
    const text = rows
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map((row) => row.chunk)
      .join('');
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.payload;
  } catch (error) {
    const message = (error as Error)?.message;
    if (
      message === '这份备份已经不存在了' ||
      message === '这不是练记的备份文件' ||
      message === '备份内容不完整' ||
      message === '文件内容不是有效的 JSON'
    ) {
      throw error;
    }
    console.warn('[cloudBackup] 下载失败', error);
    throw new Error(friendlyError(error));
  }
}
