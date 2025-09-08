// app/activate-account/request.tsx (UPDATED: All fields required, email format validation)
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ActivateAccountRequestScreen = () => {
    const router = useRouter();
    const [accountNumber, setAccountNumber] = useState('');
    const [email, setEmail] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({}); // State to hold validation errors

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        // Account Number Validation (Required and 4 characters)
        if (!accountNumber.trim()) {
            newErrors.accountNumber = 'Account ID is required.';
        } else if (accountNumber.trim().length !== 4) {
            newErrors.accountNumber = 'Account ID must be exactly 4 characters long (last 4 digits of your resident ID).';
        }

        // Email Validation (Required and format validation)
        if (!email.trim()) {
            newErrors.email = 'Email is required.';
        } else {
            // Regex for a basic email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                newErrors.email = 'Please enter a valid email address (e.g., juan@example.com).';
            }
        }

        // Contact Number Validation (Required)
        if (!contactNumber.trim()) {
            newErrors.contactNumber = 'Contact Number is required.';
        }

        // Password Validation (Required and robust rules)
        const passwordValue = password;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!passwordValue) {
            newErrors.password = 'Password is required.';
        } else if (!passwordRegex.test(passwordValue)) {
            newErrors.password = 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @$!%*?&).';
        }

        // Confirm Password Validation (Required and matches password)
        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password.';
        } else if (confirmPassword !== passwordValue) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Return true if no errors
    };

    const handleActivateAccount = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please correct the errors in the form before proceeding.');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const lowercaseAccountNumber = accountNumber.trim().toLowerCase();

            const response = await apiRequest('POST', '/api/residents/activate-account/request-otp', {
                account_number: lowercaseAccountNumber,
                email: email.trim(),
                contact_number: contactNumber.trim(),
                password: password,
            });

            if (response && response.message) {
                setMessage(response.message);
                Alert.alert('OTP Sent', response.message + ' Please enter the OTP to complete activation.');
                router.push({
                    pathname: '/activate-account/verify',
                    params: {
                        accountNumber: lowercaseAccountNumber,
                        email: email.trim(),
                        contactNumber: contactNumber.trim(),
                        password: password,
                    }
                });
            } else {
                Alert.alert('Error', response?.error || 'Could not initiate account activation. Please try again.');
            }
        } catch (error: any) {
            console.error("Activate Account error:", error);
            Alert.alert('Error', error.response?.data?.message || error.response?.data?.error || 'An unexpected error occurred during activation.');
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
                <Text style={styles.navbarTitle}>Activate Account</Text>
                <View style={{ width: 28 }} />
            </View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView contentContainerStyle={styles.container}>
                    <MaterialCommunityIcons name="account-check-outline" size={80} color="#0F00D7" style={styles.iconHeader} />
                    <Text style={styles.title}>Activate Your Account</Text>
                    <Text style={styles.subtitle}> This is for Approved Residents who have not yet activated, maybe due to age or other cases. 
                    For your Account Number, you may ask or get it from your Household Head.</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Account Number</Text>
                        <TextInput
                            style={[styles.textInput, errors.accountNumber && styles.inputError]}
                            placeholder="e.g., 13df"
                            value={accountNumber}
                            onChangeText={text => { setAccountNumber(text.toLowerCase()); setErrors(prev => ({ ...prev, accountNumber: undefined })); }}
                            keyboardType="default"
                            autoCapitalize="none"
                            maxLength={4}
                        />
                        {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.textInput, errors.email && styles.inputError]}
                            placeholder="e.g juan@gmail.com"
                            value={email}
                            onChangeText={text => { setEmail(text); setErrors(prev => ({ ...prev, email: undefined })); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Contact Number</Text>
                        <TextInput
                            style={[styles.textInput, errors.contactNumber && styles.inputError]}
                            placeholder="e.g 09079185191"
                            value={contactNumber}
                            onChangeText={text => { setContactNumber(text); setErrors(prev => ({ ...prev, contactNumber: undefined })); }}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                        />
                        {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Set Password</Text>
                        <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Set Password"
                                value={password}
                                onChangeText={text => { setPassword(text); setErrors(prev => ({ ...prev, password: undefined })); }}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChangeText={text => { setConfirmPassword(text); setErrors(prev => ({ ...prev, confirmPassword: undefined })); }}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                    </View>

                    {message && <Text style={styles.infoMessage}>{message}</Text>}

                    <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleActivateAccount} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify via OTP</Text>}
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
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        backgroundColor: '#F9F9F9',
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
    button: {
        backgroundColor: '#0F00D7',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
        minHeight: 50,
        justifyContent: 'center'
    },
    buttonDisabled: { backgroundColor: '#7986CB' },
    buttonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    infoMessage: { fontSize: 15, color: 'green', textAlign: 'center', marginVertical: 15, paddingHorizontal: 10 },
    backToLoginButton: { marginTop: 25, paddingVertical: 10 },
    backToLoginText: { fontSize: 15, color: '#0F00D7', fontWeight: '500', textAlign: 'center' },
    errorText: {
        color: 'red',
        fontSize: 13,
        marginTop: 5,
        marginLeft: 5,
    },
    inputError: {
        borderColor: 'red',
        borderWidth: 1,
    }
});

export default ActivateAccountRequestScreen;