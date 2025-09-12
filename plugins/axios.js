import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosRequestConfig } from 'axios'; // Import AxiosRequestConfig
import { Alert } from 'react-native';

// Axios instance with base URL
const apiClient = axios.create({
  // baseURL: 'https://b-bud-new.vercel.app', // Your actual API URL
  baseURL: 'https://184143e2cd6f.ngrok-free.app', // Your ngrok URL is correct here
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
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


// Updated apiRequest function
export default async function apiRequest(method: string, path: string, requestPayload?: any, config: AxiosRequestConfig = {}) {
  try {
    const requestConfig: AxiosRequestConfig = {
      method,
      url: path,
      ...config, // Apply any additional config passed in (e.g., custom headers)
    };

    // For GET requests, parameters should be in 'params', not 'data' (body)
    if (method.toUpperCase() === 'GET') {
      requestConfig.params = requestPayload; // requestPayload is now treated as query parameters
    } else {
      // For POST, PUT, PATCH, etc., data goes in the 'data' field (request body)
      requestConfig.data = requestPayload; // requestPayload is now treated as request body
    }

    // Make API request
    const response = await apiClient(requestConfig);

    return response.data;
  } catch (error) {
    // Check for a response from the server
    if (axios.isAxiosError(error) && error.response) { // Use axios.isAxiosError for type narrowing
      const { status, data } = error.response;

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

      if (status === 401) {
        await AsyncStorage.removeItem('userData');
        Alert.alert('Unauthorized', 'Session expired. Please log in again.');
        // Optionally, navigate the user to the login screen here (e.g., router.replace('/login'))
      } else {
        // For all other server errors, show the safely parsed message
        Alert.alert('Error', errorMessage);
      }
    } else if (axios.isAxiosError(error) && error.request) {
      // The request was made but no response was received
      console.error('AXIOS NETWORK ERROR ON:', path, error.request);
      Alert.alert('Network Error', 'Could not connect to the server. Please check your internet connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('AXIOS SETUP ERROR ON:', path, error?.message); // Use optional chaining for error.message
      Alert.alert('Error', 'An unexpected error occurred.');
    }

    // Returning null indicates to the caller that the request failed.
    // The error is handled here, so we don't re-throw it.
    return null;
  }
}