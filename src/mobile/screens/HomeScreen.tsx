import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { EventsList } from '../components/EventsList';

/**
 * Home Screen
 *
 * This screen serves as the landing page after login. It welcomes the
 * authenticated user and displays a list of upcoming events. No API
 * integration is required; events are loaded from a local service.
 */
export function HomeScreen() {
  const { user } = useAuth();
  return (
    <View style={styles.container}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome{user ? `, ${user.name}` : ''}</Text>
        <Text style={styles.welcomeSubtitle}>Here are the upcoming events</Text>
      </View>
      <EventsList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});
