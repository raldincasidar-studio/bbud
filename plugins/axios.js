// plugins/axios.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Import AxiosError
import { Alert } from 'react-native'; // Keep Alert for unauthorized, but remove others

// Axios instance with base URL
const apiClient = axios.create({
  // baseURL: 'https://b-bud-new.vercel.app', // Your actual API URL
  baseURL: 'https://67b96c863714.ngrok-free.app', // Your ngrok URL is correct here
  timeout: 30000, // Increased timeout to 30 seconds
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
export default async function apiRequest(method, path, requestPayload, config = {}) {
  try {
    const requestConfig = {
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
    // FIX: Re-throw the error so the caller can handle specific backend messages.
    // Remove generic alerts from here to centralize error display in the component.

    if (axios.isAxiosError(error) && error.response) { // Use axios.isAxiosError for type narrowing
      const { status, data } = error.response;

      if (status === 401) {
        await AsyncStorage.removeItem('userData');
        Alert.alert('Unauthorized', 'Session expired. Please log in again.');
        // IMPORTANT: Re-throw or return a specific error here so the calling component can react
        throw error; // Re-throw the original AxiosError
      } else {
        // For all other server errors, re-throw the AxiosError
        // The calling component will then parse `error.response.data` for details.
        throw error; 
      }
    } else if (axios.isAxiosError(error) && error.request) {
      // The request was made but no response was received (e.g., network down, server not running)
      console.error('AXIOS NETWORK ERROR ON:', path, error.request);
      // Throw a custom error for network issues, or re-throw the original error
      throw new Error('Network Error: Could not connect to the server. Please check your internet connection or try again later.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('AXIOS SETUP ERROR ON:', path, error?.message);
      // Throw a custom error for setup issues
      throw new Error('Request Setup Error: An unexpected error occurred while preparing your request.');
    }
  }
}