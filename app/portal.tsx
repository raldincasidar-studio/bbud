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
  status: string; // ADDED: Based on your backend, officials have a 'status' field
}

// Define STATUS constants based on backend
// IMPORTANT: Please ensure these statuses match your actual backend implementation
const STATUS = {
  // For Borrowed Assets (confirmed from your backend)
  PENDING: 'Pending',
  APPROVED: 'Approved',
  OVERDUE: 'Overdue',
  DECLINED: 'Declined',
  RETURNED: 'Returned',

  // ASSUMPTION: For Document Requests (please verify with your backend)
  DOCUMENT_PENDING: 'Pending',

  // ASSUMPTION: For Complaints (please verify with your backend)
  COMPLAINT_NEW: 'New',
  // Add other statuses as needed for documents and complaints if they differ
};


// Helper component for the red dot badge indicator
const RedDotBadge = ({ count }) => {
  if (count === 0) return null; // Only show if count is greater than 0
  return (
    <View style={styles.redDotBadge} />
  );
};

export default function Index() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0); // New state for notification count

  // New states for the red dot indicators
  const [pendingDocumentRequestsCount, setPendingDocumentRequestsCount] = useState(0);
  const [newComplaintsCount, setNewComplaintsCount] = useState(0);
  const [pendingBorrowedAssetsCount, setPendingBorrowedAssetsCount] = useState(0);


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


  // New fetch function for pending document requests
  const fetchPendingDocumentRequests = useCallback(async () => {
    if (user?._id) {
      // NOTE: This assumes you have a backend endpoint like `/api/document-requests`
      // that returns a `total` count for the specified resident and status.
      const path = `/api/document-requests?byResidentId=${user._id}&status=${STATUS.DOCUMENT_PENDING}`;
      try {
        const data = await apiRequest('get', path, null);
        if (data && typeof data.total === 'number') {
          setPendingDocumentRequestsCount(data.total);
        } else {
          setPendingDocumentRequestsCount(0);
        }
      } catch (error) {
        console.error('Error fetching pending document requests:', error);
        setPendingDocumentRequestsCount(0);
      }
    }
  }, [user]);

  // New fetch function for new complaints
  const fetchNewComplaints = useCallback(async () => {
    if (user?._id) {
      // NOTE: This assumes you have a backend endpoint like `/api/complaints`
      // that returns a `total` count for the specified resident and status.
      const path = `/api/complaints?byResidentId=${user._id}&status=${STATUS.COMPLAINT_NEW}`;
      try {
        const data = await apiRequest('get', path, null);
        if (data && typeof data.total === 'number') {
          setNewComplaintsCount(data.total);
        } else {
          setNewComplaintsCount(0);
        }
      } catch (error) {
        console.error('Error fetching new complaints:', error);
        setNewComplaintsCount(0);
      }
    }
  }, [user]);

  // New fetch function for pending borrowed assets
  const fetchPendingBorrowedAssets = useCallback(async () => {
    if (user?._id) {
      // This uses your existing backend endpoint `/api/borrowed-assets` with filters.
      const path = `/api/borrowed-assets?byResidentId=${user._id}&status=${STATUS.PENDING}`;
      try {
        const data = await apiRequest('get', path, null);
        if (data && typeof data.total === 'number') {
          setPendingBorrowedAssetsCount(data.total);
        } else {
          setPendingBorrowedAssetsCount(0);
        }
      } catch (error) {
        console.error('Error fetching pending borrowed assets:', error);
        setPendingBorrowedAssetsCount(0);
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
      const path = '/api/barangay-officials?itemsPerPage=15';
      const data = await apiRequest('get', path, null);

      if (data && data.officials) {
        const activeOfficials = data.officials.filter((official: Official) => official.status === 'Active');
        setOfficials(activeOfficials);
      }
    };

    getUserData();
    fetchOfficials();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Fetch all counts when the screen focuses
      fetchNotifications();
      fetchPendingDocumentRequests();
      fetchNewComplaints();
      fetchPendingBorrowedAssets();
    }, [fetchNotifications, fetchPendingDocumentRequests, fetchNewComplaints, fetchPendingBorrowedAssets])
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
                <RedDotBadge count={pendingDocumentRequestsCount} />
            </View>
            <Text style={styles.menuItemText}>Request Document</Text>
        </TouchableOpacity>

        {/* File Complaint */}
        <TouchableOpacity onPress={() => router.push('/complaints')} style={styles.menuItemWrapper}>
            <View style={styles.menuItemIconContainer}>
                <Image style={styles.menuItemIcon} source={require('@/assets/images/file-a-complaint.png')} />
                <RedDotBadge count={newComplaintsCount} />
            </View>
            <Text style={styles.menuItemText}>File Complaint</Text>
        </TouchableOpacity>

        {/* Borrow Assets */}
        <TouchableOpacity onPress={ () => router.push('/borrowed-assets') } style={styles.menuItemWrapper}>
            <View style={styles.menuItemIconContainer}>
                <Image style={styles.menuItemIcon} source={require('@/assets/images/borrow-assets.png')} />
                <RedDotBadge count={pendingBorrowedAssetsCount} />
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
  // Styles for the main notification badge (top right)
  notificationBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // --- NEW STYLES FOR MENU GRID ---
  menuGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 0,
    marginTop: 10,
  },
  menuItemWrapper: {
    width: '30%',
    marginBottom: 20,
    alignItems: 'center',
  },
  menuItemIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 15,
    backgroundColor: '#D8E9FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative', // IMPORTANT: Allows absolute positioning of RedDotBadge
  },
  menuItemIcon: {
    width: 45,
    height: 45,
    objectFit: 'contain',
  },
  menuItemText: {
    fontSize: 12,
    textAlign: 'center',
    color: 'black',
    fontWeight: '500',
  },
  // Style for the smaller red dot indicator on menu items
  redDotBadge: {
    position: 'absolute',
    top: -3,   // Adjust position as needed
    right: -3, // Adjust position as needed
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    zIndex: 2, // Ensure it's above the icon
  },
});