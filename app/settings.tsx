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
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface UserData {
    _id: string;
    first_name: string;
    middle_name?: string | null;
    last_name?: string;
    email: string;
    sex?: string;
    date_of_birth?: string;
    civil_status?: string;
    citizenship?: string;
    occupation_status?: string;
    contact_number?: string | null;
    address_house_number?: string;
    address_street?: string;
    address_subdivision_zone?: string;
    years_at_current_address?: number | null;
    proof_of_residency_base64?: string | null;
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
const ToggleSection = ({ label, value, onValueChange, idLabel, idValue, onIdChange, idError, proofValue, onProofPress }: any) => (
    <View style={styles.toggleSectionContainer}>
        <View style={styles.toggleSwitchRow}>
            <Text style={styles.label}>{label}</Text>
            <Switch onValueChange={onValueChange} value={value} />
        </View>
        {value && (
            <View style={styles.conditionalContainer}>
                <Text style={styles.label}>{idLabel}</Text>
                <TextInput style={[styles.textInput, !!idError && styles.inputError]} value={idValue || ''} onChangeText={onIdChange} placeholder={idLabel.replace('*', '')} />
                <ErrorMessage error={idError} />
                <TouchableOpacity style={styles.imagePickerButton} onPress={onProofPress}>
                    <Text style={styles.imagePickerButtonText}>{proofValue ? 'Change Proof' : 'Upload Proof'}</Text>
                </TouchableOpacity>
                {proofValue && <Image source={{ uri: proofValue }} style={styles.proofImagePreview} />}
            </View>
        )}
    </View>
);

export default function SettingsScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formState, setFormState] = useState<Partial<UserData & { newPassword?: string; confirmNewPassword?: string }>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const [originalFormState, setOriginalFormState] = useState({});
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Pure validation function without state side-effects
    const getValidationError = (field: string, value: any, currentState: typeof formState): string => {
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim());

        switch (field) {
            case 'first_name': return isRequired(value) ? 'First name is required.' : '';
            case 'last_name': return isRequired(value) ? 'Last name is required.' : '';
            case 'contact_number': return value && !/^\d{11}$/.test(value) ? 'Enter a valid 11-digit number.' : '';
            case 'date_of_birth': return isRequired(value) ? 'Date of birth is required.' : '';
            case 'sex': return isRequired(value) ? 'Sex is required.' : '';
            case 'civil_status': return isRequired(value) ? 'Civil status is required.' : '';
            case 'citizenship': return isRequired(value) ? 'Citizenship is required.' : '';
            case 'occupation_status': return isRequired(value) ? 'Occupation status is required.' : '';
            case 'address_house_number': return isRequired(value) ? 'House/Bldg number is required.' : '';
            case 'address_street': return isRequired(value) ? 'Street is required.' : '';
            case 'address_subdivision_zone': return isRequired(value) ? 'Subdivision/Zone/Sitio is required.' : '';
            case 'years_at_current_address': return isRequired(value) ? 'Years at address is required.' : !/^\d+$/.test(String(value)) ? 'Must be a valid number.' : '';
            case 'pwd_id': return currentState.is_pwd && isRequired(value) ? 'PWD ID Number is required.' : '';
            case 'senior_citizen_id': return currentState.is_senior_citizen && isRequired(value) ? 'Senior Citizen ID is required.' : '';
            case 'newPassword': return value && value.length < 8 ? 'Password must be at least 8 characters long.' : '';
            case 'confirmNewPassword': return currentState.newPassword && value !== currentState.newPassword ? 'Passwords do not match.' : '';
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
            if (field === 'newPassword') {
                const confirmError = getValidationError('confirmNewPassword', newState.confirmNewPassword, newState);
                 setErrors(currentErrors => {
                    const newErrors = { ...currentErrors };
                    if (confirmError) newErrors.confirmNewPassword = confirmError;
                    else delete newErrors.confirmNewPassword;
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
                const initialData = { ...parsedData, date_of_birth: dob };
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
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true,
            aspect: [4, 3], quality: 0.5, base64: true,
        });

        if (!result.canceled && result.assets?.[0]?.base64) {
            const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
            handleInputChange(field, base64Image);
        }
    };

    const handleSaveChanges = async () => {
        if (!formState._id) return;

        const validationErrors: Record<string, string> = {};
        const fieldsToValidate: (keyof typeof formState)[] = [
            'first_name', 'last_name', 'contact_number', 'date_of_birth', 'sex', 
            'civil_status', 'citizenship', 'occupation_status', 'address_house_number',
            'address_street', 'address_subdivision_zone', 'years_at_current_address',
        ];

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
            Alert.alert("Validation Error", "Please fix the errors shown on the form.");
            return;
        }
        
        setIsSaving(true);
        try {
            const payload: any = { ...formState };
            if (payload.years_at_current_address) {
                payload.years_at_current_address = parseInt(payload.years_at_current_address, 10);
            }
            delete payload.confirmNewPassword;

            const response = await apiRequest('PUT', `/api/residents/${formState._id}`, payload);

            if (response && response.resident) {
                const updatedUserData = { ...JSON.parse(await AsyncStorage.getItem('userData') || '{}'), ...response.resident };
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
                loadUserData();
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
                    <View style={styles.inputGroup}><Text style={styles.label}>First Name *</Text><TextInput style={[styles.textInput, !!errors.first_name && styles.inputError]} value={formState.first_name} onChangeText={(v) => handleInputChange('first_name', v)} /><ErrorMessage error={errors.first_name} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Middle Name</Text><TextInput style={styles.textInput} value={formState.middle_name || ''} onChangeText={(v) => handleInputChange('middle_name', v)} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Last Name *</Text><TextInput style={[styles.textInput, !!errors.last_name && styles.inputError]} value={formState.last_name} onChangeText={(v) => handleInputChange('last_name', v)} /><ErrorMessage error={errors.last_name} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Email Address</Text><TextInput style={[styles.textInput, styles.textInputDisabled]} value={formState.email} editable={false} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Contact Number</Text><TextInput style={[styles.textInput, !!errors.contact_number && styles.inputError]} value={formState.contact_number || ''} onChangeText={(v) => handleInputChange('contact_number', v)} keyboardType="phone-pad" maxLength={11} /><ErrorMessage error={errors.contact_number} /></View>
                    
                    <View style={styles.inputGroup}><Text style={styles.label}>Date of Birth *</Text><TouchableOpacity style={[styles.datePickerButton, !!errors.date_of_birth && styles.inputError]} onPress={() => setDatePickerVisibility(true)}><Text style={styles.datePickerText}>{formState.date_of_birth || 'Select Date'}</Text></TouchableOpacity><ErrorMessage error={errors.date_of_birth} /></View>
                    <DateTimePickerModal isVisible={isDatePickerVisible} mode="date" minimumDate={undefined} date={new Date(formState.date_of_birth || Date.now())} onConfirm={(d) => { handleInputChange('date_of_birth', d.toISOString().split('T')[0]); setDatePickerVisibility(false); }} onCancel={() => setDatePickerVisibility(false)} />
                    
                    <View style={styles.inputGroup}><Text style={styles.label}>Sex *</Text><View style={[styles.pickerWrapper, !!errors.sex && styles.inputError]}><Picker selectedValue={formState.sex} onValueChange={(v) => handleInputChange('sex', v)}><Picker.Item label="Select Sex..." value="" /><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View><ErrorMessage error={errors.sex} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Civil Status *</Text><View style={[styles.pickerWrapper, !!errors.civil_status && styles.inputError]}><Picker selectedValue={formState.civil_status} onValueChange={(v) => handleInputChange('civil_status', v)}><Picker.Item label="Select Status..." value="" /><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View><ErrorMessage error={errors.civil_status} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Citizenship *</Text><TextInput style={[styles.textInput, !!errors.citizenship && styles.inputError]} value={formState.citizenship} onChangeText={(v) => handleInputChange('citizenship', v)} /><ErrorMessage error={errors.citizenship} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Occupation Status *</Text><View style={[styles.pickerWrapper, !!errors.occupation_status && styles.inputError]}><Picker selectedValue={formState.occupation_status} onValueChange={(v) => handleInputChange('occupation_status', v)}><Picker.Item label="Select Status..." value="" /><Picker.Item label="Labor force" value="Labor force" /><Picker.Item label="Unemployed" value="Unemployed" /><Picker.Item label="Out of School Youth" value="Out of School Youth" /><Picker.Item label="Student" value="Student" /><Picker.Item label="Retired" value="Retired" /></Picker></View><ErrorMessage error={errors.occupation_status} /></View>
                    
                    <Text style={styles.sectionTitle}>Address Information</Text>
                     <View style={styles.inputGroup}><Text style={styles.label}>House No. / Bldg No. *</Text><TextInput style={[styles.textInput, !!errors.address_house_number && styles.inputError]} value={formState.address_house_number} onChangeText={(v) => handleInputChange('address_house_number', v)} /><ErrorMessage error={errors.address_house_number} /></View>
                     <View style={styles.inputGroup}><Text style={styles.label}>Street *</Text><TextInput style={[styles.textInput, !!errors.address_street && styles.inputError]} value={formState.address_street} onChangeText={(v) => handleInputChange('address_street', v)} /><ErrorMessage error={errors.address_street} /></View>
                     <View style={styles.inputGroup}><Text style={styles.label}>Subdivision/Zone/Sitio *</Text><TextInput style={[styles.textInput, !!errors.address_subdivision_zone && styles.inputError]} value={formState.address_subdivision_zone} onChangeText={(v) => handleInputChange('address_subdivision_zone', v)} /><ErrorMessage error={errors.address_subdivision_zone} /></View>
                     <View style={styles.inputGroup}><Text style={styles.label}>Years at Address *</Text><TextInput style={[styles.textInput, !!errors.years_at_current_address && styles.inputError]} value={String(formState.years_at_current_address || '')} onChangeText={(v) => handleInputChange('years_at_current_address', v)} keyboardType="numeric" /><ErrorMessage error={errors.years_at_current_address} /></View>
                     <View style={styles.inputGroup}>
                        <Text style={styles.label}>Proof of Residency</Text>
                         <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage('proof_of_residency_base64')}><Text style={styles.imagePickerButtonText}>Upload New Proof</Text></TouchableOpacity>
                         {formState.proof_of_residency_base64 && <Image source={{ uri: formState.proof_of_residency_base64 }} style={styles.proofImagePreview} />}
                     </View>

                    <Text style={styles.sectionTitle}>Special Classifications</Text>
                    <ToggleSection label="Registered Voter?" value={!!formState.is_voter} onValueChange={(v) => handleInputChange('is_voter', v)} idLabel="Voter ID Number" idValue={formState.voter_id_number} onIdChange={(v) => handleInputChange('voter_id_number', v)} idError={errors.voter_id_number} proofValue={formState.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64')} />
                    <ToggleSection label="Person with Disability (PWD)?" value={!!formState.is_pwd} onValueChange={(v) => handleInputChange('is_pwd', v)} idLabel="PWD ID Number *" idValue={formState.pwd_id} onIdChange={(v) => handleInputChange('pwd_id', v)} idError={errors.pwd_id} proofValue={formState.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64')} />
                    <ToggleSection label="Senior Citizen?" value={!!formState.is_senior_citizen} onValueChange={(v) => handleInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID *" idValue={formState.senior_citizen_id} onIdChange={(v) => handleInputChange('senior_citizen_id', v)} idError={errors.senior_citizen_id} proofValue={formState.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64')} />
                    
                    <Text style={styles.sectionTitle}>Change Password</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={[styles.passwordContainer, !!errors.newPassword && styles.inputError]}>
                            <TextInput style={styles.passwordInput} secureTextEntry={!showPassword} value={formState.newPassword || ''} onChangeText={(v) => handleInputChange('newPassword', v)} placeholder="Leave blank to keep current" />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}><MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" /></TouchableOpacity>
                        </View>
                        <ErrorMessage error={errors.newPassword} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <View style={[styles.passwordContainer, !!errors.confirmNewPassword && styles.inputError]}>
                            <TextInput style={styles.passwordInput} secureTextEntry={!showPassword} value={formState.confirmNewPassword || ''} onChangeText={(v) => handleInputChange('confirmNewPassword', v)} placeholder="Confirm new password" />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}><MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" /></TouchableOpacity>
                        </View>
                        <ErrorMessage error={errors.confirmNewPassword} />
                    </View>

                    <TouchableOpacity style={[styles.actionButton, styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.actionButtonText}>Save Changes</Text>}
                    </TouchableOpacity>

                    <Text style={styles.sectionTitle}>Account Actions</Text>
                    <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}><MaterialCommunityIcons name="logout" size={20} color="white" style={{ marginRight: 10 }} /><Text style={styles.actionButtonText}>Logout</Text></TouchableOpacity>
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
    textInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, color: '#212121' },
    textInputDisabled: { backgroundColor: '#EEEEEE', color: '#757575' },
    pickerWrapper: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white' },
    datePickerButton: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, padding: 14, backgroundColor: 'white' },
    datePickerText: { fontSize: 15, color: '#212121' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white' },
    passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15 },
    eyeIcon: { padding: 10 },
    toggleSectionContainer: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 15 },
    toggleSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    conditionalContainer: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    imagePickerButton: { backgroundColor: '#E8EAF6', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    imagePickerButtonText: { color: '#3F51B5', fontWeight: 'bold' },
    proofImagePreview: { width: 100, height: 100, borderRadius: 8, marginTop: 10, alignSelf: 'center' },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, marginTop: 10, elevation: 2 },
    saveButton: { backgroundColor: '#4CAF50' },
    logoutButton: { backgroundColor: '#D32F2F', marginTop: 20 },
    actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    buttonDisabled: { backgroundColor: '#A5D6A7' },
    // Styles for validation
    inputError: {
        borderColor: '#D32F2F',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        marginTop: 4,
    },
});