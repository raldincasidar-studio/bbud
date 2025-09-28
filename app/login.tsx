// login.tsx (React Native / Expo)
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // If using for back button
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() { // Renamed component
  const router = useRouter();

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(''); // New state for OTP input
  const [showPassword, setShowPassword] = useState(false); // State for password visibility

  const [isLoading, setIsLoading] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false); // To switch between password and OTP input views
  const [loginAttemptsMessage, setLoginAttemptsMessage] = useState('');
  const [accountLockedMessage, setAccountLockedMessage] = useState('');

  const handleInitialLogin = async () => {
    if (loginIdentifier.trim() === '' || password === '') {
      Alert.alert('Form Error', 'Please enter both email/contact number and password.'); return;
    }
    if (password.length < 6) {
      Alert.alert('Form Error', 'Password must be at least 8 characters long.'); return;
    }

    setIsLoading(true);
    setLoginAttemptsMessage('');
    setAccountLockedMessage('');

    try {
      const response = await apiRequest('POST', '/api/residents/login', {
        login_identifier: loginIdentifier.trim(),
        password: password,
      });

      // console.log('Initial Login API Response:', response);

      if (response && response.otpRequired === true) {
        // API signaled that OTP is sent and required
        Alert.alert('OTP Sent', response.message || 'An OTP has been sent. Please enter it below.');
        setIsOtpStep(true); // Move to OTP input step
      } else if (response && response.error) { // Handle errors like AccountLocked or invalid credentials
         if (response.error === 'AccountLocked') {
            setAccountLockedMessage(response.message);
         } else {
            setLoginAttemptsMessage(response.message); // For "Invalid email or password. X attempts remaining."
         }
        Alert.alert('Login Failed', response.message);
      } else {
        // Should not happen if API is correctly implemented to require OTP
        // Alert.alert('Login Failed', 'An unexpected response was received from the server.');
      }
    } catch (error: any) {
      console.error('Initial Login API error:', error);
      let errorMessage = 'An unexpected error occurred.';
      if (error.response && error.response.data) {
          const data = error.response.data;
          errorMessage = data.message || data.error || errorMessage;
          if (data.error === 'AccountLocked') {
            setAccountLockedMessage(data.message);
          } else {
            setLoginAttemptsMessage(data.message);
          }
      } else if (error.message) {
          errorMessage = error.message;
      }
      Alert.alert('Login Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) { // Assuming 6-digit OTP
      Alert.alert('Form Error', 'Please enter a valid 6-digit OTP.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/residents/login/verify-otp', {
        login_identifier: loginIdentifier.trim(),
        otp: otp.trim(),
      });

      // console.log('Verify OTP API Response:', response);

      if (response && response.resident && response.resident._id) {
        // OTP verified, login successful
        const userDataToStore = { /* ... (same as your original user data storage) ... */
            _id: response.resident._id, email: response.resident.email,
            first_name: response.resident.first_name, last_name: response.resident.last_name,
            // Add any other necessary fields
            ...response.resident
        };
        await AsyncStorage.setItem('userData', JSON.stringify(userDataToStore)); // Changed key to residentData
        Alert.alert('Success', response.message || 'Login successful!');
        router.replace('/portal'); // Navigate to portal or dashboard
      } else {
        Alert.alert('OTP Verification Failed', response?.message || response?.error || 'Invalid or expired OTP. Please try again.');
        // Optionally, allow resending OTP or going back to password step
        // For simplicity, here we just show an error. User can try logging in again.
      }
    } catch (error: any) {
      console.error('Verify OTP API error:', error);
      Alert.alert('OTP Error', error.response?.data?.message || error.response?.data?.error || 'An error occurred during OTP verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToPasswordStep = () => {
    setIsOtpStep(false);
    setOtp('');
    setLoginAttemptsMessage('');
    setAccountLockedMessage('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
            if (isOtpStep) goBackToPasswordStep();
            else router.canGoBack() ? router.back() : router.push('/');
        }}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOtpStep ? 'Enter OTP' : 'Login'}</Text>
        <View style={styles.headerIconPlaceholder} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
        {!isOtpStep ? (
          <>
            <View style={styles.logoContainer}>
              <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
              <Text style={styles.appName}>B-Bud</Text>
              <Text style={styles.loginPrompt}>Please login to continue</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Contact Number</Text>
              <TextInput placeholder='Enter your email or contact number' value={loginIdentifier} onChangeText={setLoginIdentifier} style={styles.textInput} autoCapitalize="none" />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput 
                  placeholder='Enter your password' 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry={!showPassword} 
                  style={styles.passwordInput} 
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {loginAttemptsMessage && <Text style={styles.errorMessage}>{loginAttemptsMessage}</Text>}
            {accountLockedMessage && <Text style={styles.errorMessage}>{accountLockedMessage}</Text>}


            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={handleInitialLogin} style={[styles.loginButton, (isLoading || !!accountLockedMessage) && styles.buttonDisabled]} disabled={isLoading || !!accountLockedMessage}>
                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.loginButtonText}>Continue</Text>}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => router.push('/forgot-password/request')}>
              <Text style={styles.footerLink}>Forgot Password?</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity onPress={() => router.push('/activate-account/request')}>
              <Text style={styles.footerLink}>Activate Account</Text>
            </TouchableOpacity> */}
          </>
        ) : (
          <>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="shield-key-outline" size={80} color="#0F00D7" />
              <Text style={styles.appName}>Verify OTP</Text>
              <Text style={styles.loginPrompt}>An OTP has been sent to {loginIdentifier}.</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>One-Time Password (OTP)</Text>
              <TextInput
                placeholder='Enter 6-digit OTP'
                value={otp}
                onChangeText={setOtp}
                style={styles.textInput}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={handleVerifyOtp} style={[styles.loginButton, isLoading && styles.buttonDisabled]} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.loginButtonText}>Verify & Login</Text>}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={goBackToPasswordStep}>
              <Text style={styles.footerLink}>Back to Email/Password</Text>
            </TouchableOpacity>
             {/* Optionally, add a resend OTP button here which calls handleInitialLogin again */}
          </>
        )}
        <Text style={styles.footerText}>Can't Login? Contact Administrator</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ... (Your existing styles, but I'll add/modify a few)
  container: { flex: 1, backgroundColor: '#0F00D7' },
  header: { paddingTop: Platform.OS === 'android' ? 35 : 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F00D7' },
  headerIconPlaceholder: { width: 28 }, // Match icon size
  headerTitle: { color: 'white', textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
  scrollView: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -20 },
  scrollViewContent: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 30 },
  logoContainer: { width: '100%', alignItems: 'center', marginBottom: 30 },
  logo: { width: 100, height: 100, resizeMode: 'contain', marginBottom: 10 }, // Assuming you have a logo.png
  appName: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#0F00D7', marginBottom: 5 },
  loginPrompt: { fontSize: 17, textAlign: 'center', color: '#444', marginBottom: 25, paddingHorizontal: 10 },
  inputContainer: { width: '100%', marginBottom: 20 },
  label: { color: '#333', fontSize: 15, marginBottom: 8, fontWeight: '500' },
  textInput: { borderWidth: 1, borderColor: '#CCD1D9', borderRadius: 10, fontSize: 16, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 12, color: '#333', backgroundColor: '#F7F8FC' },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCD1D9',
    borderRadius: 10,
    backgroundColor: '#F7F8FC',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    paddingLeft: 15,
    color: '#333',
  },
  eyeIcon: {
    paddingHorizontal: 15,
  },
  buttonContainer: { width: '100%', marginTop: 15 },
  loginButton: { width: '100%', backgroundColor: '#0F00D7', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  buttonDisabled: { backgroundColor: '#7986CB' }, // Lighter blue for disabled
  loginButtonText: { color: 'white', textAlign: 'center', fontSize: 17, fontWeight: 'bold' },
  footerText: { fontSize: 14, textAlign: 'center', width: '100%', marginTop: 50, color: '#666' },
  footerLink: { fontSize: 15, textAlign: 'center', width: '100%', marginTop: 20, color: '#0F00D7', fontWeight: '500' },
  errorMessage: { color: 'red', textAlign: 'center', marginBottom: 10, fontSize: 14 },
});