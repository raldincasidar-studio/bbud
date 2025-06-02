// app/forgot-password/verify.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ForgotPasswordVerifyScreen = () => {
    const router = useRouter();
    const { email: userEmail } = useLocalSearchParams<{ email: string }>(); // Get email from previous screen

    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailToVerify, setEmailToVerify] = useState('');

    useEffect(() => {
        if (userEmail) {
            setEmailToVerify(userEmail);
        } else {
            // Handle case where email is not passed, maybe redirect or show error
            Alert.alert("Error", "Email not provided for verification.", [{text: "OK", onPress: () => router.replace('/forgot-password/request')}]);
        }
    }, [userEmail]);


    const handleResetPassword = async () => {
        if (!otp.trim() || otp.trim().length !== 6 || !/^\d{6}$/.test(otp.trim())) {
            Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Invalid Password', 'New password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert('Password Mismatch', 'New passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiRequest('POST', '/api/residents/forgot-password/verify-otp', {
                email: emailToVerify, // Use email passed from previous screen
                otp: otp.trim(),
                newPassword: newPassword,
            });

            if (response && response.message.toLowerCase().includes('success')) {
                Alert.alert('Success', response.message, [
                    { text: 'OK', onPress: () => router.replace('/') } // Navigate to Login
                ]);
            } else {
                Alert.alert('Error', response?.error || response?.message || 'Failed to reset password. OTP might be invalid or expired.');
            }
        } catch (error) {
            console.error("Reset Password error:", error);
            Alert.alert('Error', error.response?.data?.error || error.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
             <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.replace('/forgot-password/request')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Verify OTP</Text>
                <View style={{width: 28}} />
            </View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView contentContainerStyle={styles.container}>
                    <MaterialCommunityIcons name="numeric-6-box-multiple-outline" size={80} color="#0F00D7" style={styles.iconHeader} />
                    <Text style={styles.title}>Enter OTP</Text>
                    <Text style={styles.subtitle}>
                        An OTP has been sent to <Text style={{fontWeight: 'bold'}}>{emailToVerify || 'your email'}</Text>.
                        Please enter it below along with your new password.
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>OTP Code (6 digits)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="______"
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
                            letterSpacing={Platform.OS === 'ios' ? 10 : 5} // Letter spacing for OTP effect
                        />
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                        />
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Confirm new password"
                            value={confirmNewPassword}
                            onChangeText={setConfirmNewPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleResetPassword} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Reset Password</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
// Styles (similar to request.jsx, adjust as needed)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop:-1 },
    iconHeader: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10, lineHeight: 22 },
    inputContainer: { width: '100%', marginBottom: 20 },
    label: { fontSize: 15, color: '#444', marginBottom: 7, fontWeight: '500' },
    textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, fontSize: 16, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 12, backgroundColor: '#F9F9F9', color: '#333' },
    button: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', width: '100%', minHeight: 50, justifyContent: 'center', marginTop: 10},
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    buttonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
});

export default ForgotPasswordVerifyScreen;