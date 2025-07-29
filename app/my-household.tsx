// app/my-household.tsx
import apiRequest from '@/plugins/axios';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
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
    first_name: '',
    middle_name: '',
    last_name: '',
    sex: '',
    date_of_birth: null as string | null,
    civil_status: '',
    citizenship: 'Filipino',
    occupation_status: '',
    contact_number: '',
    relationship_to_head: '',
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

// Define which relationships require proof
const BLOOD_RELATIONSHIPS = ['Child', 'Spouse', 'Parent', 'Sibling', 'Grandparent', 'Grandchild', 'Other Relative'];


// Reusable component for toggled sections
const ToggleSection = ({ label, value, onValueChange, idLabel, idValue, onIdChange, error, proofLabel, proofValue, onProofPress }: any) => (
    <View style={styles.toggleContainer}>
        <View style={styles.toggleSwitchRow}>
            <Text style={styles.label}>{label}</Text>
            <Switch trackColor={{ false: "#767577", true: "#4CAF50" }} thumbColor={"#f4f3f4"} onValueChange={onValueChange} value={value} />
        </View>
        {value && (
            <View style={styles.conditionalContainer}>
                <Text style={styles.label}>{idLabel}</Text>
                <TextInput style={[styles.modalInput, !!error && styles.inputError]} value={idValue} onChangeText={onIdChange} placeholder={idLabel.replace('*', '')} />
                <ErrorMessage error={error} />
                <TouchableOpacity style={styles.filePickerButton} onPress={onProofPress}>
                    <Text style={styles.filePickerButtonText}>{proofValue ? 'Change Proof' : proofLabel}</Text>
                </TouchableOpacity>
                {proofValue && <Image source={{ uri: proofValue }} style={styles.previewImageSmall} />}
            </View>
        )}
    </View>
);


