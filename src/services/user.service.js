import api from './api';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../constants/api';

export const UserService = {
  updateProfile: async (data, token = null) => {
    return await api.patch('/users/me', data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },

  uploadProfileImage: async (imageUri, token = null) => {
    return await uploadImage(imageUri, '/users/me/profile-image', token);
  },

  uploadBikeImage: async (imageUri, token = null) => {
    return await uploadImage(imageUri, '/users/me/bike-image', token);
  }
};

async function uploadImage(photoUri, endpoint, token = null) {
  console.log(`[UPLOAD] Starting for URI: ${photoUri}`);

  const fileInfo = await FileSystem.getInfoAsync(photoUri);
  console.log(`[UPLOAD] File exists? ${fileInfo.exists}`);
  if (!fileInfo.exists) {
    throw new Error('File does not exist at path: ' + photoUri);
  }

  const safeUri = FileSystem.cacheDirectory + 'upload-' + Date.now() + '.jpg';
  await FileSystem.copyAsync({ from: photoUri, to: safeUri });
  console.log(`[UPLOAD] Copied to safe URI: ${safeUri}`);

  let authToken = token;
  if (!authToken) {
    try {
      authToken = await SecureStore.getItemAsync('userToken');
    } catch (e) {
      console.warn('Error reading token', e);
    }
  }

  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  console.log('[UPLOAD] Uploading safe URI:', safeUri, 'to', url);

  try {
    const uploadResult = await FileSystem.uploadAsync(url, safeUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'image',
      mimeType: 'image/jpeg',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log(`[UPLOAD SUCCESS? status=${uploadResult.status}]:`, uploadResult.body);
    const parsedBody = JSON.parse(uploadResult.body);

    if (uploadResult.status < 200 || uploadResult.status >= 300 || parsedBody.success === false) {
      throw new Error(parsedBody?.error?.message || 'Upload failed with status ' + uploadResult.status);
    }

    return parsedBody;
  } catch (error) {
    console.error('[UPLOAD ERROR]:', error);
    throw error;
  }
}
