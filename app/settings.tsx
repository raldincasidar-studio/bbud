// app/(tabs)/settings/index.tsx OR app/settings.tsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Assuming UserData interface is similar to portal.tsx
interface UserData {
  _id: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string;
  email: string;
  contact_number?: string | null;
  // Add other editable fields here that your PUT /api/residents/:id supports
  // e.g., sex, date_of_birth (would need date picker), address fields etc.
  // For simplicity, this example focuses on name, contact, and email.
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other']; // If editing sex

export default function SettingsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Form states for editable fields
  const [editableFirstName, setEditableFirstName] = useState('');
  const [editableMiddleName, setEditableMiddleName] = useState('');
  const [editableLastName, setEditableLastName] = useState('');
  const [editableContactNumber, setEditableContactNumber] = useState('');
  // Email is usually not editable or requires a verification process, so we'll make it read-only here.

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        const storedData = await AsyncStorage.getItem('userData');
        if (storedData) {
          const parsedData: UserData = JSON.parse(storedData);
          setUserData(parsedData);
          // Initialize form fields
          setEditableFirstName(parsedData.first_name || '');
          setEditableMiddleName(parsedData.middle_name || '');
          setEditableLastName(parsedData.last_name || '');
          setEditableContactNumber(parsedData.contact_number || '');
        } else {
          Alert.alert("Error", "User data not found. Please log in again.");
          router.replace('/login');
        }
      } catch (error) {
        console.error("Error loading user data for settings:", error);
        Alert.alert("Error", "Could not load your profile.");
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, []);

  const handleSaveChanges = async () => {
    if (!userData?._id) {
      Alert.alert("Error", "User session error. Cannot save changes.");
      return;
    }
    if (!editableFirstName.trim() || !editableLastName.trim()) {
        Alert.alert("Validation Error", "First name and last name are required.");
        return;
    }
    // Add more validation as needed (e.g., contact number format)

    setIsSaving(true);
    try {
      const payload = {
        first_name: editableFirstName.trim(),
        middle_name: editableMiddleName.trim() || null,
        last_name: editableLastName.trim(),
        contact_number: editableContactNumber.trim() || null,
        // Only send fields that are actually editable and have changed.
        // Email is typically not changed here directly.
        // If you add other fields like address, sex, DOB, include them in the payload.
      };

      // Filter out fields that haven't changed to send a minimal payload (optional but good practice)
      const changedPayload = {};
      for (const key in payload) {
          if (payload[key] !== userData[key] && !(payload[key] === null && !userData[key])) { // Check for actual changes
              changedPayload[key] = payload[key];
          }
      }
      // Ensure core names are always sent if they were part of the form, even if not "changed" from initial empty state
      if (!changedPayload.hasOwnProperty('first_name') && payload.first_name) changedPayload.first_name = payload.first_name;
      if (!changedPayload.hasOwnProperty('last_name') && payload.last_name) changedPayload.last_name = payload.last_name;
      if (!changedPayload.hasOwnProperty('middle_name') && payload.hasOwnProperty('middle_name')) changedPayload.middle_name = payload.middle_name;
      if (!changedPayload.hasOwnProperty('contact_number') && payload.hasOwnProperty('contact_number')) changedPayload.contact_number = payload.contact_number;


      if (Object.keys(changedPayload).length === 0) {
          $toast.fire({ title: 'No changes to save.', icon: 'info' }); // Assuming you have $toast like in web
          setIsSaving(false);
          return;
      }


      const response = await apiRequest('PUT', `/api/residents/${userData._id}`, changedPayload);

      if (response && response.resident) {
        // Update AsyncStorage with the new resident data from the API response
        const updatedUserData = {
            ...userData, // Keep existing non-updated fields from original userData
            ...response.resident, // Overwrite with fields returned from API
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserData(updatedUserData); // Update local state for UI
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Update Failed', response?.message || response?.error || 'Could not save changes.');
      }
    } catch (error) {
      console.error('Error saving resident details:', error.response?.data || error);
      Alert.alert('Error', error.response?.data?.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userData');
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Logout failed.');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerNav}><Text style={styles.headerTitle}>Settings</Text></View>
        <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0F00D7" /></View>
      </SafeAreaView>
    );
  }

  if (!userData) {
     return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerNav}><Text style={styles.headerTitle}>Settings</Text></View>
        <View style={styles.loaderContainer}><Text>Could not load user data.</Text></View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
            </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{width: 28}} /> {/* Spacer */}
        </View>

        <ScrollView style={styles.contentScrollView} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.textInput} value={editableFirstName} onChangeText={setEditableFirstName} placeholder="Your first name" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Middle Name</Text>
            <TextInput style={styles.textInput} value={editableMiddleName} onChangeText={setEditableMiddleName} placeholder="Your middle name (optional)" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.textInput} value={editableLastName} onChangeText={setEditableLastName} placeholder="Your last name" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput style={[styles.textInput, styles.textInputDisabled]} value={userData.email} editable={false} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput style={styles.textInput} value={editableContactNumber} onChangeText={setEditableContactNumber} placeholder="Your contact number" keyboardType="phone-pad" />
          </View>
          {/* Add more editable fields here, e.g., Sex (Picker), DOB (DatePicker) if needed */}

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.actionButtonText}>Save Changes</Text>}
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Account Actions</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={20} color="white" style={{marginRight: 10}} />
            <Text style={styles.actionButtonText}>Logout</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F8' },
  headerNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, paddingHorizontal: 15,
    backgroundColor: '#0F00D7',
  },
  headerBack: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', textAlign: 'center', flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentScrollView: { flex: 1 },
  contentContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 8 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, color: '#424242', marginBottom: 6, fontWeight: '500' },
  required: { color: 'red'},
  textInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, color: '#212121' },
  textInputDisabled: { backgroundColor: '#EEEEEE', color: '#757575' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, marginTop: 10, elevation: 2 },
  saveButton: { backgroundColor: '#4CAF50' }, // Green
  logoutButton: { backgroundColor: '#D32F2F', marginTop: 20 }, // Red
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: '#A5D6A7' }, // Lighter green for disabled save
});