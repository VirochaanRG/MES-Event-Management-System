/**
 * Local event service
 *
 * In the original monorepo, Team B maintained a separate `db` package
 * with PostgreSQL schemas and seed scripts. Because React Native cannot
 * connect directly to a server-side database and there is no backend
 * running in this environment, we provide a simple in-memory event
 * service. This module exports a function that returns a list of
 * predefined events that mirror the sample data from `db/src/seed.ts`.
 *
 * Custom events created by the admin are stored in AsyncStorage and
 * merged with the sample events.
 *
 * If you later connect the mobile app to a real API, replace the
 * `fetchEvents` implementation with a network request.
 */

import type { Event } from '../types';
import { loadCustomEvents } from './localStorage';

// Sample events based on Team B's seed data. Dates are formatted as
// ISO strings to avoid timezone ambiguities.
const SAMPLE_EVENTS: Event[] = [
  {
    id: 1,
    title: 'Tech Conference 2025',
    description: 'Annual technology conference featuring the latest innovations in AI and software development.',
    location: 'Convention Center, Hall A',
    startTime: new Date('2025-03-15T09:00:00Z').toISOString(),
    endTime: new Date('2025-03-15T17:00:00Z').toISOString(),
    capacity: 500,
    isPublic: true,
    status: 'Scheduled',
    cost: 50,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 2,
    title: 'Community Meetup',
    description: 'Monthly community gathering for networking and knowledge sharing.',
    location: 'Community Center, Room 101',
    startTime: new Date('2025-03-20T18:00:00Z').toISOString(),
    endTime: new Date('2025-03-20T21:00:00Z').toISOString(),
    capacity: 100,
    isPublic: true,
    status: 'Scheduled',
    cost: 0,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 3,
    title: 'Workshop: Introduction to React Native',
    description: 'Hands-on workshop for beginners learning mobile app development with React Native.',
    location: 'Tech Hub, Training Room 2',
    startTime: new Date('2025-04-05T10:00:00Z').toISOString(),
    endTime: new Date('2025-04-05T16:00:00Z').toISOString(),
    capacity: 30,
    isPublic: true,
    status: 'Scheduled',
    cost: 25,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 4,
    title: 'Annual Charity Gala',
    description: 'Elegant evening event to raise funds for local education initiatives.',
    location: 'Grand Ballroom, Downtown Hotel',
    startTime: new Date('2025-04-20T19:00:00Z').toISOString(),
    endTime: new Date('2025-04-20T23:00:00Z').toISOString(),
    capacity: 200,
    isPublic: false,
    status: 'Scheduled',
    cost: 150,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 5,
    title: 'Summer Music Festival',
    description: 'Three-day outdoor music festival featuring local and international artists.',
    location: 'City Park Amphitheater',
    startTime: new Date('2025-06-15T12:00:00Z').toISOString(),
    endTime: new Date('2025-06-17T23:00:00Z').toISOString(),
    capacity: 5000,
    isPublic: true,
    status: 'Scheduled',
    cost: 75,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
];

/**
 * Fetch all available events. Merges sample events with any custom
 * events created by the admin and stored in AsyncStorage.
 */
export async function fetchEvents(): Promise<Event[]> {
  try {
    const customEvents = await loadCustomEvents();
    // Merge sample events with custom events, avoiding duplicates by ID
    const sampleIds = new Set(SAMPLE_EVENTS.map(e => e.id));
    const uniqueCustom = customEvents.filter(e => !sampleIds.has(e.id));
    return [...SAMPLE_EVENTS, ...uniqueCustom];
  } catch {
    return SAMPLE_EVENTS;
  }
}

/**
 * Get sample events only (for reference)
 */
export function getSampleEvents(): Event[] {
  return SAMPLE_EVENTS;
}
