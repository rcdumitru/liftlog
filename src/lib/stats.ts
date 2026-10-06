import { e1rm, norm } from './defaults';
import type { Session } from './types';

export interface ExercisePoint {
  date: string;
  topWeight: number;
  topReps: number;
  e1rm: number;
  volume: number;
  sets: { weight: number; reps: number }[];
}

/** One point per finished session for each exercise name. */
export function exerciseHistory(sessions: Session[]): Map<string, { name: string; points: ExercisePoint[] }> {
  const map = new Map<string, { name: string; points: ExercisePoint[] }>();
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    for (const e of s.entries) {
      const done = e.sets.filter((x) => x.done);
      if (!done.length) continue;
      const top = done.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
      const key = norm(e.name);
      if (!map.has(key)) map.set(key, { name: e.name, points: [] });
      map.get(key)!.points.push({
        date: s.startedAt,
        topWeight: top.weight,
        topReps: top.reps,
        e1rm: Math.max(...done.map((x) => e1rm(x.weight, x.reps))),
        volume: done.reduce((t, x) => t + x.weight * x.reps, 0),
        sets: done.map(({ weight, reps }) => ({ weight, reps })),
      });
    }
  }
  return map;
}
