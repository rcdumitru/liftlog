import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
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
  /** Bar under the pointer (web) or last tapped (touch). */
  const [sel, setSel] = useState<number | null>(null);
  const { height } = useWindowDimensions();
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
        {/* Tapping anywhere outside a bar hides its tooltip (touch has no hover-out). */}
        <Pressable onPress={() => setSel(null)} disabled={sel === null} style={{ minHeight: height, cursor: 'auto' } as object}>
          <Row style={{ marginBottom: 12 }}>
            {(Object.keys(LABEL) as Metric[]).map((m) => <Chip key={m} label={LABEL[m]} active={metric === m} onPress={() => { setMetric(m); setSel(null); }} />)}
          </Row>
          <Card>
            <Text style={s.muted}>{LABEL[metric]} · last {pts.length} sessions</Text>
            <Text style={{ color: C.text, fontSize: 34, fontWeight: '800', marginVertical: 4 }}>
              {Math.round(vals[vals.length - 1] * 10) / 10} <Text style={{ fontSize: 16, color: C.sub }}>{units}</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140, marginTop: 8 }}>
              {pts.map((p, i) => {
                const h = max === floor ? 100 : ((p[metric] - floor) / (max - floor)) * 100;
                const on = sel === i;
                // Keep the tooltip inside the card near the edges.
                const align = i < 2 ? 'flex-start' : i > pts.length - 3 ? 'flex-end' : 'center';
                return (
                  <Pressable
                    key={i}
                    onHoverIn={() => setSel(i)}
                    onHoverOut={() => setSel((cur) => (cur === i ? null : cur))}
                    onPress={() => setSel((cur) => (Platform.OS !== 'web' && cur === i ? null : i))}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', zIndex: on ? 1 : 0 }}
                  >
                    <View style={{ width: '100%', maxWidth: 28, height: `${Math.max(4, h)}%`, borderRadius: 4, backgroundColor: on ? C.text : i === pts.length - 1 ? C.accent : C.border }} />
                    {on ? (
                      <View
                        pointerEvents="none"
                        style={{ position: 'absolute', bottom: `${Math.max(4, h)}%`, marginBottom: 6, width: 140, alignItems: align, ...(align === 'flex-start' ? { left: 0 } : align === 'flex-end' ? { right: 0 } : {}) }}
                      >
                        <View style={{ backgroundColor: C.cardHi, borderColor: C.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                            {metric === 'topWeight' ? `${p.topWeight} ${units} × ${p.topReps}` : `${Math.round(p.volume).toLocaleString()} ${units}`}
                          </Text>
                          <Text style={{ color: C.sub, fontSize: 11 }}>{new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                        </View>
                      </View>
                    ) : null}
                  </Pressable>
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
        </Pressable>
      </Screen>
    </>
  );
}
