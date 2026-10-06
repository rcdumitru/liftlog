import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { DEFAULT_PROFILE, seedDays, uid } from './defaults';
import { setThemePrefs } from './theme';
import type { Profile, Session, WorkoutDay } from './types';

export interface State {
  hydrated: boolean;
  profile: Profile;
  days: WorkoutDay[];
  sessions: Session[];
  /** The in-progress workout, persisted so it survives app restarts. */
  active: Session | null;
}

const KEY = 'liftlog:v1';
let state: State = {
  hydrated: false,
  profile: DEFAULT_PROFILE,
  days: [],
  sessions: [],
  active: null,
};
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((l) => l());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { hydrated, ...persist } = state;
    AsyncStorage.setItem(KEY, JSON.stringify(persist)).catch(() => {});
  }, 250);
}

export function setState(update: Partial<State> | ((s: State) => Partial<State>)) {
  const patch = typeof update === 'function' ? update(state) : update;
  state = { ...state, ...patch };
  emit();
}

export const getState = () => state;

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(state),
  );
}

export async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<State>) : {};
    state = {
      ...state,
      ...saved,
      profile: { ...DEFAULT_PROFILE, ...(saved.profile ?? {}) },
      days: saved.days?.length ? saved.days : seedDays(),
      hydrated: true,
    };
  } catch {
    state = { ...state, days: seedDays(), hydrated: true };
  }
  setThemePrefs(state.profile.themeMode, state.profile.accent);
  listeners.forEach((l) => l());
}

/* ---------- actions ---------- */

export const actions = {
  updateProfile(p: Partial<Profile>) {
    setState((s) => ({ profile: { ...s.profile, ...p } }));
    setThemePrefs(state.profile.themeMode, state.profile.accent);
  },
  saveDay(day: WorkoutDay) {
    setState((s) => ({
      days: s.days.some((d) => d.id === day.id) ? s.days.map((d) => (d.id === day.id ? day : d)) : [...s.days, day],
    }));
  },
  deleteDay(id: string) {
    setState((s) => ({ days: s.days.filter((d) => d.id !== id) }));
  },
  /** Sets start empty: they record what was actually lifted, filled in as each set is done. */
  startWorkout(day: WorkoutDay) {
    const session: Session = {
      id: uid(),
      dayId: day.id,
      dayName: day.name,
      startedAt: new Date().toISOString(),
      entries: day.exercises.map((e) => ({
        exerciseId: e.id,
        name: e.name,
        target: { sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax },
        sets: Array.from({ length: e.sets }, () => ({ weight: 0, reps: 0, done: false })),
      })),
    };
    setState({ active: session });
    return session;
  },
  updateActive(fn: (s: Session) => Session) {
    setState((s) => (s.active ? { active: fn(s.active) } : {}));
  },
  finishWorkout() {
    setState((s) => {
      if (!s.active) return {};
      const done = { ...s.active, finishedAt: new Date().toISOString() };
      const hasWork = done.entries.some((e) => e.sets.some((x) => x.done));
      return { active: null, sessions: hasWork ? [...s.sessions, done] : s.sessions };
    });
  },
  discardWorkout() {
    setState({ active: null });
  },
  deleteSession(id: string) {
    setState((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
  },
  /** Deletes logged workouts only; days, settings and an in-progress workout are kept. */
  clearHistory() {
    setState({ sessions: [] });
  },
  resetAll() {
    setState({ days: seedDays(), sessions: [], active: null });
  },
};
