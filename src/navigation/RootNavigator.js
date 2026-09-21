import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import CreateTripScreen from '../screens/main/CreateTripScreen';
import GroupChatScreen from '../screens/main/GroupChatScreen';
import RiderProfileScreen from '../screens/main/RiderProfileScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthStack" component={AuthStack} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="CreateTrip"
        component={CreateTripScreen}
        options={{ headerShown: true, title: 'Create Trip', presentation: 'modal' }}
      />
      <Stack.Screen
        name="GroupChat"
        component={GroupChatScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.groupName || 'Group Chat',
        })}
      />
      <Stack.Screen
        name="RiderProfile"
        component={RiderProfileScreen}
        options={{ headerShown: true, title: 'Rider Profile' }}
      />
    </Stack.Navigator>
  );
}
