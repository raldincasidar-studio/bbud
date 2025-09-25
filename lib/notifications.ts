import apiRequest from '@/plugins/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// This handler determines how your app handles notifications when it's in the foreground.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Registers the device for push notifications, gets the token, and saves it to the backend.
 * It also handles asking for permissions.
 * @returns {Promise<string|null>} The Expo push token if successful, otherwise null.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    // Push notifications require a physical device.
    if (!Device.isDevice) {
        console.log('Push notifications are not supported on simulators.');
        return null;
    }

    try {
        // 1. Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // 2. Ask for permission if not granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // 3. Handle permission denial
        if (finalStatus !== 'granted') {
            Alert.alert('Permission Denied', 'You will not receive push notifications. You can enable them in your device settings.');
            return null;
        }

        // 4. Get the native device push token (FCM token on Android)
        // This is needed for sending notifications directly via FCM/APNs.
        const token = (await Notifications.getDevicePushTokenAsync()).data;
        console.log('Device Push Token:', token);

        // 5. Set Android-specific channel settings
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        // 6. Save the token to the backend
        await saveTokenToBackend(token);

        return token;

    } catch (error) {
        console.error('Error registering for push notifications:', error);
        Alert.alert('Error', 'Could not register for push notifications.');
        return null;
    }
}

/**
 * Saves the given Expo Push Token to the backend for the currently logged-in user.
 * @param {string} token The Expo Push Token to save.
 */
async function saveTokenToBackend(token: string) {
    try {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (!storedUserData) {
            console.warn('Could not save FCM token: User data not found.');
            return;
        }

        const resident = JSON.parse(storedUserData);
        const residentId = resident?._id;

        if (!residentId) {
            console.warn('Could not save FCM token: Resident ID not found.');
            return;
        }

        // Check if this token has already been saved for this user to avoid redundant API calls
        const lastSavedToken = await AsyncStorage.getItem(`fcmToken_${residentId}`);
        if (lastSavedToken === token) {
            console.log('FCM token is already up-to-date.');
            return;
        }

        console.log(`Saving FCM token for resident ${residentId}...`);
        await apiRequest('PATCH', `/api/residents/${residentId}/fcm-token`, {
            fcmToken: token,
        });

        // Store the saved token to prevent future saves of the same token
        await AsyncStorage.setItem(`fcmToken_${residentId}`, token);
        console.log('FCM token saved successfully to backend and local storage.');

    } catch (error: any) {
        console.error('Failed to save FCM token to backend:', error.response?.data || error.message);
        // We don't alert the user here to avoid being intrusive. The error is logged for debugging.
    }
}
