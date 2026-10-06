import { useSyncExternalStore } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AccentKey = 'lime' | 'blue' | 'orange' | 'pink' | 'purple';

const DARK = {
  bg: '#0E0F12',
  card: '#17191E',
  cardHi: '#1F2229',
  border: '#2A2E37',
  text: '#F2F3F5',
  sub: '#9AA0AC',
  faint: '#5E6470',
  danger: '#FF5D5D',
  good: '#4ADE80',
};

const LIGHT: typeof DARK = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  cardHi: '#ECEEF2',
  border: '#DCE0E6',
  text: '#111318',
  sub: '#5B6270',
  faint: '#9097A3',
  danger: '#DC2626',
  good: '#16A34A',
};

/** Each accent has a bright shade for dark mode and a deeper one that stays readable on white. */
export const ACCENTS: Record<AccentKey, { label: string; dark: [string, string]; light: [string, string] }> = {
  lime: { label: 'Lime', dark: ['#C6F432', '#10130A'], light: ['#4D7C0F', '#FFFFFF'] },
  blue: { label: 'Blue', dark: ['#60A5FA', '#0B1220'], light: ['#2563EB', '#FFFFFF'] },
  orange: { label: 'Orange', dark: ['#FB923C', '#1A0E05'], light: ['#EA580C', '#FFFFFF'] },
  pink: { label: 'Pink', dark: ['#F472B6', '#1F0A14'], light: ['#DB2777', '#FFFFFF'] },
  purple: { label: 'Purple', dark: ['#A78BFA', '#120B24'], light: ['#7C3AED', '#FFFFFF'] },
};

/**
 * Current colors. This object is updated in place when the theme changes, so code can keep
 * reading `C.text` etc.; screens call `useTheme()` so they re-render with the new values.
 */
export const C = { ...DARK, accent: '#C6F432', accentInk: '#10130A', accentSoft: '#C6F4321F' };

export const R = { sm: 8, md: 12, lg: 18 };

let prefs: { mode: ThemeMode; accent: AccentKey } = { mode: 'dark', accent: 'lime' };
let dark = true;
let version = 0;
const subs = new Set<() => void>();
const styleRefreshers = new Set<() => void>();

function apply() {
  dark = prefs.mode !== 'light';
  const [accent, accentInk] = ACCENTS[prefs.accent]?.[dark ? 'dark' : 'light'] ?? ACCENTS.lime.dark;
  Object.assign(C, dark ? DARK : LIGHT, { accent, accentInk, accentSoft: `${accent}1F` });
  styleRefreshers.forEach((f) => f());
  version++;
  subs.forEach((f) => f());
}

export function setThemePrefs(mode: ThemeMode, accent: AccentKey) {
  if (mode === prefs.mode && accent === prefs.accent) return;
  prefs = { mode, accent };
  apply();
}

export const isDark = () => dark;

/** For module-level style sheets: rebuild them whenever the colors change. */
export function onThemeChange(refresh: () => void) {
  styleRefreshers.add(refresh);
}

/** Re-render the calling component when the theme changes. */
export function useTheme() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => version,
    () => version,
  );
}
