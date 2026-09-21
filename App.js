import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ToastConfig';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'DateTimePicker: `onChange` is deprecated',
  'DateTimePicker: \'onChange\' is deprecated'
]);

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
