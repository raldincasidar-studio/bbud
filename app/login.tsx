import apiRequest from '@/plugins/axios'; // Ensure this path is correct
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = async () => {
    if (email.trim() === '' || password === '') {
      Alert.alert('Form Error', 'Please enter both email and password.');
      return;
    }
    if (!email.trim().match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      Alert.alert('Form Error', 'Invalid email format.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Form Error', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      // ***** CORRECTED API PATH HERE *****
      const response = await apiRequest('POST', '/api/residents/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log('Login API Response:', response);

      if (response && response.resident && response.resident._id) {
        const userDataToStore = {
          _id: response.resident._id,
          email: response.resident.email,
          first_name: response.resident.first_name,
          last_name: response.resident.last_name,
          contact_number: response.resident.contact_number,
          ...response.resident,
          // Add other fields you might need from the 'resident' object for the session
        };
        await AsyncStorage.setItem('userData', JSON.stringify(userDataToStore));
        Alert.alert('Success', response.message || 'You have successfully logged in');
        router.replace('/portal'); // Use replace to avoid back navigation to login
      } else {
        // Prioritize response.error if it exists for specific backend errors
        let errorMessage = 'Invalid email or password. Please try again.'; // Default
        if (response && response.error) {
            errorMessage = response.error;
        } else if (response && response.message) {
            errorMessage = response.message;
        }
        Alert.alert('Login Failed', errorMessage);
      }
    } catch (error) {
      console.error('Login API error:', error);
      let errorMessage = 'An unexpected error occurred during login.';
      if (error.response && error.response.data) {
          if (error.response.data.error) {
              errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
              errorMessage = error.response.data.message;
          }
      } else if (error.message) {
          errorMessage = error.message;
      }
      Alert.alert('Login Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/')}>
          <Image source={require('@/assets/images/back-white.png')} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Login</Text>
        <View style={styles.headerIconPlaceholder} />
      </View>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.appName}>BBud</Text>
          <Text style={styles.loginPrompt}>Please login to continue</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            placeholder='Enter your email address' 
            value={email} 
            onChangeText={setEmail} 
            style={styles.textInput}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCompleteType="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput 
            placeholder='Enter your password' 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry={true} 
            style={styles.textInput}
            autoCompleteType="password"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={login}
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/forgot-password/request')}>
          <Text style={styles.footerText}>
            Can't Login? Contact Administrator
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles (same as previously provided and refined)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F00D7',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 35 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F00D7',
  },
  headerIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: 'white',
  },
  headerIconPlaceholder: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -20, 
  },
  scrollViewContent: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0F00D7',
    marginBottom: 5,
  },
  loginPrompt: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    color: '#444',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CCD1D9',
    borderRadius: 10,
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    color: '#333',
    backgroundColor: '#F7F8FC',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#5E76FF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: '#A9B4FF',
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 15,
    textAlign: 'center',
    width: '100%',
    marginTop: 40,
    color: '#555',
  },
});