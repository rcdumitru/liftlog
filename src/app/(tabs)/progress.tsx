import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Chip, Empty, Row, Screen, Section, s } from '@/components/ui';
import { MUSCLE_GROUPS, muscleGroup, norm } from '@/lib/defaults';
import { exerciseHistory } from '@/lib/stats';
import { actions, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

const PERIODS = [
  { label: 'Week', days: 7 },
  { label: 'Month', days: 30 },
  { label: '3 months', days: 91 },
  { label: 'Year', days: 365 },
  { label: 'All time', days: Infinity },
];

export default function Progress() {
  const sessions = useStore((st) => st.sessions);
  const days = useStore((st) => st.days);
  const units = useStore((st) => st.profile.units);
  const groupBy = useStore((st) => st.profile.progressGroup);
  const [period, setPeriod] = useState(PERIODS[0]);
  const since = useMemo(() => Date.now() - period.days * 864e5, [period]);
  const all = useMemo(() => [...exerciseHistory(sessions).values()].sort((a, b) => b.points.length - a.points.length), [sessions]);
  // Only exercises logged within the selected period are listed.
  const hist = useMemo(() => all.filter((h) => h.points.some((p) => new Date(p.date).getTime() >= since)), [all, since]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof hist>();
    const add = (g: string, h: (typeof hist)[number]) => byGroup.set(g, [...(byGroup.get(g) ?? []), h]);
    if (groupBy === 'muscle') {
      // Muscle comes from the exercise as set up in your days (matched by name).
      const muscleOf = new Map(days.flatMap((d) => d.exercises.map((e) => [norm(e.name), e.muscle] as const)));
      for (const h of hist) add(muscleGroup(muscleOf.get(norm(h.name)) ?? ''), h);
      const order = [...MUSCLE_GROUPS.map(([g]) => g), 'Other'];
      return [...byGroup].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
    }
    // Day = the day the exercise was last logged in (current name if the day still exists).
    for (const h of hist) {
      const key = norm(h.name);
      const sess = [...sessions].reverse().find((x) => x.finishedAt && x.entries.some((e) => norm(e.name) === key && e.sets.some((z) => z.done)));
      add(days.find((d) => d.id === sess?.dayId)?.name ?? sess?.dayName ?? 'Other', h);
    }
    const order = days.map((d) => d.name);
    const rank = (g: string) => (order.includes(g) ? order.indexOf(g) : order.length);
    return [...byGroup].sort(([a], [b]) => rank(a) - rank(b));
  }, [hist, days, sessions, groupBy]);

  const stats = useMemo(() => {
    const inPeriod = sessions.filter((x) => x.finishedAt && new Date(x.startedAt).getTime() >= since);
    const exercises = new Set(inPeriod.flatMap((x) => x.entries.filter((e) => e.sets.some((z) => z.done)).map((e) => norm(e.name))));
    return { workouts: inPeriod.length, exercises: exercises.size };
  }, [sessions, since]);

  return (
    <Screen title="Progress">
      <Row style={{ gap: 6, marginBottom: 10 }}>
        {PERIODS.map((p) => <Chip key={p.label} label={p.label} active={period === p} onPress={() => setPeriod(p)} />)}
      </Row>
      <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
        <Stat label="Workouts" value={String(stats.workouts)} />
        <Stat label="Exercises" value={String(stats.exercises)} />
      </Row>

      <Section
        title="Exercises"
        right={
          <Row style={{ gap: 6 }}>
            <Chip label="By day" active={groupBy === 'day'} onPress={() => actions.updateProfile({ progressGroup: 'day' })} />
            <Chip label="By muscle" active={groupBy === 'muscle'} onPress={() => actions.updateProfile({ progressGroup: 'muscle' })} />
          </Row>
        }
      />
      {hist.length === 0 ? <Empty text={all.length ? `No exercises logged in the selected period.` : 'Finish a workout and your lifts will show up here.'} /> : null}
      {groups.map(([group, items]) => (
        <View key={group}>
          <Text style={[s.muted, { fontWeight: '700', marginTop: 6, marginBottom: 8 }]}>{group}</Text>
          {items.map(({ name, points }) => {
            const last = points[points.length - 1];
            const first = points[0];
            const delta = last.topWeight - first.topWeight;
            const spark = points.slice(-12);
            const max = Math.max(...spark.map((p) => p.topWeight), 1);
            return (
              <Card key={name} onPress={() => router.push(`/exercise/${encodeURIComponent(name)}`)}>
                <Row style={{ flexWrap: 'nowrap' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{name}</Text>
                    <Text style={s.muted}>
                      Last {last.topWeight} {units} × {last.topReps}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 30 }}>
                    {spark.map((p, i) => (
                      <View key={i} style={{ width: 5, height: Math.max(3, (p.topWeight / max) * 30), borderRadius: 2, backgroundColor: i === spark.length - 1 ? C.accent : C.border }} />
                    ))}
                  </View>
                </Row>
                {points.length > 1 ? (
                  <Row style={{ marginTop: 6, gap: 4 }}>
                    <Ionicons name={delta > 0 ? 'arrow-up' : delta < 0 ? 'arrow-down' : 'remove'} size={14} color={delta > 0 ? C.good : delta < 0 ? C.danger : C.sub} />
                    <Text style={{ color: delta > 0 ? C.good : delta < 0 ? C.danger : C.sub, fontSize: 13, fontWeight: '600' }}>
                      {delta > 0 ? '+' : ''}{delta} {units} over {points.length} sessions
                    </Text>
                  </Row>
                ) : null}
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border }}>
      <Text style={{ color: C.text, fontSize: 24, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: C.sub, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
