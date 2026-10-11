import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/api';

const API_URL = `${API_BASE_URL}/api/v1`;

class ApiService {
  async request(method, endpoint, data = null, options = {}) {
    let token;
    try {
      token = await SecureStore.getItemAsync('userToken');
    } catch (e) {
      console.warn('Error reading token', e);
    }

    const headers = { ...(options.headers || {}) };

    // Standardize header checking
    const getHeaderKey = (keyToFind) => Object.keys(headers).find(k => k.toLowerCase() === keyToFind.toLowerCase());

    if (token && !getHeaderKey('authorization')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (data instanceof FormData) {
      // React Native needs to automatically set multipart/form-data; boundary=...
      const ctKey = getHeaderKey('content-type');
      if (ctKey) delete headers[ctKey];
    } else if (data !== null && data !== undefined && !getHeaderKey('content-type')) {
      headers['Content-Type'] = 'application/json';
    }

    const url = `${API_URL}${endpoint}`;

    const fetchOptions = {
      ...options,
      method,
      headers, // Pass as plain object
    };

    if (data) {
      fetchOptions.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    // [API REQUEST] Logging
    console.log(`[API REQUEST]: ${method} ${url}`);

    // Obscure sensitive info in logs
    let logBody = fetchOptions.body;
    if (typeof logBody === 'string' && logBody.includes('otp')) {
      try {
        const parsed = JSON.parse(logBody);
        if (parsed.otp) parsed.otp = '***';
        if (parsed.password) parsed.password = '***';
        logBody = JSON.stringify(parsed);
      } catch (e) {}
    }

    console.log(`[API REQUEST HEADERS]:`, headers);
    if (!(data instanceof FormData)) {
      console.log(`[API REQUEST BODY]:`, logBody);
    } else {
      console.log(`[API REQUEST BODY]: FormData attached`);
    }

    try {
      const response = await fetch(url, fetchOptions);

      const responseClone = response.clone();
      const rawText = await responseClone.text();

      // [API RESPONSE RAW] Logging
      console.log(`[API RESPONSE RAW]: ${response.status}`, rawText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(rawText);
        } catch {
          errorData = { error: { message: 'Unknown Error', details: rawText } };
        }

        const errPayload = errorData.error || errorData;
        const e = new Error(errPayload.message || 'API Error');
        e.code = errPayload.code;
        e.details = errPayload;
        throw e;
      }

      // Return parsed JSON if possible, otherwise raw text
      try {
        return JSON.parse(rawText);
      } catch {
        return rawText;
      }
    } catch (error) {
      // [API FETCH ERROR RAW] Logging
      console.error('[API FETCH ERROR RAW]:', error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  }
}

export default new ApiService();