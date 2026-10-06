export type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'general';
export type Units = 'kg' | 'lb';
export type ExerciseKind = 'compound' | 'isolation' | 'bodyweight' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  kind: ExerciseKind;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  /** Weight increment to add once all sets hit repsMax. */
  increment: number;
  notes?: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  focus: string;
  exercises: Exercise[];
}

export interface SetLog {
  weight: number;
  reps: number;
  done: boolean;
}

export interface SessionEntry {
  exerciseId: string;
  name: string;
  target: { sets: number; repsMin: number; repsMax: number };
  sets: SetLog[];
}

export interface Session {
  id: string;
  dayId: string;
  dayName: string;
  startedAt: string;
  finishedAt?: string;
  entries: SessionEntry[];
}

export interface Profile {
  units: Units;
  bodyweight: number;
  goal: Goal;
  /** Show the next-weight hint above each exercise's sets during a workout. */
  showSuggestions: boolean;
  /** How the Progress tab groups exercises. */
  progressGroup: 'day' | 'muscle';
}
