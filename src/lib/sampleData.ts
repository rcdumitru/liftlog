import { uid } from './defaults';
import { setState } from './store';
import type { Exercise, Session, SessionEntry, WorkoutDay } from './types';

/** Generated sessions get this id prefix so they can be removed without touching real ones. */
const PREFIX = 'sample-';

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = (min: number, max: number) => Math.round(rand(min, max));
const chance = (p: number) => Math.random() < p;
const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

type Template = Pick<Exercise, 'name' | 'kind' | 'increment' | 'sets' | 'repsMin' | 'repsMax'>;

/** Occasional exercises that aren't in any day, so some only show up now and then. */
const EXTRAS: Template[] = [
  { name: 'Cable Fly', kind: 'isolation', increment: 2.5, sets: 3, repsMin: 10, repsMax: 15 },
  { name: 'Hammer Curl', kind: 'isolation', increment: 1, sets: 3, repsMin: 8, repsMax: 12 },
  { name: 'Hip Thrust', kind: 'compound', increment: 5, sets: 3, repsMin: 8, repsMax: 12 },
  { name: 'Chin-up', kind: 'bodyweight', increment: 2.5, sets: 3, repsMin: 5, repsMax: 10 },
  { name: 'Seated Cable Row', kind: 'compound', increment: 2.5, sets: 3, repsMin: 8, repsMax: 12 },
  { name: 'Skull Crusher', kind: 'isolation', increment: 2.5, sets: 3, repsMin: 8, repsMax: 12 },
];

/** Per-exercise "personality": how heavy it starts, how fast it progresses, how often it's skipped. */
interface Lifter {
  start: number;
  /** Chance of moving up an increment after each session. */
  gain: number;
  skip: number;
  level: number;
}

function newLifter(e: Template): Lifter {
  const base = e.kind === 'bodyweight' || e.kind === 'cardio' ? 0 : e.kind === 'compound' ? 20 + e.increment * 8 : 5 + e.increment * 4;
  return { start: base * rand(0.75, 1.3), gain: rand(0.15, 0.55), skip: rand(0.02, 0.3), level: 0 };
}

function logExercise(e: Template, id: string, lifter: Lifter): SessionEntry {
  const inc = e.increment || 2.5;
  if (chance(lifter.gain)) lifter.level++;
  if (chance(0.04)) lifter.level = Math.max(0, lifter.level - pick(2, 4)); // deload / time off
  const bad = chance(0.12); // off day: lighter and fewer reps
  const weight = Math.max(0, Math.round((lifter.start + lifter.level * inc - (bad ? inc : 0)) / inc) * inc);
  const sets = Math.max(1, e.sets + (chance(0.15) ? -1 : chance(0.1) ? 1 : 0));
  return {
    exerciseId: id,
    name: e.name,
    target: { sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax },
    sets: Array.from({ length: sets }, (_, i) => {
      // Bodyweight lifts progress in reps instead of weight.
      const top = weight === 0 ? e.repsMax + Math.floor(lifter.level / 3) : e.repsMax;
      const reps = Math.max(1, pick(e.repsMin - (bad ? 2 : 0), top) - (i > 0 ? pick(0, i) : 0));
      const drop = i === sets - 1 && weight > 0 && chance(0.1); // lighter back-off set
      return { weight: drop ? Math.round((weight * 0.8) / inc) * inc : weight, reps, done: true };
    }),
  };
}

/**
 * Fills history with finished workouts over the past `weeks`: 2–4 a week on random weekdays
 * (with the odd week off), mostly rotating through `days`, exercises sometimes skipped or
 * added, and each exercise progressing at its own pace with stalls and deloads.
 */
export function generateSampleSessions(days: WorkoutDay[], weeks = 52): Session[] {
  const out: Session[] = [];
  if (!days.length) return out;
  const lifters: Record<string, Lifter> = {};
  const lifter = (e: Template) => (lifters[e.name] ??= newLifter(e));
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  let next = 0;

  for (let w = weeks; w >= 0; w--) {
    if (chance(0.06)) continue; // week off
    const weekdays = shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, pick(2, 4)).sort();
    for (const dow of weekdays) {
      const date = new Date(monday);
      date.setDate(monday.getDate() - w * 7 + dow);
      date.setHours(pick(6, 20), pick(0, 59), 0, 0);
      if (date > now) continue;

      const day = chance(0.2) ? days[pick(0, days.length - 1)] : days[next++ % days.length];
      let entries = day.exercises.filter((e) => !chance(lifter(e).skip)).map((e) => logExercise(e, e.id, lifter(e)));
      if (!entries.length && day.exercises.length) entries = [logExercise(day.exercises[0], day.exercises[0].id, lifter(day.exercises[0]))];
      if (chance(0.25)) {
        const extra = EXTRAS[pick(0, EXTRAS.length - 1)];
        entries.push(logExercise(extra, `${PREFIX}${extra.name}`, lifter(extra)));
      }
      const minutes = entries.reduce((t, e) => t + e.sets.length, 0) * rand(2.5, 4.5);
      out.push({
        id: PREFIX + uid(),
        dayId: day.id,
        dayName: day.name,
        startedAt: date.toISOString(),
        finishedAt: new Date(date.getTime() + Math.round(minutes) * 60000).toISOString(),
        entries,
      });
    }
  }
  return out;
}

export function addSampleData(weeks = 52) {
  setState((s) => ({
    sessions: [...s.sessions.filter((x) => !x.id.startsWith(PREFIX)), ...generateSampleSessions(s.days, weeks)]
      // The app reads "last time" from the end of the list, so keep it chronological.
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
  }));
}

export function removeSampleData() {
  setState((s) => ({ sessions: s.sessions.filter((x) => !x.id.startsWith(PREFIX)) }));
}
