import { Text } from 'react-native';
import { Button, Card, Chip, Field, Row, Screen, Section, s } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { GOAL_PRESETS } from '@/lib/defaults';
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

      <Section title="Data" />
      <Button
        kind="danger"
        label="Reset all data"
        onPress={async () => {
          if (await confirm('Reset everything?', 'Deletes all workouts and days. Settings are kept.', 'Reset')) actions.resetAll();
        }}
      />
      <Text style={{ color: C.faint, fontSize: 12, textAlign: 'center', marginTop: 20 }}>Liftlog · data stays on your device</Text>
    </Screen>
  );
}
