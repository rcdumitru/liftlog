import { Switch, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Row, Screen, Section, s } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { GOAL_PRESETS } from '@/lib/defaults';
import { addSampleData, removeSampleData } from '@/lib/sampleData';
import { actions, useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import type { Goal } from '@/lib/types';

export default function Settings() {
  const p = useStore((st) => st.profile);
  const up = actions.updateProfile;

  return (
    <Screen title="Settings">
      <Section title="Body & goal" />
      <Card>
        <Text style={s.label}>Units</Text>
        <Row style={{ marginBottom: 14 }}>
          <Chip label="kg" active={p.units === 'kg'} onPress={() => up({ units: 'kg' })} />
          <Chip label="lb" active={p.units === 'lb'} onPress={() => up({ units: 'lb' })} />
        </Row>
        <Field label={`Bodyweight (${p.units})`} keyboardType="decimal-pad" defaultValue={String(p.bodyweight)} onChangeText={(t) => up({ bodyweight: parseFloat(t.replace(',', '.')) || 0 })} />
        <Text style={s.label}>Main goal</Text>
        <Row style={{ marginBottom: 6 }}>
          {(Object.keys(GOAL_PRESETS) as Goal[]).map((g) => <Chip key={g} label={GOAL_PRESETS[g].label} active={p.goal === g} onPress={() => up({ goal: g })} />)}
        </Row>
        <Text style={[s.muted, { fontSize: 13 }]}>{GOAL_PRESETS[p.goal].blurb}</Text>
      </Card>

      <Section title="Workout" />
      <Card>
        <Row style={{ flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.body}>Show weight suggestions</Text>
            <Text style={[s.muted, { fontSize: 13 }]}>Hint above each exercise, e.g. “Hit 12 reps on every set — add 2.5”.</Text>
          </View>
          <Switch
            value={p.showSuggestions}
            onValueChange={(showSuggestions) => up({ showSuggestions })}
            trackColor={{ true: C.accent, false: C.border }}
            thumbColor="#fff"
          />
        </Row>
      </Card>

      <Section title="Data" />
      <Button
        kind="danger"
        label="Delete workout history"
        onPress={async () => {
          if (await confirm('Delete workout history?', 'Deletes all logged workouts (including sample ones). Your days and settings are kept.', 'Delete')) actions.clearHistory();
        }}
      />
      <Button
        style={{ marginTop: 10 }}
        kind="danger"
        label="Reset all data"
        onPress={async () => {
          if (await confirm('Reset everything?', 'Deletes all workouts and days. Settings are kept.', 'Reset')) actions.resetAll();
        }}
      />
      {__DEV__ ? (
        <>
          <Section title="Developer" />
          <Card>
            <Text style={[s.muted, { fontSize: 13, marginBottom: 12 }]}>
              Only visible in development builds. Sample workouts use your current days, run ~3×/week with rising weights, and can be removed without touching real ones.
            </Text>
            <Button kind="ghost" label="Add 1 year of sample workouts" onPress={() => addSampleData(52)} />
            <Button kind="ghost" label="Add 2 weeks of sample workouts" onPress={() => addSampleData(2)} style={{ marginTop: 8 }} />
            <Button kind="danger" label="Remove sample workouts" onPress={removeSampleData} style={{ marginTop: 8 }} />
          </Card>
        </>
      ) : null}
      <Text style={{ color: C.faint, fontSize: 12, textAlign: 'center', marginTop: 20 }}>Liftlog · data stays on your device</Text>
    </Screen>
  );
}
