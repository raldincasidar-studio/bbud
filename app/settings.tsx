import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserData {
    _id: string;
    first_name: string;
    middle_name?: string | null;
    last_name?: string;
    suffix?: string | null;
    email: string;
    sex?: string;
    date_of_birth?: string;
    age?: number; // ADDED: Age field
    civil_status?: string;
    citizenship?: string;
    occupation_status?: string;
    contact_number?: string | null;
    address_house_number?: string;
    address_unit_room_apt_number?: string; // NEW FIELD
    address_street?: string;
    address_subdivision_zone?: string;
    address_city_municipality?: string; // Added this to UserData if not already present, as it's shown in UI
    type_of_household?: string | null; // NEW FIELD
    years_at_current_address?: number | null;
    proof_of_residency_base64?: string[]; // This should now be an array
    is_voter?: boolean;
    voter_id_number?: string | null;
    voter_registration_proof_base64?: string | null;
    is_pwd?: boolean;
    pwd_id?: string | null;
    pwd_card_base64?: string | null;
    is_senior_citizen?: boolean;
    senior_citizen_id?: string | null;
    senior_citizen_card_base64?: string | null;
}

// Reusable component for displaying validation errors
const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return <Text style={styles.errorText}>{error}</Text>;
};

// Reusable component for toggled sections with validation support
const ToggleSection = ({ label, value, onValueChange, idLabel, idValue, onIdChange, idError, proofValue, onProofPress, disabled }: any) => (
    <View style={styles.toggleSectionContainer}>
        <View style={styles.toggleSwitchRow}>
            <Text style={styles.label}>{label}</Text>
            <Switch onValueChange={onValueChange} value={value} disabled={disabled} />
        </View>
        {value && (
            <View style={styles.conditionalContainer}>
                <Text style={styles.label}>{idLabel}</Text>
                <TextInput
                    style={[styles.textInput, disabled && styles.textInputDisabled, !!idError && styles.inputError]}
                    value={idValue || ''}
                    onChangeText={onIdChange}
                    placeholder={idLabel.replace('*', '')}
                    placeholderTextColor="#A9A9A9"
                    editable={!disabled}
                />
                <ErrorMessage error={idError} />
                <TouchableOpacity style={[styles.imagePickerButton, disabled && styles.buttonDisabledAppearance]} onPress={onProofPress} disabled={disabled}>
                    <Text style={styles.imagePickerButtonText}>{proofValue ? 'Change Proof' : 'Upload Proof'}</Text>
                </TouchableOpacity>
                {/* ProofValue for toggle sections is typically a single image base64 string */}
                {proofValue && <Image source={{ uri: proofValue }} style={styles.proofImagePreview} />}
            </View>
        )}
    </View>
);

