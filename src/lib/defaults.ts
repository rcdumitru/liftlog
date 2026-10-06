import type { Exercise, ExerciseKind, Goal, Profile, Session, WorkoutDay } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Evidence-based starting points for sets, reps and rest, per goal and exercise type. */
export const GOAL_PRESETS: Record<Goal, { label: string; blurb: string } & Record<ExerciseKind, { sets: number; reps: [number, number]; rest: number }>> = {
  strength: {
    label: 'Strength',
    blurb: 'Heavy loads, low reps, long rests',
    compound: { sets: 5, reps: [3, 5], rest: 180 },
    isolation: { sets: 3, reps: [6, 10], rest: 120 },
    bodyweight: { sets: 4, reps: [5, 8], rest: 150 },
    cardio: { sets: 1, reps: [1, 1], rest: 60 },
  },
  hypertrophy: {
    label: 'Muscle',
    blurb: 'Moderate loads, 6–15 reps',
    compound: { sets: 4, reps: [6, 10], rest: 120 },
    isolation: { sets: 3, reps: [10, 15], rest: 75 },
    bodyweight: { sets: 3, reps: [8, 15], rest: 90 },
    cardio: { sets: 1, reps: [1, 1], rest: 60 },
  },
  endurance: {
    label: 'Endurance',
    blurb: 'Lighter loads, high reps, short rests',
    compound: { sets: 3, reps: [12, 20], rest: 60 },
    isolation: { sets: 3, reps: [15, 25], rest: 45 },
    bodyweight: { sets: 3, reps: [15, 30], rest: 45 },
    cardio: { sets: 1, reps: [1, 1], rest: 30 },
  },
  general: {
    label: 'General',
    blurb: 'Balanced fitness',
    compound: { sets: 3, reps: [8, 12], rest: 90 },
    isolation: { sets: 3, reps: [10, 15], rest: 60 },
    bodyweight: { sets: 3, reps: [10, 15], rest: 60 },
    cardio: { sets: 1, reps: [1, 1], rest: 60 },
  },
};

export function applyPreset(ex: Exercise, goal: Goal): Exercise {
  const p = GOAL_PRESETS[goal][ex.kind];
  return { ...ex, sets: p.sets, repsMin: p.reps[0], repsMax: p.reps[1], restSec: p.rest };
}

function ex(name: string, muscle: string, kind: ExerciseKind, increment = 2.5, goal: Goal = 'hypertrophy'): Exercise {
  return applyPreset({ id: uid(), name, muscle, kind, sets: 0, repsMin: 0, repsMax: 0, restSec: 0, increment }, goal);
}

export function seedDays(): WorkoutDay[] {
  return [
    {
      id: uid(), name: 'Push', focus: 'Chest · Shoulders · Triceps',
      exercises: [
        ex('Bench Press', 'Chest', 'compound'),
        ex('Overhead Press', 'Shoulders', 'compound'),
        ex('Incline Dumbbell Press', 'Upper chest', 'compound', 2),
        ex('Lateral Raise', 'Side delts', 'isolation', 1),
        ex('Triceps Pushdown', 'Triceps', 'isolation', 2.5),
      ],
    },
    {
      id: uid(), name: 'Pull', focus: 'Back · Biceps · Rear delts',
      exercises: [
        ex('Deadlift', 'Posterior chain', 'compound', 5),
        ex('Pull-up', 'Lats', 'bodyweight', 2.5),
        ex('Barbell Row', 'Upper back', 'compound'),
        ex('Face Pull', 'Rear delts', 'isolation', 2.5),
        ex('Dumbbell Curl', 'Biceps', 'isolation', 1),
      ],
    },
    {
      id: uid(), name: 'Legs', focus: 'Quads · Hamstrings · Calves',
      exercises: [
        ex('Back Squat', 'Quads', 'compound', 5),
        ex('Romanian Deadlift', 'Hamstrings', 'compound', 5),
        ex('Leg Press', 'Quads', 'compound', 10),
        ex('Leg Curl', 'Hamstrings', 'isolation', 2.5),
        ex('Standing Calf Raise', 'Calves', 'isolation', 5),
      ],
    },
  ];
}

