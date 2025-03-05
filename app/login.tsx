// import { Picker } from '@react-native-picker/picker';
import apiRequest from '@/plugins/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    
    if (email == '' || password == '') {
      Alert.alert('Form Error', 'You have empty fields in your form');
      return;
    }

    // validate email
    if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      Alert.alert('Form Error', 'Invalid email format');
      return;
    }

    // validate password
    if (password.length < 6) {
      Alert.alert('Form Error', 'Password must be at least 6 characters long');
      return;
    }

    const response = await apiRequest('POST', '/api/login', {
      email, password
    });

    console.log(response);
    
    // save response to local storage

    if (!response) {
      Alert.alert('Error', 'Something went wrong');
      return;
    }

    
    if (!response?.userData) {
      Alert.alert('Error', 'Something went wrong');
      return;
    }

    // save data to asyncstorage
    await AsyncStorage.setItem('userData', JSON.stringify(response.userData));
    Alert.alert('Success', 'You have successfully logged in');
    router.push('/portal'); 

  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={{
      padding: 60,
      backgroundColor: '#0F00D7',
    }}>
      <Text style={{
        color: 'white',
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold'
      }}>Login</Text>
    </View>
    <ScrollView style={{
      backgroundColor: 'white',
      borderRadius: 20,
      marginTop: -40,
      paddingTop: 40,
      height: '100%',
    }}>
      <View style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}>

        <View style={{ width: '100%', padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Image source={require('@/assets/images/logo.png')} style={{ width: 80, height: 80, objectFit: 'contain' }} />
          <Text style={{ fontSize: 30, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'center', margin: 20, marginBottom: 0, color: '#0F00D7' }}>BBud</Text>
          <Text style={{ fontSize: 18, fontFamily: 'Poppins-Regular', textAlign: 'center', fontWeight: 'bold', margin: 20, color: 'black' }}>Please login to continue</Text>

        </View>

        {/* Form Inputs */}
        <View style={{
          width: '100%',
          padding: 10,
        }}>
          <Text
            style={{
              color: 'black',
              fontSize: 16,
              marginBottom: 10
            }}
          >
            Email Address
          </Text>
          <TextInput placeholder='Email Address' value={email} onChangeText={setEmail} style={{
            borderWidth: 1,
            borderColor: 'grey',
            borderRadius: 10,
            fontSize: 18,
            padding: 12,
            color: 'black'
          }}></TextInput>
        </View>

        {/* Form Inputs */}
        <View style={{
          width: '100%',
          padding: 10,
        }}>
          <Text
            style={{
              color: 'black',
              fontSize: 16,
              marginBottom: 10
            }}
          >
            Password
          </Text>
          <TextInput placeholder='Password' value={password} onChangeText={setPassword} secureTextEntry={true} style={{
            borderWidth: 1,
            borderColor: 'grey',
            borderRadius: 10,
            fontSize: 18,
            padding: 12,
            color: 'black'
          }}></TextInput>
        </View>

        <View style={{
          padding: 10,
          width: "100%",
        }}>
          <TouchableOpacity
            onPress={() => login()}
            style={{
              width: '100%',
              backgroundColor: '#5E76FF',
              padding: 15,
              borderRadius: 99,
              marginTop: 30,
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
              Login
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
          fontSize: 15,
          textAlign: 'center',
          width: '100%',
          marginTop: 30,
          marginBottom: 30,
        }}>
          Can't Login? Contact Administrator
        </Text>

      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

