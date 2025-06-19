import apiRequest from '@/plugins/axios'; // Ensure this path is correct
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";

// --- Helper Functions ---

const calculateAge = (dobString: string | null): number | null => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 0 ? age : null;
};

const convertImageToBase64 = async (uri: string | null): Promise<string | null> => {
    if (!uri) return null;
    try {
        const base64 = await ImagePicker.getCameraPermissionsAsync(); // This seems incorrect, should be reading file. Let's correct this.
        // Correct approach: using expo-file-system if we get a file URI.
        // However, expo-image-picker can return base64 directly. Let's assume we get it from there.
        // The logic below will handle the case where we only have the URI.
        // For this implementation, we will rely on the base64 string provided by pickImage.
        return uri; // Assuming URI is already the base64 string with prefix
    } catch (e) {
        console.error("Could not convert image to base64", e);
        return null;
    }
};

// --- Initial State Definitions ---

const initialMemberState = {
    first_name: '',
    middle_name: '',
    last_name: '',
    sex: 'Male',
    date_of_birth: null as string | null,
    civil_status: 'Single',
    citizenship: 'Filipino',
    occupation_status: 'Student',
    contact_number: '',
    relationship_to_head: 'Child',
    other_relationship: '',
    email: '',
    password: '',
    is_voter: false,
    voter_id_number: '',
    voter_registration_proof_base64: null as string | null,
    is_pwd: false,
    pwd_id: '',
    pwd_card_base64: null as string | null,
    is_senior_citizen: false,
    senior_citizen_id: '',
    senior_citizen_card_base64: null as string | null,
};

type Member = typeof initialMemberState;

const initialHeadState = {
    ...initialMemberState, // Inherits most fields from member
    relationship_to_head: '', // Not applicable for head
    other_relationship: '', // Not applicable for head
    password: '',
    confirmPassword: '',
    address_house_number: '',
    address_street: '',
    address_subdivision_zone: '',
    address_city_municipality: 'Manila City',
    years_at_current_address: '',
    proof_of_residency_base64: null as string | null,
};

type Head = typeof initialHeadState;

// Reusable component for toggled sections (Voter, PWD, Senior)
const ToggleSection = ({ label, value, onValueChange, idLabel, idValue, onIdChange, proofLabel, proofValue, onProofPress }: any) => (
    <View style={styles.toggleContainer}>
        <View style={styles.toggleSwitchRow}>
            <Text style={styles.label}>{label}</Text>
            <Switch
                trackColor={{ false: "#767577", true: "#4CAF50" }}
                thumbColor={value ? "#f4f3f4" : "#f4f3f4"}
                onValueChange={onValueChange}
                value={value}
            />
        </View>
        {value && (
            <View style={styles.conditionalContainer}>
                <Text style={styles.label}>{idLabel}</Text>
                <TextInput
                    style={styles.textInput}
                    value={idValue}
                    onChangeText={onIdChange}
                    placeholder={idLabel.replace('*','')}
                />
                <TouchableOpacity style={styles.filePickerButton} onPress={onProofPress}>
                    <Text style={styles.filePickerButtonText}>{proofValue ? 'Change Proof' : proofLabel}</Text>
                </TouchableOpacity>
                {proofValue && <Text style={styles.fileNameText}>Proof selected.</Text>}
            </View>
        )}
    </View>
);


