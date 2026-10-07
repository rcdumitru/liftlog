import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Text } from 'react-native';
import { Button, Card, Empty, Row, Screen, s, SetPill, Stat } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { formatDate, formatDuration } from '@/lib/defaults';
import { sessionTotals } from '@/lib/stats';
import { actions, useStore } from '@/lib/store';
import { C, useTheme } from '@/lib/theme';

export default function SessionDetail() {
  useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useStore((st) => st.sessions.find((x) => x.id === id));
  const units = useStore((st) => st.profile.units);

  if (!session) return <><Stack.Screen options={{ title: 'Workout' }} /><Screen><Empty text="This workout no longer exists." /></Screen></>;

  const entries = session.entries.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length);
  const { sets, volume } = sessionTotals(session);
  const time = new Date(session.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Stack.Screen options={{ title: session.dayName }} />
      <Screen>
        <Text style={[s.muted, { marginBottom: 12 }]}>
          {formatDate(session.startedAt, { weekday: 'long' })} · {time}
        </Text>
        <Row style={{ flexWrap: 'nowrap', gap: 10, marginBottom: 6 }}>
          {session.finishedAt ? <Stat size={20} label="Duration" value={formatDuration(new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime())} /> : null}
          <Stat size={20} label="Sets" value={String(sets)} />
          <Stat size={20} label={`Volume (${units})`} value={Math.round(volume).toLocaleString()} />
        </Row>

        {entries.map((e) => (
          <Card key={e.exerciseId + e.name} onPress={() => router.push(`/exercise/${encodeURIComponent(e.name)}`)}>
            <Row style={{ flexWrap: 'nowrap', marginBottom: 10 }}>
              <Text style={[s.h2, { flex: 1 }]}>{e.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={C.faint} />
            </Row>
            {e.sets.map((x, i) => (
              <Row key={i} style={{ flexWrap: 'nowrap', paddingVertical: 3 }}>
                <Text style={{ color: C.sub, width: 26, fontWeight: '700' }}>{i + 1}</Text>
                <SetPill weight={x.weight} reps={x.reps} units={units} />
              </Row>
            ))}
          </Card>
        ))}
        {entries.length === 0 ? <Empty text="No sets were logged in this workout." /> : null}

        <Button
          kind="danger"
          label="Delete workout"
          style={{ marginTop: 14 }}
          onPress={async () => {
            if (!(await confirm('Delete this workout?', 'Its sets are removed from your history and progress. This can’t be undone.', 'Delete'))) return;
            router.back();
            actions.deleteSession(session.id);
          }}
        />
      </Screen>
    </>
  );
}

