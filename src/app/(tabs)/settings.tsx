import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Row, Screen, Section, Sheet, s } from '@/components/ui';
import { applyBackup, Backup, exportBackup, pickBackup } from '@/lib/backup';
import { confirm } from '@/lib/confirm';
import { formatDate, GOAL_PRESETS } from '@/lib/defaults';
import { addSampleData, removeSampleData } from '@/lib/sampleData';
import { actions, getState, useStore } from '@/lib/store';
import { ACCENTS, AccentKey, C, isDark, ThemeMode, useTheme } from '@/lib/theme';
import type { Goal } from '@/lib/types';

export default function Settings() {
  useTheme();
  const p = useStore((st) => st.profile);
  const up = actions.updateProfile;
  const dayCount = useStore((st) => st.days.length);
  const workoutCount = useStore((st) => st.sessions.length);
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const run = async (task: () => Promise<void>) => {
    setMessage(null);
    try {
      await task();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Something went wrong.', error: true });
    }
  };
  const doImport = (mode: 'merge' | 'replace') => {
    if (!pending) return;
    const before = getState();
    applyBackup(pending, mode);
    const after = getState();
    setPending(null);
    setMessage({
      text:
        mode === 'replace'
          ? `Restored ${after.days.length} days and ${after.sessions.length} workouts.`
          : `Added ${after.days.length - before.days.length} days and ${after.sessions.length - before.sessions.length} workouts.`,
    });
  };

  return (
    <Screen title="Settings">
      <Section title="Body & goal" />
      <Card>
        <Text style={s.label}>Units</Text>
        <Row style={{ marginBottom: 14 }}>
          <Chip label="kg" active={p.units === 'kg'} onPress={() => up({ units: 'kg' })} />
          <Chip label="lb" active={p.units === 'lb'} onPress={() => up({ units: 'lb' })} />
        </Row>
        <Field
          label={`Bodyweight (${p.units})`}
          keyboardType="decimal-pad"
          placeholder="Not set"
          defaultValue={p.bodyweight ? String(p.bodyweight) : ''}
          onChangeText={(t) => up({ bodyweight: Math.max(0, parseFloat(t.replace(',', '.')) || 0) })}
        />
        <Text style={[s.muted, { fontSize: 13, marginTop: -8, marginBottom: 14 }]}>Used to suggest starting weights and loads for bodyweight exercises.</Text>
        <Text style={s.label}>Main goal</Text>
        <Row style={{ marginBottom: 6 }}>
          {(Object.keys(GOAL_PRESETS) as Goal[]).map((g) => <Chip key={g} label={GOAL_PRESETS[g].label} active={p.goal === g} onPress={() => up({ goal: g })} />)}
        </Row>
        <Text style={[s.muted, { fontSize: 13 }]}>{GOAL_PRESETS[p.goal].blurb}</Text>
      </Card>

      <Section title="Appearance" />
      <Card>
        <Text style={s.label}>Theme</Text>
        <Row style={{ marginBottom: 14 }}>
          {(['dark', 'light'] as ThemeMode[]).map((m) => (
            <Chip key={m} label={m === 'dark' ? 'Dark' : 'Light'} active={p.themeMode !== 'light' ? m === 'dark' : m === 'light'} onPress={() => up({ themeMode: m })} />
          ))}
        </Row>
        <Text style={s.label}>Accent color</Text>
        <Row style={{ gap: 14 }}>
          {(Object.keys(ACCENTS) as AccentKey[]).map((k) => {
            const on = p.accent === k;
            return (
              <Pressable key={k} onPress={() => up({ accent: k })} accessibilityLabel={ACCENTS[k].label} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: on ? C.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: ACCENTS[k][isDark() ? 'dark' : 'light'][0] }} />
                </View>
                <Text style={{ color: on ? C.text : C.sub, fontSize: 12, fontWeight: on ? '700' : '500' }}>{ACCENTS[k].label}</Text>
              </Pressable>
            );
          })}
        </Row>
      </Card>

      <Section title="Workout" />
      <Card>
        <Row style={{ flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.body}>Show weight suggestions</Text>
            <Text style={[s.muted, { fontSize: 13 }]}>{'Shows a tip above each exercise, like "You hit 12 reps on every set. Add 2.5 kg."'}</Text>
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
      <Card>
        <Text style={s.h2}>Backup</Text>
        <Text style={[s.muted, { fontSize: 13, marginTop: 4, marginBottom: 12 }]}>
          Save all your days, workouts and settings as a JSON file — to keep it safe or move it to another phone. You have {dayCount} days and {workoutCount} workouts.
        </Text>
        <Row style={{ gap: 10, flexWrap: 'nowrap' }}>
          <Button label="Export" onPress={() => run(exportBackup)} style={{ flex: 1 }} />
          <Button kind="ghost" label="Import" onPress={() => run(async () => { const b = await pickBackup(); if (b) setPending(b); })} style={{ flex: 1 }} />
        </Row>
        {message ? <Text style={{ color: message.error ? C.danger : C.good, fontSize: 13, marginTop: 10 }}>{message.text}</Text> : null}
      </Card>
      <Sheet visible={!!pending} onClose={() => setPending(null)}>
        {pending ? (
          <>
            <Text style={s.h2}>Import backup</Text>
            <Text style={[s.muted, { marginTop: 4, marginBottom: 14 }]}>
              {pending.exportedAt ? `Exported ${formatDate(pending.exportedAt)} · ` : ''}{pending.days.length} days · {pending.sessions.length} workouts
            </Text>
            <Button label="Merge with my data" onPress={() => doImport('merge')} />
            <Text style={[s.muted, { fontSize: 12, marginTop: 4, marginBottom: 12 }]}>Adds days and workouts you don’t have yet. Your settings stay as they are.</Text>
            <Button
              kind="danger"
              label="Replace everything"
              onPress={async () => {
                if (await confirm('Replace everything?', 'Your current days, workouts and settings are replaced by the backup. This can’t be undone.', 'Replace')) doImport('replace');
              }}
            />
            <Text style={[s.muted, { fontSize: 12, marginTop: 4, marginBottom: 12 }]}>Swaps all your data and settings for the backup’s, and drops a workout in progress.</Text>
            <Button kind="ghost" label="Cancel" onPress={() => setPending(null)} />
          </>
        ) : null}
      </Sheet>
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
