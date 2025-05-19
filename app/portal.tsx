// import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  const [gender, setGender] = useState('');

  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
          console.log(user);
          console.log(userData);
        }
      } catch (error) {
        console.error('Error getting user data from AsyncStorage:', error);
        Alert.alert('Error', 'Something went wrong 👀');
      }
    };

    getUserData();
  }, [])

  const logoutshi = async () => {
    const userData = await AsyncStorage.getItem('userData');
    console.log(userData);
  }
  

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
        <TouchableOpacity>
          <Image style={{ height: 30, objectFit: 'contain', width: 30 }} source={require('@/assets/images/notification.png')} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{
        padding: 30,
        paddingTop: 0,
        paddingBottom: 10,
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#0F00D7',
          marginBottom: 5,
        }}>Welcome, { user?.firstName || 'Loading ...' } { user?.lastName || '' }</Text>
        <Text style={{
          fontSize: 17,
          color: '#7F7F7F',
        }}>{ user?.emailAddress || '...' }</Text>
      </View>
      

      {/* Grid of selection */}
      <View style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: 20,
        paddingBottom: 0,
        width: '100%',
      }}>
        {/* Request Document */}
        <TouchableOpacity onPress={() => router.push('/request-document')} style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '25%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/request-document.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Request Document</Text>
        </TouchableOpacity>

        {/* File a complaint */}
        <TouchableOpacity onPress={() => router.push('/complaint-form')} style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '25%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/file-a-complaint.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>File a complaint</Text>
        </TouchableOpacity>

        {/* Event Calendar */}
        <TouchableOpacity onPress={() => router.push('/event-calendar')} style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '25%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/event-calendar.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Event Calendar</Text>
        </TouchableOpacity>

        {/* Borrow Assets */}
        <TouchableOpacity onPress={ comingSoon } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '25%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/borrow-assets.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Borrow Assets</Text>
        </TouchableOpacity>

        {/* Feedback and Suggestion */}
        <TouchableOpacity onPress={ comingSoon } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '25%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/feedback-and-suggestion.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Feedback and Suggestion</Text>
        </TouchableOpacity>

        {/* Emergency Hotlines */}
        <TouchableOpacity onPress={ comingSoon } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '25%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/emergency-hotlines.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Emergency Hotlines</Text>
        </TouchableOpacity>

        {/* Household */}
        <TouchableOpacity onPress={ comingSoon } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '25%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/household.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Household</Text>
        </TouchableOpacity>

        {/* Budget */}
        <TouchableOpacity onPress={ comingSoon } style={{ borderColor: '#0F00D7', padding: 10, display: 'flex', alignItems: 'center', width: '25%'}}>
            <Image style={{ width: 60, height: 60, objectFit: 'contain', padding: 15, marginBottom: 10, backgroundColor: '#D8E9FC', borderRadius: 10}} source={require('@/assets/images/budget.png')} />
            <Text style={{
              fontSize: 12,
              textAlign: 'center',
              color: 'black',
            }}>Budget</Text>
        </TouchableOpacity>







      </View>
          

      <View style={{ padding: 30, paddingTop: 0, paddingBottom: 20 }}>
        <TouchableOpacity
            onPress={() => router.replace('/')}
            style={{
              width: '100%',
              backgroundColor: '#4C67FF',
              padding: 15,
              borderRadius: 12,
              marginTop: 30,
              marginBottom: 5,
            }}
          >
            <Text
              style={{
                color: 'white',
                textAlign: 'center',
                fontSize: 18,
                fontWeight: 'bold',
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
      </View>

      <ImageBackground source={require('@/assets/images/banner.webp')} style={{
        padding: 90,
        backgroundColor: '#D8E9FC',
        margin: 30,
        marginTop: 5,
        borderRadius: 15,
      }}>

      </ImageBackground>

    </ScrollView>
    </KeyboardAvoidingView>
  );
}
