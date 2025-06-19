import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Master list of available document types from the Vue component
const DOCUMENT_TYPES = [
    { label: 'Select Document Type *', value: '' },
    { label: 'Certificate of Cohabitation', value: 'Certificate of Cohabitation' },
    { label: 'Certificate of Good Moral', value: 'Certificate of Good Moral' },
    { label: 'Certificate of Residency', value: 'Certificate of Residency' },
    { label: 'Certificate of Solo Parent', value: 'Certificate of Solo Parent' },
    { label: 'Certificate of Indigency', value: 'Certificate of Indigency' },
    { label: 'Barangay Clearance', value: 'Barangay Clearance' },
    { label: 'Barangay Permit (for installations)', value: 'Barangay Permit (for installations)' },
    { label: 'Barangay Business Clearance', value: 'Barangay Business Clearance' },
    { label: 'Barangay Certification (First Time Jobseeker)', value: 'Barangay Certification (First Time Jobseeker)' },
];

// Helper component for date input to avoid using a full modal
const DateInput = ({ label, value, onChange }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            value={value}
            onChangeText={onChange}
            keyboardType="numeric"
            maxLength={10}
        />
    </View>
);


const NewDocumentRequestScreen = () => {
    const router = useRouter();

    const [form, setForm] = useState({
        requestor_resident_id: '',
        request_type: '',
        purpose: '',
        details: {} as Record<string, any>,
    });

    const [loggedInUserData, setLoggedInUserData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

    useEffect(() => {
        const loadUserData = async () => {
            setIsLoadingInitialData(true);
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsedUserData = JSON.parse(storedUserDataString);
                    setLoggedInUserData(parsedUserData);
                    // Auto-populate the requestor ID
                    setForm(prev => ({ ...prev, requestor_resident_id: parsedUserData._id }));
                } else {
                    Alert.alert("Authentication Error", "Could not load user data. Please log in again.");
                    router.replace('/login');
                }
            } catch (e) {
                console.error("Failed to load user data from AsyncStorage", e);
                Alert.alert("Error", "Failed to load your information.");
            } finally {
                setIsLoadingInitialData(false);
            }
        };
        loadUserData();
    }, []);

    const handleFormChange = (field: keyof typeof form, value: any) => {
        // When changing document type, reset details
        if (field === 'request_type') {
            setForm(prev => ({ ...prev, [field]: value, details: {} }));
        } else {
            setForm(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleDetailChange = (detailField: string, value: any) => {
        setForm(prev => ({
            ...prev,
            details: {
                ...prev.details,
                [detailField]: value,
            },
        }));
    };

    const validateForm = () => {
        if (!form.requestor_resident_id) {
            Alert.alert("Validation Error", "Your user information could not be loaded. Please try logging in again.");
            return false;
        }
        if (!form.request_type) {
            Alert.alert("Validation Error", "Please select a document type.");
            return false;
        }
        // Basic purpose validation
        if (!form.purpose.trim()) {
            Alert.alert("Validation Error", "A purpose for the request is required.");
            return false;
        }
        return true;
    };

    const saveRequest = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            // Payload is already structured correctly in the `form` state
            const response = await apiRequest('POST', '/api/document-requests', form);

            if (response && (response.message || response.requestId)) {
                Alert.alert("Success", "Document request submitted successfully!");
                router.push('/request-document');
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not submit the request.");
            }
        } catch (error: any) {
            console.error("Error saving document request:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "An unexpected error occurred.";
            Alert.alert("Error", errorMessage);
        } finally {
            setIsSaving(false);
        }
    };
    
    // Renders the dynamic part of the form based on selected document type
    const renderDynamicFields = () => {
        if (!form.request_type) return null;

        return (
            <View>
                <Text style={styles.sectionTitle}>{form.request_type} - Required Information</Text>

                {/* Certificate of Cohabitation */}
                {form.request_type === 'Certificate of Cohabitation' && (
                    <>
                        <TextInput style={styles.textInput} placeholder="Full Name of Male Partner" value={form.details.male_partner_name || ''} onChangeText={(val) => handleDetailChange('male_partner_name', val)} />
                        <DateInput label="Birthdate of Male Partner" value={form.details.male_partner_birthdate || ''} onChange={(val) => handleDetailChange('male_partner_birthdate', val)} />
                        <TextInput style={styles.textInput} placeholder="Full Name of Female Partner" value={form.details.female_partner_name || ''} onChangeText={(val) => handleDetailChange('female_partner_name', val)} />
                        <DateInput label="Birthdate of Female Partner" value={form.details.female_partner_birthdate || ''} onChange={(val) => handleDetailChange('female_partner_birthdate', val)} />
                        <TextInput style={styles.textInput} placeholder="Year Started Living Together" value={form.details.year_started_cohabiting || ''} onChangeText={(val) => handleDetailChange('year_started_cohabiting', val)} keyboardType="numeric" />
                    </>
                )}

                {/* Barangay Clearance */}
                {form.request_type === 'Barangay Clearance' && (
                    <>
                        <TextInput style={styles.textInput} placeholder="Type of Work (e.g., sidewalk repair)" value={form.details.type_of_work || ''} onChangeText={(val) => handleDetailChange('type_of_work', val)} />
                        <TextInput style={styles.textInput} placeholder="Other Work (e.g., drainage tapping)" value={form.details.other_work || ''} onChangeText={(val) => handleDetailChange('other_work', val)} />
                        <TextInput style={styles.textInput} placeholder="Number of Storeys" value={form.details.number_of_storeys || ''} onChangeText={(val) => handleDetailChange('number_of_storeys', val)} />
                        <TextInput style={styles.textInput} placeholder="Purpose of this Clearance" value={form.details.purpose_of_clearance || ''} onChangeText={(val) => handleDetailChange('purpose_of_clearance', val)} />
                    </>
                )}
                
                {/* Barangay Business Clearance */}
                {form.request_type === 'Barangay Business Clearance' && (
                    <>
                         <TextInput style={styles.textInput} placeholder="Business Trade Name" value={form.details.business_name || ''} onChangeText={(val) => handleDetailChange('business_name', val)} />
                         <TextInput style={styles.textInput} placeholder="Nature of Business" value={form.details.nature_of_business || ''} onChangeText={(val) => handleDetailChange('nature_of_business', val)} />
                    </>
                )}

                {/* First Time Jobseeker */}
                {form.request_type === 'Barangay Certification (First Time Jobseeker)' && (
                    <>
                        <TextInput style={styles.textInput} placeholder="Number of Years at Address" value={form.details.years_lived || ''} onChangeText={(val) => handleDetailChange('years_lived', val)} keyboardType="numeric" />
                        <TextInput style={styles.textInput} placeholder="Number of Months at Address" value={form.details.months_lived || ''} onChangeText={(val) => handleDetailChange('months_lived', val)} keyboardType="numeric" />
                    </>
                )}
                
                {/* Certificate of Indigency */}
                {form.request_type === 'Certificate of Indigency' && (
                    <View style={styles.pickerWrapper}>
                         <Picker selectedValue={form.details.medical_educational_financial || ''} onValueChange={(val) => handleDetailChange('medical_educational_financial', val)}>
                            <Picker.Item label="Select Purpose (Medical/Financial...)" value="" />
                            <Picker.Item label="Medical" value="Medical" />
                            <Picker.Item label="Educational" value="Educational" />
                            <Picker.Item label="Financial" value="Financial" />
                        </Picker>
                    </View>
                )}
                
                {/* Barangay Permit */}
                {form.request_type === 'Barangay Permit (for installations)' && (
                     <>
                        <TextInput style={styles.textInput} placeholder="Installation/Construction/Repair" value={form.details.installation_construction_repair || ''} onChangeText={(val) => handleDetailChange('installation_construction_repair', val)} />
                        <TextInput style={styles.textInput} placeholder="Project Site" value={form.details.project_site || ''} onChangeText={(val) => handleDetailChange('project_site', val)} />
                    </>
                )}

                {/* General Purpose field for ALL document types */}
                <View style={styles.inputContainer}>
                     <Text style={styles.label}>Purpose of this Request <Text style={styles.requiredStar}>*</Text></Text>
                     <TextInput
                         placeholder="Be specific (e.g., For hospital application, For new job application)"
                         value={form.purpose}
                         onChangeText={(val) => handleFormChange('purpose', val)}
                         style={[styles.textInput, { height: 100 }]}
                         multiline
                         textAlignVertical="top"
                     />
                 </View>
            </View>
        );
    }

    if (isLoadingInitialData) {
        return (
            <View style={styles.loaderContainerFullPage}>
                <ActivityIndicator size="large" color="#0F00D7" />
                <Text style={{ marginTop: 10 }}>Loading your information...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Document Request</Text>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionTitle}>Requestor Information (You)</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput value={`${loggedInUserData?.first_name || ''} ${loggedInUserData?.last_name || ''}`} style={[styles.textInput, styles.readOnlyInput]} editable={false} />
                </View>

                <Text style={styles.sectionTitle}>Document Details</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Type of Document to Request <Text style={styles.requiredStar}>*</Text></Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={form.request_type}
                            onValueChange={(itemValue) => handleFormChange('request_type', itemValue)}
                            style={styles.picker}
                        >
                            {DOCUMENT_TYPES.map((opt) => (
                                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* DYNAMIC FIELDS RENDER HERE */}
                {renderDynamicFields()}

                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={saveRequest} style={[styles.submitButton, isSaving && styles.buttonDisabled]} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Submit Request</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F00D7' },
    header: { paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F00D7' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    scrollView: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: Platform.OS === 'ios' ? -20 : 0 },
    scrollViewContent: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 15, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    inputContainer: { marginBottom: 15 },
    label: { color: '#444', fontSize: 15, marginBottom: 7, fontWeight: '500' },
    requiredStar: { color: 'red' },
    textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, fontSize: 16, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, marginBottom: 10, color: '#333', backgroundColor: '#F9F9F9' },
    readOnlyInput: { backgroundColor: '#ECEFF1', color: '#546E7A' },
    pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
    picker: { height: 50, width: '100%', color: '#333' },
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }
});

export default NewDocumentRequestScreen;