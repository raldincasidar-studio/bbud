// app/forgot-password/request.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ForgotPasswordRequestScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(''); // To display success/info message

    const handleRequestOtp = async () => {
        if (!email.trim() || !email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        setIsLoading(true);
        setMessage('');
        try {
            const response = await apiRequest('POST', '/api/residents/forgot-password/request-otp', { email: email.trim().toLowerCase() });
            if (response && response.message) {
                // Alert.alert('OTP Sent', response.message); // Using setMessage instead for inline display
                setMessage(response.message);
                // Do not navigate immediately, let user see the message
                // Optionally navigate after a delay or if user explicitly confirms
                // router.push({ pathname: '/forgot-password/verify', params: { email: email.trim().toLowerCase() } });
            } else {
                Alert.alert('Error', response?.error || 'Could not request OTP. Please try again.');
            }
        } catch (error) {
            console.error("Request OTP error:", error);
            Alert.alert('Error', error.response?.data?.error || error.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Forgot Password</Text>
                <View style={{width: 28}} />
            </View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView contentContainerStyle={styles.container}>
                    <MaterialCommunityIcons name="email-lock-outline" size={80} color="#0F00D7" style={styles.iconHeader} />
                    <Text style={styles.title}>Reset Your Password</Text>
                    <Text style={styles.subtitle}>Enter your email address below and we'll send you an OTP to reset your password.</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="youremail@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCompleteType="email"
                        />
                    </View>

                    {message && <Text style={styles.infoMessage}>{message}</Text>}
                     {message && ( // Show verify button only after successful OTP request message
                        <TouchableOpacity 
                            style={[styles.button, styles.verifyButton]} 
                            onPress={() => router.push({ pathname: '/forgot-password/verify', params: { email: email.trim().toLowerCase() }})}>
                            <Text style={styles.buttonText}>Enter OTP & Reset Password</Text>
                        </TouchableOpacity>
                    )}


                    {!message && (
                        <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleRequestOtp} disabled={isLoading}>
                            {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send OTP</Text>}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => router.push('/')} style={styles.backToLoginButton}>
                        <Text style={styles.backToLoginText}>Back to Login</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
// Styles (Use a consistent styling approach)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' }, // Match navbar
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop:-1 },
    iconHeader: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
    inputContainer: { width: '100%', marginBottom: 20 },
    label: { fontSize: 15, color: '#444', marginBottom: 7, fontWeight: '500' },
    textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, fontSize: 16, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 12, backgroundColor: '#F9F9F9', color: '#333' },
    button: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', width: '100%', minHeight: 50, justifyContent: 'center'},
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    buttonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    infoMessage: { fontSize: 15, color: 'green', textAlign: 'center', marginVertical: 15, paddingHorizontal: 10 },
    verifyButton: { backgroundColor: '#4CAF50', marginTop: 10, }, // Green for next step
    backToLoginButton: { marginTop: 25, paddingVertical: 10 },
    backToLoginText: { fontSize: 15, color: '#5E76FF', fontWeight: '500', textAlign: 'center' },
});

export default ForgotPasswordRequestScreen;