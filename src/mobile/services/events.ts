/**
 * Local event service
 *
 * In the original monorepo, Team B maintained a separate `db` package
 * with PostgreSQL schemas and seed scripts. Because React Native cannot
 * connect directly to a server‑side database and there is no backend
 * running in this environment, we provide a simple in‑memory event
 * service. This module exports a function that returns a list of
 * predefined events that mirror the sample data from `db/src/seed.ts`.
 *
 * If you later connect the mobile app to a real API, replace the
 * `fetchEvents` implementation with a network request.
 */

import type { Event } from '../types';

// Sample events based on Team B's seed data. Dates are formatted as
// ISO strings to avoid timezone ambiguities.
const SAMPLE_EVENTS: Event[] = [
  {
    id: 1,
    title: 'Test Event 1',
    description: 'This is a sample event for testing purposes.',
    location: 'Test Location A',
    startTime: new Date('2025-01-10T10:00:00Z').toISOString(),
    endTime: new Date('2025-01-10T12:00:00Z').toISOString(),
    capacity: 50,
    isPublic: true,
    status: 'scheduled',
    cost: 0,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 2,
    title: 'Test Event 2',
    description: 'A simple placeholder event for local testing.',
    location: 'Test Location B',
    startTime: new Date('2025-02-15T14:00:00Z').toISOString(),
    endTime: new Date('2025-02-15T16:00:00Z').toISOString(),
    capacity: 30,
    isPublic: false,
    status: 'scheduled',
    cost: 0,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 3,
    title: 'Test Event 3',
    description: 'Third test event for verifying inserts and queries.',
    location: 'Test Location C',
    startTime: new Date('2025-03-05T09:00:00Z').toISOString(),
    endTime: new Date('2025-03-05T11:00:00Z').toISOString(),
    capacity: 100,
    isPublic: true,
    status: 'scheduled',
    cost: 0,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 4,
    title: 'Test Event 4',
    description: 'Placeholder data for local development testing.',
    location: 'Test Location D',
    startTime: new Date('2025-04-20T13:00:00Z').toISOString(),
    endTime: new Date('2025-04-20T15:00:00Z').toISOString(),
    capacity: 75,
    isPublic: true,
    status: 'scheduled',
    cost: 0,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 5,
    title: 'Test Event 5',
    description: 'Fifth test event entry for database seeding.',
    location: 'Test Location E',
    startTime: new Date('2025-05-30T18:00:00Z').toISOString(),
    endTime: new Date('2025-05-30T20:00:00Z').toISOString(),
    capacity: 25,
    isPublic: false,
    status: 'scheduled',
    cost: 0,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  },
];

/**
 * Fetch all available events. In a real application this would make a
 * network request to your backend API or database layer. Here it just
 * returns a promise that resolves to a static list.
 */
export async function fetchEvents(): Promise<Event[]> {
  // Simulate async operation
  return Promise.resolve(SAMPLE_EVENTS);
}