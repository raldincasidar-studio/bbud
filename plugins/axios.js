import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

// Axios instance with base URL
const apiClient = axios.create({
  baseURL: 'https://b-bud-new.vercel.app', // Your actual API URL
});

// Add a request interceptor to include the auth token in headers
apiClient.interceptors.request.use(async (config) => {
  const userData = await AsyncStorage.getItem('userData');
  if (userData) {
    const parsedUserData = JSON.parse(userData);
    if (parsedUserData.token) {
      config.headers.Authorization = `Bearer ${parsedUserData.token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});


export default async function apiRequest(method, path, data, config = {}) {
  try {
    // Make API request
    const response = await apiClient({
      method,
      url: path,
      data: data,
      ...config,
    });

    return response.data;
  } catch (error) {
    // Check for a response from the server
    if (error.response) {
      const { status, data } = error.response;
      
      // --- FIX STARTS HERE ---
      // This new logic safely parses the error response to ensure it's a string.
      let errorMessage = 'An unexpected error occurred.'; // Default message

      if (data) {
        // Prioritize the 'message' field from the backend
        if (typeof data.message === 'string') {
          errorMessage = data.message;
        } 
        // If 'message' is an object (common for validation errors), parse it
        else if (typeof data.message === 'object' && data.message !== null) {
          const messages = Object.values(data.message).flat();
          if (messages.length > 0) {
            errorMessage = messages.join('\n');
          }
        } 
        // Fallback to checking the 'error' field if 'message' isn't a useful string
        else if (typeof data.error === 'string') {
          errorMessage = data.error;
        }
      }
      // --- FIX ENDS HERE ---

      if (status === 401) {
        await AsyncStorage.removeItem('userData');
        Alert.alert('Unauthorized', 'Session expired. Please log in again.');
        // Optionally, navigate the user to the login screen here
      } else {
        // For all other server errors, show the safely parsed message
        Alert.alert('Error', errorMessage);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('AXIOS NETWORK ERROR ON:', path, error.request);
      Alert.alert('Network Error', 'Could not connect to the server. Please check your internet connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('AXIOS SETUP ERROR ON:', path, error.message);
      Alert.alert('Error', 'An unexpected error occurred.');
    }

    // Returning null indicates to the caller that the request failed.
    // The error is handled here, so we don't re-throw it.
    return null;
  }
}