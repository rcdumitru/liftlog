import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { restTimer } from '@/components/RestTimer';
import { Button, Card, Empty, NumInput, Row, Screen, s, SetPill, Sheet } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { formatRest, lastPerformance, suggestNext } from '@/lib/defaults';
import { actions, getState, useStore } from '@/lib/store';
import { C, useTheme } from '@/lib/theme';
import type { Exercise, SetLog } from '@/lib/types';

export default function Workout() {
  useTheme();
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
  /** Exercise whose inline editor is open, and its name being typed (committed on Done). */
  const [editing, setEditing] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [notesFor, setNotesFor] = useState<number | null>(null);
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
      // Only boxes left empty take last time's value; a typed 0 (e.g. bodyweight) is kept.
      if (!set.weightEntered && !set.weight && prev) patch.weight = prev.weight;
      if (!set.repsEntered && !set.reps && prev) patch.reps = prev.reps;
      if (!(patch.reps ?? set.reps)) return; // nothing to log yet
      // Filled-in values stay visible if the set is unticked again.
      patch.weightEntered = true;
      patch.repsEntered = true;
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

  /** Exercise edits apply to this session and are saved to the day, so they stick for next time. */
  const editExercise = (ei: number, patch: Partial<Exercise>) => {
    const entry = active.entries[ei];
    const { name, repsMin, repsMax } = patch;
    actions.updateActive((sess) => ({
      ...sess,
      entries: sess.entries.map((e, i) =>
        i !== ei ? e : { ...e, name: name ?? e.name, target: { ...e.target, repsMin: repsMin ?? e.target.repsMin, repsMax: repsMax ?? e.target.repsMax } },
      ),
    }));
    actions.saveDay({ ...day, exercises: day.exercises.map((x) => (x.id === entry.exerciseId ? { ...x, ...patch } : x)) });
  };
  const toggleEditor = (ei: number) => {
    const entry = active.entries[ei];
    if (editing !== entry.exerciseId) {
      setNameDraft(entry.name);
      setEditing(entry.exerciseId);
      return;
    }
    // Done: commit the name and tidy up numbers left half-typed.
    const ex = day.exercises.find((x) => x.id === entry.exerciseId);
    const min = Math.max(1, entry.target.repsMin);
    editExercise(ei, {
      name: nameDraft.trim() || entry.name,
      repsMin: min,
      repsMax: Math.max(min, entry.target.repsMax),
      restSec: Math.max(0, ex?.restSec ?? 0),
      increment: Math.max(0, ex?.increment ?? 0),
    });
    setEditing(null);
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
      <NotesSheet
        visible={notesFor !== null}
        title={notesFor !== null ? active.entries[notesFor]?.name ?? '' : ''}
        initial={notesFor !== null ? day.exercises.find((x) => x.id === active.entries[notesFor]?.exerciseId)?.notes ?? '' : ''}
        onClose={() => setNotesFor(null)}
        onSave={(notes) => {
          if (notesFor !== null) editExercise(notesFor, { notes: notes.trim() || undefined });
          setNotesFor(null);
        }}
      />
      <Screen>
        <View style={{ height: 4, backgroundColor: C.card, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${(doneSets / Math.max(1, totalSets)) * 100}%`, backgroundColor: C.accent }} />
        </View>

        {active.entries.map((entry, ei) => {
          const ex = day.exercises.find((x) => x.id === entry.exerciseId);
          const prevSets = lastPerformance(sessions, entry.name)?.entry.sets.filter((x) => x.done) ?? [];
          const sug = suggestions[entry.exerciseId];
          const isEditing = editing === entry.exerciseId;
          return (
            <Card key={entry.exerciseId}>
              <Row style={{ flexWrap: 'nowrap' }}>
                <Pressable onPress={() => router.push(`/exercise/${encodeURIComponent(entry.name)}`)} style={{ flex: 1 }}>
                  <Text style={[s.h2, { fontSize: 20 }]}>{entry.name}</Text>
                </Pressable>
                {ex ? (
                  <>
                    <Pressable onPress={() => setNotesFor(ei)} hitSlop={8} accessibilityLabel="Notes" style={{ padding: 4 }}>
                      <Ionicons name={ex.notes ? 'document-text' : 'document-text-outline'} size={20} color={ex.notes ? C.accent : C.sub} />
                    </Pressable>
                    <Pressable onPress={() => toggleEditor(ei)} hitSlop={8} accessibilityLabel="Edit exercise" style={{ padding: 4 }}>
                      <Ionicons name={isEditing ? 'checkmark-circle' : 'create-outline'} size={20} color={isEditing ? C.accent : C.sub} />
                    </Pressable>
                  </>
                ) : null}
              </Row>
              <Row style={{ marginTop: 6, gap: 6 }}>
                <Tag
                  icon="repeat"
                  text={`${entry.sets.length} × ${entry.target.repsMin === entry.target.repsMax ? entry.target.repsMin : `${entry.target.repsMin}–${entry.target.repsMax}`}`}
                  onPress={ex && !isEditing ? () => toggleEditor(ei) : undefined}
                />
                {ex ? <Tag icon="timer-outline" text={`Rest ${formatRest(ex.restSec)}`} onPress={!isEditing ? () => toggleEditor(ei) : undefined} /> : null}
                {ex ? <Tag icon="trending-up" text={`Increase by ${ex.increment} ${units}`} onPress={!isEditing ? () => toggleEditor(ei) : undefined} /> : null}
              </Row>
              {ex && isEditing ? (
                <View style={{ marginTop: 12, gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.accent }}>
                  <View>
                    <Text style={s.label}>Name</Text>
                    <TextInput value={nameDraft} onChangeText={setNameDraft} placeholder="Exercise name" placeholderTextColor={C.faint} style={[s.input, { paddingVertical: 8 }]} />
                  </View>
                  <Row style={{ gap: 14, alignItems: 'flex-end' }}>
                    <View>
                      <Text style={s.label}>Reps</Text>
                      <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
                        <NumInput width={52} value={entry.target.repsMin} onChange={(n) => editExercise(ei, { repsMin: Math.round(n) })} />
                        <Text style={s.muted}>–</Text>
                        <NumInput width={52} value={entry.target.repsMax} onChange={(n) => editExercise(ei, { repsMax: Math.round(n) })} />
                      </Row>
                    </View>
                    <View>
                      <Text style={s.label}>Rest (s)</Text>
                      <NumInput width={70} value={ex.restSec} onChange={(n) => editExercise(ei, { restSec: Math.round(n) })} />
                    </View>
                    <View>
                      <Text style={s.label}>Increase by ({units})</Text>
                      <NumInput width={70} value={ex.increment} onChange={(n) => editExercise(ei, { increment: n })} />
                    </View>
                  </Row>
                  <Text style={[s.muted, { fontSize: 12 }]}>Changes are saved to {day.name} for next time. Use + Set / − Set below for this workout’s sets.</Text>
                  <Button small label="Done" onPress={() => toggleEditor(ei)} style={{ alignSelf: 'flex-start' }} />
                </View>
              ) : null}
              {ex?.notes ? (
                <Pressable onPress={() => setNotesFor(ei)}>
                  <Text style={[s.muted, { fontSize: 13, marginTop: 8, fontStyle: 'italic' }]} numberOfLines={2}>{ex.notes}</Text>
                </Pressable>
              ) : null}
              {showSuggestions && sug ? <Text style={{ color: C.accent, fontSize: 13, marginTop: 8 }}>{sug.reason}</Text> : null}

              <Row style={{ marginTop: 12, marginBottom: 4, flexWrap: 'nowrap' }}>
                <Text style={[hdr(), { width: 26 }]}>SET</Text>
                <Text style={[hdr(), { flex: 1 }]}>PREVIOUS</Text>
                <Text style={[hdr(), { width: 72, textAlign: 'center' }]}>{units.toUpperCase()}</Text>
                <Text style={[hdr(), { width: 56, textAlign: 'center' }]}>REPS</Text>
                <View style={{ width: 44 }} />
              </Row>
              {entry.sets.map((set, si) => {
                const prev = prevSets[si];
                return (
                  <Row key={si} style={{ flexWrap: 'nowrap', paddingVertical: 4, opacity: set.done ? 0.65 : 1 }}>
                    <Text style={{ color: C.sub, width: 26, fontWeight: '700' }}>{si + 1}</Text>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                      {prev ? (
                        <SetPill small weight={prev.weight} reps={prev.reps} units={units} />
                      ) : (
                        <Text style={{ color: C.faint, fontSize: 13 }}>–</Text>
                      )}
                    </View>
                    <NumInput width={72} value={set.weight} showZero={set.weightEntered} placeholder={prev ? String(prev.weight) : '–'} onChange={(n, empty) => updateSet(ei, si, { weight: n, weightEntered: !empty })} />
                    <NumInput width={56} value={set.reps} showZero={set.repsEntered} placeholder={prev ? String(prev.reps) : '–'} onChange={(n, empty) => updateSet(ei, si, { reps: Math.round(n), repsEntered: !empty })} />
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

const hdr = () => ({ color: C.faint, fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 });

function Tag({ icon, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}
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
  ['create-outline', 'Edit an exercise', 'Tap ✎ (or any of its tags) to change the name, rep range, rest or how much to increase by. Changes are saved to the day. The sets tag follows + Set / − Set.'],
  ['document-text-outline', 'Notes', 'Tap the notes icon next to an exercise to add instructions, e.g. seat height or grip. They show under the exercise every time.'],
  ['eye-outline', 'Just looking', 'Opening a day doesn’t start a workout. If you leave without ticking any set, nothing is saved and no "in progress" card is left behind.'],
  ['play-outline', 'In progress', 'Once you tick a set, the workout stays in progress — you can leave and resume it from the Train tab until you finish or discard it.'],
  ['flag-outline', 'Finish', 'Tap Finish workout to save. Only ticked sets are saved, and they become your "previous" numbers next time.'],
];

function HelpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
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
    </Sheet>
  );
}

function NotesSheet({ visible, title, initial, onClose, onSave }: { visible: boolean; title: string; initial: string; onClose: () => void; onSave: (notes: string) => void }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (visible) setText(initial);
  }, [visible, initial]);
  return (
    <Sheet visible={visible} onClose={onClose}>
          <Text style={s.h2}>Notes</Text>
          <Text style={[s.muted, { marginBottom: 12 }]}>{title}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            placeholder="e.g. Seat on 4, grip just outside shoulders, 3 s down"
            placeholderTextColor={C.faint}
            style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
          />
          <Row style={{ marginTop: 14, gap: 10 }}>
            <Button label="Save" onPress={() => onSave(text)} style={{ flex: 1 }} />
            <Button kind="ghost" label="Cancel" onPress={onClose} style={{ flex: 1 }} />
          </Row>
    </Sheet>
  );
}
