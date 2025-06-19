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

// Reusable component for toggled sections
const ToggleSection = ({ label, value, onValueChange, idLabel, idValue, onIdChange, proofValue, onProofPress }: any) => (
    <View style={styles.toggleSectionContainer}>
        <View style={styles.toggleSwitchRow}>
            <Text style={styles.label}>{label}</Text>
            <Switch onValueChange={onValueChange} value={value} />
        </View>
        {value && (
            <View style={styles.conditionalContainer}>
                <Text style={styles.label}>{idLabel}</Text>
                <TextInput style={styles.textInput} value={idValue || ''} onChangeText={onIdChange} placeholder={idLabel.replace('*', '')} />
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
    
    // Use a single state object for the form
    const [formState, setFormState] = useState<Partial<UserData & { newPassword?: string; confirmNewPassword?: string }>>({});
    
    const [originalFormState, setOriginalFormState] = useState({});
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form input handler
    const handleInputChange = (field: keyof typeof formState, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const loadUserData = useCallback(async () => {
        setIsLoading(true);
        try {
            const storedData = await AsyncStorage.getItem('userData');
            if (storedData) {
                const parsedData: UserData = JSON.parse(storedData);
                // Format date for input field
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
        if (!formState.first_name?.trim() || !formState.last_name?.trim()) {
            Alert.alert("Validation Error", "First name and last name are required.");
            return;
        }
        if (formState.newPassword && formState.newPassword !== formState.confirmNewPassword) {
            Alert.alert("Validation Error", "New passwords do not match.");
            return;
        }
        
        setIsSaving(true);
        try {
            const payload: any = { ...formState };
            // Ensure years is a number
            if (payload.years_at_current_address) {
                payload.years_at_current_address = parseInt(payload.years_at_current_address, 10);
            }

            // Remove confirm password field before sending
            delete payload.confirmNewPassword;

            const response = await apiRequest('PUT', `/api/residents/${formState._id}`, payload);

            if (response && response.resident) {
                const updatedUserData = { ...JSON.parse(await AsyncStorage.getItem('userData') || '{}'), ...response.resident };
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
                loadUserData(); // Reload to refresh the form and original state
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
                await AsyncStorage.clear(); // Clear all async storage data
                router.replace('/login');
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

                <ScrollView style={styles.contentScrollView} contentContainerStyle={styles.contentContainer}>
                    {/* Personal Info */}
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.inputGroup}><Text style={styles.label}>First Name *</Text><TextInput style={styles.textInput} value={formState.first_name} onChangeText={(v) => handleInputChange('first_name', v)} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Middle Name</Text><TextInput style={styles.textInput} value={formState.middle_name || ''} onChangeText={(v) => handleInputChange('middle_name', v)} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Last Name *</Text><TextInput style={styles.textInput} value={formState.last_name} onChangeText={(v) => handleInputChange('last_name', v)} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Email Address</Text><TextInput style={[styles.textInput, styles.textInputDisabled]} value={formState.email} editable={false} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Contact Number</Text><TextInput style={styles.textInput} value={formState.contact_number || ''} onChangeText={(v) => handleInputChange('contact_number', v)} keyboardType="phone-pad" /></View>
                    
                    <View style={styles.inputGroup}><Text style={styles.label}>Date of Birth *</Text><TouchableOpacity style={styles.datePickerButton} onPress={() => setDatePickerVisibility(true)}><Text style={styles.datePickerText}>{formState.date_of_birth || 'Select Date'}</Text></TouchableOpacity></View>
                    <DateTimePickerModal isVisible={isDatePickerVisible} mode="date" date={new Date(formState.date_of_birth || Date.now())} onConfirm={(d) => { handleInputChange('date_of_birth', d.toISOString().split('T')[0]); setDatePickerVisibility(false); }} onCancel={() => setDatePickerVisibility(false)} />
                    
                    <View style={styles.inputGroup}><Text style={styles.label}>Sex *</Text><View style={styles.pickerWrapper}><Picker selectedValue={formState.sex} onValueChange={(v) => handleInputChange('sex', v)}><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Civil Status *</Text><View style={styles.pickerWrapper}><Picker selectedValue={formState.civil_status} onValueChange={(v) => handleInputChange('civil_status', v)}><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Citizenship *</Text><TextInput style={styles.textInput} value={formState.citizenship} onChangeText={(v) => handleInputChange('citizenship', v)} /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>Occupation Status *</Text><View style={styles.pickerWrapper}><Picker selectedValue={formState.occupation_status} onValueChange={(v) => handleInputChange('occupation_status', v)}><Picker.Item label="Labor force" value="Labor force" /><Picker.Item label="Unemployed" value="Unemployed" /><Picker.Item label="Out of School Youth" value="Out of School Youth" /><Picker.Item label="Student" value="Student" /><Picker.Item label="Retired" value="Retired" /></Picker></View></View>
                    
                    {/* Address Info */}
                    <Text style={styles.sectionTitle}>Address Information</Text>
                     <View style={styles.inputGroup}><Text style={styles.label}>House No. / Bldg No. *</Text><TextInput style={styles.textInput} value={formState.address_house_number} onChangeText={(v) => handleInputChange('address_house_number', v)} /></View>
                     <View style={styles.inputGroup}><Text style={styles.label}>Street *</Text><TextInput style={styles.textInput} value={formState.address_street} onChangeText={(v) => handleInputChange('address_street', v)} /></View>
                     <View style={styles.inputGroup}><Text style={styles.label}>Subdivision/Zone/Sitio *</Text><TextInput style={styles.textInput} value={formState.address_subdivision_zone} onChangeText={(v) => handleInputChange('address_subdivision_zone', v)} /></View>
                     <View style={styles.inputGroup}><Text style={styles.label}>Years at Address *</Text><TextInput style={styles.textInput} value={String(formState.years_at_current_address || '')} onChangeText={(v) => handleInputChange('years_at_current_address', v)} keyboardType="numeric" /></View>
                     <View style={styles.inputGroup}>
                        <Text style={styles.label}>Proof of Residency</Text>
                         <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage('proof_of_residency_base64')}><Text style={styles.imagePickerButtonText}>Upload New Proof</Text></TouchableOpacity>
                         {formState.proof_of_residency_base64 && <Image source={{ uri: formState.proof_of_residency_base64 }} style={styles.proofImagePreview} />}
                     </View>

                    {/* Special Classifications */}
                    <Text style={styles.sectionTitle}>Special Classifications</Text>
                    <ToggleSection label="Registered Voter?" value={!!formState.is_voter} onValueChange={(v) => handleInputChange('is_voter', v)} idLabel="Voter ID Number" idValue={formState.voter_id_number} onIdChange={(v) => handleInputChange('voter_id_number', v)} proofValue={formState.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64')} />
                    <ToggleSection label="Person with Disability (PWD)?" value={!!formState.is_pwd} onValueChange={(v) => handleInputChange('is_pwd', v)} idLabel="PWD ID Number *" idValue={formState.pwd_id} onIdChange={(v) => handleInputChange('pwd_id', v)} proofValue={formState.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64')} />
                    <ToggleSection label="Senior Citizen?" value={!!formState.is_senior_citizen} onValueChange={(v) => handleInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID *" idValue={formState.senior_citizen_id} onIdChange={(v) => handleInputChange('senior_citizen_id', v)} proofValue={formState.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64')} />
                    
                    {/* Change Password */}
                    <Text style={styles.sectionTitle}>Change Password</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput style={styles.passwordInput} secureTextEntry={!showPassword} value={formState.newPassword || ''} onChangeText={(v) => handleInputChange('newPassword', v)} placeholder="Leave blank to keep current" />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}><MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" /></TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput style={styles.passwordInput} secureTextEntry={!showPassword} value={formState.confirmNewPassword || ''} onChangeText={(v) => handleInputChange('confirmNewPassword', v)} placeholder="Confirm new password" />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}><MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" /></TouchableOpacity>
                        </View>
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
    contentContainer: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 8 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 14, color: '#424242', marginBottom: 6, fontWeight: '500' },
    textInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, color: '#212121' },
    textInputDisabled: { backgroundColor: '#EEEEEE', color: '#757575' },
    pickerWrapper: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white' },
    datePickerButton: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, padding: 14, backgroundColor: 'white' },
    datePickerText: { fontSize: 15 },
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
});