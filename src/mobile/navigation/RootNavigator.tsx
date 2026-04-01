import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/user/HomeScreen";
import { EventsScreen } from "../screens/user/EventsScreen";
import { EventDetailScreen } from "../screens/user/EventDetailScreen";
import { RegisteredEventsScreen } from "../screens/user/RegisteredEventsScreen";
import { SurveysScreen } from "../screens/user/SurveysScreen";
import { SurveyDetailScreen } from "../screens/user/SurveyDetailScreen";
import { SurveyFormScreen } from "../screens/user/SurveyFormScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";
import { AdminEventsScreen } from "../screens/admin/AdminEventsScreen";
import { AdminAnalyticsScreen } from "../screens/admin/AdminAnalyticsScreen";
import { AdminUsersScreen } from "../screens/admin/AdminUsersScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const EventsStack = createNativeStackNavigator();
function EventsStackNavigator() {
  return (
    <EventsStack.Navigator screenOptions={{ headerShown: false }}>
      <EventsStack.Screen name="EventsList" component={EventsScreen} />
      <EventsStack.Screen name="EventDetail" component={EventDetailScreen} />
    </EventsStack.Navigator>
  );
}

const SurveysStack = createNativeStackNavigator();
function SurveysStackNavigator() {
  return (
    <SurveysStack.Navigator screenOptions={{ headerShown: false }}>
      <SurveysStack.Screen name="SurveysList" component={SurveysScreen} />
      <SurveysStack.Screen name="SurveyDetail" component={SurveyDetailScreen} />
      <SurveysStack.Screen name="SurveyForm" component={SurveyFormScreen} />
    </SurveysStack.Navigator>
  );
}

function TabNavigator() {
  const { user } = useAuth();
  const isAdmin = user?.isSystemAdmin;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = "ellipse";
          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Events":
              iconName = focused ? "calendar" : "calendar-outline";
              break;
            case "Registered":
              iconName = focused ? "qr-code" : "qr-code-outline";
              break;
            case "Surveys":
              iconName = focused ? "list" : "list-outline";
              break;
            case "AdminDashboard":
              iconName = focused ? "speedometer" : "speedometer-outline";
              break;
            case "AdminEvents":
              iconName = focused ? "calendar" : "calendar-outline";
              break;
            case "AdminAnalytics":
              iconName = focused ? "bar-chart" : "bar-chart-outline";
              break;
            case "AdminUsers":
              iconName = focused ? "people" : "people-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "ellipse";
          }
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#7f1d1d",
        tabBarInactiveTintColor: "#9ca3af",
      })}
    >
      {isAdmin ? (
        // Admin tabs
        <>
          <Tab.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ title: "Dashboard" }}
          />
          <Tab.Screen
            name="AdminEvents"
            component={AdminEventsScreen}
            options={{ title: "Events" }}
          />
          <Tab.Screen
            name="AdminAnalytics"
            component={AdminAnalyticsScreen}
            options={{ title: "Analytics" }}
          />
          <Tab.Screen
            name="AdminUsers"
            component={AdminUsersScreen}
            options={{ title: "Users" }}
          />
        </>
      ) : (
        // User tabs
        <>
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "Home", headerShown: false }}
          />
          <Tab.Screen
            name="Events"
            component={EventsStackNavigator}
            options={{ title: "Events", headerShown: false }}
          />
          <Tab.Screen
            name="Registered"
            component={RegisteredEventsScreen}
            options={{ title: "My Tickets", headerShown: false }}
          />
          <Tab.Screen
            name="Surveys"
            component={SurveysStackNavigator}
            options={{ title: "Surveys", headerShown: false }}
          />
        </>
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
}
