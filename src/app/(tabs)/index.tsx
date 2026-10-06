import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, Empty, Row, Screen, Section, s } from '@/components/ui';
import { formatDate, formatDuration, formatRest, uid } from '@/lib/defaults';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Train() {
  const days = useStore((st) => st.days);
  const sessions = useStore((st) => st.sessions);
  const active = useStore((st) => st.active);

  const lastByDay = (id: string) => [...sessions].reverse().find((x) => x.dayId === id);
  const thisWeek = sessions.filter((x) => Date.now() - new Date(x.startedAt).getTime() < 7 * 864e5).length;

  return (
    <Screen title="Train" subtitle={`${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · ${thisWeek} workout${thisWeek === 1 ? '' : 's'} this week`}>
      {active ? (
        <Card style={{ borderColor: C.accent }} onPress={() => router.push(`/workout/${active.dayId}`)}>
          <Row>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent }} />
            <Text style={[s.h2, { flex: 1 }]}>{active.dayName} in progress</Text>
            <Text style={{ color: C.accent, fontWeight: '700' }}>Resume →</Text>
          </Row>
        </Card>
      ) : null}

      <Section
        title="Your days"
        right={
          <Pressable onPress={() => router.push(`/day/new-${uid()}`)} hitSlop={10}>
            <Text style={{ color: C.accent, fontWeight: '700' }}>+ Add day</Text>
          </Pressable>
        }
      />
      {days.length === 0 ? <Empty text="No workout days yet. Add one to get started." /> : null}
      {days.map((d) => {
        const last = lastByDay(d.id);
        const mins = Math.round(d.exercises.reduce((t, e) => t + e.sets * (45 + e.restSec), 0) / 60);
        const blocked = !!active && active.dayId !== d.id;
        return (
          <Card key={d.id} onPress={blocked ? undefined : () => router.push(`/workout/${d.id}`)}>
            <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.h2, { fontSize: 22 }]}>{d.name}</Text>
                <Text style={s.muted}>{d.focus}</Text>
              </View>
              <Pressable onPress={() => router.push(`/day/${d.id}`)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="create-outline" size={20} color={C.sub} />
              </Pressable>
            </Row>
            <View style={{ marginVertical: 12, gap: 6 }}>
              {d.exercises.map((e) => (
                <Row key={e.id} style={{ flexWrap: 'nowrap' }}>
                  <Text style={[s.body, { flex: 1 }]} numberOfLines={1}>{e.name}</Text>
                  <Text style={{ color: C.sub, fontVariant: ['tabular-nums'] }}>
                    {e.sets}×{e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}–${e.repsMax}`} · {formatRest(e.restSec)}
                  </Text>
                </Row>
              ))}
            </View>
            <Row style={{ flexWrap: 'nowrap' }}>
              <Text style={[s.muted, { flex: 1, fontSize: 13 }]}>
                ~{mins} min{last ? ` · last ${formatDate(last.startedAt)}` : ''}
              </Text>
              <Button
                small
                label={active?.dayId === d.id ? 'Resume' : 'Start'}
                disabled={blocked}
                onPress={() => router.push(`/workout/${d.id}`)}
              />
            </Row>
          </Card>
        );
      })}

      {sessions.length ? (
        <>
          <Section title="Recent" />
          {[...sessions].reverse().slice(0, 5).map((x) => {
            const vol = x.entries.reduce((t, e) => t + e.sets.filter((z) => z.done).reduce((a, z) => a + z.weight * z.reps, 0), 0);
            const sets = x.entries.reduce((t, e) => t + e.sets.filter((z) => z.done).length, 0);
            return (
              <Card key={x.id} style={{ paddingVertical: 12 }} onPress={() => router.push(`/session/${x.id}`)}>
                <Row style={{ flexWrap: 'nowrap' }}>
                  <Text style={[s.body, { flex: 1, fontWeight: '600' }]}>{x.dayName}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.muted}>{formatDate(x.startedAt, { weekday: 'short' })}</Text>
                    {x.finishedAt ? <Text style={[s.muted, { fontSize: 13 }]}>{formatDuration(new Date(x.finishedAt).getTime() - new Date(x.startedAt).getTime())}</Text> : null}
                  </View>
                </Row>
                <Text style={[s.muted, { fontSize: 13 }]}>{sets} sets · {Math.round(vol).toLocaleString()} volume</Text>
              </Card>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}
