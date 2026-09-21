import React from 'react';
import { BaseToast, ErrorToast } from 'react-native-toast-message';

/*
  Customized Toast UI configuration.
  This makes the Toasts much more readable by increasing text size and padding,
  bringing them closer to modern iOS/Android UI standards.
*/
export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#4CAF50', borderLeftWidth: 6, height: 'auto', minHeight: 70, paddingVertical: 10 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
      }}
      text2Style={{
        fontSize: 16,
        color: '#666',
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#F44336', borderLeftWidth: 6, height: 'auto', minHeight: 70, paddingVertical: 10 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
      }}
      text2Style={{
        fontSize: 16,
        color: '#666',
      }}
      text2NumberOfLines={2}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#2196F3', borderLeftWidth: 6, height: 'auto', minHeight: 70, paddingVertical: 10 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
      }}
      text2Style={{
        fontSize: 16,
        color: '#666',
      }}
    />
  )
};