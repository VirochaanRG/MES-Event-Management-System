import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_IDS_KEY = '@teamd/seen_announcement_ids';

/**
 * Configure how notifications appear when the app is in the foreground.
 * Call this once at app startup.
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request notification permissions and return the Expo push token string,
 * or null if permissions were denied or the device doesn't support push.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens only work on real devices, not simulators
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7f1d1d',
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as
      | string
      | undefined;
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Returns the set of announcement IDs the user has already seen locally.
 */
export async function getSeenAnnouncementIds(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_IDS_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/**
 * Persists a new set of seen announcement IDs.
 */
export async function saveSeenAnnouncementIds(ids: Set<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage errors
  }
}

/**
 * Schedules a local notification immediately.
 */
export async function showLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // fire immediately
  });
}
