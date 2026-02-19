import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Event, Form } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32;

const CAROUSEL_SLIDES = [
  {
    title: "Discover Events",
    subtitle: "Find exciting events near you",
    icon: "calendar" as const,
  },
  {
    title: "Join the Community",
    subtitle: "Connect with fellow attendees",
    icon: "people" as const,
  },
  {
    title: "Share Your Voice",
    subtitle: "Take surveys and give feedback",
    icon: "chatbubbles" as const,
  },
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [surveys, setSurveys] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          setLoading(true);
          const [eventsData, surveysData] = await Promise.all([
            userApi.getEvents(),
            user ? userApi.getAvailableForms(user.id) : Promise.resolve([]),
          ]);
          if (!cancelled) {
            const sortedEvents = Array.isArray(eventsData)
              ? [...eventsData]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .slice(0, 3)
              : [];
            const sortedSurveys = Array.isArray(surveysData)
              ? [...surveysData]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .slice(0, 3)
              : [];
            setEvents(sortedEvents);
            setSurveys(sortedSurveys);
          }
        } catch (err) {
          console.warn("[HomeScreen] Failed to load data", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
    setActiveSlide(index);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() =>
        navigation
          .getParent()
          ?.navigate("Events", {
            screen: "EventDetail",
            params: { eventId: item.id },
          })
      }
    >
      <View style={styles.featuredCardIcon}>
        <Ionicons name="calendar" size={24} color="#7f1d1d" />
      </View>
      <Text style={styles.featuredCardTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.featuredCardMeta}>{formatDate(item.startTime)}</Text>
      {item.location && (
        <Text style={styles.featuredCardMeta} numberOfLines={1}>
          {item.location}
        </Text>
      )}
      <View style={styles.viewButton}>
        <Text style={styles.viewButtonText}>View</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSurveyCard = ({ item }: { item: Form }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() =>
        navigation
          .getParent()
          ?.navigate("Surveys", {
            screen: "SurveyDetail",
            params: { formId: item.id },
          })
      }
    >
      <View style={[styles.featuredCardIcon, { backgroundColor: "#fffbeb" }]}>
        <Ionicons name="list" size={24} color="#7f1d1d" />
      </View>
      <Text style={styles.featuredCardTitle} numberOfLines={1}>
        {item.title}
      </Text>
      {item.description && (
        <Text style={styles.featuredCardDesc} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={styles.viewButton}>
        <Text style={styles.viewButtonText}>View</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#7f1d1d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>EVENGAGE</Text>
          <View style={styles.headerAccent} />
        </View>

        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={CAROUSEL_WIDTH}
          >
            {CAROUSEL_SLIDES.map((slide, index) => (
              <View
                key={index}
                style={[styles.carouselSlide, { width: CAROUSEL_WIDTH }]}
              >
                <View style={styles.carouselGradient}>
                  <Ionicons name={slide.icon} size={48} color="#facc15" />
                  <Text style={styles.carouselTitle}>{slide.title}</Text>
                  <Text style={styles.carouselSubtitle}>{slide.subtitle}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            {CAROUSEL_SLIDES.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeSlide === index && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Featured Events */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Featured Events</Text>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>No events available</Text>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderEventCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          )}
        </View>

        {/* Featured Surveys */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Featured Surveys</Text>
          {surveys.length === 0 ? (
            <Text style={styles.emptyText}>No surveys available</Text>
          ) : (
            <FlatList
              data={surveys}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderSurveyCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  headerContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#7f1d1d",
    letterSpacing: 2,
  },
  headerAccent: {
    width: 60,
    height: 4,
    backgroundColor: "#facc15",
    borderRadius: 2,
    marginTop: 6,
  },

  // Carousel
  carouselContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  carouselSlide: {
    borderRadius: 16,
    overflow: "hidden",
  },
  carouselGradient: {
    backgroundColor: "#7f1d1d",
    height: 180,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  carouselTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fcd34d",
    marginTop: 12,
  },
  carouselSubtitle: {
    fontSize: 14,
    color: "#fef2f2",
    marginTop: 4,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1d5db",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#7f1d1d",
    width: 20,
  },

  // Sections
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
  },
  horizontalList: {
    gap: 12,
  },

  // Featured Cards
  featuredCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    width: 180,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  featuredCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  featuredCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  featuredCardMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  featuredCardDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  viewButton: {
    marginTop: 8,
    backgroundColor: "#7f1d1d",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  viewButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
