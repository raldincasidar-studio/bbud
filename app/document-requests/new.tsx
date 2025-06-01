// app/document-requests/new.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// DateTimePicker is no longer needed for date_of_request
import { Picker } from '@react-native-picker/picker';

// Debounce utility
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

const NewDocumentRequestScreen = () => {
    const router = useRouter();

    const [requestType, setRequestType] = useState('');
    // REMOVED: Date of Request state from form
    const [purposeOfRequest, setPurposeOfRequest] = useState('');
    const [documentStatus, setDocumentStatus] = useState('Pending'); // Default to Pending and ReadOnly

    // Logged-in User's data (Requestor)
    const [loggedInUserData, setLoggedInUserData] = useState(null);
    const [requestorResidentId, setRequestorResidentId] = useState(null);
    const [requestorDisplayName, setRequestorDisplayName] = useState('');
    const [requestorAddress, setRequestorAddress] = useState('');
    const [requestorContactNumber, setRequestorContactNumber] = useState('');

    // Requested By (Personnel) search state
    const [processedBySearchQuery, setProcessedBySearchQuery] = useState('');
    const [processedBySearchResults, setProcessedBySearchResults] = useState([]);
    const [isLoadingProcessedBy, setIsLoadingProcessedBy] = useState(false);
    const [selectedProcessedById, setSelectedProcessedById] = useState(null);
    const [selectedProcessedByName, setSelectedProcessedByName] = useState('');
    const [selectedProcessedByIsResident, setSelectedProcessedByIsResident] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);


    const documentTypeOptions = [
        { label: 'Select Document Type', value: '' },
        { label: 'Barangay Clearance', value: 'Barangay Clearance' },
        { label: 'Certificate of Indigency', value: 'Certificate of Indigency' },
        { label: 'Certificate of Residency', value: 'Certificate of Residency' },
        { label: 'Business Permit Application', value: 'Business Permit Application' },
        { label: 'Certificate of Good Moral Character', value: 'Certificate of Good Moral Character' },
    ];

    // --- Fetch Logged-in User Data on Mount ---
    useEffect(() => {
        const loadUserData = async () => {
            setIsLoadingInitialData(true);
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsedUserData = JSON.parse(storedUserDataString);
                    setLoggedInUserData(parsedUserData);
                    setRequestorResidentId(parsedUserData._id);
                    const name = `${parsedUserData.first_name || ''} ${parsedUserData.middle_name || ''} ${parsedUserData.last_name || ''}`.trim();
                    setRequestorDisplayName(name);
                    const address = `${parsedUserData.address_house_number || ''} ${parsedUserData.address_street || ''}, ${parsedUserData.address_subdivision_zone || ''}, ${parsedUserData.address_city_municipality || ''}`.replace(/ ,/g,',').replace(/^,|,$/g,'').trim();
                    setRequestorAddress(address || 'N/A');
                    setRequestorContactNumber(parsedUserData.contact_number || 'N/A');
                } else {
                    Alert.alert("Authentication Error", "Could not load user data. Please log in again.");
                    router.replace('/');
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

    const formatDateForAPI = (date) => {
        if (!date) return null;
        return date.toISOString(); // Send full ISO string, backend will handle it as Date
    };

    const searchResidentsAPI = async (query, type) => {
        const trimmedQuery = typeof query === 'string' ? query.trim() : '';
        const setIsLoading = type === 'processedBy' ? setIsLoadingProcessedBy : () => {}; // Only for 'processedBy' now
        const setSearchResults = type === 'processedBy' ? setProcessedBySearchResults : () => {};

        if (trimmedQuery.length < 2) { setSearchResults([]); setIsLoading(false); return; }
        setIsLoading(true); setSearchResults([]);
        try {
            const response = await apiRequest('GET', '/api/residents/search?q=' + trimmedQuery, null, { q: trimmedQuery });
            if (response && response.residents) {
                setSearchResults(response.residents || []);
            } else {
                 setSearchResults([]);
            }
        } catch (e) {
            console.error(`Exception searching ${type}:`, e);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
     };

    // --- Requested By (Personnel) Search Logic ---
    const debouncedProcessedBySearch = useCallback(debounce((query) => searchResidentsAPI(query, 'processedBy'), 500), []);
    useEffect(() => {
        if (processedBySearchQuery !== selectedProcessedByName && selectedProcessedById) {
            setSelectedProcessedById(null);
            setSelectedProcessedByIsResident(false);
        }
        if (!processedBySearchQuery || processedBySearchQuery.trim().length < 2) {
            setProcessedBySearchResults([]);
            return;
        }
        if (!selectedProcessedByIsResident || processedBySearchQuery !== selectedProcessedByName) {
            debouncedProcessedBySearch(processedBySearchQuery);
        } else if (selectedProcessedByIsResident && processedBySearchQuery === selectedProcessedByName) {
            setProcessedBySearchResults([]);
        }
    }, [processedBySearchQuery, selectedProcessedByName, selectedProcessedById, debouncedProcessedBySearch]);

    const selectProcessedBy = (resident) => {
        setSelectedProcessedById(resident._id);
        const name = `${resident.first_name || ''} ${resident.middle_name || ''} ${resident.last_name || ''}`.trim();
        setSelectedProcessedByName(name);
        setProcessedBySearchQuery(name);
        setSelectedProcessedByIsResident(true);
        setProcessedBySearchResults([]);
    };
    const clearProcessedBySelection = (clearInput = true) => {
        if(clearInput) setProcessedBySearchQuery('');
        setSelectedProcessedById(null); setSelectedProcessedByName('');
        setSelectedProcessedByIsResident(false);
        setProcessedBySearchResults([]);
    };

    const validateForm = () => {
        if (!requestType) { Alert.alert("Validation Error", "Please select a document type."); return false; }
        if (!requestorResidentId) { Alert.alert("Validation Error", "Requestor information is missing. Please try logging in again."); return false; }
        if (!requestorAddress.trim() || requestorAddress === 'N/A') { Alert.alert("Validation Error", "Requestor address could not be loaded or is missing."); return false; }
        if (!requestorContactNumber.trim() || requestorContactNumber === 'N/A') { Alert.alert("Validation Error", "Requestor contact number could not be loaded or is missing."); return false; }
        if (!purposeOfRequest.trim()) { Alert.alert("Validation Error", "Purpose of request is required."); return false; }
        return true;
    }

    const saveRequest = async () => {
        if (!validateForm()) { return; }

        setIsSaving(true);
        try {
            const payload = {
                request_type: requestType,
                requestor_resident_id: requestorResidentId,
                requestor_display_name: requestorDisplayName,
                requestor_address: requestorAddress.trim(),
                requestor_contact_number: requestorContactNumber.trim(),
                date_of_request: formatDateForAPI(new Date()), // Automatically set current date
                purpose_of_request: purposeOfRequest.trim(),
                requested_by_resident_id: selectedProcessedByIsResident ? selectedProcessedById : null,
                requested_by_display_name: processedBySearchQuery.trim() || null, // Name from input or selected
                document_status: "Pending", // Always Pending on creation
            };

            const response = await apiRequest('POST', '/api/request-document', payload);

            if (response && (response.message || response.request?._id)) {
                Alert.alert("Success", response.message || "Document request submitted successfully!");
                router.push('/document-requests');
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not submit document request.");
            }
        } catch (error) {
            console.error("Error saving document request:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "An unexpected error occurred.";
            Alert.alert("Error", errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingInitialData) {
        return (
            <View style={styles.loaderContainerFullPage}>
                <ActivityIndicator size="large" color="#0F00D7" />
                <Text style={{marginTop: 10}}>Loading your information...</Text>
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
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Request Type Picker */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Document Type <Text style={styles.requiredStar}>*</Text></Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={requestType}
                            onValueChange={(itemValue) => setRequestType(itemValue)}
                            style={styles.picker}
                            prompt="Select Document Type"
                        >
                            {documentTypeOptions.map((opt) => (
                                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Requestor Information Section (Auto-filled and ReadOnly) */}
                <Text style={styles.sectionTitle}>Requestor Information (You)</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name of Requestor</Text>
                    <TextInput value={requestorDisplayName} style={[styles.textInput, styles.readOnlyInput]} editable={false} />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Requestor Address</Text>
                    <TextInput value={requestorAddress} style={[styles.textInput, styles.readOnlyInput]} editable={false} multiline />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Requestor Contact Number</Text>
                    <TextInput value={requestorContactNumber} style={[styles.textInput, styles.readOnlyInput]} editable={false} keyboardType="phone-pad" />
                </View>

                {/* Request Details Section */}
                <Text style={styles.sectionTitle}>Request Details</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Purpose of Request <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput placeholder="State the purpose..." value={purposeOfRequest} onChangeText={setPurposeOfRequest} style={[styles.textInput, {height: 100}]} multiline textAlignVertical="top" />
                </View>

                 <View style={styles.inputContainer}>
                    <Text style={styles.label}>Requested By (Personnel - Optional)</Text>
                    <TextInput
                        placeholder="Search Personnel or Enter Name..."
                        value={processedBySearchQuery}
                        onChangeText={setProcessedBySearchQuery}
                        style={styles.textInput}
                        onBlur={() => { if(processedBySearchResults.length > 0) setTimeout(() => setProcessedBySearchResults([]), 200) }}
                    />
                    {isLoadingProcessedBy && <ActivityIndicator style={styles.searchLoader} />}
                     {processedBySearchQuery.trim().length >= 2 && !isLoadingProcessedBy && !selectedProcessedByIsResident && (
                        <View style={styles.searchResultsContainer}>
                            {processedBySearchResults.length > 0 ? processedBySearchResults.map((resident) => (
                                <TouchableOpacity key={resident._id} style={styles.searchResultItem} onPress={() => selectProcessedBy(resident)}>
                                    <Text>{`${resident.first_name} ${resident.middle_name || ''} ${resident.last_name}`.trim()}</Text>
                                </TouchableOpacity>
                            )) : <Text style={styles.noResultsTextSmall}>No matching personnel. Enter name manually.</Text>}
                        </View>
                    )}
                    {selectedProcessedByName && <Text style={styles.selectedNameHint}>{selectedProcessedByIsResident ? "Selected Personnel: " : "Entered Name: "}{selectedProcessedByName}</Text>}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Document Status</Text>
                    <TextInput
                        value={documentStatus} // Always "Pending"
                        style={[styles.textInput, styles.readOnlyInput]}
                        editable={false}
                    />
                </View>

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
    header: { paddingTop: Platform.OS === 'android' ? 35 : 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F00D7' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    scrollView: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -20 },
    scrollViewContent: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5},
    inputContainer: { marginBottom: 15 },
    label: { color: '#444', fontSize: 15, marginBottom: 7, fontWeight: '500' },
    requiredStar: { color: 'red' },
    textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, fontSize: 16, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, color: '#333', backgroundColor: '#F9F9F9' },
    readOnlyInput: {
        backgroundColor: '#ECEFF1',
        color: '#546E7A',
    },
    pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
    picker: { height: 50, width: '100%', color: '#333' },
    // datePickerButton and datePickerButtonText styles can be removed if no longer used
    searchResultsContainer: { marginTop: 5, borderColor: '#DDD', borderWidth: 1, borderRadius: 8, maxHeight: 150, backgroundColor: 'white', zIndex: 1, position: 'relative' },
    searchResultItem: { padding: 12, borderBottomWidth: 1, borderColor: '#EEE' },
    searchLoader: { marginVertical: 5 },
    noResultsTextSmall: { textAlign: 'center', color: '#777', padding: 8, fontSize: 13 },
    selectedNameHint: { fontSize: 13, color: 'green', marginTop: 5, marginLeft: 2 },
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    }
});

export default NewDocumentRequestScreen;