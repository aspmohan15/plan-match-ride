import api from './api';

export const AuthService = {
  sendOtp: async (phoneNumber, isUpdate = false) => {
    return await api.post('/auth/send-otp', { phoneNumber, isUpdate });
  },

  verifyOtp: async (phoneNumber, otp) => {
    return await api.post('/auth/verify-otp', { phoneNumber, otp });
  },

  getCurrentUser: async () => {
    return await api.get('/auth/me');
  },

  updateProfile: async (data) => {
    return await api.request('PUT', '/auth/me', data);
  },

  logout: async () => {
    return await api.post('/auth/logout', {});
  }
};