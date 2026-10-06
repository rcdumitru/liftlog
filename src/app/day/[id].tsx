import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, Field, NumInput, Row, Screen, Section, s } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { applyPreset, formatRest, GOAL_PRESETS, uid } from '@/lib/defaults';
import { actions, useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import type { Exercise, ExerciseKind, Goal, WorkoutDay } from '@/lib/types';

const KINDS: ExerciseKind[] = ['compound', 'isolation', 'bodyweight', 'cardio'];

export default function EditDay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useStore((st) => st.days.find((d) => d.id === id));
  const goal = useStore((st) => st.profile.goal);
  const isNew = !existing;
  const [day, setDay] = useState<WorkoutDay>(existing ?? { id: uid(), name: '', focus: '', exercises: [] });
  const [presetGoal, setPresetGoal] = useState<Goal>(goal);

  const setEx = (i: number, patch: Partial<Exercise>) => setDay((d) => ({ ...d, exercises: d.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
  const move = (i: number, dir: -1 | 1) =>
    setDay((d) => {
      const ex = [...d.exercises];
      const j = i + dir;
      if (j < 0 || j >= ex.length) return d;
      [ex[i], ex[j]] = [ex[j], ex[i]];
      return { ...d, exercises: ex };
    });
  const addEx = () =>
    setDay((d) => ({ ...d, exercises: [...d.exercises, applyPreset({ id: uid(), name: '', muscle: '', kind: 'compound', sets: 3, repsMin: 8, repsMax: 12, restSec: 90, increment: 2.5 }, presetGoal)] }));

  const save = () => {
    actions.saveDay({ ...day, name: day.name.trim() || 'Workout', exercises: day.exercises.filter((e) => e.name.trim()) });
    router.back();
  };
  const remove = async () => {
    if (await confirm('Delete day?', `"${day.name}" will be removed. Logged history is kept.`, 'Delete')) {
      actions.deleteDay(day.id);
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New day' : `Edit ${existing.name}` }} />
      <Screen>
        <Field label="Name" value={day.name} onChangeText={(name) => setDay({ ...day, name })} placeholder="Push, Pull, Legs, Upper A…" />
        <Field label="Focus" value={day.focus} onChangeText={(focus) => setDay({ ...day, focus })} placeholder="Chest · Shoulders · Triceps" />

        <Card style={{ marginTop: 6 }}>
          <Text style={s.h2}>Suggested sets, reps & rest</Text>
          <Text style={[s.muted, { marginVertical: 6 }]}>Fill every exercise with recommended targets for a goal, based on whether it’s a compound or isolation lift.</Text>
          <Row style={{ marginVertical: 6 }}>
            {(Object.keys(GOAL_PRESETS) as Goal[]).map((g) => (
              <Chip key={g} label={GOAL_PRESETS[g].label} active={presetGoal === g} onPress={() => setPresetGoal(g)} />
            ))}
          </Row>
          <Button small kind="ghost" label={`Apply ${GOAL_PRESETS[presetGoal].label.toLowerCase()} targets`} onPress={() => setDay((d) => ({ ...d, exercises: d.exercises.map((e) => applyPreset(e, presetGoal)) }))} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
        </Card>

        <Section title={`Exercises (${day.exercises.length})`} />
        {day.exercises.map((e, i) => (
          <Card key={e.id}>
            <Row style={{ flexWrap: 'nowrap' }}>
              <TextInput value={e.name} onChangeText={(name) => setEx(i, { name })} placeholder="Exercise name" placeholderTextColor={C.faint} style={[s.h2, { flex: 1, paddingVertical: 4 }]} />
              <Pressable onPress={() => move(i, -1)} hitSlop={6}><Ionicons name="chevron-up" size={20} color={C.sub} /></Pressable>
              <Pressable onPress={() => move(i, 1)} hitSlop={6}><Ionicons name="chevron-down" size={20} color={C.sub} /></Pressable>
              <Pressable onPress={() => setDay((d) => ({ ...d, exercises: d.exercises.filter((_, j) => j !== i) }))} hitSlop={6}><Ionicons name="trash-outline" size={19} color={C.danger} /></Pressable>
            </Row>
            <TextInput value={e.muscle} onChangeText={(muscle) => setEx(i, { muscle })} placeholder="Muscle group" placeholderTextColor={C.faint} style={[s.muted, { paddingVertical: 2 }]} />
            <Row style={{ marginVertical: 10, gap: 6 }}>
              {KINDS.map((k) => (
                <Chip key={k} label={k} active={e.kind === k} onPress={() => setEx(i, applyPreset({ ...e, kind: k }, presetGoal))} />
              ))}
            </Row>
            <Row style={{ gap: 14 }}>
              <Num label="Sets" value={e.sets} onChange={(n) => setEx(i, { sets: Math.max(1, Math.round(n)) })} />
              <Num label="Reps min" value={e.repsMin} onChange={(n) => setEx(i, { repsMin: Math.round(n) })} />
              <Num label="Reps max" value={e.repsMax} onChange={(n) => setEx(i, { repsMax: Math.round(n) })} />
              <Num label={`Rest s (${formatRest(e.restSec)})`} value={e.restSec} onChange={(n) => setEx(i, { restSec: Math.round(n) })} width={80} />
              <Num label="+ Load" value={e.increment} onChange={(n) => setEx(i, { increment: n })} />
            </Row>
          </Card>
        ))}
        <Button kind="ghost" label="+ Add exercise" onPress={addEx} />
        <Button label="Save" onPress={save} style={{ marginTop: 18 }} />
        {!isNew ? <Button kind="danger" label="Delete day" onPress={remove} style={{ marginTop: 10 }} /> : null}
      </Screen>
    </>
  );
}

function Num({ label, value, onChange, width = 64 }: { label: string; value: number; onChange: (n: number) => void; width?: number }) {
  return (
    <View>
      <Text style={[s.label, { fontSize: 10 }]}>{label}</Text>
      <NumInput value={value} onChange={onChange} width={width} />
    </View>
  );
}
