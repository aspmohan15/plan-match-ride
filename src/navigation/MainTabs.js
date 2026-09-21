import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/main/HomeScreen';
import DiscoverScreen from '../screens/main/DiscoverScreen';
import MyTripsScreen from '../screens/main/MyTripsScreen';
import GroupsScreen from '../screens/main/GroupsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#FF5722',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size || 24 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size || 24 }}>🔎</Text>,
        }}
      />
      <Tab.Screen
        name="My Trips"
        component={MyTripsScreen}
        options={{
          tabBarLabel: 'My Trips',
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size || 24 }}>🧳</Text>,
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Groups',
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size || 24 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ size }) => <Text style={{ fontSize: size || 24 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