// Suffix Options
const suffixOptions = ['Jr.', 'Sr.', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export default function SettingsScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formState, setFormState] = useState<Partial<UserData & { newPassword?: string; confirmNewPassword?: string }>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [originalFormState, setOriginalFormState] = useState({});
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false); // This state is not currently used for a DatePicker component.
    const [showPassword, setShowPassword] = useState(false);

    // Pure validation function without state side-effects
    const getValidationError = (field: string, value: any, currentState: typeof formState): string => {
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0);
        const isInvalidName = (val: string) => !/^[a-zA-Z'.\-\s]+$/.test(val); // Re-using from signup.tsx
        // Regex for address_unit_room_apt_number: alphanumeric, spaces, hyphens, and slashes
        const isInvalidUnitRoomApt = (val: string) => !/^[a-zA-Z0-9\s\-\/]*$/.test(val); 
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        switch (field) {
            case 'first_name': return isRequired(value) ? 'First name is required.' : '';
            case 'last_name': return isRequired(value) ? 'Last name is required.' : '';
            case 'suffix':
                if (value && isInvalidName(value)) {
                    return 'Suffix cannot contain numbers.';
                }
                return '';
            case 'email':
                if (isRequired(value)) {
                    return 'Email is required.';
                }
                if (!emailRegex.test(value.trim())) {
                    return 'Please enter a valid email address (e.g., juan@example.com).';
                }
                return '';
            case 'contact_number': return value && !/^\d{11}$/.test(value) ? 'Enter a valid 11-digit number.' : '';
            case 'date_of_birth': return isRequired(value) ? 'Date of birth is required.' : '';
            case 'sex': return isRequired(value) ? 'Sex is required.' : '';
            case 'civil_status': return isRequired(value) ? 'Civil status is required.' : '';
            case 'citizenship': return isRequired(value) ? 'Citizenship is required.' : '';
            case 'occupation_status': return isRequired(value) ? 'Occupation status is required.' : '';
            case 'address_house_number': return isRequired(value) ? 'House/Bldg number is required.' : '';
            case 'address_unit_room_apt_number': // NEW FIELD: Optional, but validate format if provided
                if (value && isInvalidUnitRoomApt(value)) {
                    return 'Only alphanumeric characters, spaces, hyphens, and slashes are allowed.';
                }
                return '';
            case 'address_street': return isRequired(value) ? 'Street is required.' : '';
            case 'address_subdivision_zone': return isRequired(value) ? 'Subdivision/Zone/Sitio is required.' : '';
            case 'type_of_household': // NEW FIELD: Optional, no validation added here
                return '';
            case 'years_at_current_address': return isRequired(value) ? 'Years at address is required.' : !/^\d+$/.test(String(value)) ? 'Must be a valid number.' : '';
            case 'pwd_id': return currentState.is_pwd && isRequired(value) ? 'PWD ID Number is required.' : '';
            case 'senior_citizen_id': return currentState.is_senior_citizen && isRequired(value) ? 'Senior Citizen ID is required.' : '';
            case 'newPassword':
                if (value && !passwordRegex.test(value)) { // Only validate if a new password is provided
                    return 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @$!%*?&).';
                }
                return '';
            case 'confirmNewPassword':
                if (currentState.newPassword) { // Only validate if newPassword is provided
                    if (isRequired(value)) {
                        return 'Please confirm your new password.';
                    }
                    if (value !== currentState.newPassword) {
                        return 'New passwords do not match.';
                    }
                }
                return '';
            default: return '';
        }
    };

    // Form input handler with real-time validation
    const handleInputChange = (field: keyof typeof formState, value: any) => {
        setFormState(prev => {
            const newState = { ...prev, [field]: value };

            // Validate the current field and update its error state
            const error = getValidationError(field, value, newState);
            setErrors(currentErrors => {
                const newErrors = { ...currentErrors };
                if (error) {
                    newErrors[field] = error;
                } else {
                    delete newErrors[field];
                }
                return newErrors;
            });

            // If newPassword is changed, re-validate confirmNewPassword
            if (field === 'newPassword' || field === 'confirmNewPassword') {
                const confirmError = getValidationError('confirmNewPassword', newState.confirmNewPassword, newState);
                 setErrors(currentErrors => {
                    const newErrors = { ...currentErrors };
                    if (confirmError) newErrors.confirmNewPassword = confirmError;
                    else delete newErrors.confirmNewPassword;
                    return newErrors;
                });
                const newPasswordError = getValidationError('newPassword', newState.newPassword, newState);
                 setErrors(currentErrors => {
                    const newErrors = { ...currentErrors };
                    if (newPasswordError) newErrors.newPassword = newPasswordError;
                    else delete newErrors.newPassword;
                    return newErrors;
                });
            }

            return newState;
        });
    };

    const loadUserData = useCallback(async () => {
        setIsLoading(true);
        try {
            const storedData = await AsyncStorage.getItem('userData');
            if (storedData) {
                const parsedData: UserData = JSON.parse(storedData);
                const dob = parsedData.date_of_birth ? new Date(parsedData.date_of_birth).toISOString().split('T')[0] : '';
                
                let age: number | undefined;
                if (parsedData.date_of_birth) {
                    const birthDate = new Date(parsedData.date_of_birth);
                    const today = new Date();
                    age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                }

                const initialData = {
                    ...parsedData,
                    date_of_birth: dob,
                    age: age, // ADDED: Calculate and set age
                    suffix: parsedData.suffix || null, // Ensure suffix is initialized as null if not present
                    address_unit_room_apt_number: parsedData.address_unit_room_apt_number || '', // NEW FIELD
                    type_of_household: parsedData.type_of_household || null, // NEW FIELD
                    // Ensure proof_of_residency_base64 is an array, even if empty or null from storage initially
                    proof_of_residency_base64: Array.isArray(parsedData.proof_of_residency_base64)
                        ? parsedData.proof_of_residency_base64
                        : (parsedData.proof_of_residency_base64 ? [parsedData.proof_of_residency_base64] : []),
                };
                setFormState(initialData);
                setOriginalFormState(initialData);
            } else {
                Alert.alert("Error", "User data not found. Please log in again.");
                router.replace('/login');
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            Alert.alert("Error", "Could not load your profile.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    const pickImage = async (field: keyof UserData) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll access is required.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false,
            aspect: [4, 3], quality: 0.5, base64: true,
        });

        if (!result.canceled && result.assets?.[0]?.base64) {
            const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
            // This is for single image fields. For proof_of_residency_base64, it's handled below.
            handleInputChange(field, base64Image);
        }
    };

    const handleSaveChanges = async () => {
        if (!formState._id) return;

        const validationErrors: Record<string, string> = {};
        const fieldsToValidate: (keyof typeof formState)[] = [
            'first_name', 'last_name', 'suffix',
            'email',
            'contact_number', 'date_of_birth', 'sex',
            'civil_status', 'citizenship', 'occupation_status', 
            'address_house_number', 'address_unit_room_apt_number', // NEW FIELD
            'address_street', 'address_subdivision_zone', 'type_of_household', // NEW FIELD
            'years_at_current_address',
        ];

        // Only validate password fields if newPassword is provided by the user
        if (formState.newPassword) {
            fieldsToValidate.push('newPassword', 'confirmNewPassword');
        }
        if (formState.is_pwd) fieldsToValidate.push('pwd_id');
        if (formState.is_senior_citizen) fieldsToValidate.push('senior_citizen_id');

        fieldsToValidate.forEach(field => {
            const error = getValidationError(field, formState[field], formState);
            if (error) validationErrors[field] = error;
        });

        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            Alert.alert("Validation Error", "Please fix the errors shown on the form before saving.");
            return;
        }

        setIsSaving(true);
        try {
            const payload: any = { ...formState };
            if (payload.years_at_current_address) {
                payload.years_at_current_address = parseInt(payload.years_at_current_address, 10);
            }
            delete payload.confirmNewPassword; // Don't send confirmNewPassword to the backend
            delete payload.age; // Do not send age to the backend, it's a derived field

            const response = await apiRequest('PUT', `/api/residents/${formState._id}`, payload);

            if (response && response.resident) {
                const storedUserData = JSON.parse(await AsyncStorage.getItem('userData') || '{}');
                const updatedUserData = { ...storedUserData, ...response.resident };
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
                loadUserData(); // Reload to refresh UI with latest data
                Alert.alert('Success', 'Profile updated successfully!');
            } else {
                Alert.alert('Update Failed', response?.message || 'Could not save changes.');
            }
        } catch (error: any) {
            console.error('Error saving resident details:', error.response?.data || error);
            Alert.alert('Error', error.response?.data?.message || 'An error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: async () => {
                await AsyncStorage.clear();
                router.replace('/');
            }},
        ]);
    };

    if (isLoading) return <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0F00D7" /></View>;

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.headerNav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile & Settings</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView style={styles.contentScrollView} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    {/* First Name (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>First Name *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled, !!errors.first_name && styles.inputError]}
                            value={formState.first_name}
                            editable={false}
                        />
                        <ErrorMessage error={errors.first_name} />
                    </View>

                    {/* Middle Name (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Middle Name</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled]}
                            value={formState.middle_name || ''}
                            editable={false}
                        />
                    </View>

                    {/* Last Name (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Last Name *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled, !!errors.last_name && styles.inputError]}
                            value={formState.last_name}
                            editable={false}
                        />
                        <ErrorMessage error={errors.last_name} />
                    </View>

                    {/* Suffix field (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Suffix</Text>
                        <View style={[styles.pickerWrapper, styles.pickerWrapperDisabled, !!errors.suffix && styles.inputError]}>
                            <Picker
                                selectedValue={formState.suffix}
                                enabled={false}
                                style={[styles.pickerText, styles.pickerTextDisabled, !formState.suffix && styles.pickerPlaceholder]}
                                itemStyle={{ color: '#757575' }}
                            >
                                <Picker.Item label="Select Suffix (Optional)" value={null} />
                                {suffixOptions.map((option) => (
                                    <Picker.Item key={option} label={option} value={option} />
                                ))}
                            </Picker>
                        </View>
                        <ErrorMessage error={errors.suffix} />
                    </View>

                    {/* Email (editable) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address *</Text>
                        <TextInput
                            style={[styles.textInput, !!errors.email && styles.inputError]}
                            value={formState.email}
                            onChangeText={(v) => handleInputChange('email', v)}
                            editable={true}
                            placeholderTextColor="#A9A9A9"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <ErrorMessage error={errors.email} />
                    </View>

                    {/* Contact Number (editable) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Contact Number *</Text>
                        <TextInput
                            style={[styles.textInput, !!errors.contact_number && styles.inputError]}
                            value={formState.contact_number || ''}
                            onChangeText={(v) => handleInputChange('contact_number', v)}
                            keyboardType="phone-pad"
                            maxLength={11}
                            editable={true}
                            placeholderTextColor="#A9A9A9"
                        />
                        <ErrorMessage error={errors.contact_number} />
                    </View>

                    {/* Date of Birth (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth *</Text>
                        <TouchableOpacity
                            style={[styles.datePickerButton, styles.buttonDisabledAppearance, !!errors.date_of_birth && styles.inputError]}
                            disabled={true} // 🔒 make non-editable
                        >
                            <Text style={formState.date_of_birth ? styles.datePickerText : styles.datePickerPlaceholderText}>
                                {formState.date_of_birth || 'Select Date'}
                            </Text>
                        </TouchableOpacity>
                        <ErrorMessage error={errors.date_of_birth} />
                    </View>

                    {/* Age (Read-only) - NEW FIELD */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Age</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled]}
                            value={formState.age ? String(formState.age) : ''}
                            editable={false}
                            placeholderTextColor="#A9A9A9"
                        />
                    </View>


                    {/* Sex (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Sex *</Text>
                        <View style={[styles.pickerWrapper, styles.pickerWrapperDisabled, !!errors.sex && styles.inputError]}>
                            <Picker
                                selectedValue={formState.sex}
                                enabled={false} // 🔒 disable picker
                                style={[styles.pickerText, styles.pickerTextDisabled, !formState.sex && styles.pickerPlaceholder]}
                                itemStyle={{ color: '#757575' }} // Ensure individual items are also styled
                            >
                                <Picker.Item label="Select Sex..." value="" />
                                <Picker.Item label="Male" value="Male" />
                                <Picker.Item label="Female" value="Female" />
                            </Picker>
                        </View>
                        <ErrorMessage error={errors.sex} />
                    </View>

                    {/* Civil Status (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Civil Status *</Text>
                        <View style={[styles.pickerWrapper, styles.pickerWrapperDisabled, !!errors.civil_status && styles.inputError]}>
                            <Picker
                                selectedValue={formState.civil_status}
                                enabled={false} // 🔒 disable picker
                                style={[styles.pickerText, styles.pickerTextDisabled, !formState.civil_status && styles.pickerPlaceholder]}
                                itemStyle={{ color: '#757575' }}
                            >
                                <Picker.Item label="Select Status..." value="" />
                                <Picker.Item label="Single" value="Single" />
                                <Picker.Item label="Married" value="Married" />
                                <Picker.Item label="Widowed" value="Widowed" />
                                <Picker.Item label="Separated" value="Separated" />
                            </Picker>
                        </View>
                        <ErrorMessage error={errors.civil_status} />
                    </View>

                    {/* Citizenship (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Citizenship *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled, !!errors.citizenship && styles.inputError]}
                            value={formState.citizenship}
                            editable={false}
                            placeholderTextColor="#A9A9A9"
                        />
                        <ErrorMessage error={errors.citizenship} />
                    </View>

                    {/* Occupation Status (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Occupation Status *</Text>
                        <View style={[styles.pickerWrapper, styles.pickerWrapperDisabled, !!errors.occupation_status && styles.inputError]}>
                            <Picker
                                selectedValue={formState.occupation_status}
                                enabled={false} // 🔒 disable picker
                                style={[styles.pickerText, styles.pickerTextDisabled, !formState.occupation_status && styles.pickerPlaceholder]}
                                itemStyle={{ color: '#757575' }}
                            >
                                <Picker.Item label="Select Status..." value="" />
                                <Picker.Item label="Labor force" value="Labor force" />
                                <Picker.Item label="Unemployed" value="Unemployed" />
                                <Picker.Item label="Out of School Youth" value="Out of School Youth" />
                                <Picker.Item label="Student" value="Student" />
                                <Picker.Item label="Retired" value="Retired" />
                            </Picker>
                        </View>
                        <ErrorMessage error={errors.occupation_status} />
                    </View>

                    <Text style={styles.sectionTitle}>Address Information</Text>

                    {/* NEW FIELD: Unit/Room/Apartment number (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Unit/Room/Apartment number</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled, !!errors.address_unit_room_apt_number && styles.inputError]}
                            value={formState.address_unit_room_apt_number || ''}
                            editable={false}
                            placeholderTextColor="#A9A9A9"
                        />
                        <ErrorMessage error={errors.address_unit_room_apt_number} />
                    </View>

                    {/* House Number (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>House Number/Lot/Block *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled, !!errors.address_house_number && styles.inputError]}
                            value={formState.address_house_number}
                            editable={false}
                            placeholderTextColor="#A9A9A9"
                        />
                        <ErrorMessage error={errors.address_house_number} />
                    </View>

                    {/* Street (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Street *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled, !!errors.address_street && styles.inputError]}
                            value={formState.address_street}
                            editable={false}
                            placeholderTextColor="#A9A9A9"
                        />
                        <ErrorMessage error={errors.address_street} />
                    </View>

                    {/* Subdivision / Zone / Sitio / Purok (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Subdivision / Zone / Sitio / Purok *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled, !!errors.address_subdivision_zone && styles.inputError]}
                            value={formState.address_subdivision_zone}
                            editable={false}
                            placeholderTextColor="#A9A9A9"
                        />
                        <ErrorMessage error={errors.address_subdivision_zone} />
                    </View>

                    {/* NEW FIELD: Type of Household (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Type of Household</Text>
                        <View style={[styles.pickerWrapper, styles.pickerWrapperDisabled, !!errors.type_of_household && styles.inputError]}>
                            <Picker
                                selectedValue={formState.type_of_household}
                                enabled={false} // 🔒 disable picker
                                style={[styles.pickerText, styles.pickerTextDisabled, !formState.type_of_household && styles.pickerPlaceholder]}
                                itemStyle={{ color: '#757575' }}
                            >
                                <Picker.Item label="Select Type of Household..." value={null} />
                                <Picker.Item label="Owner" value="Owner" />
                                <Picker.Item label="Tenant/Border" value="Tenant/Border" />
                                <Picker.Item label="Sharer" value="Sharer" />
                            </Picker>
                        </View>
                        <ErrorMessage error={errors.type_of_household} />
                    </View>

                     {/* City/Municipality (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>City/Municipality</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled]}
                            value={formState.address_city_municipality}
                            editable={false}
                            placeholderTextColor="#A9A9A9"
                        />
                    </View>


                    {/* Years at Current Address (Read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Years at Current Address *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textInputDisabled, !!errors.years_at_current_address && styles.inputError]}
                            value={formState.years_at_current_address?.toString() || ''}
                            editable={false}
                            placeholderTextColor="#A9A9A9"
                        />
                        <ErrorMessage error={errors.years_at_current_address} />
                    </View>

                    {/* Proof of Residency (Read-only) - FIX IMPLEMENTED HERE */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Proof of Residency</Text>
                        {formState.proof_of_residency_base64 && formState.proof_of_residency_base64.length > 0 ? (
                            <View style={styles.imagePreviewContainer}>
                                {formState.proof_of_residency_base64.map((uri, index) => (
                                    <View key={index} style={styles.imagePreviewWrapper}>
                                        <Image
                                            source={{ uri }}
                                            style={styles.proofImagePreview}
                                        />
                                        {/* If you wanted to allow removing, you'd add a button here, similar to signup.tsx */}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noProofText}>No proof of residency uploaded.</Text>
                        )}
                        <ErrorMessage error={errors.proof_of_residency_base64} />
                    </View>


                    {/* Special Classifications (disabled) */}
                    <Text style={styles.sectionTitle}>Special Classifications</Text>

                    <ToggleSection
                        label="Registered Voter?"
                        value={!!formState.is_voter}
                        onValueChange={() => {}} // 🔒 disable toggle
                        idLabel="Voter ID Number"
                        idValue={formState.voter_id_number}
                        onIdChange={() => {}} // 🔒 disable input
                        idError={errors.voter_id_number}
                        proofValue={formState.voter_registration_proof_base64}
                        onProofPress={() => {}} // 🔒 disable upload
                        disabled={true}
                    />

                    <ToggleSection
                        label="Person with Disability (PWD)?"
                        value={!!formState.is_pwd}
                        onValueChange={() => {}}
                        idLabel="PWD ID Number *"
                        idValue={formState.pwd_id}
                        onIdChange={() => {}}
                        idError={errors.pwd_id}
                        proofValue={formState.pwd_card_base64}
                        onProofPress={() => {}}
                        disabled={true}
                    />

                    <ToggleSection
                        label="Senior Citizen?"
                        value={!!formState.is_senior_citizen}
                        onValueChange={() => {}}
                        idLabel="Senior Citizen ID *"
                        idValue={formState.senior_citizen_id}
                        onIdChange={() => {}}
                        idError={errors.senior_citizen_id}
                        proofValue={formState.senior_citizen_card_base64}
                        onProofPress={() => {}}
                        disabled={true}
                    />

                    <Text style={styles.sectionTitle}>Change Password</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={[styles.passwordContainer, !!errors.newPassword && styles.inputError]}>
                            <TextInput
                                style={styles.passwordInput}
                                secureTextEntry={!showPassword}
                                value={formState.newPassword || ''}
                                onChangeText={(v) => handleInputChange('newPassword', v)}
                                placeholder="Leave blank to keep current"
                                placeholderTextColor="#A9A9A9"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#888" />
                            </TouchableOpacity>
                        </View>
                        <ErrorMessage error={errors.newPassword} />
                        {/* Add helper text for password requirements */}
                        {formState.newPassword && !errors.newPassword &&
                            <Text style={styles.helperText}>Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @$!%*?&).</Text>
                        }
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <View style={[styles.passwordContainer, !!errors.confirmNewPassword && styles.inputError]}>
                            <TextInput
                                style={styles.passwordInput}
                                secureTextEntry={!showPassword}
                                value={formState.confirmNewPassword || ''}
                                onChangeText={(v) => handleInputChange('confirmNewPassword', v)}
                                placeholder="Confirm new password"
                                placeholderTextColor="#A9A9A9"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#888" />
                            </TouchableOpacity>
                        </View>
                        <ErrorMessage error={errors.confirmNewPassword} />
                    </View>

                    <TouchableOpacity style={[styles.actionButton, styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.actionButtonText}>Save Changes</Text>}
                    </TouchableOpacity>

                    <Text style={styles.sectionTitle}>Account Actions</Text>
                    <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color="white" style={{ marginRight: 10 }} />
                        <Text style={styles.actionButtonText}>Logout</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F6F8' },
    headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: '#0F00D7' },
    headerBack: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', textAlign: 'center', flex: 1 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    contentScrollView: { flex: 1 },
    contentContainer: { padding: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 8 },
    inputGroup: { marginBottom: 12 },
    label: { fontSize: 14, color: '#424242', marginBottom: 6, fontWeight: '500' },
    textInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, color: '#000' },
    textInputDisabled: { backgroundColor: '#E0E0E0', color: '#757575', borderColor: '#C0C0C0' },
    pickerWrapper: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white' },
    pickerWrapperDisabled: { backgroundColor: '#E0E0E0', borderColor: '#C0C0C0' },
    pickerText: { color: '#000' },
    pickerTextDisabled: { color: '#757575' },
    pickerPlaceholder: { color: '#A9A9A9' },
    datePickerButton: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, padding: 14, backgroundColor: 'white' },
    datePickerText: { fontSize: 15, color: '#000' },
    datePickerPlaceholderText: { fontSize: 15, color: '#A9A9A9' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white' },
    passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, color: '#000' },
    eyeIcon: { padding: 10 },
    toggleSectionContainer: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 15 },
    toggleSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    conditionalContainer: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    imagePickerButton: { backgroundColor: '#E8EAF6', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    imagePickerButtonText: { color: '#3F51B5', fontWeight: 'bold' },
    buttonDisabledAppearance: { backgroundColor: '#E0E0E0', borderColor: '#C0C0C0' },
    proofImagePreview: { width: 100, height: 100, borderRadius: 8, marginTop: 10, alignSelf: 'center' },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, marginTop: 10, elevation: 2 },
    saveButton: { backgroundColor: '#4CAF50' },
    logoutButton: { backgroundColor: '#D32F2F', marginTop: 20 },
    actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    buttonDisabled: { backgroundColor: '#A5D6A7' },
    inputError: {
        borderColor: '#D32F2F',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        marginTop: 4,
    },
    helperText: {
        fontSize: 12,
        color: '#616161',
        marginTop: 5,
        marginLeft: 5,
    },
    // --- ADDED NEW STYLES FROM signup.tsx ---
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 15,
        gap: 10, // Added for spacing between images
    },
    imagePreviewWrapper: {
        position: 'relative',
    },
    noProofText: {
        textAlign: 'center',
        color: '#888',
        fontStyle: 'italic',
        marginTop: 10,
        fontSize: 14,
    }
    // --- END NEW STYLES ---
});