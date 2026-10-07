import type { AccentKey, ThemeMode } from './theme';

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
  /** Weight increment to add once all sets hit repsMax ("Increase by"). */
  increment: number;
  /** Extra instructions, edited from the workout screen. */
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
  /** While logging: the user typed this field (so a typed 0 isn't replaced by last time's value). */
  weightEntered?: boolean;
  repsEntered?: boolean;
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
  goal: Goal;
  /** Show the next-weight hint above each exercise's sets during a workout. */
  showSuggestions: boolean;
  /** How the Progress tab groups exercises. */
  progressGroup: 'day' | 'muscle';
  themeMode: ThemeMode;
  accent: AccentKey;
}
