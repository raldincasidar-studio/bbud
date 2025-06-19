// import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
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
  }, [])
  

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
        <TouchableOpacity onPress={() => router.push('/notification')}>
          <Image style={{ height: 30, objectFit: 'contain', width: 30 }} source={require('@/assets/images/notification.png')} />
        </TouchableOpacity>
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
        <TouchableOpacity onPress={() => router.push('/settings')} style={{
          padding: 10,
        }}>
          <MaterialCommunityIcons name="cog" size={30} color="#0F00D7" />
        </TouchableOpacity>
      </View>
      

      {/* Grid of selection */}
      <View style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: 20,
        paddingBottom: 0,
        width: '100%',
      }}>
        {/* Request Document */}
        <TouchableOpacity onPress={() => router.push('/request-document')} style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '33%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/request-document.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Request Document</Text>
        </TouchableOpacity>

        {/* File a complaint */}
        <TouchableOpacity onPress={() => router.push('/complaints')} style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '33%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/file-a-complaint.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>File a complaint</Text>
        </TouchableOpacity>

        {/* Borrow Assets */}
        <TouchableOpacity onPress={ () => router.push('/borrowed-assets') } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '33%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/borrow-assets.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Borrow Assets</Text>
        </TouchableOpacity>

        {/* Emergency Hotlines */}
        <TouchableOpacity onPress={ () => router.push('/emergency-hotlines') } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '33%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/emergency-hotlines.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Emergency Hotlines</Text>
        </TouchableOpacity>

        {/* Household */}
        <TouchableOpacity onPress={ () => router.push('/my-household') } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '33%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/household.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Household</Text>
        </TouchableOpacity>

        {/* Budget */}
        {/* <TouchableOpacity onPress={ comingSoon } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '33%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/budget.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Budget</Text>
        </TouchableOpacity> */}
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
});