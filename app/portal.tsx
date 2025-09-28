import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Import the custom API request handler
import apiRequest from '../plugins/axios'; // Adjusted path assuming /app/portal.tsx and /plugins/axios.js

// Type definition for a barangay official based on your API
interface Official {
  _id: string; // Assuming MongoDB _id from the API response
  position: string;
  first_name: string;
  last_name: string;
  photo_url: string | null; // Based on your API and Vue component
}

export default function Index() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0); // New state for notification count

  const fetchNotifications = useCallback(async () => {
    if (user?._id) {
      const path = `/api/residents/${user._id}/notifications`;
      try {
        const data = await apiRequest('get', path, null);
        if (data && typeof data.unreadCount === 'number') {
          setUnreadNotificationCount(data.unreadCount); // Set the actual unread count
        } else {
          setUnreadNotificationCount(0); // Default to 0 if data or unreadCount is missing/invalid
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setUnreadNotificationCount(0); // Ensure count is reset on error
      }
    }
  }, [user]);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error getting user data from AsyncStorage:', error);
        Alert.alert('Error', 'Something went wrong while loading your data 👀');
      }
    };

    const fetchOfficials = async () => {
      // The path includes query params to limit the results for the slider
      const path = '/api/barangay-officials?itemsPerPage=15';
      const data = await apiRequest('get', path, null);

      // The apiRequest function returns false on failure
      if (data && data.officials) {
        // The API returns an object { officials: [...] }, so we extract the array
        setOfficials(data.officials);
      }
    };

    getUserData();
    fetchOfficials();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );
  

  const comingSoon = () => {
    Alert.alert(
      'Coming Soon!',
      'This feature is currently under development.',
      [
        { text: 'OK', onPress: () => console.log('OK Pressed') },
      ],
      { cancelable: false }
    );
  }

  const renderOfficialCard = ({ item }: { item: Official }) => (
    <View style={styles.officialCard}>
      <Image
        style={styles.officialImage}
        source={
          item.photo_url
            ? { uri: item.photo_url }
            // Ensure you have a default placeholder image at this path
            : require('@/assets/images/logo.png')
        }
      />
      <Text style={styles.officialName} numberOfLines={2}>
        {item.first_name} {item.last_name}
      </Text>
      <Text style={styles.officialPosition}>{item.position}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={{
      backgroundColor: 'white',
      borderRadius: 20,
      marginTop: -40,
      paddingTop: 40
    }}>
      
      {/* Navbar */}
      <View style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 30,
        width: '100%',
        paddingTop: 40
      }}>
        <Image style={{ height: 50, width: 130, objectFit: 'contain' }} source={require('@/assets/images/logo-name.png')} />
        
        {/* Group for Settings and Notification Icons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}> {/* Added gap for spacing between icons */}
          {/* Settings Icon */}
          <TouchableOpacity onPress={() => router.push('/settings')} style={{
            padding: 10,
          }}>
            <MaterialCommunityIcons name="cog" size={30} color="#0F00D7" />
          </TouchableOpacity>

          {/* Notification Icon with Number Badge */}
          <TouchableOpacity onPress={() => router.push('/notification')} style={{ position: 'relative' }}>
          <Image
            style={{ height: 30, objectFit: 'contain', width: 30 }}
            source={require('@/assets/images/notification.png')} // Always use the regular bell icon
          />
          {unreadNotificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount} {/* Display '99+' for counts over 99 */}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        </View>
      </View>

      

      {/* Content */}
      <View style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 30,
        paddingTop: 0,
        paddingBottom: 10,
        width: '100%',
      }}>
        <View>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#0F00D7',
            marginBottom: 5,
          }}>Welcome, { user?.first_name || 'Loading ...' } { user?.last_name || '' }</Text>
          <Text style={{
            fontSize: 17,
            color: '#7F7F7F',
          }}>{ user?.email || '...' }</Text>
        </View>
        
      </View>
      

      {/* Grid of selection */}
      <View style={styles.menuGridContainer}>
        {/* Request Document */}
        <TouchableOpacity onPress={() => router.push('/request-document')} style={styles.menuItemWrapper}>
            <View style={styles.menuItemIconContainer}>
                <Image style={styles.menuItemIcon} source={require('@/assets/images/request-document.png')} />
            </View>
            <Text style={styles.menuItemText}>Request Document</Text>
        </TouchableOpacity>

        {/* File Complaint */}
        <TouchableOpacity onPress={() => router.push('/complaints')} style={styles.menuItemWrapper}>
            <View style={styles.menuItemIconContainer}>
                <Image style={styles.menuItemIcon} source={require('@/assets/images/file-a-complaint.png')} />
            </View>
            <Text style={styles.menuItemText}>File Complaint</Text>
        </TouchableOpacity>

        {/* Borrow Assets */}
        <TouchableOpacity onPress={ () => router.push('/borrowed-assets') } style={styles.menuItemWrapper}>
            <View style={styles.menuItemIconContainer}>
                <Image style={styles.menuItemIcon} source={require('@/assets/images/borrow-assets.png')} />
            </View>
            <Text style={styles.menuItemText}>Borrow Assets</Text>
        </TouchableOpacity>

        {/* Emergency Hotlines */}
        <TouchableOpacity onPress={ () => router.push('/emergency-hotlines') } style={styles.menuItemWrapper}>
            <View style={styles.menuItemIconContainer}>
                <Image style={styles.menuItemIcon} source={require('@/assets/images/emergency-hotlines.png')} />
            </View>
            <Text style={styles.menuItemText}>Emergency Hotlines</Text>
        </TouchableOpacity>

        {/* Household */}
        <TouchableOpacity onPress={ () => router.push('/my-household') } style={styles.menuItemWrapper}>
            <View style={styles.menuItemIconContainer}>
                <Image style={styles.menuItemIcon} source={require('@/assets/images/household.png')} />
            </View>
            <Text style={styles.menuItemText}>Household</Text>
        </TouchableOpacity>

        {/* Budget */}
        <TouchableOpacity onPress={ () => router.push('/budget') } style={styles.menuItemWrapper}>
            <View style={styles.menuItemIconContainer}>
                <Image style={styles.menuItemIcon} source={require('@/assets/images/budget.png')} />
            </View>
            <Text style={styles.menuItemText}>Budget</Text>
        </TouchableOpacity>
      </View>
          
      {/* --- START: BARANGAY OFFICIALS SLIDER --- */}
      {officials.length > 0 && (
        <View style={{ marginTop: 25 }}>
          <Text style={styles.sliderTitle}>Barangay Officials</Text>
          <FlatList
            data={officials}
            renderItem={renderOfficialCard}
            keyExtractor={(item) => item._id}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sliderContainer}
          />
        </View>
      )}
      {/* --- END: BARANGAY OFFICIALS SLIDER --- */}

      <View style={{ padding: 30, paddingTop: 0, paddingBottom: 20 }}>
        {/* This view provides bottom spacing */}
      </View>


    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sliderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
    paddingHorizontal: 30,
  },
  sliderContainer: {
    paddingHorizontal: 22, // Page padding (30) - Card margin (8) = 22
    paddingBottom: 10,
  },
  officialCard: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginHorizontal: 8,
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    // Elevation for Android
    elevation: 5,
  },
  officialImage: {
    width: 80,
    height: 80,
    borderRadius: 40, // Half of width/height for a circle
    marginBottom: 12,
    backgroundColor: '#F0F0F0', // Placeholder background color
    objectFit: 'cover',
  },
  officialName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 4,
  },
  officialPosition: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
  },
  // New styles for the notification badge
  notificationBadge: {
    position: 'absolute',
    right: -5, // Adjust this value to position the badge horizontally
    top: -5,   // Adjust this value to position the badge vertically
    backgroundColor: 'red',
    borderRadius: 10, // Makes it circular
    width: 20,       // Badge width
    height: 20,      // Badge height
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensures the badge appears on top of the bell icon
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 11, // Adjust font size for better fit within the badge
    fontWeight: 'bold',
  },

  // --- NEW STYLES FOR MENU GRID ---
  menuGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Distribute items evenly
    paddingHorizontal: 20, // Overall padding for the grid
    paddingBottom: 0,
    marginTop: 10, // Add some top margin to separate from the welcome message
  },
  menuItemWrapper: {
    width: '30%', // Allows for 3 items per row with space in between
    marginBottom: 20, // Vertical spacing between rows of items
    alignItems: 'center', // Centers content (icon and text) horizontally
  },
  menuItemIconContainer: {
    width: 70, // Fixed size for the background circle/square
    height: 70,
    borderRadius: 15, // Rounded corners for the icon background
    backgroundColor: '#D8E9FC',
    justifyContent: 'center', // Center icon vertically
    alignItems: 'center', // Center icon horizontally
    marginBottom: 10, // Space between icon and text
  },
  menuItemIcon: {
    width: 45, // Size of the actual icon image
    height: 45,
    objectFit: 'contain',
  },
  menuItemText: {
    fontSize: 12,
    textAlign: 'center',
    color: 'black',
    fontWeight: '500', // Make text a bit bolder for better readability
  },
});