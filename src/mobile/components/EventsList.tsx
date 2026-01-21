import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { fetchEvents } from '../services/events';
import type { Event } from '../types';

/**
 * A simple list component to display upcoming events.
 *
 * This component mirrors the structure of the `AvailableEvents` component
 * from the web-user project but adapts it for React Native. It
 * fetches a static list of events from the local `fetchEvents` service
 * and renders them as cards. If you later connect the mobile app to
 * a real backend you can replace `fetchEvents` with a network call.
 */
export function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to load events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#a855f7" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!events || events.length === 0) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.emptyText}>No events available</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.listContainer}>
      {events.map((event) => (
        <View key={event.id} style={styles.card}>
          {/* Header with emoji placeholder */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderEmoji}>📅</Text>
          </View>
          {/* Content */}
          <View style={styles.cardBody}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDescription}>
              {event.description || 'No description available'}
            </Text>
            <View style={styles.eventDetailRow}>
              <Text style={styles.eventDetailIcon}>📍</Text>
              <Text style={styles.eventDetailText}>{event.location || 'TBA'}</Text>
            </View>
            <View style={styles.eventDetailRow}>
              <Text style={styles.eventDetailIcon}>🗓️</Text>
              <Text style={styles.eventDetailText}>
                {formatDate(event.startTime)} - {formatDate(event.endTime)}
              </Text>
            </View>
            <View style={styles.eventFooter}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: event.status === 'scheduled' ? '#fbbf24' : '#dc2626' },
                ]}
              >
                <Text style={styles.statusText}>{event.status}</Text>
              </View>
              <Text style={styles.capacityText}>{event.capacity} capacity</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    height: 96,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderEmoji: {
    fontSize: 32,
    color: '#ffffff',
  },
  cardBody: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDetailIcon: {
    marginRight: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: '#374151',
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  capacityText: {
    fontSize: 10,
    color: '#6b7280',
  },
});