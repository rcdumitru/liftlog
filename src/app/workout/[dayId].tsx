import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { restTimer } from '@/components/RestTimer';
import { Button, Card, Empty, NumInput, Row, Screen, s } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { formatRest, lastPerformance, suggestNext } from '@/lib/defaults';
import { actions, getState, useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import type { SetLog } from '@/lib/types';

export default function Workout() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const day = useStore((st) => st.days.find((d) => d.id === dayId));
  const active = useStore((st) => st.active);
  const sessions = useStore((st) => st.sessions);
  const units = useStore((st) => st.profile.units);
  const showSuggestions = useStore((st) => st.profile.showSuggestions);

  const suggestions = useMemo(
    () => Object.fromEntries((day?.exercises ?? []).map((e) => [e.id, suggestNext(sessions, e)])),
    [day, sessions],
  );

  const [help, setHelp] = useState(false);
  const [editingReps, setEditingReps] = useState<string | null>(null);
  const leaving = useRef(false);
  useEffect(() => {
    if (day && !active && !leaving.current) actions.startWorkout(day);
  }, [day, active]);
  // Opening a day just to look at last time's numbers shouldn't leave an empty workout "in progress".
  useEffect(
    () => () => {
      const a = getState().active;
      if (!leaving.current && a && a.dayId === dayId && !a.entries.some((e) => e.sets.some((x) => x.done))) actions.discardWorkout();
    },
    [dayId],
  );

  if (!day) return <Screen><Empty text="This day no longer exists." /></Screen>;
  if (!active || active.dayId !== day.id) return <Screen><Empty text="Another workout is in progress — finish it first." /></Screen>;

  const doneSets = active.entries.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0);
  const totalSets = active.entries.reduce((t, e) => t + e.sets.length, 0);

  const updateSet = (ei: number, si: number, patch: Partial<SetLog>) =>
    actions.updateActive((sess) => ({
      ...sess,
      entries: sess.entries.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, ...patch } : x)) })),
    }));

  /** Ticking a set with empty fields logs the same weight/reps as that set last time. */
  const toggleDone = (ei: number, si: number, prev?: { weight: number; reps: number }) => {
    const set = active.entries[ei].sets[si];
    const nowDone = !set.done;
    const patch: Partial<SetLog> = { done: nowDone };
    if (nowDone) {
      if (!set.weight && prev) patch.weight = prev.weight;
      if (!set.reps && prev) patch.reps = prev.reps;
      if (!(patch.reps ?? set.reps)) return; // nothing to log yet
    }
    updateSet(ei, si, patch);
    if (nowDone) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const ex = day.exercises.find((x) => x.id === active.entries[ei].exerciseId);
      restTimer.start(ex?.restSec ?? 90, active.entries[ei].name);
    }
  };

  const addSet = (ei: number) =>
    actions.updateActive((sess) => ({
      ...sess,
      entries: sess.entries.map((e, i) => (i !== ei ? e : { ...e, sets: [...e.sets, { weight: 0, reps: 0, done: false }] })),
    }));
  const removeSet = (ei: number) =>
    actions.updateActive((sess) => ({ ...sess, entries: sess.entries.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.slice(0, -1) })) }));

  /** Rep range edits apply to this session and are saved to the day, so they stick for next time. */
  const setRepRange = (ei: number, patch: { repsMin?: number; repsMax?: number }) => {
    const entry = active.entries[ei];
    actions.updateActive((sess) => ({ ...sess, entries: sess.entries.map((e, i) => (i !== ei ? e : { ...e, target: { ...e.target, ...patch } })) }));
    actions.saveDay({ ...day, exercises: day.exercises.map((x) => (x.id === entry.exerciseId ? { ...x, ...patch } : x)) });
  };
  const closeRepEditor = (ei: number) => {
    const { repsMin, repsMax } = active.entries[ei].target;
    const min = Math.max(1, repsMin);
    setRepRange(ei, { repsMin: min, repsMax: Math.max(min, repsMax) });
    setEditingReps(null);
  };

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
      <Stack.Screen options={{ title: day.name, headerRight: () => (
            <Row style={{ marginRight: 12, gap: 12, flexWrap: 'nowrap' }}>
              <Text style={{ color: C.sub, fontVariant: ['tabular-nums'] }}>{doneSets}/{totalSets} sets</Text>
              <Pressable onPress={() => setHelp(true)} hitSlop={10} accessibilityLabel="How logging works">
                <Ionicons name="help-circle-outline" size={24} color={C.sub} />
              </Pressable>
            </Row>
          ) }} />
      <HelpSheet visible={help} onClose={() => setHelp(false)} />
      <Screen>
        <View style={{ height: 4, backgroundColor: C.card, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${(doneSets / Math.max(1, totalSets)) * 100}%`, backgroundColor: C.accent }} />
        </View>

        {active.entries.map((entry, ei) => {
          const ex = day.exercises.find((x) => x.id === entry.exerciseId);
          const prevSets = lastPerformance(sessions, entry.name)?.entry.sets.filter((x) => x.done) ?? [];
          const sug = suggestions[entry.exerciseId];
          return (
            <Card key={entry.exerciseId}>
              <Pressable onPress={() => router.push(`/exercise/${encodeURIComponent(entry.name)}`)}>
                <Text style={[s.h2, { fontSize: 20 }]}>{entry.name}</Text>
              </Pressable>
              <Row style={{ marginTop: 6, gap: 6 }}>
                <Tag
                  icon="repeat"
                  text={`${entry.sets.length} × ${entry.target.repsMin === entry.target.repsMax ? entry.target.repsMin : `${entry.target.repsMin}–${entry.target.repsMax}`}`}
                  editing={editingReps === entry.exerciseId}
                  onPress={() => (editingReps === entry.exerciseId ? closeRepEditor(ei) : setEditingReps(entry.exerciseId))}
                />
                {ex ? <Tag icon="timer-outline" text={`Rest ${formatRest(ex.restSec)}`} /> : null}
                {ex?.muscle ? <Tag icon="body-outline" text={ex.muscle} /> : null}
              </Row>
              {editingReps === entry.exerciseId ? (
                <Row style={{ marginTop: 10, flexWrap: 'nowrap' }}>
                  <Text style={[s.muted, { fontSize: 13 }]}>Rep range</Text>
                  <NumInput width={52} value={entry.target.repsMin} onChange={(n) => setRepRange(ei, { repsMin: Math.round(n) })} />
                  <Text style={s.muted}>–</Text>
                  <NumInput width={52} value={entry.target.repsMax} onChange={(n) => setRepRange(ei, { repsMax: Math.round(n) })} />
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => closeRepEditor(ei)} hitSlop={8}><Text style={{ color: C.accent, fontWeight: '700' }}>Done</Text></Pressable>
                </Row>
              ) : null}
              {showSuggestions && sug ? <Text style={{ color: C.accent, fontSize: 13, marginTop: 8 }}>{sug.reason}</Text> : null}
              {ex?.notes ? <Text style={[s.muted, { fontSize: 13, marginTop: 4, fontStyle: 'italic' }]}>{ex.notes}</Text> : null}

              <Row style={{ marginTop: 12, marginBottom: 4, flexWrap: 'nowrap' }}>
                <Text style={[hdr, { width: 26 }]}>SET</Text>
                <Text style={[hdr, { flex: 1 }]}>PREVIOUS</Text>
                <Text style={[hdr, { width: 72, textAlign: 'center' }]}>{units.toUpperCase()}</Text>
                <Text style={[hdr, { width: 56, textAlign: 'center' }]}>REPS</Text>
                <View style={{ width: 44 }} />
              </Row>
              {entry.sets.map((set, si) => {
                const prev = prevSets[si];
                return (
                  <Row key={si} style={{ flexWrap: 'nowrap', paddingVertical: 4, opacity: set.done ? 0.65 : 1 }}>
                    <Text style={{ color: C.sub, width: 26, fontWeight: '700' }}>{si + 1}</Text>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                      {prev ? (
                        <View style={{ maxWidth: '100%', backgroundColor: 'rgba(128,128,128,0.25)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: C.sub, fontSize: 12, fontVariant: ['tabular-nums'] }} numberOfLines={1}>{`${prev.weight} ${units} × ${prev.reps}`}</Text>
                        </View>
                      ) : (
                        <Text style={{ color: C.faint, fontSize: 13 }}>–</Text>
                      )}
                    </View>
                    <NumInput width={72} value={set.weight} placeholder={prev ? String(prev.weight) : '–'} onChange={(n) => updateSet(ei, si, { weight: n })} />
                    <NumInput width={56} value={set.reps} placeholder={prev ? String(prev.reps) : '–'} onChange={(n) => updateSet(ei, si, { reps: Math.round(n) })} />
                    <Pressable
                      onPress={() => toggleDone(ei, si, prev)}
                      hitSlop={8}
                      style={{ width: 44, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: set.done ? C.accent : C.bg, borderWidth: 1, borderColor: set.done ? C.accent : C.border }}
                    >
                      <Ionicons name="checkmark" size={22} color={set.done ? C.accentInk : C.faint} />
                    </Pressable>
                  </Row>
                );
              })}
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

function Tag({ icon, text, onPress, editing }: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress?: () => void; editing?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: editing ? C.accent : 'transparent' }}
    >
      <Ionicons name={icon} size={13} color={C.sub} />
      <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{text}</Text>
      {onPress ? <Ionicons name="pencil" size={11} color={C.faint} /> : null}
    </Pressable>
  );
}

const HELP: [keyof typeof Ionicons.glyphMap, string, string][] = [
  ['time-outline', 'Previous', 'Each row shows what you did on that set last time you trained this exercise.'],
  ['create-outline', 'Log what you did', 'After each set, enter the weight and reps you actually did, then tap ✓. The rest timer starts automatically.'],
  ['checkmark-done-outline', 'Same as last time?', 'Leave the boxes empty and just tap ✓ — it logs last time’s weight and reps.'],
  ['repeat', 'Sets & rep range', 'The sets tag follows + Set / − Set. Tap it to change the rep range — the new range is saved to the day for next time.'],
  ['eye-outline', 'Just looking', 'Opening a day doesn’t start a workout. If you leave without ticking any set, nothing is saved and no "in progress" card is left behind.'],
  ['play-outline', 'In progress', 'Once you tick a set, the workout stays in progress — you can leave and resume it from the Train tab until you finish or discard it.'],
  ['flag-outline', 'Finish', 'Tap Finish workout to save. Only ticked sets are saved, and they become your "previous" numbers next time.'],
];

function HelpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={[s.card, { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20 }]}>
          <Text style={[s.h2, { marginBottom: 14 }]}>How logging works</Text>
          {HELP.map(([icon, title, text]) => (
            <Row key={title} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', marginBottom: 12 }}>
              <Ionicons name={icon} size={20} color={C.accent} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={[s.body, { fontWeight: '700' }]}>{title}</Text>
                <Text style={[s.muted, { fontSize: 13 }]}>{text}</Text>
              </View>
            </Row>
          ))}
          <Button label="Got it" onPress={onClose} style={{ marginTop: 4 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
