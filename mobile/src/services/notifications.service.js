/**
 * Safe Mock Push Notification Service for Expo Go (SDK 53+)
 * Expo removed push notification support from the Go app.
 * Importing `expo-notifications` throws a fatal error on boot.
 */

export const registerForPushNotificationsAsync = async () => {
  console.log("Push notifications bypassed for Expo Go development.");
  return 'mock-expo-push-token-for-development';
};
