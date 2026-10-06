import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Card, Empty, Row, Screen, Section, s } from '@/components/ui';
import { exerciseHistory } from '@/lib/stats';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Progress() {
  const sessions = useStore((st) => st.sessions);
  const units = useStore((st) => st.profile.units);
  const hist = useMemo(() => [...exerciseHistory(sessions).values()].sort((a, b) => b.points.length - a.points.length), [sessions]);

  const weekStart = Date.now() - 7 * 864e5;
  const weekVol = sessions.filter((x) => new Date(x.startedAt).getTime() > weekStart).reduce((t, x) => t + x.entries.reduce((a, e) => a + e.sets.filter((z) => z.done).reduce((b, z) => b + z.weight * z.reps, 0), 0), 0);

  return (
    <Screen title="Progress">
      <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
        <Stat label="Workouts" value={String(sessions.length)} />
        <Stat label="Exercises" value={String(hist.length)} />
      </Row>

      <Section title="Exercises" />
      {hist.length === 0 ? <Empty text="Finish a workout and your lifts will show up here." /> : null}
      {hist.map(({ name, points }) => {
        const last = points[points.length - 1];
        const first = points[0];
        const best = Math.max(...points.map((p) => p.e1rm));
        const delta = last.topWeight - first.topWeight;
        const spark = points.slice(-12);
        const max = Math.max(...spark.map((p) => p.topWeight), 1);
        return (
          <Card key={name} onPress={() => router.push(`/exercise/${encodeURIComponent(name)}`)}>
            <Row style={{ flexWrap: 'nowrap' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>{name}</Text>
                <Text style={s.muted}>
                  Last {last.topWeight} {units} × {last.topReps} · e1RM best {Math.round(best)}
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
