import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, onThemeChange, R } from '@/lib/theme';

/** Scrollable page with a centered max-width column so it also looks right on desktop web. */
export function Screen({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
      <View style={[s.column, { paddingTop: title ? insets.top + 16 : 12, paddingHorizontal: 16 }]}>
        {title ? (
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {children}
      </View>
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { backgroundColor: C.cardHi }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ label, onPress, kind = 'primary', disabled, small, style }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const bg = kind === 'primary' ? C.accent : 'transparent';
  const fg = kind === 'primary' ? C.accentInk : kind === 'danger' ? C.danger : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && { paddingVertical: 8, paddingHorizontal: 12 },
        { backgroundColor: bg, borderColor: kind === 'primary' ? C.accent : kind === 'danger' ? C.danger : C.border, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnText, { color: fg }, small && { fontSize: 14 }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.accent, borderColor: C.accent }]}>
      <Text style={[s.chipText, active && { color: C.accentInk }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={C.faint} {...props} style={[s.input, props.style]} />
    </View>
  );
}

/**
 * Numeric input that keeps a local text buffer so users can type "72." etc.
 * 0 shows as empty unless `showZero` (a 0 the user actually typed); `onChange` also reports whether the box is empty.
 */
export function NumInput({ value, onChange, style, width = 64, placeholder = '0', showZero }: {
  value: number; onChange: (n: number, empty: boolean) => void; style?: object; width?: number; placeholder?: string; showZero?: boolean;
}) {
  const fmt = (v: number) => (v || showZero ? String(v) : '');
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    // Sync from outside (e.g. "copy to all sets") without clobbering "72." mid-typing.
    if ((parseFloat(text.replace(',', '.')) || 0) !== value) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <TextInput
      value={text}
      placeholder={placeholder}
      placeholderTextColor={C.faint}
      keyboardType="decimal-pad"
      selectTextOnFocus
      onChangeText={(t) => {
        setText(t);
        onChange(parseFloat(t.replace(',', '.')) || 0, t.trim() === '');
      }}
      style={[s.num, { width }, style]}
    />
  );
}

export function Section({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ marginTop: 22, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
      <Text style={[s.section, { flex: 1 }]}>{title}</Text>
      {right}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Empty({ text }: { text: string }) {
  return <Text style={{ color: C.sub, textAlign: 'center', paddingVertical: 28, lineHeight: 20 }}>{text}</Text>;
}

const makeStyles = () => StyleSheet.create({
  column: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { marginBottom: 16 },
  title: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: C.sub, fontSize: 15, marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  btn: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnText: { fontWeight: '700', fontSize: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipText: { color: C.text, fontWeight: '600', fontSize: 14 },
  label: { color: C.sub, fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: R.md, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  num: { backgroundColor: C.bg, borderColor: C.border, borderWidth: 1, borderRadius: R.sm, color: C.text, paddingVertical: 8, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  section: { color: C.sub, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  h2: { color: C.text, fontSize: 18, fontWeight: '700' },
  body: { color: C.text, fontSize: 15, lineHeight: 21 },
  muted: { color: C.sub, fontSize: 14, lineHeight: 20 },
});

export const s = makeStyles();
onThemeChange(() => Object.assign(s, makeStyles()));
