/**
 * Global App Configuration
 *
 * Replace LOCAL_IP with your computer's current IP address (found via `ipconfig` or `ifconfig`)
 * when testing on a physical device over Wi-Fi.
 *
 * In production, replace BASE_URL with your actual live domain (e.g., 'https://api.yourdomain.com').
 */

// Your computer's current local IP address
const LOCAL_IP = '192.168.1.7';

// The port your Node.js backend is running on
const PORT = '3000';

export const CONFIG = {
  // Base URLs for API calls
  API_URL: `http://${LOCAL_IP}:${PORT}/api/v1`,
  WS_URL: `ws://${LOCAL_IP}:${PORT}/api/v1`,
};
