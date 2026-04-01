//Local Storage Service
// Provides offline storage for custom events created by the admin.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event } from '../types';

const STORAGE_KEYS = {
  EVENTS: '@teamd/events',
};

let eventsCache: Event[] | null = null;

export async function loadCustomEvents(): Promise<Event[]> {
  if (eventsCache) return eventsCache;
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
    eventsCache = data ? JSON.parse(data) : [];
    return eventsCache!;
  } catch {
    return [];
  }
}

export async function saveCustomEvents(events: Event[]): Promise<void> {
  eventsCache = events;
  await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
}

export async function addEvent(event: Event): Promise<void> {
  const events = await loadCustomEvents();
  const existing = events.find(e => e.id === event.id);
  if (!existing) {
    events.push(event);
    await saveCustomEvents(events);
  }
}

export async function deleteEvent(eventId: number): Promise<void> {
  const events = await loadCustomEvents();
  const filtered = events.filter(e => e.id !== eventId);
  await saveCustomEvents(filtered);
}
