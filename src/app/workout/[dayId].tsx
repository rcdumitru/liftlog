import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { restTimer } from '@/components/RestTimer';
import { Button, Card, Empty, NumInput, Row, Screen, s } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { formatRest, lastPerformance, suggestNext } from '@/lib/defaults';
import { actions, useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import type { SetLog } from '@/lib/types';

export default function Workout() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const day = useStore((st) => st.days.find((d) => d.id === dayId));
  const active = useStore((st) => st.active);
  const sessions = useStore((st) => st.sessions);
  const units = useStore((st) => st.profile.units);

  const suggestions = useMemo(
    () => Object.fromEntries((day?.exercises ?? []).map((e) => [e.id, suggestNext(sessions, e)])),
    [day, sessions],
  );

  const leaving = useRef(false);
  useEffect(() => {
    if (day && !active && !leaving.current) actions.startWorkout(day, Object.fromEntries(Object.entries(suggestions).map(([k, v]) => [k, v.weight])));
  }, [day, active, suggestions]);

  if (!day) return <Screen><Empty text="This day no longer exists." /></Screen>;
  if (!active || active.dayId !== day.id) return <Screen><Empty text="Another workout is in progress — finish it first." /></Screen>;

  const doneSets = active.entries.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0);
  const totalSets = active.entries.reduce((t, e) => t + e.sets.length, 0);

  const updateSet = (ei: number, si: number, patch: Partial<SetLog>) =>
    actions.updateActive((sess) => ({
      ...sess,
      entries: sess.entries.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, ...patch } : x)) })),
    }));

  const toggleDone = (ei: number, si: number) => {
    const set = active.entries[ei].sets[si];
    const nowDone = !set.done;
    // Weight typed into set 1 flows forward into later un-done sets that still have the old value.
    actions.updateActive((sess) => ({
      ...sess,
      entries: sess.entries.map((e, i) =>
        i !== ei ? e : { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, done: nowDone } : j > si && !x.done && x.weight === 0 ? { ...x, weight: set.weight } : x)) },
      ),
    }));
    if (nowDone) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const ex = day.exercises.find((x) => x.id === active.entries[ei].exerciseId);
      restTimer.start(ex?.restSec ?? 90, active.entries[ei].name);
    }
  };

  const addSet = (ei: number) =>
    actions.updateActive((sess) => ({
      ...sess,
      entries: sess.entries.map((e, i) => (i !== ei ? e : { ...e, sets: [...e.sets, { ...(e.sets[e.sets.length - 1] ?? { weight: 0, reps: 8 }), done: false }] })),
    }));
  const removeSet = (ei: number) =>
    actions.updateActive((sess) => ({ ...sess, entries: sess.entries.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.slice(0, -1) })) }));

  const finish = async () => {
    if (doneSets < totalSets && !(await confirm('Finish workout?', `${totalSets - doneSets} sets not ticked off. They won't be saved.`, 'Finish'))) return;
    leaving.current = true;
    restTimer.stop();
    actions.finishWorkout();
    router.back();
  };
  const discard = async () => {
    if (!(await confirm('Discard workout?', 'Nothing from this session will be saved.', 'Discard'))) return;
    leaving.current = true;
    restTimer.stop();
    actions.discardWorkout();
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: day.name, headerRight: () => <Text style={{ color: C.sub, marginRight: 12, fontVariant: ['tabular-nums'] }}>{doneSets}/{totalSets} sets</Text> }} />
      <Screen>
        <View style={{ height: 4, backgroundColor: C.card, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${(doneSets / Math.max(1, totalSets)) * 100}%`, backgroundColor: C.accent }} />
        </View>

        {active.entries.map((entry, ei) => {
          const ex = day.exercises.find((x) => x.id === entry.exerciseId);
          const last = lastPerformance(sessions, entry.name);
          const sug = suggestions[entry.exerciseId];
          return (
            <Card key={entry.exerciseId}>
              <Pressable onPress={() => router.push(`/exercise/${encodeURIComponent(entry.name)}`)}>
                <Text style={[s.h2, { fontSize: 20 }]}>{entry.name}</Text>
              </Pressable>
              <Row style={{ marginTop: 6, gap: 6 }}>
                <Tag icon="repeat" text={`${entry.target.sets} × ${entry.target.repsMin === entry.target.repsMax ? entry.target.repsMin : `${entry.target.repsMin}–${entry.target.repsMax}`}`} />
                {ex ? <Tag icon="timer-outline" text={`Rest ${formatRest(ex.restSec)}`} /> : null}
                {ex?.muscle ? <Tag icon="body-outline" text={ex.muscle} /> : null}
              </Row>
              {last ? (
                <Text style={[s.muted, { marginTop: 8, fontSize: 13 }]}>
                  Last: {last.entry.sets.filter((x) => x.done).map((x) => `${x.weight}×${x.reps}`).join(', ')}
                </Text>
              ) : null}
              {sug ? <Text style={{ color: C.accent, fontSize: 13, marginTop: 4 }}>{sug.reason}</Text> : null}
              {ex?.notes ? <Text style={[s.muted, { fontSize: 13, marginTop: 4, fontStyle: 'italic' }]}>{ex.notes}</Text> : null}

              <Row style={{ marginTop: 12, marginBottom: 4, flexWrap: 'nowrap' }}>
                <Text style={[hdr, { width: 30 }]}>SET</Text>
                <Text style={[hdr, { width: 84, textAlign: 'center' }]}>{units.toUpperCase()}</Text>
                <Text style={[hdr, { width: 64, textAlign: 'center' }]}>REPS</Text>
                <View style={{ flex: 1 }} />
              </Row>
              {entry.sets.map((set, si) => (
                <Row key={si} style={{ flexWrap: 'nowrap', paddingVertical: 4, opacity: set.done ? 0.65 : 1 }}>
                  <Text style={{ color: C.sub, width: 30, fontWeight: '700' }}>{si + 1}</Text>
                  <NumInput width={84} value={set.weight} onChange={(n) => updateSet(ei, si, { weight: n })} />
                  <NumInput value={set.reps} onChange={(n) => updateSet(ei, si, { reps: Math.round(n) })} />
                  <View style={{ flex: 1 }} />
                  <Pressable
                    onPress={() => toggleDone(ei, si)}
                    hitSlop={8}
                    style={{ width: 44, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: set.done ? C.accent : C.bg, borderWidth: 1, borderColor: set.done ? C.accent : C.border }}
                  >
                    <Ionicons name="checkmark" size={22} color={set.done ? C.accentInk : C.faint} />
                  </Pressable>
                </Row>
              ))}
              <Row style={{ marginTop: 8 }}>
                <Pressable onPress={() => addSet(ei)} hitSlop={6}><Text style={{ color: C.accent, fontWeight: '600' }}>+ Set</Text></Pressable>
                {entry.sets.length > 1 ? (
                  <Pressable onPress={() => removeSet(ei)} hitSlop={6} style={{ marginLeft: 16 }}><Text style={{ color: C.sub, fontWeight: '600' }}>− Set</Text></Pressable>
                ) : null}
              </Row>
            </Card>
          );
        })}

        <Button label="Finish workout" onPress={finish} style={{ marginTop: 8 }} />
        <Button label="Discard" kind="danger" onPress={discard} style={{ marginTop: 10 }} />
      </Screen>
    </>
  );
}

const hdr = { color: C.faint, fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 };

function Tag({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Ionicons name={icon} size={13} color={C.sub} />
      <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