const MyHouseholdScreen = () => {
    const router = useRouter();
    const [loggedInUserId, setLoggedInUserId] = useState(null);
    const [householdData, setHouseholdData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // --- Modal and Member States ---
    const [isModalVisible, setModalVisible] = useState(false);
    const [currentMember, setCurrentMember] = useState<Member>(initialMemberState);
    const [memberErrors, setMemberErrors] = useState<Partial<Record<keyof Member | 'proof_type' | 'proof_image', string>>>({});
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showMemberPassword, setShowMemberPassword] = useState(false);

    // --- State for photo and proof uploads ---
    const [proofType, setProofType] = useState<string>('');
    const [proofImageBase64, setProofImageBase64] = useState<string | null>(null);


    const resetForm = () => {
        setCurrentMember(initialMemberState);
        setMemberErrors({});
        setProofType('');
        setProofImageBase64(null);
        setIsSaving(false);
    };

    const validateMemberField = (fieldName: keyof Member, value: any, state: Member) => {
        let error = '';
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim());
        const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const hasNumber = (val: string) => /\d/.test(val);

        switch (fieldName) {
            case 'first_name':
            case 'last_name':
                if (isRequired(value)) error = 'This field is required.';
                else if (hasNumber(value)) error = 'This field cannot contain numbers.';
                break;
            case 'middle_name':
                 if (value && hasNumber(value)) error = 'This field cannot contain numbers.';
                 break;
            case 'sex': case 'civil_status': case 'occupation_status':
                 if (isRequired(value)) error = 'This field is required.'; break;
            case 'date_of_birth': if (isRequired(value)) error = 'Date of birth is required.'; break;
            case 'citizenship':
                if (isRequired(value)) error = 'Citizenship is required.';
                else if (hasNumber(value)) error = 'This field cannot contain numbers.';
                break;
            case 'email':
                if (value && !isEmail(value)) error = 'Please enter a valid email address.';
                break;
            case 'password':
                if (state.email && isRequired(value)) error = 'Password is required for account creation.';
                else if (value && value.length < 6) error = 'Password must be at least 6 characters.';
                break;
            case 'relationship_to_head': if (value === 'Other' && isRequired(state.other_relationship)) {} else if (isRequired(value)) error = 'Relationship is required.'; break;
            case 'other_relationship':
                if (state.relationship_to_head === 'Other' && isRequired(value)) error = 'Please specify the relationship.';
                else if (value && hasNumber(value)) error = 'This field cannot contain numbers.';
                break;
            case 'voter_id_number': if (state.is_voter && isRequired(value)) error = "Voter ID is required."; break;
            case 'pwd_id': if (state.is_pwd && isRequired(value)) error = "PWD ID is required."; break;
            case 'senior_citizen_id': if (state.is_senior_citizen && isRequired(value)) error = "Senior Citizen ID is required."; break;
        }
        return error;
    };

    const handleMemberInputChange = useCallback((name: keyof Member, value: any) => {
        setCurrentMember(prev => {
            let newState = { ...prev, [name]: value };

            if (name === 'date_of_birth') {
                const newAge = calculateAge(value as string | null);
                if (newAge !== null && newAge < 18) {
                    newState.is_voter = false;
                    newState.voter_id_number = '';
                    newState.voter_registration_proof_base64 = null;
                }
                if (newAge !== null && newAge < 60) {
                    newState.is_senior_citizen = false;
                    newState.senior_citizen_id = '';
                    newState.senior_citizen_card_base64 = null;
                }
                setMemberErrors(currentErrors => ({
                    ...currentErrors, is_voter: undefined, voter_id_number: undefined,
                    is_senior_citizen: undefined, senior_citizen_id: undefined,
                }));
            }

            const error = validateMemberField(name, value, newState);
            setMemberErrors(currentErrors => ({ ...currentErrors, [name]: error || undefined }));
            
            if (name === 'relationship_to_head') {
                const otherRelError = validateMemberField('other_relationship', newState.other_relationship, newState);
                setMemberErrors(currentErrors => ({ ...currentErrors, other_relationship: otherRelError || undefined }));
            }

            return newState;
        });
    }, []);

    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);

    const handleConfirmDate = (date: Date) => {
        const formattedDate = date.toISOString().split('T')[0];
        handleMemberInputChange('date_of_birth', formattedDate);
        hideDatePicker();
    };

    const pickImage = async (setter: (base64: string | null) => void, fieldName: string) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera roll permissions are required.'); return; }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false, // Set to false to disable cropping
            quality: 0.5, 
            base64: true,
        });
        if (!result.canceled && result.assets?.[0]?.base64) {
            const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setter(base64);
            setMemberErrors(prev => ({...prev, [fieldName]: undefined}));
        }
    };


    const handleSaveMember = async () => {
        if (!householdData?.resident?._id) {
            Alert.alert("Error", "Could not identify the household head.");
            return;
        }

        const fieldsToValidate: (keyof Member)[] = [
            'first_name', 'last_name', 'sex', 'civil_status', 'occupation_status',
            'date_of_birth', 'relationship_to_head', 'citizenship'
        ];
        
        if (currentMember.relationship_to_head === 'Other') {
            fieldsToValidate.push('other_relationship');
        }

        const memberAge = calculateAge(currentMember.date_of_birth);
        if (memberAge !== null && memberAge >= 15 && (currentMember.email || currentMember.password)) {
            fieldsToValidate.push('email', 'password');
        }

        if (currentMember.is_voter) {
            fieldsToValidate.push('voter_id_number');
        }
        if (currentMember.is_pwd) {
            fieldsToValidate.push('pwd_id');
        }
        if (currentMember.is_senior_citizen) {
            fieldsToValidate.push('senior_citizen_id');
        }
        
        const newErrors: Partial<Record<string, string>> = {};

        fieldsToValidate.forEach(field => {
            const error = validateMemberField(field, currentMember[field], currentMember);
            if (error) {
                newErrors[field] = error;
            }
        });

        if (BLOOD_RELATIONSHIPS.includes(currentMember.relationship_to_head)) {
            if (!proofType) {
                newErrors.proof_type = 'Please select a proof type.';
            }
            if (!proofImageBase64) {
                newErrors.proof_image = 'An image of the proof is required.';
            }
        }

        setMemberErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            Alert.alert('Validation Error', 'Please fix the errors shown in the form.');
            return;
        }
        
        setIsSaving(true);
        try {
            const payload = {
                ...currentMember,
                // photo_base64 is removed
                proof_of_relationship_type: BLOOD_RELATIONSHIPS.includes(currentMember.relationship_to_head) ? proofType : null,
                proof_of_relationship_base64: BLOOD_RELATIONSHIPS.includes(currentMember.relationship_to_head) ? proofImageBase64 : null,
            };

            const response = await apiRequest('POST', `/api/residents/${householdData.resident._id}/members`, payload);

            if (response && response.message) {
                 Alert.alert('Success', 'Household member added successfully. Their account is pending approval.');
                 setModalVisible(false);
                 resetForm();
                 fetchHouseholdData(loggedInUserId);
            } else {
                 Alert.alert('Failed to Add', response?.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
            console.error("Error adding household member:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'An unexpected error occurred.';
            Alert.alert('Error', errorMessage);
        } finally {
            setIsSaving(false);
        }
    };


    const fetchHouseholdData = useCallback(async (userId) => {
        if (!userId) {
            setError("User ID not available. Please log in again.");
            setIsLoading(false); setRefreshing(false);
            return;
        }
        setIsLoading(true); setError(null);
        try {
            const response = await apiRequest('GET', `/api/residents/${userId}/household-details`);
            if (response) {
                setHouseholdData(response);
            } else {
                setError("Failed to fetch household data or data is incomplete.");
                setHouseholdData(null);
            }
        } catch (err) {
            console.error("Error fetching household data:", err);
            setError(err.response?.data?.message || err.message || "An error occurred.");
            setHouseholdData(null);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);


    useEffect(() => {
        const loadUserAndFetchHousehold = async () => {
            setIsLoading(true);
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsed = JSON.parse(storedUserDataString);
                    if (parsed?._id) {
                        setLoggedInUserId(parsed._id);
                        await fetchHouseholdData(parsed._id);
                    } else {
                        setError("User ID not found. Please log in again.");
                        setIsLoading(false);
                        Alert.alert("Error", "User ID not found.", [{ text: "OK", onPress: () => router.replace('/') }]);
                    }
                } else {
                    setError("Not logged in.");
                    setIsLoading(false);
                    Alert.alert("Authentication Error", "Please log in to view your household.", [{ text: "OK", onPress: () => router.replace('/') }]);
                }
            } catch (e) {
                console.error("Error loading user data from storage:", e);
                setError("Failed to load user information.");
                setIsLoading(false);
            }
        };
        loadUserAndFetchHousehold();
    }, [fetchHouseholdData]);

    useFocusEffect(
        useCallback(() => {
            if (loggedInUserId) {
                fetchHouseholdData(loggedInUserId);
            }
        }, [loggedInUserId, fetchHouseholdData])
    );

    const onRefresh = useCallback(() => {
        if (loggedInUserId) {
            setRefreshing(true);
            fetchHouseholdData(loggedInUserId);
        } else {
            setRefreshing(false);
        }
    }, [loggedInUserId, fetchHouseholdData]);


    const renderMemberItem = (member, isCurrentUser = false) => (
        <View key={member._id} style={[styles.memberItem, isCurrentUser && styles.currentUserMemberItem]}>
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={isCurrentUser ? "#0F00D7" : "#555"} style={styles.memberIcon} />
            <View style={styles.memberTextContainer}>
                <Text style={[styles.memberName, isCurrentUser && styles.currentUserName]}>
                    {`${member.first_name || ''} ${member.middle_name || ''} ${member.last_name || ''}`.trim()}
                    {isCurrentUser && " (You)"}
                </Text>
                <Text style={styles.memberDetail}>{member.relationship_to_head === 'Other' ? member.other_relationship : member.relationship_to_head || 'N/A'}</Text>
            </View>
        </View>
    );

    const memberAge = calculateAge(currentMember.date_of_birth);

    // --- Loading and Error States ---
    if (isLoading && !refreshing) {
        return <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading household information...</Text></View>;
    }
    if (error) {
        return <View style={styles.loaderContainer}><MaterialCommunityIcons name="alert-circle-outline" size={50} color="red" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => loggedInUserId ? fetchHouseholdData(loggedInUserId) : router.replace('/')} style={styles.retryButton}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity></View>;
    }
    if (!householdData || !householdData.resident) {
        return <View style={styles.loaderContainer}><Text>No household data available.</Text></View>;
    }

    const { resident, isHouseholdHead, householdMembers } = householdData;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>My Household</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />}
            >
                <View style={styles.profileCard}>
                    <MaterialCommunityIcons name="account-details-outline" size={30} color="#0F00D7" />
                    <Text style={styles.profileName}>{`${resident.first_name || ''} ${resident.middle_name || ''} ${resident.last_name || ''}`.trim()}</Text>
                    <Text style={styles.profileEmail}>{resident.email || 'No Email'}</Text>
                </View>

                {isHouseholdHead && (
                    <View style={styles.householdSection}>
                        <Text style={styles.sectionTitle}>You are the Household Head</Text>
                        <Text style={styles.sectionSubtitle}>Members in your household:</Text>
                        {householdMembers && householdMembers.length > 0 ? (
                            householdMembers.map(member => renderMemberItem(member, member._id === loggedInUserId))
                        ) : (
                            <Text style={styles.noMembersText}>No members listed in your household yet.</Text>
                        )}
                        <TouchableOpacity style={styles.manageButton} onPress={() => { setModalVisible(true); resetForm(); }}>
                            <MaterialCommunityIcons name="account-plus-outline" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.manageButtonText}>Add Household Member</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Other conditional UI for non-household heads */}
                
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => { setModalVisible(false); resetForm(); }}
            >
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add Household Member</Text>
                            <ScrollView keyboardShouldPersistTaps="handled">

                                <Text style={styles.modalSectionTitle}>Personal Information</Text>
                                <Text style={styles.label}>First Name*</Text>
                                <TextInput style={[styles.modalInput, !!memberErrors.first_name && styles.inputError]} placeholder="First Name*" value={currentMember.first_name} onChangeText={(v) => handleMemberInputChange('first_name', v)} /><ErrorMessage error={memberErrors.first_name} />
                                <Text style={styles.label}>Middle Name</Text>
                                <TextInput style={[styles.modalInput, !!memberErrors.middle_name && styles.inputError]} placeholder="Middle Name" value={currentMember.middle_name} onChangeText={(v) => handleMemberInputChange('middle_name', v)} /><ErrorMessage error={memberErrors.middle_name} />
                                <Text style={styles.label}>Last Name*</Text>
                                <TextInput style={[styles.modalInput, !!memberErrors.last_name && styles.inputError]} placeholder="Last Name*" value={currentMember.last_name} onChangeText={(v) => handleMemberInputChange('last_name', v)} /><ErrorMessage error={memberErrors.last_name} />
                                <Text style={styles.label}>Date of Birth*</Text>
                                <TouchableOpacity style={[styles.datePickerButtonModal, !!memberErrors.date_of_birth && styles.inputError]} onPress={showDatePicker}><Text style={currentMember.date_of_birth ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>{currentMember.date_of_birth || 'Date of Birth*'}</Text></TouchableOpacity><ErrorMessage error={memberErrors.date_of_birth} />
                                <Text style={styles.label}>Relationship to Head*</Text>
                                <View style={[styles.pickerWrapperSmall, !!memberErrors.relationship_to_head && styles.inputError]}><Picker selectedValue={currentMember.relationship_to_head} onValueChange={(v) => handleMemberInputChange('relationship_to_head', v)} style={!currentMember.relationship_to_head ? styles.pickerPlaceholder : {}}><Picker.Item label="Select Relationship*" value="" enabled={false} /><Picker.Item label="Child" value="Child" /><Picker.Item label="Spouse" value="Spouse" /><Picker.Item label="Parent" value="Parent" /><Picker.Item label="Sibling" value="Sibling" /><Picker.Item label="Other Relative" value="Other Relative" /><Picker.Item label="House Helper" value="House Helper" /><Picker.Item label="Other" value="Other" /></Picker></View><ErrorMessage error={memberErrors.relationship_to_head} />
                                {currentMember.relationship_to_head === 'Other' && (<><Text style={styles.label}>Specify Relationship*</Text><TextInput style={[styles.modalInput, !!memberErrors.other_relationship && styles.inputError]} placeholder="Please specify relationship*" value={currentMember.other_relationship} onChangeText={(v) => handleMemberInputChange('other_relationship', v)} /><ErrorMessage error={memberErrors.other_relationship} /></>)}
                                <Text style={styles.label}>Sex*</Text>
                                <View style={[styles.pickerWrapperSmall, !!memberErrors.sex && styles.inputError]}><Picker selectedValue={currentMember.sex} onValueChange={(v) => handleMemberInputChange('sex', v)} style={!currentMember.sex ? styles.pickerPlaceholder : {}}><Picker.Item label="Select Sex*" value="" enabled={false} /><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View><ErrorMessage error={memberErrors.sex} />
                                <Text style={styles.label}>Civil Status*</Text>
                                <View style={[styles.pickerWrapperSmall, !!memberErrors.civil_status && styles.inputError]}><Picker selectedValue={currentMember.civil_status} onValueChange={(v) => handleMemberInputChange('civil_status', v)} style={!currentMember.civil_status ? styles.pickerPlaceholder : {}}><Picker.Item label="Select Civil Status*" value="" enabled={false} /><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View><ErrorMessage error={memberErrors.civil_status} />
                                <Text style={styles.label}>Citizenship*</Text>
                                <TextInput style={[styles.modalInput, !!memberErrors.citizenship && styles.inputError]} placeholder="Citizenship*" value={currentMember.citizenship} onChangeText={(v) => handleMemberInputChange('citizenship', v)} /><ErrorMessage error={memberErrors.citizenship} />
                                <Text style={styles.label}>Occupation Status*</Text>
                                <View style={[styles.pickerWrapperSmall, !!memberErrors.occupation_status && styles.inputError]}><Picker selectedValue={currentMember.occupation_status} onValueChange={(v) => handleMemberInputChange('occupation_status', v)} style={!currentMember.occupation_status ? styles.pickerPlaceholder : {}}><Picker.Item label="Select Occupation Status*" value="" enabled={false} /><Picker.Item label="Student" value="Student" /><Picker.Item label="Labor force" value="Labor force" /><Picker.Item label="Unemployed" value="Unemployed" /><Picker.Item label="Out of School Youth" value="Out of School Youth" /><Picker.Item label="Retired" value="Retired" /></Picker></View><ErrorMessage error={memberErrors.occupation_status} />
                                
                                {BLOOD_RELATIONSHIPS.includes(currentMember.relationship_to_head) && (
                                    <View style={styles.proofSection}>
                                        <Text style={styles.modalSectionTitle}>Proof of Relationship</Text>
                                        <Text style={styles.label}>Proof Type*</Text>
                                        <View style={[styles.pickerWrapperSmall, !!memberErrors.proof_type && styles.inputError]}><Picker selectedValue={proofType} onValueChange={(itemValue) => {setProofType(itemValue); setMemberErrors(p => ({...p, proof_type: undefined}))}}><Picker.Item label="Select Proof Document*" value="" /><Picker.Item label="Birth Certificate" value="Birth Certificate" /><Picker.Item label="Marriage Certificate" value="Marriage Certificate" /><Picker.Item label="Valid ID Card" value="Valid ID Card" /></Picker></View>
                                        <ErrorMessage error={memberErrors.proof_type} />
                                        <Text style={styles.label}>Proof Image*</Text>
                                        <TouchableOpacity style={[styles.filePickerButton, !!memberErrors.proof_image && styles.inputErrorBorder]} onPress={() => pickImage(setProofImageBase64, 'proof_image')}>
                                            <Text style={styles.filePickerButtonText}>{proofImageBase64 ? 'Change Proof Image' : 'Upload Proof Image'}</Text>
                                        </TouchableOpacity>
                                        {proofImageBase64 && <Image source={{ uri: proofImageBase64 }} style={styles.previewImage} />}
                                        <ErrorMessage error={memberErrors.proof_image} />
                                    </View>
                                )}

                                <Text style={styles.modalSectionTitle}>Special Classifications (Optional)</Text>
                                
                                {(memberAge === null || memberAge >= 18) && <ToggleSection label="Is member a registered voter?" value={currentMember.is_voter} onValueChange={(v:boolean) => handleMemberInputChange('is_voter', v)} idLabel="Voter ID Number*" idValue={currentMember.voter_id_number} onIdChange={(v:string) => handleMemberInputChange('voter_id_number', v)} error={memberErrors.voter_id_number} proofLabel="Upload Voter's Proof" proofValue={currentMember.voter_registration_proof_base64} onProofPress={() => pickImage(base64 => setCurrentMember(prev => ({ ...prev, voter_registration_proof_base64: base64 })), 'voter_registration_proof_base64')} />}
                                <ToggleSection label="Is member a PWD?" value={currentMember.is_pwd} onValueChange={(v:boolean) => handleMemberInputChange('is_pwd', v)} idLabel="PWD ID Number*" idValue={currentMember.pwd_id} onIdChange={(v:string) => handleMemberInputChange('pwd_id', v)} error={memberErrors.pwd_id} proofLabel="Upload PWD Card*" proofValue={currentMember.pwd_card_base64} onProofPress={() => pickImage(base64 => setCurrentMember(prev => ({ ...prev, pwd_card_base64: base64 })), 'pwd_card_base64')} />}
                                {(memberAge === null || memberAge >= 60) && <ToggleSection label="Is member a Senior Citizen?" value={currentMember.is_senior_citizen} onValueChange={(v:boolean) => handleMemberInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID*" idValue={currentMember.senior_citizen_id} onIdChange={(v:string) => handleMemberInputChange('senior_citizen_id', v)} error={memberErrors.senior_citizen_id} proofLabel="Upload Senior Citizen Card*" proofValue={currentMember.senior_citizen_card_base64} onProofPress={() => pickImage(base64 => setCurrentMember(prev => ({ ...prev, senior_citizen_card_base64: base64 })), 'senior_citizen_card_base64')} />}

                                <View style={styles.modalActions}>
                                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleSaveMember} disabled={isSaving}>
                                    {isSaving ? <ActivityIndicator color="#FFF"/> : <Text style={styles.modalButtonText}>Save Member</Text>}
                                  </TouchableOpacity>
                                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonClose]} onPress={() => { setModalVisible(false); resetForm(); }}>
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                  </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmDate}
                onCancel={hideDatePicker}
                minimumDate={new Date(1900, 0, 1)}
                maximumDate={new Date()}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F7FC' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 40 : 45, backgroundColor: '#0F00D7' },
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    scrollView: { flex: 1 },
    scrollViewContent: { padding: 15, paddingBottom: 30 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    errorText: { color: '#D32F2F', fontSize: 12, marginTop: -10, marginBottom: 10 },
    retryButton: { backgroundColor: '#0F00D7', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5, marginTop: 15 },
    retryButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    profileCard: { backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
    profileName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 10 },
    profileEmail: { fontSize: 16, color: '#666', marginTop: 4 },
    householdSection: { backgroundColor: 'white', borderRadius: 10, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0F00D7', marginBottom: 5 },
    sectionTitleCentered: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10, textAlign: 'center' },
    sectionSubtitle: { fontSize: 16, fontWeight: '500', color: '#444', marginTop: 15, marginBottom: 10 },
    headInfoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', padding: 10, borderRadius: 8, marginBottom: 15 },
    memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    currentUserMemberItem: { backgroundColor: '#E3F2FD', borderRadius: 6, paddingHorizontal: 8 },
    memberIcon: { marginRight: 12 },
    memberTextContainer: { flex: 1 },
    memberName: { fontSize: 16, color: '#333', fontWeight: '500' },
    currentUserName: { fontWeight: 'bold', color: '#0D47A1' },
    memberDetail: { fontSize: 13, color: '#777' },
    noMembersText: { fontSize: 15, color: '#777', textAlign: 'center', paddingVertical: 10 },
    noHouseholdText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
    manageButton: { flexDirection: 'row', backgroundColor: '#0F00D7', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 20, alignSelf: 'center', elevation: 2 },
    manageButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
    modalContent: { width: '100%', maxHeight: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#0F00D7' },
    modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15},
    modalInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 15, fontSize: 15, backgroundColor: '#F9F9F9' },
    passwordContainerModal: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: '#F9F9F9', marginBottom: 15 },
    passwordInputModal: { flex: 1, fontSize: 15, color: '#212121', paddingVertical: 10, paddingHorizontal: 12 },
    eyeIcon: { paddingHorizontal: 12, paddingVertical: 10 },
    pickerWrapperSmall: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, marginBottom: 15, backgroundColor: '#F9F9F9' },
    pickerPlaceholder: { color: '#A9A9A9' },
    datePickerButtonModal: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 14, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48, marginBottom: 15 },
    datePickerButtonText: { fontSize: 16, color: '#212121' },
    datePickerPlaceholderText: { fontSize: 16, color: '#A9A9A9' },
    accountInfoText: { fontSize: 14, color: '#666', marginBottom: 10, fontStyle: 'italic', textAlign: 'center' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 25, borderTopWidth: 1, paddingTop: 15, borderColor: '#EEEEEE' },
    modalButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', flex: 1, marginHorizontal: 5 },
    modalButtonSave: { backgroundColor: '#0F00D7' },
    modalButtonClose: { backgroundColor: '#757575' },
    modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    inputError: { borderColor: '#D32F2F' },
    inputErrorBorder: { borderWidth: 1, borderColor: '#D32F2F' },
    label: { fontSize: 16, color: '#333', fontWeight: '500', paddingBottom: 5 },
    toggleContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
    toggleSwitchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    conditionalContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
    filePickerButton: { backgroundColor: '#E8E8FF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 4 },
    filePickerButtonText: { color: '#0F00D7', fontSize: 15, fontWeight: 'bold' },
    fileNameText: { fontSize: 13, color: 'green', marginTop: 4, fontStyle: 'italic', textAlign: 'center', marginBottom: 15 },
    proofSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E0E0E0', marginBottom: 10 },
    previewImage: { width: 100, height: 100, borderRadius: 8, alignSelf: 'center', marginVertical: 10 },
    previewImageSmall: { width: 70, height: 70, borderRadius: 4, alignSelf: 'center', marginTop: 10 },
});

export default MyHouseholdScreen;