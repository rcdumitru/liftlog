import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { DEFAULT_PROFILE, GOAL_PRESETS } from './defaults';
import { getState, setState } from './store';
import { ACCENTS, setThemePrefs } from './theme';
import type { Exercise, Profile, Session, SessionEntry, SetLog, WorkoutDay } from './types';

/**
 * Backups are plain JSON: the same data the app stores, wrapped with an app tag and a format
 * version so future versions can tell what they're reading. The in-progress workout isn't included.
 */
const FORMAT = 1;

export interface Backup {
  exportedAt: string;
  days: WorkoutDay[];
  sessions: Session[];
  profile: Profile;
}

/* ---------------- export ---------------- */

export async function exportBackup() {
  const { days, sessions, profile } = getState();
  const json = JSON.stringify(
    {
      app: 'liftlog',
      format: FORMAT,
      exportedAt: new Date().toISOString(),
      profile,
      days,
      // Drop logging-only flags; only the numbers matter in a backup.
      sessions: sessions.map((x) => ({ ...x, entries: x.entries.map((e) => ({ ...e, sets: e.sets.map(({ weight, reps, done }) => ({ weight, reps, done })) })) })),
    },
    null,
    2,
  );
  const name = `liftlog-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    // Browsers can't share local files, so download it instead.
    const doc = (globalThis as any).document;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = doc.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device.');
  // The share sheet lets you save to Files / Drive, email it, or send it to another phone.
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save Liftlog backup' });
}

/* ---------------- import ---------------- */

/** Lets the user pick a backup file and returns it parsed and checked, or null if they cancelled. */
export async function pickBackup(): Promise<Backup | null> {
  // Some Android file managers report .json as octet-stream, so accept anything and validate the content.
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return parseBackup(text);
}

export function parseBackup(text: string): Backup {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  if (!raw || raw.app !== 'liftlog' || !Array.isArray(raw.days) || !Array.isArray(raw.sessions)) {
    throw new Error('That file isn’t a Liftlog backup.');
  }
  if (typeof raw.format !== 'number' || raw.format > FORMAT) {
    throw new Error('This backup was made by a newer version of Liftlog. Update the app and try again.');
  }
  const days = raw.days.map(toDay).filter(Boolean) as WorkoutDay[];
  const sessions = (raw.sessions.map(toSession).filter(Boolean) as Session[]).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return { exportedAt: str(raw.exportedAt), days, sessions, profile: toProfile(raw.profile) };
}

/**
 * Merge adds days and workouts you don't already have (matched by id) and keeps your settings.
 * Replace swaps everything for the backup, settings included, and drops any workout in progress.
 */
export function applyBackup(b: Backup, mode: 'merge' | 'replace') {
  if (mode === 'replace') {
    setState({ days: b.days, sessions: b.sessions, profile: b.profile, active: null });
  } else {
    setState((s) => {
      const dayIds = new Set(s.days.map((d) => d.id));
      const sessionIds = new Set(s.sessions.map((x) => x.id));
      return {
        days: [...s.days, ...b.days.filter((d) => !dayIds.has(d.id))],
        sessions: [...s.sessions, ...b.sessions.filter((x) => !sessionIds.has(x.id))].sort((a, c) => a.startedAt.localeCompare(c.startedAt)),
      };
    });
  }
  const { profile } = getState();
  setThemePrefs(profile.themeMode, profile.accent);
}

/* ---------------- validation: keep what's usable, fill gaps, skip broken items ---------------- */

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const KINDS = ['compound', 'isolation', 'bodyweight', 'cardio'] as const;

function toExercise(v: any): Exercise | null {
  if (!v || typeof v.id !== 'string' || typeof v.name !== 'string') return null;
  return {
    id: v.id,
    name: v.name,
    muscle: str(v.muscle),
    kind: KINDS.includes(v.kind) ? v.kind : 'compound',
    sets: num(v.sets, 3),
    repsMin: num(v.repsMin, 8),
    repsMax: num(v.repsMax, 12),
    restSec: num(v.restSec, 90),
    increment: num(v.increment, 2.5),
    ...(typeof v.notes === 'string' && v.notes ? { notes: v.notes } : {}),
  };
}

function toDay(v: any): WorkoutDay | null {
  if (!v || typeof v.id !== 'string' || !Array.isArray(v.exercises)) return null;
  return { id: v.id, name: str(v.name, 'Workout'), focus: str(v.focus), exercises: v.exercises.map(toExercise).filter(Boolean) as Exercise[] };
}

function toSet(v: any): SetLog | null {
  if (!v) return null;
  return { weight: num(v.weight), reps: num(v.reps), done: v.done === true };
}

function toEntry(v: any): SessionEntry | null {
  if (!v || typeof v.name !== 'string' || !Array.isArray(v.sets)) return null;
  const t = v.target ?? {};
  return {
    exerciseId: str(v.exerciseId),
    name: v.name,
    target: { sets: num(t.sets, v.sets.length), repsMin: num(t.repsMin, 8), repsMax: num(t.repsMax, 12) },
    sets: v.sets.map(toSet).filter(Boolean) as SetLog[],
  };
}

function toSession(v: any): Session | null {
  if (!v || typeof v.id !== 'string' || !Array.isArray(v.entries) || Number.isNaN(Date.parse(v.startedAt))) return null;
  return {
    id: v.id,
    dayId: str(v.dayId),
    dayName: str(v.dayName, 'Workout'),
    startedAt: v.startedAt,
    ...(typeof v.finishedAt === 'string' && !Number.isNaN(Date.parse(v.finishedAt)) ? { finishedAt: v.finishedAt } : {}),
    entries: v.entries.map(toEntry).filter(Boolean) as SessionEntry[],
  };
}

const ALLOWED: Record<string, readonly unknown[]> = {
  units: ['kg', 'lb'],
  goal: Object.keys(GOAL_PRESETS),
  progressGroup: ['day', 'muscle'],
  themeMode: ['dark', 'light'],
  accent: Object.keys(ACCENTS),
};

/** Known settings only, each kept just if it has the right type (and an allowed value, for choices). */
function toProfile(v: any): Profile {
  const out = { ...DEFAULT_PROFILE } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_PROFILE)) {
    const val = v?.[key];
    if (typeof val === typeof out[key] && (!ALLOWED[key] || ALLOWED[key].includes(val))) out[key] = val;
  }
  return out as unknown as Profile;
}
