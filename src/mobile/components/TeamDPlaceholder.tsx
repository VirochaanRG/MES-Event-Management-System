/**
 * Team D Placeholder Component
 *
 * Example component showing how to build Team D mobile components
 * that consume the Team D API and display data.
 *
 * This file is copied from the original `mobile-components` package and
 * adapted for a unified codebase. All imports now reference local modules
 * rather than the published `@teamd/mobile-components` package. This
 * simplifies the build on Windows by removing the need for a separate
 * workspace package.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

// Import local types instead of pulling from a published package. The
// `TeamComponentProps` and `InstanceResponse` types are defined in
// ../../types.ts to avoid external dependencies.
import type { TeamComponentProps, InstanceResponse, Event } from '../types';

// Use the locally bundled API client. See ../services/api.ts for
// implementation details.
import { teamDInstances } from '../services/api';

// Import the local event service. This fetches a static list of events
// representing the contents of Team B's database. When a backend API
// becomes available, this module can be replaced with real network
// requests.
import { fetchEvents } from '../services/events';

export function TeamDPlaceholder({ user, instances: passedInstances, token }: TeamComponentProps) {
  const [instances, setInstances] = useState<InstanceResponse[]>(passedInstances || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Event state and error handling. We call fetchEvents() on mount to
  // simulate retrieving data from the database. Errors are stored
  // separately from instance loading errors so they can be displayed
  // independently.
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Debug logging for iOS/Android differences
  useEffect(() => {
    console.log('[TeamDPlaceholder] Props received:', {
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      hasToken: !!token,
      tokenLength: token?.length,
      instancesCount: passedInstances?.length,
    });
  }, [user, token, passedInstances]);

  // Sync instances when passedInstances prop changes
  useEffect(() => {
    if (passedInstances) {
      console.log('[TeamDPlaceholder] Syncing instances from props:', passedInstances.length);
      setInstances(passedInstances);
    }
  }, [passedInstances]);

  // Load events when the component mounts. This mimics fetching data
  // from the database. The promise resolves immediately with static
  // sample data defined in services/events.ts.
  useEffect(() => {
    let isMounted = true;
    const loadEvents = async () => {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const fetched = await fetchEvents();
        if (isMounted) {
          setEvents(fetched);
        }
      } catch (err) {
        console.error('Error loading events:', err);
        if (isMounted) {
          setEventsError(err instanceof Error ? err.message : 'Failed to load events');
        }
      } finally {
        if (isMounted) {
          setEventsLoading(false);
        }
      }
    };
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamDInstances.getInstances();
      setInstances(data.instances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instances');
      console.error('Error loading instances:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadInstances} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Team D Mobile Component</Text>
        <Text style={styles.subtitle}>Example Integration</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        <View style={styles.card}>
          <Text style={styles.label}>User:</Text>
          <Text style={styles.value}>{user?.email || 'Not available'}</Text>

          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{user?.id?.toString() || 'Not available'}</Text>

          <Text style={styles.label}>Token:</Text>
          <Text style={styles.value} numberOfLines={1}>
            {token ? `${token.substring(0, 30)}...` : 'Not available'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accessible Instances</Text>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {instances.map((instance) => (
          <View key={instance.id} style={styles.instanceCard}>
            <Text style={styles.instanceName}>{instance.name}</Text>
            <Text style={styles.instanceOrg}>
              {instance.ownerOrganization.acronym || instance.ownerOrganization.name}
            </Text>
            <View style={[styles.badge, { backgroundColor: getBadgeColor(instance.accessLevel) }]}>
              <Text style={styles.badgeText}>{instance.accessLevel}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.count}>Total: {instances.length} instances</Text>
      </View>

      {/* Events Section (Team B DB integration) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {eventsError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{eventsError}</Text>
          </View>
        )}
        {eventsLoading ? (
          <ActivityIndicator size="small" color="#a855f7" />
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventSubtitle}>{event.location}</Text>
              <Text style={styles.eventTime}>{new Date(event.startTime).toLocaleString()} – {new Date(event.endTime).toLocaleString()}</Text>
            </View>
          ))
        )}
        <Text style={styles.count}>Total: {events.length} events</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Package Information</Text>
        <View style={styles.card}>
          <Text style={styles.infoText}>
            📦 This component was originally part of the{' '}
            <Text style={styles.bold}>@teamd/mobile-components</Text> package
          </Text>
          <Text style={styles.infoText}>🚀 Integrated directly into the mobile app</Text>
          <Text style={styles.infoText}>✅ No separate workspace required</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function getBadgeColor(accessLevel: string): string {
  switch (accessLevel) {
    case 'web_admin':
      return '#ef4444';
    case 'web_user':
      return '#3b82f6';
    case 'both':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#a855f7',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#e9d5ff',
  },
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  instanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  instanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  instanceOrg: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  count: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    fontFamily: 'monospace',
  },

  // Styles specific to the events section. These cards mirror the
  // appearance of instance cards but with distinct spacing and font
  // choices for event details.
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
