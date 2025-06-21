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
    // Removed duplicate Certificate of Residency for cleanliness
];

// Helper component for date input, now with error handling
const DateInput = ({ label, value, onChange, error }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={[styles.textInput, !!error && styles.inputError]}
            placeholder="YYYY-MM-DD"
            value={value}
            onChangeText={onChange}
            keyboardType="numeric"
            maxLength={10}
        />
        {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

// Helper component to display error messages
const ErrorMessage = ({ error }) => {
    if (!error) return null;
    return <Text style={styles.errorText}>{error}</Text>;
};


const NewDocumentRequestScreen = () => {
    const router = useRouter();

    const [form, setForm] = useState({
        requestor_resident_id: '',
        request_type: '',
        purpose: '',
        details: {} as Record<string, any>,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
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

    const validateField = (field: string, value: any): string => {
        let error = '';
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim());
        const isDate = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);
        const isYear = (val: string) => /^\d{4}$/.test(val);
        const isNumeric = (val: string) => /^\d+$/.test(val);

        switch (field) {
            case 'request_type':
                if (isRequired(value)) error = 'Please select a document type.';
                break;
            case 'purpose':
                if (isRequired(value)) error = 'A purpose for the request is required.';
                break;
            case 'details.male_partner_name':
                if (isRequired(value)) error = "Male partner's name is required.";
                break;
            case 'details.male_partner_birthdate':
                if (isRequired(value)) error = "Birthdate is required.";
                else if (!isDate(value)) error = 'Enter a valid date (YYYY-MM-DD).';
                break;
            case 'details.female_partner_name':
                if (isRequired(value)) error = "Female partner's name is required.";
                break;
            case 'details.female_partner_birthdate':
                if (isRequired(value)) error = "Birthdate is required.";
                else if (!isDate(value)) error = 'Enter a valid date (YYYY-MM-DD).';
                break;
            case 'details.year_started_cohabiting':
                if (isRequired(value)) error = "Year is required.";
                else if (!isYear(value)) error = 'Enter a valid 4-digit year.';
                break;
            case 'details.business_name':
            case 'details.nature_of_business':
            case 'details.type_of_work':
            case 'details.purpose_of_clearance':
            case 'details.installation_construction_repair':
            case 'details.project_site':
                if (isRequired(value)) error = 'This field is required.';
                break;
            case 'details.years_lived':
            case 'details.months_lived':
                if (isRequired(value)) error = 'This field is required.';
                else if (!isNumeric(value)) error = 'Must be a number.';
                break;
            case 'details.medical_educational_financial':
                if (isRequired(value)) error = 'Please select a purpose.';
                break;
            default:
                break;
        }
        
        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[field] = error;
            } else {
                delete newErrors[field];
            }
            return newErrors;
        });

        return error;
    };


    const handleFormChange = (field: keyof typeof form, value: any) => {
        setForm(prev => {
            const isRequestTypeChange = field === 'request_type';
            const updatedForm = {
                ...prev,
                [field]: value,
                details: isRequestTypeChange ? {} : prev.details,
            };

            if (isRequestTypeChange) {
                setErrors(e => {
                    const newErrors = { ...e };
                    Object.keys(newErrors).forEach(key => {
                        if (key.startsWith('details.') || key === 'purpose') {
                            delete newErrors[key];
                        }
                    });
                    return newErrors;
                });
            }
            
            validateField(field, value);
            return updatedForm;
        });
    };

    const handleDetailChange = (detailField: string, value: any) => {
        setForm(prev => {
            const updatedDetails = { ...prev.details, [detailField]: value };
            validateField(`details.${detailField}`, value);
            return { ...prev, details: updatedDetails };
        });
    };

    const saveRequest = async () => {
        let hasValidationErrors = false;
        const fieldsToValidate: Record<string, any> = {
            request_type: form.request_type,
        };
        
        // Add dynamic fields to validation check only if a request type is selected
        if (form.request_type) {
             fieldsToValidate.purpose = form.purpose;

            const details = form.details;
            const requestType = form.request_type;

            if (requestType === 'Certificate of Cohabitation') {
                Object.assign(fieldsToValidate, {
                    'details.male_partner_name': details.male_partner_name, 'details.male_partner_birthdate': details.male_partner_birthdate,
                    'details.female_partner_name': details.female_partner_name, 'details.female_partner_birthdate': details.female_partner_birthdate,
                    'details.year_started_cohabiting': details.year_started_cohabiting,
                });
            } else if (requestType === 'Barangay Clearance') {
                Object.assign(fieldsToValidate, { 'details.type_of_work': details.type_of_work, 'details.purpose_of_clearance': details.purpose_of_clearance });
            } else if (requestType === 'Barangay Business Clearance') {
                Object.assign(fieldsToValidate, { 'details.business_name': details.business_name, 'details.nature_of_business': details.nature_of_business });
            } else if (requestType === 'Barangay Certification (First Time Jobseeker)') {
                Object.assign(fieldsToValidate, { 'details.years_lived': details.years_lived, 'details.months_lived': details.months_lived });
            } else if (requestType === 'Certificate of Indigency') {
                Object.assign(fieldsToValidate, { 'details.medical_educational_financial': details.medical_educational_financial });
            } else if (requestType === 'Barangay Permit (for installations)') {
                Object.assign(fieldsToValidate, { 'details.installation_construction_repair': details.installation_construction_repair, 'details.project_site': details.project_site });
            }
        }

        Object.keys(fieldsToValidate).forEach(field => {
            if (validateField(field, fieldsToValidate[field])) {
                hasValidationErrors = true;
            }
        });

        if (hasValidationErrors) {
            Alert.alert("Validation Error", "Please fix the errors shown on the form.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await apiRequest('POST', '/api/document-requests', form);
            if (response && (response.message || response.requestId)) {
                Alert.alert("Success", "Document request submitted successfully!");
                router.replace('/request-document');
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
    
    const renderDynamicFields = () => {
        if (!form.request_type) return null;
        
        return (
            <View>
                <Text style={styles.sectionTitle}>{form.request_type} - Required Information</Text>

                {form.request_type === 'Certificate of Cohabitation' && (
                    <>
                        <TextInput style={[styles.textInput, !!errors['details.male_partner_name'] && styles.inputError]} placeholder="Full Name of Male Partner *" value={form.details.male_partner_name || ''} onChangeText={(val) => handleDetailChange('male_partner_name', val)} />
                        <ErrorMessage error={errors['details.male_partner_name']} />
                        <DateInput label="Birthdate of Male Partner *" value={form.details.male_partner_birthdate || ''} onChange={(val) => handleDetailChange('male_partner_birthdate', val)} error={errors['details.male_partner_birthdate']} />
                        <TextInput style={[styles.textInput, !!errors['details.female_partner_name'] && styles.inputError]} placeholder="Full Name of Female Partner *" value={form.details.female_partner_name || ''} onChangeText={(val) => handleDetailChange('female_partner_name', val)} />
                        <ErrorMessage error={errors['details.female_partner_name']} />
                        <DateInput label="Birthdate of Female Partner *" value={form.details.female_partner_birthdate || ''} onChange={(val) => handleDetailChange('female_partner_birthdate', val)} error={errors['details.female_partner_birthdate']} />
                        <TextInput style={[styles.textInput, !!errors['details.year_started_cohabiting'] && styles.inputError]} placeholder="Year Started Living Together *" value={form.details.year_started_cohabiting || ''} onChangeText={(val) => handleDetailChange('year_started_cohabiting', val)} keyboardType="numeric" />
                        <ErrorMessage error={errors['details.year_started_cohabiting']} />
                    </>
                )}

                {form.request_type === 'Barangay Clearance' && (
                    <>
                        <TextInput style={[styles.textInput, !!errors['details.type_of_work'] && styles.inputError]} placeholder="Type of Work (e.g., sidewalk repair) *" value={form.details.type_of_work || ''} onChangeText={(val) => handleDetailChange('type_of_work', val)} />
                        <ErrorMessage error={errors['details.type_of_work']} />
                        <TextInput style={styles.textInput} placeholder="Other Work (e.g., drainage tapping)" value={form.details.other_work || ''} onChangeText={(val) => handleDetailChange('other_work', val)} />
                        <TextInput style={styles.textInput} placeholder="Number of Storeys" value={form.details.number_of_storeys || ''} onChangeText={(val) => handleDetailChange('number_of_storeys', val)} />
                        <TextInput style={[styles.textInput, !!errors['details.purpose_of_clearance'] && styles.inputError]} placeholder="Purpose of this Clearance *" value={form.details.purpose_of_clearance || ''} onChangeText={(val) => handleDetailChange('purpose_of_clearance', val)} />
                        <ErrorMessage error={errors['details.purpose_of_clearance']} />
                    </>
                )}
                
                {form.request_type === 'Barangay Business Clearance' && (
                    <>
                        <TextInput style={[styles.textInput, !!errors['details.business_name'] && styles.inputError]} placeholder="Business Trade Name *" value={form.details.business_name || ''} onChangeText={(val) => handleDetailChange('business_name', val)} />
                        <ErrorMessage error={errors['details.business_name']} />
                        <TextInput style={[styles.textInput, !!errors['details.nature_of_business'] && styles.inputError]} placeholder="Nature of Business *" value={form.details.nature_of_business || ''} onChangeText={(val) => handleDetailChange('nature_of_business', val)} />
                        <ErrorMessage error={errors['details.nature_of_business']} />
                    </>
                )}

                {form.request_type === 'Barangay Certification (First Time Jobseeker)' && (
                    <>
                        <TextInput style={[styles.textInput, !!errors['details.years_lived'] && styles.inputError]} placeholder="Number of Years at Address *" value={form.details.years_lived || ''} onChangeText={(val) => handleDetailChange('years_lived', val)} keyboardType="numeric" />
                        <ErrorMessage error={errors['details.years_lived']} />
                        <TextInput style={[styles.textInput, !!errors['details.months_lived'] && styles.inputError]} placeholder="Number of Months at Address *" value={form.details.months_lived || ''} onChangeText={(val) => handleDetailChange('months_lived', val)} keyboardType="numeric" />
                        <ErrorMessage error={errors['details.months_lived']} />
                    </>
                )}
                
                {form.request_type === 'Certificate of Indigency' && (
                    <>
                        <View style={[styles.pickerWrapper, !!errors['details.medical_educational_financial'] && styles.inputError]}>
                            <Picker selectedValue={form.details.medical_educational_financial || ''} onValueChange={(val) => handleDetailChange('medical_educational_financial', val)}>
                                <Picker.Item label="Select Purpose (Medical/Financial...) *" value="" />
                                <Picker.Item label="Medical" value="Medical" />
                                <Picker.Item label="Educational" value="Educational" />
                                <Picker.Item label="Financial" value="Financial" />
                            </Picker>
                        </View>
                        <ErrorMessage error={errors['details.medical_educational_financial']} />
                    </>
                )}
                
                {form.request_type === 'Barangay Permit (for installations)' && (
                     <>
                        <TextInput style={[styles.textInput, !!errors['details.installation_construction_repair'] && styles.inputError]} placeholder="Installation/Construction/Repair *" value={form.details.installation_construction_repair || ''} onChangeText={(val) => handleDetailChange('installation_construction_repair', val)} />
                        <ErrorMessage error={errors['details.installation_construction_repair']} />
                        <TextInput style={[styles.textInput, !!errors['details.project_site'] && styles.inputError]} placeholder="Project Site *" value={form.details.project_site || ''} onChangeText={(val) => handleDetailChange('project_site', val)} />
                        <ErrorMessage error={errors['details.project_site']} />
                    </>
                )}

                <View style={styles.inputContainer}>
                     <Text style={styles.label}>Purpose of this Request <Text style={styles.requiredStar}>*</Text></Text>
                     <TextInput
                         placeholder="Be specific (e.g., For hospital application, For new job application)"
                         value={form.purpose}
                         onChangeText={(val) => handleFormChange('purpose', val)}
                         style={[styles.textInput, { height: 100 }, !!errors.purpose && styles.inputError]}
                         multiline
                         textAlignVertical="top"
                     />
                     <ErrorMessage error={errors.purpose} />
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
                    <View style={[styles.pickerWrapper, !!errors.request_type && styles.inputError]}>
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
                     <ErrorMessage error={errors.request_type} />
                </View>

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
    textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, fontSize: 16, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, color: '#333', backgroundColor: '#F9F9F9' },
    readOnlyInput: { backgroundColor: '#ECEFF1', color: '#546E7A' },
    pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
    picker: { height: 50, width: '100%', color: '#333' },
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    // Styles for validation
    inputError: {
        borderColor: '#D32F2F', // A stronger red for error indication
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        marginTop: 4,
        marginBottom: 4, // Add margin to push content below
    },
});

export default NewDocumentRequestScreen;