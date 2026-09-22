import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import CreateTripScreen from '../screens/main/CreateTripScreen';
import GroupChatScreen from '../screens/main/GroupChatScreen';
import RiderProfileScreen from '../screens/main/RiderProfileScreen';
import { AuthContext } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { user, isLoading } = React.useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
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
        </>
      ) : (
        <Stack.Screen name="AuthStack" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
