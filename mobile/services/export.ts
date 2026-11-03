import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { all } from './db';
import { listBloodTests } from './blood-test-service';

/** Every user-data table. Blood tests are exported decrypted (via the service). */
export const EXPORT_TABLES = [
  'daily_metrics',
  'food_log',
  'workouts',
  'hydration_log',
  'todos',
  'wardrobe_items',
  'grooming_routines',
  'knowledge_nodes',
  'learning_media',
  'skills',
  'education_marks',
  'college_activities',
  'finance_transactions',
  'finance_subscriptions',
  'investments',
  'travel_trips',
  'travel_stops',
  'user_ranks',
  'achievements',
  'user_purchases',
  'points_log',
  'settings',
] as const;

/** Requires the app to be unlocked (blood tests are decrypted). */
export async function buildExport(): Promise<Record<string, unknown>> {
  const tables: Record<string, unknown[]> = {};
  for (const t of EXPORT_TABLES) tables[t] = await all(`SELECT * FROM ${t}`);
  return {
    app: 'lif.os',
    version: 2,
    exportedAt: new Date().toISOString(),
    // The file itself is plaintext: treat it as sensitive.
    bloodTests: await listBloodTests(Number.MAX_SAFE_INTEGER),
    tables,
  };
}

const EXPORT_PREFIX = 'lifos-export-';

/**
 * Deletes earlier plaintext exports. Not done right after sharing: on Android
 * shareAsync can resolve before the receiving app has read the file.
 */
function removeOldExports(): void {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && entry.name.startsWith(EXPORT_PREFIX)) entry.delete();
    }
  } catch {
    // Best effort; the OS clears the cache eventually.
  }
}

export async function exportAllData(): Promise<{ uri: string; fileSize: number }> {
  removeOldExports();
  const json = JSON.stringify(await buildExport(), null, 2);
  // Cache, not documents: the file is plaintext and is removed on the next export.
  const file = new File(Paths.cache, `${EXPORT_PREFIX}${Date.now()}.json`);
  file.create({ overwrite: true });
  file.write(json);
  return { uri: file.uri, fileSize: file.info().size ?? json.length };
}

export async function shareExport(): Promise<{ uri: string }> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const { uri } = await exportAllData();
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export lif.os data', UTI: 'public.json' });
  return { uri };
}
