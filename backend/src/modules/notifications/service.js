// D:/MyApplication/backend/src/modules/notifications/service.js

/**
 * Notifications Service
 * Handles saving device tokens and sending push notifications.
 */

// Mock database to store tokens
const deviceTokensDb = new Map();

export const notificationService = {
  /**
   * Saves a device token to the database for a given user.
   * @param {string} userId
   * @param {string} token
   */
  async saveDeviceToken(userId, token) {
    console.log(`[Notifications Service] Saving token for user ${userId}: ${token}`);
    deviceTokensDb.set(userId, token);
    return { success: true, message: 'Token saved successfully' };
  },

  /**
   * Sends a push notification to a specific token.
   * Simulates sending via FCM or Expo.
   * @param {string} token
   * @param {string} title
   * @param {string} body
   */
  async sendPushNotification(token, title, body) {
    console.log(`[Notifications Service] Sending push notification to ${token}...`);
    console.log(`[Notifications Service] Title: ${title}`);
    console.log(`[Notifications Service] Body: ${body}`);

    // Simulate network delay for third-party push service (Expo/FCM)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[Notifications Service] Notification sent successfully!`);
        resolve({ success: true, provider: 'mock_expo_or_fcm' });
      }, 500);
    });
  }
};
