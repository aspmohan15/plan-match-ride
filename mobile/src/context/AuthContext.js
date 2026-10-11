import React, { createContext, useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkInitialAuth();

    const subscription = DeviceEventEmitter.addListener('auth:logout', () => {
      console.log('401 Unauthorized received. Logging out...');
      logout();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkInitialAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        const response = await AuthService.getCurrentUser();
        if (response.success) {
          setUser(response.data.user);
        } else {
          await SecureStore.deleteItemAsync('userToken');
        }
      }
    } catch (error) {
      console.log('Auth check error:', error);
      await SecureStore.deleteItemAsync('userToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token, userData) => {
    await SecureStore.setItemAsync('userToken', token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      // Ignore API error on logout
    }
    await SecureStore.deleteItemAsync('userToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};