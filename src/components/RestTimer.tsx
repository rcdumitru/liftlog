import * as Haptics from 'expo-haptics';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatRest } from '@/lib/defaults';
import { cancelRestDone, scheduleRestDone } from '@/lib/notify';
import { C, onThemeChange, useTheme } from '@/lib/theme';

type Timer = { endAt: number; total: number; label: string } | null;
let timer: Timer = null;
const subs = new Set<() => void>();
const set = (t: Timer) => {
  timer = t;
  subs.forEach((f) => f());
};

/** Set when a rest finishes, so the bar can show "next set" for a few seconds. */
let finished: { label: string } | null = null;

export const restTimer = {
  start(seconds: number, label: string) {
    finished = null;
    set({ endAt: Date.now() + seconds * 1000, total: seconds, label });
    scheduleRestDone(timer!.endAt, label);
  },
  add(seconds: number) {
    if (!timer) return;
    set({ ...timer, endAt: timer.endAt + seconds * 1000, total: timer.total + seconds });
    scheduleRestDone(timer.endAt, timer.label);
  },
  /** Skip / cancel: no notification and no popup. */
  stop() {
    finished = null;
    cancelRestDone();
    set(null);
  },
  /** Ran out: the scheduled notification covers the background case; show the popup here. */
  finish() {
    if (!timer) return;
    finished = { label: timer.label };
    set(null);
  },
};

function buzz() {
  if (Platform.OS === 'web') {
    (globalThis.navigator as any)?.vibrate?.([200, 100, 200]);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

/** Floating countdown bar shown above the tab bar / at the bottom of the workout screen. */
export function RestTimerBar() {
  useTheme();
  const t = useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => timer, () => timer);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState<{ label: string } | null>(null);
  const insets = useSafeAreaInsets();

  // Show the "next set" popup for a few seconds after a rest runs out.
  useEffect(() => {
    if (t || !finished) return;
    setDone(finished);
    finished = null;
    const id = setTimeout(() => setDone(null), 5000);
    return () => clearTimeout(id);
  }, [t]);
  useEffect(() => {
    if (t) setDone(null);
  }, [t]);

  useEffect(() => {
    if (!t) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= t.endAt) {
        buzz();
        restTimer.finish();
      }
    }, 250);
    return () => clearInterval(id);
  }, [t]);

  if (!t) {
    if (!done) return null;
    return (
      <View style={[st.wrap, { bottom: insets.bottom + 12 }]} pointerEvents="box-none">
        <Pressable onPress={() => setDone(null)} style={[st.bar, { borderColor: C.accent }]}>
          <View style={[st.fill, { width: '100%' }]} />
          <View style={{ flex: 1 }}>
            <Text style={st.small}>REST OVER · {done.label}</Text>
            <Text style={[st.time, { fontSize: 22 }]}>Start your next set 💪</Text>
          </View>
          <View style={[st.btn, { backgroundColor: C.accent }]}><Text style={[st.btnText, { color: C.accentInk }]}>OK</Text></View>
        </Pressable>
      </View>
    );
  }
  const left = Math.max(0, Math.ceil((t.endAt - now) / 1000));
  const pct = Math.min(1, 1 - left / t.total);

  return (
    <View style={[st.wrap, { bottom: insets.bottom + 12 }]} pointerEvents="box-none">
      <View style={st.bar}>
        <View style={[st.fill, { width: `${pct * 100}%` }]} />
        <View style={{ flex: 1 }}>
          <Text style={st.small}>REST · {t.label}</Text>
          <Text style={st.time}>{formatRest(left).replace(' min', ':00')}</Text>
        </View>
        <Pressable onPress={() => restTimer.add(-15)} style={st.btn}><Text style={st.btnText}>−15</Text></Pressable>
        <Pressable onPress={() => restTimer.add(15)} style={st.btn}><Text style={st.btnText}>+15</Text></Pressable>
        <Pressable onPress={restTimer.stop} style={[st.btn, { backgroundColor: C.accent }]}><Text style={[st.btnText, { color: C.accentInk }]}>Skip</Text></Pressable>
      </View>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  bar: {
    width: '100%', maxWidth: 696, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingLeft: 16,
    backgroundColor: C.cardHi, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.accentSoft },
  small: { color: C.sub, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  time: { color: C.text, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  btnText: { color: C.text, fontWeight: '700' },
});

const st = makeStyles();
onThemeChange(() => Object.assign(st, makeStyles()));
