import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Chip, Empty, Row, Screen, Section, s } from '@/components/ui';
import { norm } from '@/lib/defaults';
import { exerciseHistory } from '@/lib/stats';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

type Metric = 'topWeight' | 'volume';
const LABEL: Record<Metric, string> = { topWeight: 'Top weight', volume: 'Volume' };

export default function ExerciseDetail() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const sessions = useStore((st) => st.sessions);
  const units = useStore((st) => st.profile.units);
  const [metric, setMetric] = useState<Metric>('topWeight');
  const data = useMemo(() => exerciseHistory(sessions).get(norm(decodeURIComponent(name ?? ''))), [sessions, name]);

  const title = data?.name ?? decodeURIComponent(name ?? '');
  if (!data) return <><Stack.Screen options={{ title }} /><Screen><Empty text="No logged sets for this exercise yet." /></Screen></>;

  const pts = data.points.slice(-16);
  const vals = pts.map((p) => p[metric]);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const floor = Math.max(0, min - (max - min) * 0.5);
  const pr = Math.max(...data.points.map((p) => p.topWeight));

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen>
        <Row style={{ marginBottom: 12 }}>
          {(Object.keys(LABEL) as Metric[]).map((m) => <Chip key={m} label={LABEL[m]} active={metric === m} onPress={() => setMetric(m)} />)}
        </Row>
        <Card>
          <Text style={s.muted}>{LABEL[metric]} · last {pts.length} sessions</Text>
          <Text style={{ color: C.text, fontSize: 34, fontWeight: '800', marginVertical: 4 }}>
            {Math.round(vals[vals.length - 1] * 10) / 10} <Text style={{ fontSize: 16, color: C.sub }}>{units}</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140, marginTop: 8 }}>
            {pts.map((p, i) => {
              const h = max === floor ? 100 : ((p[metric] - floor) / (max - floor)) * 100;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <View style={{ width: '100%', maxWidth: 28, height: `${Math.max(4, h)}%`, borderRadius: 4, backgroundColor: i === pts.length - 1 ? C.accent : C.border }} />
                </View>
              );
            })}
          </View>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: C.faint, fontSize: 11 }}>{new Date(pts[0].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
            <Text style={{ color: C.faint, fontSize: 11 }}>{new Date(pts[pts.length - 1].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
          </Row>
        </Card>
        <Text style={[s.muted, { marginTop: 4 }]}>Heaviest set ever: {pr} {units}</Text>

        <Section title="History" />
        {[...data.points].reverse().map((p, i) => (
          <Card key={i} style={{ paddingVertical: 12 }}>
            <Row style={{ flexWrap: 'nowrap' }}>
              <Text style={[s.body, { fontWeight: '600', width: 90 }]}>{new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {p.sets.map((x, j) => (
                  <View key={j} style={{ backgroundColor: 'rgba(128,128,128,0.25)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={s.muted}>{`${x.weight} ${units} × ${x.reps}`}</Text>
                  </View>
                ))}
              </View>
            </Row>
          </Card>
        ))}
      </Screen>
    </>
  );
}
