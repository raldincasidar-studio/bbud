import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

// Axios instance with base URL
const apiClient = axios.create({
  baseURL: 'https://b-bud-new.vercel.app', // Update with your actual API URL
  // baseURL: 'https://766e-2001-4455-542-5200-b9da-d772-6913-1cdd.ngrok-free.app', // Update with your actual API URL
});

export default async function apiRequest(method, path, data) {
  try {
    // Retrieve user data from AsyncStorage
    const userData = await AsyncStorage.getItem('userData');
    const parsedUserData = userData ? JSON.parse(userData) : {};

    console.log(data, typeof data);
    // Make API request
    const response = await apiClient({
      method,
      url: path,
      data: data,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        await AsyncStorage.removeItem('userData');
        Alert.alert('Unauthorized', data.error || 'Session expired, please log in again.');
      } else {
        Alert.alert('Error', data.error || 'Something went wrong');
      }
    } else {
      console.error('AXIOS ERROR ON:', path, error);
      Alert.alert('Network Error', 'Please check your internet connection.');
    }

    return false;
  }
}

