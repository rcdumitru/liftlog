import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RestTimerBar } from '@/components/RestTimer';
import { hydrate, useStore } from '@/lib/store';
import { C, isDark, useTheme } from '@/lib/theme';

export default function RootLayout() {
  useTheme();
  const hydrated = useStore((s) => s.hydrated);
  useEffect(() => {
    hydrate();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark() ? 'light' : 'dark'} />
      {hydrated ? (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.text,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: C.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Liftlog' }} />
            <Stack.Screen name="workout/[dayId]" options={{ title: 'Workout' }} />
            <Stack.Screen name="day/[id]" options={{ title: 'Edit day' }} />
            <Stack.Screen name="exercise/[name]" options={{ title: 'Progress' }} />
            <Stack.Screen name="session/[id]" options={{ title: 'Workout' }} />
          </Stack>
          <RestTimerBar />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
