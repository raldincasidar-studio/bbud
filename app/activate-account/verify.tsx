// app/activate-account/verify.tsx (UPDATED: accountNumber to lowercase, robust subtitle)
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ActivateAccountVerifyScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { accountNumber, email, contactNumber, password } = params;

    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // More robust targetIdentifier for display
    let targetIdentifierDisplay = '';
    if (email && contactNumber) {
        targetIdentifierDisplay = `${email} and ${contactNumber}`;
    } else if (email) {
        targetIdentifierDisplay = email;
    } else if (contactNumber) {
        targetIdentifierDisplay = contactNumber;
    } else {
        targetIdentifierDisplay = 'your provided details';
    }

    const handleVerifyOtp = async () => {
        if (!otp.trim() || otp.trim().length !== 6) {
            Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP.');
            return;
        }
        if (String(accountNumber).trim().length !== 4) {
            Alert.alert('Account ID Error', 'Account ID must be exactly 4 characters long.');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            // Ensure accountNumber is lowercase when sent
            const lowercaseAccountNumber = String(accountNumber).trim().toLowerCase();

            const response = await apiRequest('POST', '/api/residents/activate-account/verify-otp', {
                account_number: lowercaseAccountNumber, // Send lowercase
                otp: otp.trim(),
            });

            if (response && response.message) {
                setMessage(response.message);
                Alert.alert('Success', response.message);
                router.replace('/login');
            } else {
                Alert.alert('Verification Failed', response?.error || 'Could not verify OTP. Please try again.');
            }
        } catch (error: any) {
            console.error("Verify OTP error:", error);
            Alert.alert('Error', error.response?.data?.message || error.response?.data?.error || 'An unexpected error occurred during OTP verification.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setIsLoading(true);
        setMessage('');
        try {
            // Ensure accountNumber is lowercase when sent
            const lowercaseAccountNumber = String(accountNumber).trim().toLowerCase();

            const response = await apiRequest('POST', '/api/residents/activate-account/request-otp', {
                account_number: lowercaseAccountNumber, // Send lowercase
                email: email,
                contact_number: contactNumber,
                password: password,
            });
            if (response && response.message) {
                setMessage(response.message);
                Alert.alert('OTP Resent', response.message);
            } else {
                Alert.alert('Resend Failed', response?.error || 'Could not resend OTP. Please try again.');
            }
        } catch (error: any) {
            console.error("Resend OTP error:", error);
            Alert.alert('Error', error.response?.data?.message || error.response?.data?.error || 'An error occurred while resending OTP.');
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
                <Text style={styles.navbarTitle}>Verify Activation</Text>
                <View style={{ width: 28 }} />
            </View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView contentContainerStyle={styles.container}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={80} color="#0F00D7" style={styles.iconHeader} />
                    <Text style={styles.title}>Enter OTP</Text>
                    <Text style={styles.subtitle}>
                        An OTP has been sent to {targetIdentifierDisplay}.
                        Please enter it below to complete your account activation.
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>One-Time Password (OTP)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="number-pad"
                            maxLength={6}
                        />
                    </View>

                    {message && <Text style={styles.infoMessage}>{message}</Text>}

                    <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleVerifyOtp} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Activate Account</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleResendOtp} disabled={isLoading} style={styles.resendOtpButton}>
                        {isLoading ? <ActivityIndicator color="#0F00D7" /> : <Text style={styles.resendOtpText}>Resend OTP</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.push('/')} style={styles.backToLoginButton}>
                        <Text style={styles.backToLoginText}>Back to Login</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' },
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        paddingTop: Platform.OS === 'android' ? 30 : 45,
        backgroundColor: '#0F00D7'
    },
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -1
    },
    iconHeader: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
    inputContainer: { width: '100%', marginBottom: 20 },
    label: { fontSize: 15, color: '#444', marginBottom: 7, fontWeight: '500' },
    textInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        fontSize: 16,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        backgroundColor: '#F9F9F9',
        color: '#333'
    },
    button: {
        backgroundColor: '#0F00D7',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
        minHeight: 50,
        justifyContent: 'center',
        marginTop: 10,
    },
    buttonDisabled: { backgroundColor: '#7986CB' },
    buttonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    infoMessage: { fontSize: 15, color: 'green', textAlign: 'center', marginVertical: 15, paddingHorizontal: 10 },
    resendOtpButton: { marginTop: 15, paddingVertical: 10 },
    resendOtpText: { fontSize: 15, color: '#0F00D7', fontWeight: '500', textAlign: 'center' },
    backToLoginButton: { marginTop: 25, paddingVertical: 10 },
    backToLoginText: { fontSize: 15, color: '#0F00D7', fontWeight: '500', textAlign: 'center' },
});

export default ActivateAccountVerifyScreen;