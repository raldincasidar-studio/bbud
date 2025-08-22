import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Master list of available document types
const DOCUMENT_TYPES = [
    { label: 'Select Document Type *', value: '', enabled: false },
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

// This component is no longer used by the Cohabitation form but kept for other forms
const DateInput = ({ label, value, onChange, error }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={[styles.textInput, !!error && styles.inputError]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#A9A9A9"
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

// A platform-aware Picker component that uses a modal on iOS
const PickerInput = ({ label, value, onValueChange, items, error, placeholder, required = true }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const selectedItem = items.find(item => item.value === value);
    const displayLabel = selectedItem?.label ?? placeholder;

    if (Platform.OS === 'android') {
        return (
            <View style={styles.inputContainer}>
                {label && <Text style={styles.label}>{label} {required && <Text style={styles.requiredStar}>*</Text>}</Text>}
                <View style={[styles.pickerWrapper, !!error && styles.inputError]}>
                    <Picker
                        selectedValue={value}
                        onValueChange={onValueChange}
                        style={[styles.pickerText, !value && styles.pickerPlaceholder]}
                        itemStyle={{ color: 'black' }} // Ensures dropdown items are black
                    >
                        {items.map((opt, index) => (
                            <Picker.Item
                                key={index}
                                label={opt.label}
                                value={opt.value}
                                enabled={opt.enabled !== false}
                            />
                        ))}
                    </Picker>
                </View>
                <ErrorMessage error={error} />
            </View>
        );
    }

    // iOS implementation using a Modal
    return (
        <View style={styles.inputContainer}>
            {label && <Text style={styles.label}>{label} {required && <Text style={styles.requiredStar}>*</Text>}</Text>}
            <TouchableOpacity
                style={[styles.datePickerButton, !!error && styles.inputError]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={value ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>
                    {displayLabel}
                </Text>
            </TouchableOpacity>
            <ErrorMessage error={error} />

            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalDoneButton}>
                                <Text style={styles.modalDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={value}
                            onValueChange={onValueChange}
                            itemStyle={{ color: 'black' }} // FIX: Ensures picker wheel text is black
                        >
                            {items.map((opt, index) => (
                                <Picker.Item key={index} label={opt.label} value={opt.value} />
                            ))}
                        </Picker>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};


// NameInput component now uses PickerInput for iOS compatibility
const NameInput = ({ label, value, onValueChange, error, householdMembers = [] }) => {
    const [isManual, setIsManual] = useState(false);

    const handleSelection = (selectedValue) => {
        if (selectedValue === 'manual') {
            setIsManual(true);
            onValueChange(''); // Clear previous selection
        } else if (selectedValue !== '') { // Ensure placeholder is not processed
            setIsManual(false);
            onValueChange(selectedValue);
        }
    };

    const pickerItems = [
        { label: "Select from household or enter manually", value: "", enabled: false },
        ...householdMembers.map(member => ({
            label: `${member.first_name} ${member.last_name}`,
            value: `${member.first_name} ${member.last_name}`
        })),
        { label: "Enter name manually...", value: "manual" }
    ];

    return (
        <>
            {!isManual ? (
                <PickerInput
                    label={label}
                    value={value}
                    onValueChange={handleSelection}
                    items={pickerItems}
                    error={error}
                    placeholder="Select from household or enter manually"
                />
            ) : (
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>{label} <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        style={[styles.textInput, !!error && styles.inputError]}
                        placeholder="Enter full name"
                        placeholderTextColor="#A9A9A9"
                        value={value}
                        onChangeText={onValueChange}
                    />
                    <ErrorMessage error={error} />
                </View>
            )}
        </>
    );
};


// Component for the date picker button
const DatePickerInput = ({ label, value, onPress, error }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
            style={[styles.datePickerButton, !!error && styles.inputError]}
            onPress={onPress}
        >
            <Text style={value ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>
                {value ? new Date(value).toLocaleDateString('en-CA') : 'Select Date *'}
            </Text>
        </TouchableOpacity>
        <ErrorMessage error={error} />
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

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loggedInUserData, setLoggedInUserData] = useState<any>(null);
    const [householdMembers, setHouseholdMembers] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingInitialData(true);
            let parsedUserData = null;
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    parsedUserData = JSON.parse(storedUserDataString);
                    setLoggedInUserData(parsedUserData);
                    setForm(prev => ({ ...prev, requestor_resident_id: parsedUserData._id }));

                    const response = await apiRequest('GET', `/api/residents/${parsedUserData._id}/household-members`);

                    if (response && Array.isArray(response.household_members)) {
                        setHouseholdMembers([parsedUserData, ...response.household_members]);
                    } else {
                        setHouseholdMembers([parsedUserData]);
                    }
                } else {
                    Alert.alert("Authentication Error", "Could not load user data. Please log in again.");
                    router.replace('/login');
                }
            } catch (e) {
                console.error("Failed to load initial data", e);
                if (parsedUserData) {
                    setHouseholdMembers([parsedUserData]);
                }
                Alert.alert("Error", "Failed to load household members. Please try again later.");
            } finally {
                setIsLoadingInitialData(false);
            }
        };
        loadInitialData();
    }, []);

    const validateField = (field: string, value: any): string => {
        let error = '';
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim());
        const isDate = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);
        const isYear = (val: string) => /^\d{4}$/.test(val);
        const isNumeric = (val: string) => /^\d+$/.test(val);

        switch (field) {
            case 'requestor_resident_id':
                if (isRequired(value)) error = 'Please select a requester.';
                break;
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

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate && datePickerTarget) {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            handleDetailChange(datePickerTarget, formattedDate);
            setDatePickerTarget('');
        }
    };

    const openDatePicker = (target: string) => {
        setDatePickerTarget(target);
        setShowDatePicker(true);
    };

    const saveRequest = async () => {
        let hasValidationErrors = false;
        const fieldsToValidate: Record<string, any> = {
            requestor_resident_id: form.requestor_resident_id,
            request_type: form.request_type,
        };

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
                        <NameInput
                            label="Full Name of Male Partner"
                            value={form.details.male_partner_name || ''}
                            onValueChange={(val) => handleDetailChange('male_partner_name', val)}
                            error={errors['details.male_partner_name']}
                            householdMembers={householdMembers}
                        />
                        <DatePickerInput
                            label="Birthdate of Male Partner"
                            value={form.details.male_partner_birthdate}
                            onPress={() => openDatePicker('male_partner_birthdate')}
                            error={errors['details.male_partner_birthdate']}
                        />
                        <NameInput
                            label="Full Name of Female Partner"
                            value={form.details.female_partner_name || ''}
                            onValueChange={(val) => handleDetailChange('female_partner_name', val)}
                            error={errors['details.female_partner_name']}
                            householdMembers={householdMembers}
                        />
                        <DatePickerInput
                            label="Birthdate of Female Partner"
                            value={form.details.female_partner_birthdate}
                            onPress={() => openDatePicker('female_partner_birthdate')}
                            error={errors['details.female_partner_birthdate']}
                        />
                        <TextInput style={[styles.textInput, !!errors['details.year_started_cohabiting'] && styles.inputError]} placeholder="Year Started Living Together *" placeholderTextColor="#A9A9A9" value={form.details.year_started_cohabiting || ''} onChangeText={(val) => handleDetailChange('year_started_cohabiting', val)} keyboardType="numeric" />
                        <ErrorMessage error={errors['details.year_started_cohabiting']} />
                    </>
                )}

                {form.request_type === 'Barangay Clearance' && (
                    <>
                        <TextInput style={[styles.textInput, !!errors['details.type_of_work'] && styles.inputError]} placeholder="Type of Work (e.g., sidewalk repair) *" placeholderTextColor="#A9A9A9" value={form.details.type_of_work || ''} onChangeText={(val) => handleDetailChange('type_of_work', val)} />
                        <ErrorMessage error={errors['details.type_of_work']} />
                        <TextInput style={styles.textInput} placeholder="Other Work (e.g., drainage tapping)" placeholderTextColor="#A9A9A9" value={form.details.other_work || ''} onChangeText={(val) => handleDetailChange('other_work', val)} />
                        <TextInput style={styles.textInput} placeholder="Number of Storeys" placeholderTextColor="#A9A9A9" value={form.details.number_of_storeys || ''} onChangeText={(val) => handleDetailChange('number_of_storeys', val)} />
                        <TextInput style={[styles.textInput, !!errors['details.purpose_of_clearance'] && styles.inputError]} placeholder="Purpose of this Clearance *" placeholderTextColor="#A9A9A9" value={form.details.purpose_of_clearance || ''} onChangeText={(val) => handleDetailChange('purpose_of_clearance', val)} />
                        <ErrorMessage error={errors['details.purpose_of_clearance']} />
                    </>
                )}
                
                {form.request_type === 'Barangay Business Clearance' && (
                    <>
                        <TextInput style={[styles.textInput, !!errors['details.business_name'] && styles.inputError]} placeholder="Business Trade Name *" placeholderTextColor="#A9A9A9" value={form.details.business_name || ''} onChangeText={(val) => handleDetailChange('business_name', val)} />
                        <ErrorMessage error={errors['details.business_name']} />
                        <TextInput style={[styles.textInput, !!errors['details.nature_of_business'] && styles.inputError]} placeholder="Nature of Business *" placeholderTextColor="#A9A9A9" value={form.details.nature_of_business || ''} onChangeText={(val) => handleDetailChange('nature_of_business', val)} />
                        <ErrorMessage error={errors['details.nature_of_business']} />
                    </>
                )}

                {form.request_type === 'Barangay Certification (First Time Jobseeker)' && (
                    <>
                        <TextInput style={[styles.textInput, !!errors['details.years_lived'] && styles.inputError]} placeholder="Number of Years at Address *" placeholderTextColor="#A9A9A9" value={form.details.years_lived || ''} onChangeText={(val) => handleDetailChange('years_lived', val)} keyboardType="numeric" />
                        <ErrorMessage error={errors['details.years_lived']} />
                        <TextInput style={[styles.textInput, !!errors['details.months_lived'] && styles.inputError]} placeholder="Number of Months at Address *" placeholderTextColor="#A9A9A9" value={form.details.months_lived || ''} onChangeText={(val) => handleDetailChange('months_lived', val)} keyboardType="numeric" />
                        <ErrorMessage error={errors['details.months_lived']} />
                    </>
                )}
                
                {form.request_type === 'Certificate of Indigency' && (
                    <PickerInput
                        label="Purpose (Medical/Financial)"
                        value={form.details.medical_educational_financial || ''}
                        onValueChange={(val) => handleDetailChange('medical_educational_financial', val)}
                        items={[
                            { label: 'Select Purpose *', value: '', enabled: false },
                            { label: 'Medical', value: 'Medical' },
                            { label: 'Educational', value: 'Educational' },
                            { label: 'Financial', value: 'Financial' },
                        ]}
                        error={errors['details.medical_educational_financial']}
                        placeholder="Select Purpose *"
                    />
                )}
                
                {form.request_type === 'Barangay Permit (for installations)' && (
                     <>
                        <TextInput style={[styles.textInput, !!errors['details.installation_construction_repair'] && styles.inputError]} placeholder="Installation/Construction/Repair *" placeholderTextColor="#A9A9A9" value={form.details.installation_construction_repair || ''} onChangeText={(val) => handleDetailChange('installation_construction_repair', val)} />
                        <ErrorMessage error={errors['details.installation_construction_repair']} />
                        <TextInput style={[styles.textInput, !!errors['details.project_site'] && styles.inputError]} placeholder="Project Site *" placeholderTextColor="#A9A9A9" value={form.details.project_site || ''} onChangeText={(val) => handleDetailChange('project_site', val)} />
                        <ErrorMessage error={errors['details.project_site']} />
                    </>
                )}

                <View style={[styles.inputContainer, { paddingTop: 10 }]}>
                     <Text style={styles.label}>Purpose of this Request <Text style={styles.requiredStar}>*</Text></Text>
                     <TextInput
                         placeholder="Be specific (e.g., For hospital application, For new job application)"
                         placeholderTextColor="#A9A9A9"
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
                <Text style={{ marginTop: 10, color: '#000' }}>Loading your information...</Text>
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
                <Text style={styles.sectionTitle}>Requestor Information</Text>

                <PickerInput
                    label="Requesting For"
                    value={form.requestor_resident_id}
                    onValueChange={(itemValue) => handleFormChange('requestor_resident_id', itemValue)}
                    items={householdMembers.map((member) => ({
                        label: `${member.first_name} ${member.last_name}`,
                        value: member._id,
                    }))}
                    error={errors.requestor_resident_id}
                    placeholder="Select Requestor"
                />

                <Text style={styles.sectionTitle}>Document Details</Text>
                
                <PickerInput
                    label="Type of Document to Request"
                    value={form.request_type}
                    onValueChange={(itemValue) => handleFormChange('request_type', itemValue)}
                    items={DOCUMENT_TYPES}
                    error={errors.request_type}
                    placeholder="Select Document Type *"
                />

                {renderDynamicFields()}

                {showDatePicker && (
                    <DateTimePicker
                        value={form.details[datePickerTarget] ? new Date(form.details[datePickerTarget]) : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'} // FIX: Use spinner on iOS
                        onChange={onDateChange}
                    />
                )}

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
    textInput: { borderWidth: 1, borderColor: '#DDD', marginTop: 5, marginBottom: 5, borderRadius: 8, fontSize: 16, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, color: '#000', backgroundColor: '#F9F9F9' },
    pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
    pickerText: { color: '#000' },
    pickerPlaceholder: { color: '#A9A9A9' },
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    inputError: { borderColor: '#D32F2F' },
    errorText: { color: '#D32F2F', fontSize: 12, marginTop: 4, marginBottom: 4 },
    datePickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, backgroundColor: '#F9F9F9', justifyContent: 'center', minHeight: 48 },
    datePickerButtonText: { fontSize: 16, color: '#000' },
    datePickerPlaceholderText: { fontSize: 16, color: '#A9A9A9' },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    modalHeader: {
        alignItems: 'flex-end',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalDoneButton: {
        padding: 8,
    },
    modalDoneText: {
        color: '#007AFF',
        fontSize: 17,
        fontWeight: '600',
    },
});

export default NewDocumentRequestScreen;