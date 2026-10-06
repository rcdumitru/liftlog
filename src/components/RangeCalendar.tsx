import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C } from '@/lib/theme';

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const same = (a: Date | null, b: Date) => !!a && a.getTime() === b.getTime();

/**
 * Month calendar for picking a date range: first tap sets the start, second tap the end
 * (tapping an earlier day restarts). Future days are disabled.
 */
export function RangeCalendar({ start, end, onChange }: { start: Date | null; end: Date | null; onChange: (start: Date | null, end: Date | null) => void }) {
  const today = dayStart(new Date());
  const [month, setMonth] = useState(() => new Date((end ?? start ?? today).getFullYear(), (end ?? start ?? today).getMonth(), 1));

  const lead = (month.getDay() + 6) % 7; // Monday-first
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' }));
  const atCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  const tap = (d: Date) => {
    if (!start || end || d < start) onChange(d, null);
    else onChange(start, d);
  };
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Previous month" style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', color: C.text, fontWeight: '700', fontSize: 15 }}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => shift(1)} disabled={atCurrentMonth} hitSlop={10} accessibilityLabel="Next month" style={{ padding: 4, opacity: atCurrentMonth ? 0.3 : 1 }}>
          <Ionicons name="chevron-forward" size={20} color={C.text} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {weekdays.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: C.faint, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{w}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 38 }} />;
          const future = d > today;
          const edge = same(start, d) || same(end, d);
          const inside = !!start && !!end && d > start && d < end;
          return (
            <Pressable
              key={i}
              disabled={future}
              onPress={() => tap(d)}
              style={{ width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: inside ? C.accentSoft : 'transparent' }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: edge ? C.accent : 'transparent', borderWidth: same(today, d) && !edge ? 1 : 0, borderColor: C.sub }}>
                <Text style={{ color: edge ? C.accentInk : future ? C.faint : C.text, fontWeight: edge ? '800' : '500', opacity: future ? 0.5 : 1 }}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
