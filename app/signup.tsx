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

// --- Helper Functions and Components ---

const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return <Text style={styles.errorText}>{error}</Text>;
};

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

// --- Initial State Definitions ---

const initialMemberState = {
    first_name: '', middle_name: '', last_name: '', sex: '',
    date_of_birth: null as string | null, civil_status: '', citizenship: 'Filipino',
    occupation_status: '', contact_number: '', relationship_to_head: '',
    other_relationship: '', email: '', password: '', is_voter: false, voter_id_number: '',
    voter_registration_proof_base64: null as string | null, is_pwd: false, pwd_id: '',
    pwd_card_base64: null as string | null, is_senior_citizen: false, senior_citizen_id: '',
    senior_citizen_card_base64: null as string | null,
};

type Member = typeof initialMemberState;

const initialHeadState = {
    ...initialMemberState, relationship_to_head: '', other_relationship: '', password: '',
    confirmPassword: '', address_house_number: '', address_street: '', address_subdivision_zone: '',
    address_city_municipality: 'Manila City', years_at_current_address: '',
    proof_of_residency_base64: null as string | null,
};

type Head = typeof initialHeadState;

// Reusable component for toggled sections with validation
const ToggleSection = ({ label, value, onValueChange, idLabel, idValue, onIdChange, error, proofLabel, proofValue, onProofPress }: any) => (
    <View style={styles.toggleContainer}>
        <View style={styles.toggleSwitchRow}>
            <Text style={styles.label}>{label}</Text>
            <Switch trackColor={{ false: "#767577", true: "#4CAF50" }} thumbColor={"#f4f3f4"} onValueChange={onValueChange} value={value} />
        </View>
        {value && (
            <View style={styles.conditionalContainer}>
                <Text style={styles.label}>{idLabel}</Text>
                <TextInput style={[styles.textInput, !!error && styles.inputError]} value={idValue} onChangeText={onIdChange} placeholder={idLabel.replace('*','')} />
                <ErrorMessage error={error} />
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
    const [errors, setErrors] = useState<Partial<Record<keyof Head, string>>>({});
    
    const [members, setMembers] = useState<Member[]>([]);
    const [isMemberModalVisible, setMemberModalVisible] = useState(false);
    const [currentMember, setCurrentMember] = useState<Member>(initialMemberState);
    const [memberErrors, setMemberErrors] = useState<Partial<Record<keyof Member, string>>>({});
    const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);

    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState<'head' | 'member'>('head');
    const [isSaving, setIsSaving] = useState(false);
    const [showHeadPassword, setShowHeadPassword] = useState(false);
    const [showMemberPassword, setShowMemberPassword] = useState(false);

    const validateField = (fieldName: keyof Head | keyof Member, value: any, state: Head | Member, allMembers: Member[] = [], headEmail: string = '', editingIndex: number | null = null) => {
        let error = '';
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim());
        const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

        switch (fieldName) {
            // Common fields
            case 'first_name': case 'last_name': if (isRequired(value)) error = 'This field is required.'; break;
            case 'date_of_birth': if (isRequired(value)) error = 'Date of birth is required.'; break;
            case 'citizenship': if (isRequired(value)) error = 'Citizenship is required.'; break;
            case 'email':
                if (value && !isEmail(value)) {
                    error = 'Please enter a valid email address.';
                } else if (value) {
                    const allEmails = [headEmail.trim().toLowerCase()];
                    allMembers.forEach((mem, i) => {
                        if (editingIndex === null || i !== editingIndex) {
                            if (mem.email) allEmails.push(mem.email.trim().toLowerCase());
                        }
                    });
                }
                break;
            // Head-specific fields
            case 'contact_number': if (isRequired(value)) error = 'Contact number is required.'; else if (!/^\d{11}$/.test(value)) error = 'Must be a valid 11-digit number.'; break;
            case 'address_house_number': if (isRequired(value) || !/^\d+$/.test(value)) error = 'This address field must be a valid number.'; break;
            case 'address_street': case 'address_subdivision_zone': if (isRequired(value)) error = 'This address field is required.'; break;
            case 'years_at_current_address': if (isRequired(value)) error = 'Years at address is required.'; else if (!/^\d+$/.test(value)) error = 'Must be a valid number.'; break;
            case 'proof_of_residency_base64': if (isRequired(value)) error = 'Proof of residency is required.'; break;
            case 'password': if ('confirmPassword' in state && isRequired(value)) error = 'Password is required.'; else if (value && value.length < 6) error = 'Password must be at least 6 characters.'; break;
            case 'confirmPassword': if ('password' in state && value !== state.password) error = 'Passwords do not match.'; break;
            // Member-specific fields
            case 'relationship_to_head': if ((state as Member).relationship_to_head === 'Other' && isRequired((state as Member).other_relationship)) { /* validated at other_relationship */ } else if (isRequired(value)) error = 'Relationship is required.'; break;
            case 'other_relationship': if ((state as Member).relationship_to_head === 'Other' && isRequired(value)) error = 'Please specify the relationship.'; break;
            // Conditional fields
            case 'voter_id_number': if ((state as Head | Member).is_voter && isRequired(value)) error = "Voter ID is required."; break;
            case 'pwd_id': if ((state as Head | Member).is_pwd && isRequired(value)) error = "PWD ID is required."; break;
            case 'senior_citizen_id': if ((state as Head | Member).is_senior_citizen && isRequired(value)) error = "Senior Citizen ID is required."; break;
        }
        return error;
    };
    
    const handleInputChange = useCallback((name: keyof Head, value: any) => {
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            const error = validateField(name, value, newState, members, newState.email);
            setErrors(currentErrors => ({ ...currentErrors, [name]: error || undefined }));
            if (name === 'password') {
                const confirmError = validateField('confirmPassword', newState.confirmPassword, newState);
                setErrors(currentErrors => ({ ...currentErrors, confirmPassword: confirmError || undefined }));
            }
            if (name === 'date_of_birth') {
                setErrors(currentErrors => ({...currentErrors, is_voter: undefined, is_senior_citizen: undefined}));
            }
            return newState;
        });
    }, [members]);

    const handleMemberInputChange = useCallback((name: keyof Member, value: any) => {
        setCurrentMember(prev => {
            const newState = { ...prev, [name]: value };
            const error = validateField(name, value, newState, members, formData.email, editingMemberIndex);
            setMemberErrors(currentErrors => ({ ...currentErrors, [name]: error || undefined }));
            if (name === 'relationship_to_head') {
                const otherRelError = validateField('other_relationship', newState.other_relationship, newState);
                setMemberErrors(currentErrors => ({ ...currentErrors, other_relationship: otherRelError || undefined }));
            }
             if (name === 'date_of_birth') {
                setMemberErrors(currentErrors => ({...currentErrors, is_voter: undefined, is_senior_citizen: undefined}));
            }
            return newState;
        });
    }, [members, formData.email, editingMemberIndex]);
    
    const handleConfirmDate = (date: Date) => {
        const formattedDate = date.toISOString().split('T')[0];
        if (datePickerTarget === 'head') { handleInputChange('date_of_birth', formattedDate); } 
        else { handleMemberInputChange('date_of_birth', formattedDate); }
        hideDatePicker();
    };

    const pickImage = async (field: keyof Head | keyof Member, target: 'head' | 'member') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera roll permissions are required.'); return; }
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
        if (!result.canceled && result.assets?.[0]?.base64) {
            const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
            if (target === 'head') { handleInputChange(field as keyof Head, base64); } 
            else { handleMemberInputChange(field as keyof Member, base64); }
        }
    };
    
    const handleSaveMember = () => {
        const fieldsToValidate: (keyof Member)[] = ['first_name', 'last_name', 'date_of_birth', 'relationship_to_head', 'other_relationship'];
        let hasErrors = false;
        const newErrors: Partial<Record<keyof Member, string>> = {};

        const memberAge = calculateAge(currentMember.date_of_birth);
        if (memberAge !== null && memberAge >= 15 && (currentMember.email || currentMember.password)) {
            fieldsToValidate.push('email', 'password');
        }

        fieldsToValidate.forEach(field => {
            const error = validateField(field, currentMember[field], currentMember, members, formData.email, editingMemberIndex);
            if (error) {
                hasErrors = true;
                newErrors[field] = error;
            }
        });
        setMemberErrors(newErrors);

        if (hasErrors) { Alert.alert('Validation Error', 'Please fix the errors shown in the form.'); return; }
        
        if (editingMemberIndex !== null) {
            const updatedMembers = [...members];
            updatedMembers[editingMemberIndex] = currentMember;
            setMembers(updatedMembers);
        } else {
            setMembers([...members, currentMember]);
        }
        setMemberModalVisible(false);
    };
    
    const handleRegister = async () => {
        const fieldsToValidate: (keyof Head)[] = [
            'first_name', 'last_name', 'email', 'contact_number', 'date_of_birth', 
            'address_house_number', 'address_street', 'address_subdivision_zone', 
            'years_at_current_address', 'proof_of_residency_base64', 'password', 'confirmPassword'
        ];
        if (formData.is_voter) fieldsToValidate.push('voter_id_number');
        if (formData.is_pwd) fieldsToValidate.push('pwd_id');
        if (formData.is_senior_citizen) fieldsToValidate.push('senior_citizen_id');
        
        let hasErrors = false;
        const newErrors: Partial<Record<keyof Head, string>> = {};

        fieldsToValidate.forEach(field => {
            const error = validateField(field, formData[field], formData, members, formData.email);
            if (error) {
                hasErrors = true;
                newErrors[field] = error;
            }
        });
        setErrors(newErrors);

        const headAge = calculateAge(formData.date_of_birth);
        if (headAge === null || headAge < 15) {
            Alert.alert("Validation Error", "Household Head must be at least 15 years old to register."); return;
        }
        if (hasErrors) { Alert.alert("Validation Error", "Please correct the errors on the form before submitting."); return; }

        setIsSaving(true);
        try {
            const payload: any = { ...formData, household_members_to_create: members };
            delete payload.confirmPassword;
            const response = await apiRequest('POST', '/api/residents', payload);
            if (response && (response.message || response.resident)) {
                Alert.alert('Registration Successful', 'Your household has been registered and is pending for approval by the Baranggay Secretary.', [{ text: 'OK', onPress: () => router.replace('/login') }]);
            } else {
                Alert.alert('Registration Failed', response?.message || response?.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'An unexpected error occurred. Please try again.';
            Alert.alert('Registration Error', errorMessage);
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- Other handlers ---
    const showDatePicker = (target: 'head' | 'member') => { setDatePickerTarget(target); setDatePickerVisibility(true); };
    const hideDatePicker = () => setDatePickerVisibility(false);
    const openAddMemberModal = () => { setCurrentMember(initialMemberState); setEditingMemberIndex(null); setMemberErrors({}); setMemberModalVisible(true); };
    const openEditMemberModal = (index: number) => { setCurrentMember(members[index]); setEditingMemberIndex(index); setMemberErrors({}); setMemberModalVisible(true); };
    const handleRemoveMember = (indexToRemove: number) => { Alert.alert( "Remove Member", "Are you sure you want to remove this member?", [{ text: "Cancel", style: "cancel" }, { text: "Remove", onPress: () => setMembers(p => p.filter((_, i) => i !== indexToRemove)), style: "destructive" }] ); };
    const headAge = calculateAge(formData.date_of_birth);
    const memberAge = calculateAge(currentMember.date_of_birth);
    
    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Household Registration</Text>
                <View style={{width: 24}} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
                <View style={styles.formContainer}>
                    <Text style={styles.subHeader}>Step 1: Household Head Information</Text>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <Text style={styles.label}>First Name*</Text>
                    <TextInput style={[styles.textInput, !!errors.first_name && styles.inputError]} placeholder="First Name*" value={formData.first_name} onChangeText={(v) => handleInputChange('first_name', v)} /><ErrorMessage error={errors.first_name} />
                    <Text style={styles.label}>Middle Name*</Text>
                    <TextInput style={styles.textInput} placeholder="Middle Name" value={formData.middle_name} onChangeText={(v) => handleInputChange('middle_name', v)} />
                    <Text style={styles.label}>Last Name*</Text>
                    <TextInput style={[styles.textInput, !!errors.last_name && styles.inputError]} placeholder="Last Name*" value={formData.last_name} onChangeText={(v) => handleInputChange('last_name', v)} /><ErrorMessage error={errors.last_name} />
                    <Text style={styles.label}>Contact Number*</Text>
                    <TextInput style={[styles.textInput, !!errors.contact_number && styles.inputError]} placeholder="Contact Number*" keyboardType="phone-pad" value={formData.contact_number} onChangeText={(v) => handleInputChange('contact_number', v)} maxLength={11} /><ErrorMessage error={errors.contact_number} />
                    <Text style={styles.label}>Date of Birth*</Text>
                    <TouchableOpacity style={[styles.datePickerButton, !!errors.date_of_birth && styles.inputError]} onPress={() => showDatePicker('head')}><Text style={formData.date_of_birth ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>{formData.date_of_birth || 'Date of Birth*'}</Text></TouchableOpacity><ErrorMessage error={errors.date_of_birth} />
                    <Text style={styles.label}>Age</Text>
                    <TextInput style={[styles.textInput, styles.textInputDisabled]} placeholder="Age" value={headAge !== null ? String(headAge) : ''} editable={false} />
                    <Text style={styles.label}>Sex</Text>
                    <View style={styles.pickerWrapper}><Picker selectedValue={formData.sex} onValueChange={(v) => handleInputChange('sex', v)}><Picker.Item label="Select Sex*" value="" enabled={false} /><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View>
                    <Text style={styles.label}>Civil Status</Text>
                    <View style={styles.pickerWrapper}><Picker selectedValue={formData.civil_status} onValueChange={(v) => handleInputChange('civil_status', v)}><Picker.Item label="Select Civil Status*" value="" enabled={false} /><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View>
                    <Text style={styles.label}>Citizenship</Text>
                    <TextInput style={[styles.textInput, !!errors.citizenship && styles.inputError]} placeholder="Citizenship*" value={formData.citizenship} onChangeText={(v) => handleInputChange('citizenship', v)} /><ErrorMessage error={errors.citizenship} />
                    <Text style={styles.label}>Occupation Status</Text>
                    <View style={styles.pickerWrapper}><Picker selectedValue={formData.occupation_status} onValueChange={(v) => handleInputChange('occupation_status', v)}><Picker.Item label="Select Occupation Status*" value="" enabled={false} /><Picker.Item label="Student" value="Student" /><Picker.Item label="Labor force" value="Labor force" /><Picker.Item label="Unemployed" value="Unemployed" /><Picker.Item label="Out of School Youth" value="Out of School Youth" /><Picker.Item label="Retired" value="Retired" /></Picker></View>
                    
                    <Text style={styles.sectionTitle}>Address Information</Text>
                    <Text style={styles.label}>House No. / Building No.*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_house_number && styles.inputError]} placeholder="House No. / Building No.*" value={formData.address_house_number} onChangeText={(v) => handleInputChange('address_house_number', v)} /><ErrorMessage error={errors.address_house_number} />
                    <Text style={styles.label}>Street*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_street && styles.inputError]} placeholder="Street*" value={formData.address_street} onChangeText={(v) => handleInputChange('address_street', v)} /><ErrorMessage error={errors.address_street} />
                    <Text style={styles.label}>Subdivision / Zone / Sitio / Purok*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_subdivision_zone && styles.inputError]} placeholder="Subdivision / Zone / Sitio / Purok*" value={formData.address_subdivision_zone} onChangeText={(v) => handleInputChange('address_subdivision_zone', v)} /><ErrorMessage error={errors.address_subdivision_zone} />
                    <Text style={styles.label}>City/Municipality</Text>
                    <TextInput style={[styles.textInput, styles.textInputDisabled]} value={formData.address_city_municipality} editable={false} />
                    <Text style={styles.label}>Years at Current Address*</Text>
                    <TextInput style={[styles.textInput, !!errors.years_at_current_address && styles.inputError]} placeholder="Years at Current Address*" keyboardType="numeric" value={formData.years_at_current_address} onChangeText={(v) => handleInputChange('years_at_current_address', v)} /><ErrorMessage error={errors.years_at_current_address} />
                    <TouchableOpacity style={[styles.filePickerButton, !!errors.proof_of_residency_base64 && styles.inputErrorBorder]} onPress={() => pickImage('proof_of_residency_base64', 'head')}><Text style={styles.filePickerButtonText}>{formData.proof_of_residency_base64 ? 'Change Proof of Residency*' : 'Upload Proof of Residency*'}</Text></TouchableOpacity><ErrorMessage error={errors.proof_of_residency_base64} />
                    {formData.proof_of_residency_base64 && !errors.proof_of_residency_base64 && <Text style={styles.fileNameText}>Proof selected.</Text>}

                    <Text style={styles.sectionTitle}>Special Classifications</Text>
                    {(headAge === null || headAge >= 18) && <ToggleSection label="Are you a registered voter?" value={formData.is_voter} onValueChange={(v:boolean) => handleInputChange('is_voter', v)} idLabel="Voter ID Number*" idValue={formData.voter_id_number} onIdChange={(v:string) => handleInputChange('voter_id_number', v)} error={errors.voter_id_number} proofLabel="Upload Voter's Proof" proofValue={formData.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64', 'head')} />}
                    <ToggleSection label="Are you a PWD?" value={formData.is_pwd} onValueChange={(v:boolean) => handleInputChange('is_pwd', v)} idLabel="PWD ID Number*" idValue={formData.pwd_id} onIdChange={(v:string) => handleInputChange('pwd_id', v)} error={errors.pwd_id} proofLabel="Upload PWD Card*" proofValue={formData.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64', 'head')} />
                    {(headAge === null || headAge >= 60) && <ToggleSection label="Are you a Senior Citizen?" value={formData.is_senior_citizen} onValueChange={(v:boolean) => handleInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID*" idValue={formData.senior_citizen_id} onIdChange={(v:string) => handleInputChange('senior_citizen_id', v)} error={errors.senior_citizen_id} proofLabel="Upload Senior Citizen Card*" proofValue={formData.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64', 'head')} />}

                    <Text style={styles.sectionTitle}>Account Credentials</Text>
                    <Text style={styles.label}>Email*</Text>
                    <TextInput style={[styles.textInput, !!errors.email && styles.inputError]} placeholder="Email*" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} /><ErrorMessage error={errors.email} />
                    <Text style={styles.label}>Password*</Text>
                    <View style={[styles.passwordContainer, !!errors.password && styles.inputError]}><TextInput style={styles.passwordInput} placeholder="Password*" secureTextEntry={!showHeadPassword} value={formData.password} onChangeText={(v) => handleInputChange('password', v)} /><TouchableOpacity onPress={() => setShowHeadPassword(!showHeadPassword)} style={styles.eyeIcon}><Ionicons name={showHeadPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#666" /></TouchableOpacity></View><ErrorMessage error={errors.password} />
                    <Text style={styles.label}>Confirm Password*</Text>
                    <View style={[styles.passwordContainer, !!errors.confirmPassword && styles.inputError]}><TextInput style={styles.passwordInput} placeholder="Confirm Password*" secureTextEntry={!showHeadPassword} value={formData.confirmPassword} onChangeText={(v) => handleInputChange('confirmPassword', v)} /><TouchableOpacity onPress={() => setShowHeadPassword(!showHeadPassword)} style={styles.eyeIcon}><Ionicons name={showHeadPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#666" /></TouchableOpacity></View><ErrorMessage error={errors.confirmPassword} />
                    
                    <Text style={styles.subHeader}>Step 2: Household Members</Text>
                    {members.map((member, index) => (<View key={index} style={styles.memberCard}><View style={styles.memberHeader}><Text style={styles.memberTitle}>{`${member.first_name} ${member.last_name}`}</Text><View style={{flexDirection: 'row'}}><TouchableOpacity onPress={() => openEditMemberModal(index)} style={{marginRight: 15}}><Ionicons name="pencil-outline" size={22} color="#0F00D7" /></TouchableOpacity><TouchableOpacity onPress={() => handleRemoveMember(index)}><Ionicons name="trash-bin-outline" size={22} color="#D32F2F" /></TouchableOpacity></View></View><Text style={styles.memberDetailText}>Relationship: {member.relationship_to_head === 'Other' ? member.other_relationship : member.relationship_to_head}</Text><Text style={styles.memberDetailText}>Age: {calculateAge(member.date_of_birth)}</Text></View>))}
                    <TouchableOpacity style={styles.addMemberButton} onPress={openAddMemberModal}><Ionicons name="add-circle-outline" size={22} color="#0F00D7" style={{marginRight: 8}} /><Text style={styles.addMemberButtonText}>Add Household Member</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.signUpButton} onPress={handleRegister} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signUpButtonText}>Register Household</Text>}</TouchableOpacity>
                    <TouchableOpacity onPress={() => router.navigate('/login')}><Text style={styles.loginText}>Already have an account? Login</Text></TouchableOpacity>
                </View>
                <DateTimePickerModal isVisible={isDatePickerVisible} mode="date" onConfirm={handleConfirmDate} onCancel={hideDatePicker} minimumDate={new Date(1600, 1, 1)} maximumDate={new Date()} />
            </ScrollView>

            <Modal animationType="slide" transparent={true} visible={isMemberModalVisible} onRequestClose={() => setMemberModalVisible(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingMemberIndex !== null ? 'Edit' : 'Add'} Household Member</Text>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={styles.label}>First Name*</Text>
                            <TextInput style={[styles.modalInput, !!memberErrors.first_name && styles.inputError]} placeholder="First Name*" value={currentMember.first_name} onChangeText={(v) => handleMemberInputChange('first_name', v)} /><ErrorMessage error={memberErrors.first_name} />
                            <Text style={styles.label}>Middle Name*</Text>
                            <TextInput style={styles.modalInput} placeholder="Middle Name" value={currentMember.middle_name} onChangeText={(v) => handleMemberInputChange('middle_name', v)} />
                            <Text style={styles.label}>Last Name*</Text>
                            <TextInput style={[styles.modalInput, !!memberErrors.last_name && styles.inputError]} placeholder="Last Name*" value={currentMember.last_name} onChangeText={(v) => handleMemberInputChange('last_name', v)} /><ErrorMessage error={memberErrors.last_name} />
                            <Text style={styles.label}>Date of Birth*</Text>
                            <TouchableOpacity style={[styles.datePickerButtonModal, !!memberErrors.date_of_birth && styles.inputError]} onPress={() => showDatePicker('member')}><Text style={currentMember.date_of_birth ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>{currentMember.date_of_birth || 'Date of Birth*'}</Text></TouchableOpacity><ErrorMessage error={memberErrors.date_of_birth} />
                            <Text style={styles.label}>Relationship to Head</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.relationship_to_head && styles.inputError]}><Picker selectedValue={currentMember.relationship_to_head} onValueChange={(v) => handleMemberInputChange('relationship_to_head', v)}><Picker.Item label="Select Relationship*" value="" enabled={false} /><Picker.Item label="Child" value="Child" /><Picker.Item label="Spouse" value="Spouse" /><Picker.Item label="Parent" value="Parent" /><Picker.Item label="Sibling" value="Sibling" /><Picker.Item label="Other Relative" value="Other Relative" /><Picker.Item label="House Helper" value="House Helper" /><Picker.Item label="Other" value="Other" /></Picker></View><ErrorMessage error={memberErrors.relationship_to_head} />
                            {currentMember.relationship_to_head === 'Other' && (<><TextInput style={[styles.modalInput, !!memberErrors.other_relationship && styles.inputError]} placeholder="Please specify relationship*" value={currentMember.other_relationship} onChangeText={(v) => handleMemberInputChange('other_relationship', v)} /><ErrorMessage error={memberErrors.other_relationship} /></>)}
                            <Text style={styles.label}>Sex</Text>
                            <View style={styles.pickerWrapperSmall}><Picker selectedValue={currentMember.sex} onValueChange={(v) => handleMemberInputChange('sex', v)}><Picker.Item label="Select Sex*" value="" enabled={false} /><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View>
                            <Text style={styles.label}>Civil Status</Text>
                            <View style={styles.pickerWrapperSmall}><Picker selectedValue={currentMember.civil_status} onValueChange={(v) => handleMemberInputChange('civil_status', v)}><Picker.Item label="Select Civil Status*" value="" enabled={false} /><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View>
                            <Text style={styles.label}>Citizenship</Text>
                            <TextInput style={[styles.modalInput, !!memberErrors.citizenship && styles.inputError]} placeholder="Citizenship*" value={currentMember.citizenship} onChangeText={(v) => handleMemberInputChange('citizenship', v)} /><ErrorMessage error={memberErrors.citizenship} />
                            <Text style={styles.label}>Occupation Status</Text>
                            <View style={styles.pickerWrapperSmall}><Picker selectedValue={currentMember.occupation_status} onValueChange={(v) => handleMemberInputChange('occupation_status', v)}><Picker.Item label="Select Occupation Status*" value="" enabled={false} /><Picker.Item label="Student" value="Student" /><Picker.Item label="Labor force" value="Labor force" /><Picker.Item label="Unemployed" value="Unemployed" /><Picker.Item label="Out of School Youth" value="Out of School Youth" /><Picker.Item label="Retired" value="Retired" /></Picker></View>
                            <Text style={styles.modalSectionTitle}>Special Classifications</Text>
                            {(memberAge === null || memberAge >= 18) && <ToggleSection label="Is member a registered voter?" value={currentMember.is_voter} onValueChange={(v:boolean) => handleMemberInputChange('is_voter', v)} idLabel="Voter ID Number" idValue={currentMember.voter_id_number} onIdChange={(v:string) => handleMemberInputChange('voter_id_number', v)} error={memberErrors.voter_id_number} proofLabel="Upload Voter's Proof" proofValue={currentMember.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64', 'member')} />}
                            <ToggleSection label="Is member a PWD?" value={currentMember.is_pwd} onValueChange={(v:boolean) => handleMemberInputChange('is_pwd', v)} idLabel="PWD ID Number*" idValue={currentMember.pwd_id} onIdChange={(v:string) => handleMemberInputChange('pwd_id', v)} error={memberErrors.pwd_id} proofLabel="Upload PWD Card*" proofValue={currentMember.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64', 'member')} />
                            {(memberAge === null || memberAge >= 60) && <ToggleSection label="Is member a Senior Citizen?" value={currentMember.is_senior_citizen} onValueChange={(v:boolean) => handleMemberInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID*" idValue={currentMember.senior_citizen_id} onIdChange={(v:string) => handleMemberInputChange('senior_citizen_id', v)} error={memberErrors.senior_citizen_id} proofLabel="Upload Senior Citizen Card*" proofValue={currentMember.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64', 'member')} />}
                            {memberAge !== null && memberAge >= 15 && (<View><Text style={styles.modalSectionTitle}>Create Account (Optional)</Text><Text style={styles.accountInfoText}>Member is {memberAge} years old. They can create their own account.</Text><TextInput style={[styles.modalInput, !!memberErrors.email && styles.inputError]} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={currentMember.email} onChangeText={(v) => handleMemberInputChange('email', v)} /><ErrorMessage error={memberErrors.email} /><View style={[styles.passwordContainerModal, !!memberErrors.password && styles.inputError]}><TextInput style={styles.passwordInputModal} placeholder="Password" secureTextEntry={!showMemberPassword} value={currentMember.password} onChangeText={(v) => handleMemberInputChange('password', v)} /><TouchableOpacity onPress={() => setShowMemberPassword(!showMemberPassword)} style={styles.eyeIcon}><Ionicons name={showMemberPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" /></TouchableOpacity></View><ErrorMessage error={memberErrors.password} /></View>)}
                            <View style={styles.modalActions}><TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleSaveMember}><Text style={styles.modalButtonText}>Save Member</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.modalButtonClose]} onPress={() => setMemberModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity></View>
                        </ScrollView>
                    </View>
                </View>
                </KeyboardAvoidingView>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: { paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F00D7' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    scrollView: { backgroundColor: '#F4F6F8', flex: 1 },
    formContainer: { paddingHorizontal: 20, paddingTop: 10 },
    subHeader: { fontSize: 22, fontWeight: '600', color: '#333', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 5 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F00D7', marginTop: 20, marginBottom: 15 },
    textInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, fontSize: 16, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, marginBottom: 15, color: '#212121', backgroundColor: 'white' },
    textInputDisabled: { backgroundColor: '#EEEEEE', color: '#757575' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white', marginBottom: 15 },
    passwordInput: { flex: 1, fontSize: 16, color: '#212121', paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
    eyeIcon: { paddingHorizontal: 12, paddingVertical: 10 },
    pickerWrapper: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white', marginBottom: 15 },
    datePickerButton: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 14, height: 50, marginBottom: 15 },
    datePickerButtonText: { fontSize: 16, color: '#212121' },
    datePickerPlaceholderText: { fontSize: 16, color: '#A9A9A9' },
    filePickerButton: { backgroundColor: '#E8E8FF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 4 }, // Smaller margin before file name text
    filePickerButtonText: { color: '#0F00D7', fontSize: 15, fontWeight: 'bold' },
    fileNameText: { fontSize: 13, color: 'green', marginTop: 4, fontStyle: 'italic', textAlign: 'center', marginBottom: 15 },
    loginText: { textAlign: 'center', marginTop: 20, color: '#0F00D7', fontSize: 16 },
    toggleContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
    toggleSwitchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 16, color: '#333', fontWeight: '500' },
    conditionalContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
    addMemberButton: { flexDirection: 'row', backgroundColor: 'white', borderWidth: 1, borderColor: '#0F00D7', borderStyle: 'dashed', paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    addMemberButtonText: { color: '#0F00D7', fontSize: 16, fontWeight: 'bold' },
    memberCard: { backgroundColor: 'white', borderRadius: 8, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
    memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    memberTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
    memberDetailText: { fontSize: 14, color: '#555', marginBottom: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
    modalContent: { width: '100%', maxHeight: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#0F00D7' },
    modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
    modalInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 15, fontSize: 15, backgroundColor: '#F9F9F9' },
    passwordContainerModal: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: '#F9F9F9', marginBottom: 15 },
    passwordInputModal: { flex: 1, fontSize: 15, color: '#212121', paddingVertical: 10, paddingHorizontal: 12 },
    pickerWrapperSmall: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, marginBottom: 15, backgroundColor: '#F9F9F9' },
    datePickerButtonModal: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 14, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48, marginBottom: 15 },
    accountInfoText: { fontSize: 14, color: '#666', marginBottom: 10, fontStyle: 'italic', textAlign: 'center' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 25, borderTopWidth: 1, paddingTop: 15, borderColor: '#EEEEEE' },
    modalButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', flex: 1, marginHorizontal: 5 },
    modalButtonSave: { backgroundColor: '#0F00D7' },
    modalButtonClose: { backgroundColor: '#757575' },
    modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    signUpButton: { backgroundColor: '#0F00D7', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 30, marginBottom: 15, elevation: 3 },
    signUpButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    // Validation Styles
    inputError: {
        borderColor: '#D32F2F',
    },
    inputErrorBorder: {
        borderWidth: 1,
        borderColor: '#D32F2F',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        marginTop: -10, // Pulls the error message up closer to the input field
        marginBottom: 10, // Ensures space before the next element
    },
    label: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
        paddingBottom: 5, // Added this line
    },
});