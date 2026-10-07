import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { RangeCalendar } from '@/components/RangeCalendar';
import { Button, Card, Empty, Row, Screen, Section, Sheet, s } from '@/components/ui';
import { formatDate, formatDuration, formatRest, PERIODS, uid } from '@/lib/defaults';
import { sessionTotals } from '@/lib/stats';
import { useStore } from '@/lib/store';
import type { Session } from '@/lib/types';
import { C, useTheme } from '@/lib/theme';

export default function Train() {
  useTheme();
  const days = useStore((st) => st.days);
  const sessions = useStore((st) => st.sessions);
  const active = useStore((st) => st.active);

  const lastByDay = (id: string) => [...sessions].reverse().find((x) => x.dayId === id);
  const thisWeek = sessions.filter((x) => Date.now() - new Date(x.startedAt).getTime() < 7 * 864e5).length;

  // Recent shows the last 5; "Show more…" switches to a date range, shown in a 5-tile-tall scrollable box
  // that renders PAGE tiles at a time as you scroll inside it.
  const [period, setPeriod] = useState<Range | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [picking, setPicking] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  /** Measured height of one tile (incl. its gap), so the box fits exactly five. */
  const [tileH, setTileH] = useState(92);
  const listRef = useRef<ScrollView>(null);
  const newest = [...sessions].reverse();
  const inRange = (x: Session, r: Range) => {
    const at = new Date(x.startedAt).getTime();
    return at >= r.from && at <= r.to;
  };
  const recent = period ? newest.filter((x) => inRange(x, period)) : newest.slice(0, 5);
  const visible = period ? recent.slice(0, shown) : recent;
  const loadMore = () => {
    if (period && shown < recent.length) setShown((n) => n + PAGE);
  };

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
          <Section
            title={period ? `${period.title} (${recent.length})` : 'Recent'}
            right={
              period ? (
                <Pressable onPress={() => setPeriod(null)} hitSlop={10}>
                  <Text style={{ color: C.accent, fontWeight: '700' }}>Show less</Text>
                </Pressable>
              ) : null
            }
          />
          {!period ? visible.map((x) => <SessionTile key={x.id} session={x} />) : null}
          {period && recent.length === 0 ? <Empty text="No workouts in this period." /> : null}
          {period && recent.length ? (
            <View>
              <ScrollView
                ref={listRef}
                nestedScrollEnabled
                style={{ maxHeight: tileH * 5 - 10 }}
                scrollEventThrottle={100}
                onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
                  setScrolled(contentOffset.y > 120);
                  if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) loadMore();
                }}
              >
                {visible.map((x, i) => (
                  <View key={x.id} onLayout={i === 0 ? (e) => setTileH(e.nativeEvent.layout.height) : undefined}>
                    <SessionTile session={x} />
                  </View>
                ))}
                {shown < recent.length ? (
                  // Loads automatically near the bottom; tapping is a fallback.
                  <Pressable onPress={loadMore} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 12 }}>
                    <Text style={s.muted}>Load more…</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
              {scrolled ? (
                <Pressable
                  onPress={() => listRef.current?.scrollTo({ y: 0, animated: true })}
                  accessibilityLabel="Back to top"
                  style={{ position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6 }}
                >
                  <Ionicons name="arrow-up" size={14} color={C.accentInk} />
                  <Text style={{ color: C.accentInk, fontWeight: '700', fontSize: 13 }}>Top</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {!period && sessions.length > 5 ? (
            <Pressable onPress={() => setPicking(true)} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 10 }}>
              <Text style={{ color: C.accent, fontWeight: '700' }}>Show more…</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
      <PeriodPicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(p) => {
          setPeriod(p);
          setShown(PAGE);
          setScrolled(false);
          setPicking(false);
        }}
      />
    </Screen>
  );
}

const PAGE = 20;

function SessionTile({ session: x }: { session: Session }) {
  const { sets, volume: vol } = sessionTotals(x);
  return (
    <Card style={{ paddingVertical: 12 }} onPress={() => router.push(`/session/${x.id}`)}>
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
}

/** Which workouts the expanded list shows: startedAt between `from` and `to` (ms). */
type Range = { title: string; from: number; to: number };

const presetRange = (p: (typeof PERIODS)[number]): Range =>
  p.days === Infinity ? { title: 'All workouts', from: -Infinity, to: Infinity } : { title: `Last ${p.label.toLowerCase()}`, from: Date.now() - p.days * 864e5, to: Infinity };

function PeriodPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (r: Range) => void }) {
  const [custom, setCustom] = useState(false);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const pickCustom = () => {
    if (!start) return;
    const last = end ?? start; // one tapped day = just that day
    const title = last.getTime() === start.getTime() ? formatDate(start.toISOString()) : `${formatDate(start.toISOString())} – ${formatDate(last.toISOString())}`;
    onPick({ title, from: start.getTime(), to: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).getTime() - 1 });
  };

  return (
    <Sheet visible={visible} onClose={onClose} maxWidth={400}>
            <Text style={[s.h2, { marginBottom: 12 }]}>Show workouts from</Text>
            {PERIODS.filter((p) => p.days !== Infinity).map((p) => (
              <Pressable key={p.label} onPress={() => onPick(presetRange(p))} style={({ pressed }) => ({ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, opacity: pressed ? 0.6 : 1 })}>
                <Text style={s.body}>Last {p.label.toLowerCase()}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setCustom((v) => !v)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
              <Text style={[s.body, { flex: 1 }]}>Custom dates…</Text>
              <Ionicons name={custom ? 'chevron-up' : 'chevron-down'} size={18} color={C.sub} />
            </Pressable>
            {custom ? (
              <View style={{ marginBottom: 4 }}>
                <RangeCalendar start={start} end={end} onChange={(a, b) => { setStart(a); setEnd(b); }} />
                <Text style={[s.muted, { fontSize: 13, textAlign: 'center', marginTop: 8 }]}>
                  {!start ? 'Tap a start date' : !end ? `${formatDate(start.toISOString())} – tap an end date` : `${formatDate(start.toISOString())} – ${formatDate(end.toISOString())}`}
                </Text>
                <Button label="Show these dates" disabled={!start} onPress={pickCustom} style={{ marginTop: 10 }} />
              </View>
            ) : null}
            <Button kind={custom ? 'ghost' : 'primary'} label="Show all" onPress={() => onPick(presetRange(PERIODS[PERIODS.length - 1]))} style={{ marginTop: 12 }} />
            <Button kind="ghost" label="Cancel" onPress={onClose} style={{ marginTop: 8 }} />
    </Sheet>
  );
}
