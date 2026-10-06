import { uid } from './defaults';
import { setState } from './store';
import type { Exercise, Session, WorkoutDay } from './types';

/** Generated sessions get this id prefix so they can be removed without touching real ones. */
const PREFIX = 'sample-';

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = (min: number, max: number) => Math.round(rand(min, max));

function startWeight(e: Exercise) {
  if (e.kind === 'bodyweight' || e.kind === 'cardio') return 0;
  return e.kind === 'compound' ? 20 + e.increment * 8 : 5 + e.increment * 4;
}

/**
 * Fills history with finished workouts over the past `weeks`, cycling through `days`
 * ~3 times a week (some skipped), with weights that climb by each exercise's increment.
 */
export function generateSampleSessions(days: WorkoutDay[], weeks = 52): Session[] {
  const out: Session[] = [];
  if (!days.length) return out;
  const timesDone: Record<string, number> = {};
  let next = 0;
  const now = new Date();

  for (let w = weeks; w >= 0; w--) {
    for (const dow of [1, 3, 5]) {
      const date = new Date(now);
      date.setDate(now.getDate() - w * 7 - ((now.getDay() + 6) % 7) + (dow - 1));
      date.setHours(pick(7, 19), pick(0, 59), 0, 0);
      if (date > now || Math.random() < 0.15) continue;

      const day = days[next++ % days.length];
      const startedAt = date.toISOString();
      const finishedAt = new Date(date.getTime() + pick(40, 85) * 60000).toISOString();
      out.push({
        id: PREFIX + uid(),
        dayId: day.id,
        dayName: day.name,
        startedAt,
        finishedAt,
        entries: day.exercises.map((e) => {
          const n = (timesDone[e.id] = (timesDone[e.id] ?? 0) + 1);
          const inc = e.increment || 2.5;
          // Roughly one increment every 2–3 sessions, with the odd bad day.
          const raw = startWeight(e) + inc * Math.floor(n * 0.4) - (Math.random() < 0.1 ? inc : 0);
          const weight = Math.max(0, Math.round(raw / inc) * inc);
          return {
            exerciseId: e.id,
            name: e.name,
            target: { sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax },
            sets: Array.from({ length: e.sets }, (_, i) => ({
              weight,
              reps: Math.max(1, pick(e.repsMin, e.repsMax) - (i > 1 ? pick(0, 1) : 0)),
              done: true,
            })),
          };
        }),
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