export const DEFAULT_PROFILE: Profile = {
  units: 'kg',
  goal: 'hypertrophy',
  showSuggestions: true,
  progressGroup: 'day',
  themeMode: 'dark',
  accent: 'lime',
};

export const norm = (name: string) => name.trim().toLowerCase();

/** Broad muscle groups, in display order; each matches the free-text `muscle` field by keyword. */
export const MUSCLE_GROUPS: [string, string[]][] = [
  ['Chest', ['chest', 'pec']],
  // Shoulders before Back so "lateral delts" isn't caught by "lat".
  ['Shoulders', ['shoulder', 'delt']],
  ['Back', ['back', 'lat', 'trap', 'posterior chain', 'rhomboid']],
  ['Arms', ['bicep', 'tricep', 'forearm', 'arm']],
  ['Legs', ['quad', 'hamstring', 'glute', 'calf', 'calves', 'leg', 'adductor', 'abductor']],
  ['Core', ['core', 'abs', 'oblique']],
];

export const muscleGroup = (muscle: string) => {
  const m = norm(muscle);
  return MUSCLE_GROUPS.find(([, keys]) => keys.some((k) => m.includes(k)))?.[0] ?? 'Other';
};

/** Most recent completed session entry for an exercise (matched by name). */
export function lastPerformance(sessions: Session[], name: string) {
  const key = norm(name);
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (!s.finishedAt) continue;
    const e = s.entries.find((x) => norm(x.name) === key && x.sets.some((st) => st.done));
    if (e) return { session: s, entry: e };
  }
  return null;
}

/**
 * Double progression: if every working set last time hit the top of the rep range,
 * add the increment. If any set fell below the bottom of the range, hold (or deload
 * after a clear miss). Otherwise keep the weight and chase more reps.
 */
export function suggestNext(sessions: Session[], exercise: Exercise): { weight: number | null; reason: string } {
  const last = lastPerformance(sessions, exercise.name);
  if (!last) return { weight: null, reason: 'First time — pick a weight you can do for the top of the range with 2 reps left.' };
  const done = last.entry.sets.filter((s) => s.done);
  const top = Math.max(...done.map((s) => s.weight));
  const working = done.filter((s) => s.weight === top);
  const allTop = working.length >= exercise.sets && working.every((s) => s.reps >= exercise.repsMax);
  const missed = working.filter((s) => s.reps < exercise.repsMin).length;
  if (allTop) return { weight: round(top + exercise.increment), reason: `Hit ${exercise.repsMax} reps on every set — add ${exercise.increment}.` };
  if (missed >= Math.ceil(working.length / 2) && working.length > 1)
    return { weight: round(top * 0.9), reason: 'Missed the rep range on most sets — drop ~10% and build back up.' };
  return { weight: top, reason: `Stay at ${top} and add reps until every set hits ${exercise.repsMax}.` };
}

const round = (n: number) => Math.round(n * 4) / 4;

export const formatRest = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? (s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`) : `${s}s`;
};

/** "45 min" or "1h 05m" from a millisecond span. */
export const formatDuration = (ms: number) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  return h ? `${h}h ${String(mins % 60).padStart(2, '0')}m` : `${mins} min`;
};

/** "12 Oct", or "12 Oct 2025" when it isn't this year. */
export const formatDate = (iso: string, extra: Intl.DateTimeFormatOptions = {}) => {
  const d = new Date(iso);
  const year = d.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' as const };
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...year, ...extra });
};

/** Look-back windows used by the Progress tab and exercise history. */
export const PERIODS = [
  { label: 'Week', days: 7 },
  { label: 'Month', days: 30 },
  { label: '3 months', days: 91 },
  { label: 'Year', days: 365 },
  { label: 'All time', days: Infinity },
];