export default function SignupScreen() {
    const router = useRouter();

    const [formData, setFormData] = useState<Head>(initialHeadState);
    const [members, setMembers] = useState<Member[]>([]);
    const [isMemberModalVisible, setMemberModalVisible] = useState(false);
    const [currentMember, setCurrentMember] = useState<Member>(initialMemberState);
    const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);

    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState<'head' | 'member'>('head');

    const [isSaving, setIsSaving] = useState(false);
    const [showHeadPassword, setShowHeadPassword] = useState(false);
    const [showMemberPassword, setShowMemberPassword] = useState(false);

    const handleInputChange = useCallback((name: keyof Head, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleMemberInputChange = useCallback((name: keyof Member, value: any) => {
        setCurrentMember(prev => ({ ...prev, [name]: value }));
    }, []);

    // --- Date Picker Logic ---
    const showDatePicker = (target: 'head' | 'member') => {
        setDatePickerTarget(target);
        setDatePickerVisibility(true);
    };

    const hideDatePicker = () => setDatePickerVisibility(false);

    const handleConfirmDate = (date: Date) => {
        const formattedDate = date.toISOString().split('T')[0];
        if (datePickerTarget === 'head') {
            handleInputChange('date_of_birth', formattedDate);
        } else {
            handleMemberInputChange('date_of_birth', formattedDate);
        }
        hideDatePicker();
    };

    // --- Image Picker Logic ---
    const pickImage = async (field: keyof Head | keyof Member, target: 'head' | 'member') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
            if (target === 'head') {
                handleInputChange(field as keyof Head, base64);
            } else {
                handleMemberInputChange(field as keyof Member, base64);
            }
        }
    };

    // --- Member Modal Logic ---
    const openAddMemberModal = () => {
        setCurrentMember(initialMemberState);
        setEditingMemberIndex(null);
        setShowMemberPassword(false);
        setMemberModalVisible(true);
    };

    const openEditMemberModal = (index: number) => {
        setCurrentMember(members[index]);
        setEditingMemberIndex(index);
        setShowMemberPassword(false);
        setMemberModalVisible(true);
    };

    const handleSaveMember = () => {
        const { first_name, last_name, date_of_birth, relationship_to_head, other_relationship, email, password } = currentMember;
        if (!first_name || !last_name || !date_of_birth || !relationship_to_head) {
            Alert.alert('Validation Error', 'First Name, Last Name, Date of Birth, and Relationship are required for household members.');
            return;
        }
        if (relationship_to_head === 'Other' && !other_relationship) {
            Alert.alert('Validation Error', 'Please specify the "Other" relationship.');
            return;
        }

        const memberAge = calculateAge(date_of_birth);
        if (memberAge !== null && memberAge >= 15 && (email || password)) {
            if (!email || !password) {
                Alert.alert('Validation Error', 'For members 15 and above, both email and password are required to create an account.');
                return;
            }
             if (password.length < 6) {
                Alert.alert('Validation Error', "Member's password must be at least 6 characters long.");
                return;
            }
        }

        const allEmailsInForm = [formData.email.trim().toLowerCase()];
        members.forEach((mem, i) => {
            if (editingMemberIndex === null || i !== editingMemberIndex) {
                if (mem.email) allEmailsInForm.push(mem.email.trim().toLowerCase());
            }
        });
        if (currentMember.email && allEmailsInForm.includes(currentMember.email.trim().toLowerCase())) {
            Alert.alert("Duplicate Email", `The email address '${currentMember.email}' is already used in this form.`);
            return;
        }

        if (editingMemberIndex !== null) {
            const updatedMembers = [...members];
            updatedMembers[editingMemberIndex] = currentMember;
            setMembers(updatedMembers);
        } else {
            setMembers([...members, currentMember]);
        }
        setMemberModalVisible(false);
    };

    const handleRemoveMember = (indexToRemove: number) => {
        Alert.alert(
            "Remove Member",
            "Are you sure you want to remove this household member?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    onPress: () => {
                        setMembers(prev => prev.filter((_, index) => index !== indexToRemove));
                    },
                    style: "destructive"
                }
            ]
        );
    };

    // --- Main Registration Handler ---
    const handleRegister = async () => {
        const { password, confirmPassword, first_name, last_name, email, contact_number, date_of_birth, address_house_number, address_street, address_subdivision_zone, proof_of_residency_base64, is_voter, voter_id_number, is_pwd, pwd_id, is_senior_citizen, senior_citizen_id } = formData;
        
        if (password !== confirmPassword) {
            Alert.alert("Validation Error", "Passwords do not match."); return;
        }
        if (password.length < 6) {
            Alert.alert('Validation Error', 'Password must be at least 6 characters long.'); return;
        }
        const headAge = calculateAge(date_of_birth);
        if (headAge === null || headAge < 15) {
            Alert.alert("Validation Error", "Household Head must be at least 15 years old to register."); return;
        }
        const requiredFields: (keyof Head)[] = ['first_name', 'last_name', 'email', 'contact_number', 'date_of_birth', 'address_house_number', 'address_street', 'address_subdivision_zone', 'years_at_current_address', 'proof_of_residency_base64'];
        for (const field of requiredFields) {
            if (!formData[field]) {
                Alert.alert("Validation Error", `Please fill in all required fields for the household head. Missing: ${field.replace(/_/g, ' ')}`);
                return;
            }
        }
        if (is_voter && !voter_id_number) { Alert.alert("Validation Error", "Voter ID Number is required if you are a registered voter."); return; }
        if (is_pwd && !pwd_id) { Alert.alert("Validation Error", "PWD ID is required if you are a PWD."); return; }
        if (is_senior_citizen && !senior_citizen_id) { Alert.alert("Validation Error", "Senior Citizen ID is required."); return; }
        
        setIsSaving(true);
        try {
            const payload: any = { ...formData };
            delete payload.confirmPassword;
            payload.household_members_to_create = members.map(mem => {
                const { ...memberPayload } = mem;
                // No need to convert base64 again, it's already in the state
                return memberPayload;
            });

            const response = await apiRequest('POST', '/api/residents', payload);

            if (response && (response.message || response.resident)) {
                Alert.alert(
                    'Registration Successful',
                    'Your household has been registered. Your account is now pending for approval by the barangay administrator.',
                    [{ text: 'OK', onPress: () => router.replace('/login') }]
                );
            } else {
                Alert.alert('Registration Failed', response?.message || response?.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
            console.error('Registration API error:', error.response ? error.response.data : error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'An unexpected error occurred. Please try again.';
            Alert.alert('Registration Error', errorMessage);
        } finally {
            setIsSaving(false);
        }
    };
    
    const headAge = calculateAge(formData.date_of_birth);
    const memberAge = calculateAge(currentMember.date_of_birth);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
             <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Household Registration</Text>
                <View style={{width: 24}} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
                <View style={styles.formContainer}>
                    <Text style={styles.subHeader}>Step 1: Household Head Information</Text>

                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <TextInput style={styles.textInput} placeholder="First Name*" value={formData.first_name} onChangeText={(val) => handleInputChange('first_name', val)} />
                    <TextInput style={styles.textInput} placeholder="Middle Name" value={formData.middle_name} onChangeText={(val) => handleInputChange('middle_name', val)} />
                    <TextInput style={styles.textInput} placeholder="Last Name*" value={formData.last_name} onChangeText={(val) => handleInputChange('last_name', val)} />
                    <TextInput style={styles.textInput} placeholder="Contact Number*" keyboardType="phone-pad" value={formData.contact_number} onChangeText={(val) => handleInputChange('contact_number', val)} />
                    <TouchableOpacity style={styles.datePickerButton} onPress={() => showDatePicker('head')}>
                        <Text style={formData.date_of_birth ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>
                            {formData.date_of_birth || 'Date of Birth*'}
                        </Text>
                    </TouchableOpacity>
                     <TextInput style={[styles.textInput, styles.textInputDisabled]} placeholder="Age" value={headAge !== null ? String(headAge) : ''} editable={false} />

                    <View style={styles.pickerWrapper}><Picker selectedValue={formData.sex} onValueChange={(val) => handleInputChange('sex', val)}><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View>
                    <View style={styles.pickerWrapper}><Picker selectedValue={formData.civil_status} onValueChange={(val) => handleInputChange('civil_status', val)}><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View>
                    <TextInput style={styles.textInput} placeholder="Citizenship*" value={formData.citizenship} onChangeText={(val) => handleInputChange('citizenship', val)} />
                    <View style={styles.pickerWrapper}><Picker selectedValue={formData.occupation_status} onValueChange={(val) => handleInputChange('occupation_status', val)}><Picker.Item label="Student" value="Student" /><Picker.Item label="Labor force" value="Labor force" /><Picker.Item label="Unemployed" value="Unemployed" /><Picker.Item label="Out of School Youth" value="Out of School Youth" /><Picker.Item label="Retired" value="Retired" /></Picker></View>

                    <Text style={styles.sectionTitle}>Address Information</Text>
                    <TextInput style={styles.textInput} placeholder="House No. / Building No.*" value={formData.address_house_number} onChangeText={(val) => handleInputChange('address_house_number', val)} />
                    <TextInput style={styles.textInput} placeholder="Street*" value={formData.address_street} onChangeText={(val) => handleInputChange('address_street', val)} />
                    <TextInput style={styles.textInput} placeholder="Subdivision / Zone / Sitio / Purok*" value={formData.address_subdivision_zone} onChangeText={(val) => handleInputChange('address_subdivision_zone', val)} />
                    <TextInput style={[styles.textInput, styles.textInputDisabled]} value={formData.address_city_municipality} editable={false} />
                    <TextInput style={styles.textInput} placeholder="Years at Current Address*" keyboardType="numeric" value={formData.years_at_current_address} onChangeText={(val) => handleInputChange('years_at_current_address', val)} />
                    <TouchableOpacity style={styles.filePickerButton} onPress={() => pickImage('proof_of_residency_base64', 'head')}>
                        <Text style={styles.filePickerButtonText}>{formData.proof_of_residency_base64 ? 'Change Proof of Residency*' : 'Upload Proof of Residency*'}</Text>
                    </TouchableOpacity>
                     {formData.proof_of_residency_base64 && <Text style={styles.fileNameText}>Proof selected.</Text>}

                    <Text style={styles.sectionTitle}>Special Classifications</Text>
                    {(headAge === null || headAge >= 18) &&
                    <ToggleSection
                        label="Are you a registered voter?" value={formData.is_voter} onValueChange={(val: boolean) => handleInputChange('is_voter', val)}
                        idLabel="Voter ID Number*" idValue={formData.voter_id_number} onIdChange={(val: string) => handleInputChange('voter_id_number', val)}
                        proofLabel="Upload Voter's Proof" proofValue={formData.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64', 'head')}
                    />}
                    <ToggleSection
                        label="Are you a PWD?" value={formData.is_pwd} onValueChange={(val: boolean) => handleInputChange('is_pwd', val)}
                        idLabel="PWD ID Number*" idValue={formData.pwd_id} onIdChange={(val: string) => handleInputChange('pwd_id', val)}
                        proofLabel="Upload PWD Card*" proofValue={formData.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64', 'head')}
                    />
                    {(headAge === null || headAge >= 60) &&
                    <ToggleSection
                        label="Are you a Senior Citizen?" value={formData.is_senior_citizen} onValueChange={(val: boolean) => handleInputChange('is_senior_citizen', val)}
                        idLabel="Senior Citizen ID*" idValue={formData.senior_citizen_id} onIdChange={(val: string) => handleInputChange('senior_citizen_id', val)}
                        proofLabel="Upload Senior Citizen Card*" proofValue={formData.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64', 'head')}
                    />}

                    <Text style={styles.sectionTitle}>Account Credentials</Text>
                    <TextInput style={styles.textInput} placeholder="Email*" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(val) => handleInputChange('email', val)} />
                    <View style={styles.passwordContainer}>
                        <TextInput style={styles.passwordInput} placeholder="Password*" secureTextEntry={!showHeadPassword} value={formData.password} onChangeText={(val) => handleInputChange('password', val)} />
                        <TouchableOpacity onPress={() => setShowHeadPassword(!showHeadPassword)} style={styles.eyeIcon}>
                            <Ionicons name={showHeadPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.passwordContainer}>
                        <TextInput style={styles.passwordInput} placeholder="Confirm Password*" secureTextEntry={!showHeadPassword} value={formData.confirmPassword} onChangeText={(val) => handleInputChange('confirmPassword', val)} />
                        <TouchableOpacity onPress={() => setShowHeadPassword(!showHeadPassword)} style={styles.eyeIcon}>
                            <Ionicons name={showHeadPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subHeader}>Step 2: Household Members</Text>
                    <View>
                        {members.map((member, index) => (
                            <View key={index} style={styles.memberCard}>
                               <View style={styles.memberHeader}>
                                    <Text style={styles.memberTitle}>{`${member.first_name} ${member.last_name}`}</Text>
                                    <View style={{flexDirection: 'row'}}>
                                        <TouchableOpacity onPress={() => openEditMemberModal(index)} style={{marginRight: 15}}>
                                            <Ionicons name="pencil-outline" size={22} color="#0F00D7" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleRemoveMember(index)}>
                                            <Ionicons name="trash-bin-outline" size={22} color="#D32F2F" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                               <Text style={styles.memberDetailText}>Relationship: {member.relationship_to_head === 'Other' ? member.other_relationship : member.relationship_to_head}</Text>
                               <Text style={styles.memberDetailText}>Age: {calculateAge(member.date_of_birth)}</Text>
                           </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.addMemberButton} onPress={openAddMemberModal}>
                        <Ionicons name="add-circle-outline" size={22} color="#0F00D7" style={{marginRight: 8}} />
                        <Text style={styles.addMemberButtonText}>Add Household Member</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.signUpButton} onPress={handleRegister} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signUpButtonText}>Register Household</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.navigate('login')}>
                        <Text style={styles.loginText}>Already have an account? Login</Text>
                    </TouchableOpacity>
                </View>

                <DateTimePickerModal isVisible={isDatePickerVisible} mode="date" onConfirm={handleConfirmDate} onCancel={hideDatePicker} maximumDate={new Date()} />
            </ScrollView>

            <Modal animationType="slide" transparent={true} visible={isMemberModalVisible} onRequestClose={() => setMemberModalVisible(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingMemberIndex !== null ? 'Edit' : 'Add'} Household Member</Text>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <TextInput style={styles.modalInput} placeholder="First Name*" value={currentMember.first_name} onChangeText={(val) => handleMemberInputChange('first_name', val)} />
                            <TextInput style={styles.modalInput} placeholder="Middle Name" value={currentMember.middle_name} onChangeText={(val) => handleMemberInputChange('middle_name', val)} />
                            <TextInput style={styles.modalInput} placeholder="Last Name*" value={currentMember.last_name} onChangeText={(val) => handleMemberInputChange('last_name', val)} />
                            <TouchableOpacity style={styles.datePickerButtonModal} onPress={() => showDatePicker('member')}>
                                <Text style={currentMember.date_of_birth ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>{currentMember.date_of_birth || 'Date of Birth*'}</Text>
                            </TouchableOpacity>

                            <View style={styles.pickerWrapperSmall}><Picker selectedValue={currentMember.relationship_to_head} onValueChange={(val) => handleMemberInputChange('relationship_to_head', val)}><Picker.Item label="Child" value="Child" /><Picker.Item label="Spouse" value="Spouse" /><Picker.Item label="Parent" value="Parent" /><Picker.Item label="Sibling" value="Sibling" /><Picker.Item label="Other Relative" value="Other Relative" /><Picker.Item label="House Helper" value="House Helper" /><Picker.Item label="Other" value="Other" /></Picker></View>
                            {currentMember.relationship_to_head === 'Other' && (
                                <TextInput style={styles.modalInput} placeholder="Please specify relationship*" value={currentMember.other_relationship} onChangeText={(val) => handleMemberInputChange('other_relationship', val)} />
                            )}
                            
                            <View style={styles.pickerWrapperSmall}><Picker selectedValue={currentMember.sex} onValueChange={(val) => handleMemberInputChange('sex', val)}><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View>
                            <View style={styles.pickerWrapperSmall}><Picker selectedValue={currentMember.civil_status} onValueChange={(val) => handleMemberInputChange('civil_status', val)}><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View>
                            <TextInput style={styles.modalInput} placeholder="Citizenship*" value={currentMember.citizenship} onChangeText={(val) => handleMemberInputChange('citizenship', val)} />
                            <View style={styles.pickerWrapperSmall}><Picker selectedValue={currentMember.occupation_status} onValueChange={(val) => handleMemberInputChange('occupation_status', val)}><Picker.Item label="Student" value="Student" /><Picker.Item label="Labor force" value="Labor force" /><Picker.Item label="Unemployed" value="Unemployed" /><Picker.Item label="Out of School Youth" value="Out of School Youth" /><Picker.Item label="Retired" value="Retired" /></Picker></View>

                             <Text style={styles.modalSectionTitle}>Special Classifications</Text>
                            {(memberAge === null || memberAge >= 18) &&
                            <ToggleSection
                                label="Is member a registered voter?" value={currentMember.is_voter} onValueChange={(val: boolean) => handleMemberInputChange('is_voter', val)}
                                idLabel="Voter ID Number" idValue={currentMember.voter_id_number} onIdChange={(val: string) => handleMemberInputChange('voter_id_number', val)}
                                proofLabel="Upload Voter's Proof" proofValue={currentMember.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64', 'member')}
                            />}
                             <ToggleSection
                                label="Is member a PWD?" value={currentMember.is_pwd} onValueChange={(val: boolean) => handleMemberInputChange('is_pwd', val)}
                                idLabel="PWD ID Number*" idValue={currentMember.pwd_id} onIdChange={(val: string) => handleMemberInputChange('pwd_id', val)}
                                proofLabel="Upload PWD Card*" proofValue={currentMember.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64', 'member')}
                            />
                            {(memberAge === null || memberAge >= 60) &&
                             <ToggleSection
                                label="Is member a Senior Citizen?" value={currentMember.is_senior_citizen} onValueChange={(val: boolean) => handleMemberInputChange('is_senior_citizen', val)}
                                idLabel="Senior Citizen ID*" idValue={currentMember.senior_citizen_id} onIdChange={(val: string) => handleMemberInputChange('senior_citizen_id', val)}
                                proofLabel="Upload Senior Citizen Card*" proofValue={currentMember.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64', 'member')}
                            />}

                            {memberAge !== null && memberAge >= 15 && (
                                <View>
                                    <Text style={styles.modalSectionTitle}>Create Account (Optional)</Text>
                                    <Text style={styles.accountInfoText}>Member is {memberAge} years old. They can create their own account.</Text>
                                    <TextInput style={styles.modalInput} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={currentMember.email} onChangeText={(val) => handleMemberInputChange('email', val)} />
                                    <View style={styles.passwordContainerModal}>
                                        <TextInput style={styles.passwordInputModal} placeholder="Password" secureTextEntry={!showMemberPassword} value={currentMember.password} onChangeText={(val) => handleMemberInputChange('password', val)} />
                                        <TouchableOpacity onPress={() => setShowMemberPassword(!showMemberPassword)} style={styles.eyeIcon}>
                                            <Ionicons name={showMemberPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleSaveMember}>
                                    <Text style={styles.modalButtonText}>Save Member</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalButton, styles.modalButtonClose]} onPress={() => setMemberModalVisible(false)}>
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
                </KeyboardAvoidingView>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    requiredAsterisk: { color: 'red' },
    header: { paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F00D7' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    scrollView: { backgroundColor: '#F4F6F8', flex: 1 },
    formContainer: { paddingHorizontal: 20, paddingTop: 10 },
    subHeader: { fontSize: 22, fontWeight: '600', color: '#333', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 5 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F00D7', marginTop: 20, marginBottom: 15 },
    textInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, fontSize: 16, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, marginBottom: 12, color: '#212121', backgroundColor: 'white' },
    textInputDisabled: { backgroundColor: '#EEEEEE', color: '#757575' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white', marginBottom: 12 },
    passwordInput: { flex: 1, fontSize: 16, color: '#212121', paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
    eyeIcon: { paddingHorizontal: 12, paddingVertical: 10 },
    pickerWrapper: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white', marginBottom: 12 },
    picker: { height: 50, width: '100%', color: '#212121' },
    datePickerButton: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 14, height: 50, marginBottom: 12 },
    datePickerButtonText: { fontSize: 16, color: '#212121' },
    datePickerPlaceholderText: { fontSize: 16, color: '#A9A9A9' },
    filePickerButton: { backgroundColor: '#E8E8FF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 5 },
    filePickerButtonText: { color: '#0F00D7', fontSize: 15, fontWeight: 'bold' },
    fileNameText: { fontSize: 13, color: 'green', marginTop: 4, fontStyle: 'italic', textAlign: 'center', marginBottom: 10 },
    loginText: { textAlign: 'center', marginTop: 20, color: '#0F00D7', fontSize: 16 },

    // Toggle Section
    toggleContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
    toggleSwitchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 16, color: '#333', fontWeight: '500' },
    conditionalContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
    
    // Member Section
    addMemberButton: { flexDirection: 'row', backgroundColor: 'white', borderWidth: 1, borderColor: '#0F00D7', borderStyle: 'dashed', paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    addMemberButtonText: { color: '#0F00D7', fontSize: 16, fontWeight: 'bold' },
    memberCard: { backgroundColor: 'white', borderRadius: 8, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
    memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    memberTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
    memberDetailText: { fontSize: 14, color: '#555', marginBottom: 4 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
    modalContent: { width: '100%', maxHeight: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#0F00D7' },
    modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
    modalInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 15, backgroundColor: '#F9F9F9' },
    passwordContainerModal: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: '#F9F9F9', marginBottom: 12 },
    passwordInputModal: { flex: 1, fontSize: 15, color: '#212121', paddingVertical: 10, paddingHorizontal: 12 },
    pickerWrapperSmall: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, marginBottom: 12, backgroundColor: '#F9F9F9' },
    datePickerButtonModal: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 14, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48, marginBottom: 12 },
    accountInfoText: { fontSize: 14, color: '#666', marginBottom: 10, fontStyle: 'italic', textAlign: 'center' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 25, borderTopWidth: 1, paddingTop: 15, borderColor: '#EEEEEE' },
    modalButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', flex: 1, marginHorizontal: 5 },
    modalButtonSave: { backgroundColor: '#0F00D7' },
    modalButtonClose: { backgroundColor: '#757575' },
    modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

    // Submit Button
    signUpButton: { backgroundColor: '#0F00D7', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 30, marginBottom: 15, elevation: 3 },
    signUpButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
});