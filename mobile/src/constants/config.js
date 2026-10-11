/**
 * Global App Configuration
 *
 * Replace LOCAL_IP with your computer's current IP address (found via `ipconfig` or `ifconfig`)
 * when testing on a physical device over Wi-Fi.
 *
 * In production, replace BASE_URL with your actual live domain (e.g., 'https://api.yourdomain.com').
 */

import { API_BASE_URL } from './api';

export const CONFIG = {
  // Base URLs for API calls
  API_URL: `${API_BASE_URL}/api/v1`,
  WS_URL: `${API_BASE_URL.replace('http', 'ws')}/api/v1`,
};

