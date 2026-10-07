import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/**
 * System notification for when the rest timer ends while the app is in the background
 * (phone locked, another app open). In the foreground the in-app popup handles it,
 * so banners are suppressed there to avoid showing both.
 *
 * Not available on web, or in Expo Go on Android, where merely importing expo-notifications
 * throws (SDK 53+). The package is therefore loaded lazily, only where it works; a development
 * build gets notifications on Android.
 */
const native = Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());
const Notifications: typeof import('expo-notifications') = native ? require('expo-notifications') : (null as never);
let ready: Promise<boolean> | null = null;
let scheduled: string | null = null;
/** Bumped on every schedule/cancel so a slow, outdated schedule call cancels itself. */
let gen = 0;

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false }),
  });
}

/** Asks for permission once (on the first rest timer) and sets up the Android channel. */
function ensureReady() {
  ready ??= (async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('rest-timer', {
          name: 'Rest timer',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 100, 200],
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      return (await Notifications.requestPermissionsAsync()).granted;
    } catch {
      return false;
    }
  })();
  return ready;
}

export async function scheduleRestDone(endAt: number, label: string) {
  if (!native) return;
  await cancelRestDone();
  const mine = gen;
  if (!(await ensureReady()) || mine !== gen) return;
  const seconds = Math.round((endAt - Date.now()) / 1000);
  if (seconds < 1) return;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest’s over 💪', body: `Time for your next set of ${label}.`, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: 'rest-timer' },
    });
    if (mine === gen) scheduled = id;
    else await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Notifications are a nice-to-have; the in-app popup still fires.
  }
}

export async function cancelRestDone() {
  gen++;
  if (!native || !scheduled) return;
  const id = scheduled;
  scheduled = null;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
