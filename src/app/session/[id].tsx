import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Text, View } from 'react-native';
import { Button, Card, Empty, Row, Screen, s } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { formatDate, formatDuration } from '@/lib/defaults';
import { actions, useStore } from '@/lib/store';
import { C, useTheme } from '@/lib/theme';

export default function SessionDetail() {
  useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useStore((st) => st.sessions.find((x) => x.id === id));
  const units = useStore((st) => st.profile.units);

  if (!session) return <><Stack.Screen options={{ title: 'Workout' }} /><Screen><Empty text="This workout no longer exists." /></Screen></>;

  const entries = session.entries.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length);
  const sets = entries.reduce((t, e) => t + e.sets.length, 0);
  const volume = entries.reduce((t, e) => t + e.sets.reduce((a, x) => a + x.weight * x.reps, 0), 0);
  const time = new Date(session.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Stack.Screen options={{ title: session.dayName }} />
      <Screen>
        <Text style={[s.muted, { marginBottom: 12 }]}>
          {formatDate(session.startedAt, { weekday: 'long' })} · {time}
        </Text>
        <Row style={{ flexWrap: 'nowrap', gap: 10, marginBottom: 6 }}>
          {session.finishedAt ? <Stat label="Duration" value={formatDuration(new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime())} /> : null}
          <Stat label="Sets" value={String(sets)} />
          <Stat label={`Volume (${units})`} value={Math.round(volume).toLocaleString()} />
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
                <View style={{ backgroundColor: 'rgba(128,128,128,0.25)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={s.muted}>{`${x.weight} ${units} × ${x.reps}`}</Text>
                </View>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border }}>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: C.sub, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
