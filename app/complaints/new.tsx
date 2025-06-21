// app/complaints/new.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

// Reusable component for displaying validation errors
const ErrorMessage = ({ error }) => {
    if (!error) return null;
    return <Text style={styles.errorText}>{error}</Text>;
};

const categoryOptions = [
    'Theft / Robbery', 'Scam / Fraud', 'Physical Assault / Violence',
    'Verbal Abuse / Threats', 'Sexual Harassment / Abuse', 'Vandalism',
    'Noise Disturbance', 'Illegal Parking / Obstruction', 'Drunk and Disorderly Behavior',
    'Curfew Violation / Minor Offenses', 'Illegal Gambling', 'Animal Nuisance / Stray Animal Concern',
    'Garbage / Sanitation Complaints', 'Boundary Disputes / Trespassing',
    'Barangay Staff / Official Misconduct', 'Others',
];

const NewComplaintScreen = () => {
    const router = useRouter();

    const [loggedInUserData, setLoggedInUserData] = useState(null);
    const [complainantResidentId, setComplainantResidentId] = useState(null);
    const [complainantDisplayName, setComplainantDisplayName] = useState('');
    const [complainantAddress, setComplainantAddress] = useState('');
    const [complainantContactNumber, setComplainantContactNumber] = useState('');

    const [dateOfComplaint, setDateOfComplaint] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [timeOfComplaint, setTimeOfComplaint] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [status, setStatus] = useState('New');
    const [notesDescription, setNotesDescription] = useState('');
    const [category, setCategory] = useState('');
    const [isCategoryPickerVisible, setCategoryPickerVisible] = useState(false);

    const [personComplainedSearchQuery, setPersonComplainedSearchQuery] = useState('');
    const [personComplainedSearchResults, setPersonComplainedSearchResults] = useState([]);
    const [isLoadingPersonComplained, setIsLoadingPersonComplained] = useState(false);
    const [selectedPersonComplainedId, setSelectedPersonComplainedId] = useState(null);
    const [selectedPersonComplainedName, setSelectedPersonComplainedName] = useState('');
    const [selectedPersonComplainedIsResident, setSelectedPersonComplainedIsResident] = useState(false);
    
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

    // Central validation logic
    const validateField = (fieldName, value) => {
        let error = '';
        switch (fieldName) {
            case 'personComplainedSearchQuery':
                if (!value.trim()) error = 'Person complained against is required.';
                break;
            case 'category':
                if (!value) error = 'Category is required.';
                break;
            case 'notesDescription':
                if (!value.trim()) error = 'A description of the complaint is required.';
                break;
            case 'dateOfComplaint':
                if (!value) error = 'Date of complaint is required.';
                break;
            case 'timeOfComplaint':
                if (!value) error = 'Time of complaint is required.';
                break;
        }

        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[fieldName] = error;
            } else {
                delete newErrors[fieldName];
            }
            return newErrors;
        });
        return error;
    };

    useEffect(() => {
        const loadUserData = async () => {
            setIsLoadingInitialData(true);
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsed = JSON.parse(storedUserDataString);
                    setLoggedInUserData(parsed);
                    setComplainantResidentId(parsed._id);
                    setComplainantDisplayName(`${parsed.first_name||''} ${parsed.middle_name||''} ${parsed.last_name||''}`.trim());
                    setComplainantAddress(`${parsed.address_house_number||''} ${parsed.address_street||''}, ${parsed.address_subdivision_zone||''}`.trim() || 'N/A');
                    setComplainantContactNumber(parsed.contact_number || 'N/A');
                } else {
                    Alert.alert("Auth Error", "Please log in.", [{ text: "OK", onPress: () => router.replace('/') }]);
                }
            } catch (e) { Alert.alert("Error", "Failed to load your info."); }
            finally { setIsLoadingInitialData(false); }
        };
        loadUserData();
    }, []);

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedDate) {
            setDateOfComplaint(selectedDate);
            validateField('dateOfComplaint', selectedDate);
        }
    };

    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedTime) {
            setTimeOfComplaint(selectedTime);
            validateField('timeOfComplaint', selectedTime);
        }
    };
    
    const formatDateForAPI = (date) => date ? date.toISOString().split('T')[0] : null;
    const formatTimeForAPI = (time) => time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

    const searchResidentsAPI = async (query) => {
        const trimmedQuery = typeof query === 'string' ? query.trim() : '';
        if (trimmedQuery.length < 2) { setPersonComplainedSearchResults([]); setIsLoadingPersonComplained(false); return; }
        setIsLoadingPersonComplained(true); setPersonComplainedSearchResults([]);
        try {
            const response = await apiRequest('GET', '/api/residents/search?q=' + trimmedQuery);
            setPersonComplainedSearchResults(response.residents || []);
        } catch (e) { console.error(`Exception searching:`, e); setPersonComplainedSearchResults([]); }
        finally { setIsLoadingPersonComplained(false); }
    };
    
    const debouncedPersonComplainedSearch = useCallback(debounce(searchResidentsAPI, 500), []);

    useEffect(() => {
        if (personComplainedSearchQuery !== selectedPersonComplainedName && selectedPersonComplainedId) {
            setSelectedPersonComplainedId(null);
            setSelectedPersonComplainedIsResident(false);
        }
        if (!personComplainedSearchQuery || personComplainedSearchQuery.trim().length < 2) {
            setPersonComplainedSearchResults([]);
            return;
        }
        if (!selectedPersonComplainedIsResident || personComplainedSearchQuery !== selectedPersonComplainedName) {
            debouncedPersonComplainedSearch(personComplainedSearchQuery);
        } else if (selectedPersonComplainedIsResident && personComplainedSearchQuery === selectedPersonComplainedName) {
            setPersonComplainedSearchResults([]);
        }
    }, [personComplainedSearchQuery, selectedPersonComplainedName, selectedPersonComplainedIsResident, debouncedPersonComplainedSearch]);

    const selectPersonComplained = (resident) => {
        const name = `${resident.first_name || ''} ${resident.middle_name || ''} ${resident.last_name || ''}`.trim();
        setSelectedPersonComplainedId(resident._id);
        setSelectedPersonComplainedName(name);
        setPersonComplainedSearchQuery(name);
        setSelectedPersonComplainedIsResident(true);
        setPersonComplainedSearchResults([]);
        validateField('personComplainedSearchQuery', name);
    };

    const handlePersonComplainedChange = (text) => {
        setPersonComplainedSearchQuery(text);
        validateField('personComplainedSearchQuery', text);
    };

    const handleCategorySelect = (cat) => {
        setCategory(cat);
        validateField('category', cat);
        setCategoryPickerVisible(false);
    };

    const handleDescriptionChange = (text) => {
        setNotesDescription(text);
        validateField('notesDescription', text);
    };
    
    const saveComplaint = async () => {
        // Run validation on all fields before submitting
        const validationErrors = {};
        if (validateField('personComplainedSearchQuery', personComplainedSearchQuery)) validationErrors.personComplainedSearchQuery = true;
        if (validateField('category', category)) validationErrors.category = true;
        if (validateField('notesDescription', notesDescription)) validationErrors.notesDescription = true;
        if (validateField('dateOfComplaint', dateOfComplaint)) validationErrors.dateOfComplaint = true;
        if (validateField('timeOfComplaint', timeOfComplaint)) validationErrors.timeOfComplaint = true;
        
        if (Object.keys(validationErrors).length > 0) {
            Alert.alert("Validation Error", "Please fill in all required fields.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                complainant_resident_id: complainantResidentId,
                complainant_display_name: complainantDisplayName,
                complainant_address: complainantAddress,
                contact_number: complainantContactNumber,
                date_of_complaint: formatDateForAPI(dateOfComplaint),
                time_of_complaint: formatTimeForAPI(timeOfComplaint),
                person_complained_against_name: personComplainedSearchQuery.trim(),
                person_complained_against_resident_id: selectedPersonComplainedIsResident ? selectedPersonComplainedId : null,
                category: category,
                status: status,
                notes_description: notesDescription.trim(),
            };
            const response = await apiRequest('POST', '/api/complaints', payload);
            if (response && (response.message || response.complaint?._id)) {
                Alert.alert("Success", response.message || "Complaint submitted successfully!");
                router.replace('/complaints');
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not submit complaint.");
            }
        } catch (error) { console.error(error); Alert.alert("Error", "An unexpected error occurred.");
        } finally { setIsSaving(false); }
    };

    if (isLoadingInitialData) {
        return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" /><Text>Loading your info...</Text></View>;
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>File New Complaint</Text>
                <View style={{width:28}}/>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionTitle}>Your Information (Complainant)</Text>
                <View style={styles.inputContainer}><Text style={styles.label}>Name:</Text><TextInput value={complainantDisplayName} style={[styles.textInput, styles.readOnlyInput]} editable={false} /></View>
                <View style={styles.inputContainer}><Text style={styles.label}>Address:</Text><TextInput value={complainantAddress} style={[styles.textInput, styles.readOnlyInput]} editable={false} multiline/></View>
                <View style={styles.inputContainer}><Text style={styles.label}>Contact No.:</Text><TextInput value={complainantContactNumber} style={[styles.textInput, styles.readOnlyInput]} editable={false} /></View>

                <Text style={styles.sectionTitle}>Complaint Details</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Date of Complaint <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.datePickerButton, !!errors.dateOfComplaint && styles.inputError]}>
                        <Text style={styles.datePickerButtonText}>{dateOfComplaint.toLocaleDateString('en-CA')}</Text>
                    </TouchableOpacity>
                    {showDatePicker && <DateTimePicker testID="datePicker" value={dateOfComplaint} mode="date" display="default" onChange={onDateChange} />}
                    <ErrorMessage error={errors.dateOfComplaint} />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Time of Complaint <Text style={styles.requiredStar}>*</Text></Text>
                     <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.datePickerButton, !!errors.timeOfComplaint && styles.inputError]}>
                        <Text style={styles.datePickerButtonText}>{timeOfComplaint.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'})}</Text>
                    </TouchableOpacity>
                    {showTimePicker && <DateTimePicker testID="timePicker" value={timeOfComplaint} mode="time" display="default" onChange={onTimeChange} is24Hour={false} />}
                    <ErrorMessage error={errors.timeOfComplaint} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Person Complained Against <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        placeholder="Search Resident or Enter Name..."
                        value={personComplainedSearchQuery}
                        onChangeText={handlePersonComplainedChange}
                        style={[styles.textInput, !!errors.personComplainedSearchQuery && styles.inputError]}
                        onBlur={() => { if(personComplainedSearchResults.length > 0) setTimeout(() => setPersonComplainedSearchResults([]), 200) }}
                    />
                    <ErrorMessage error={errors.personComplainedSearchQuery} />
                    {isLoadingPersonComplained && <ActivityIndicator style={styles.searchLoader}/>}
                    {personComplainedSearchQuery.trim().length >=2 && !isLoadingPersonComplained && !selectedPersonComplainedIsResident && (
                        <View style={styles.searchResultsContainer}>
                            {personComplainedSearchResults.length > 0 ? personComplainedSearchResults.map(res => (
                                <TouchableOpacity key={res._id} style={styles.searchResultItem} onPress={() => selectPersonComplained(res)}>
                                    <Text>{`${res.first_name||''} ${res.middle_name||''} ${res.last_name||''}`.trim()}</Text>
                                </TouchableOpacity>
                            )) : <Text style={styles.noResultsTextSmall}>No matching residents. Enter name manually.</Text>}
                        </View>
                    )}
                    {selectedPersonComplainedName && <Text style={styles.selectedNameHint}>{selectedPersonComplainedIsResident ? "Selected Resident: " : "Entered Name: "}{selectedPersonComplainedName}</Text>}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Category <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                        style={[styles.datePickerButton, !!errors.category && styles.inputError]}
                        onPress={() => setCategoryPickerVisible(!isCategoryPickerVisible)}>
                        <Text style={styles.datePickerButtonText}>{category || 'Select a Category...'}</Text>
                    </TouchableOpacity>
                    <ErrorMessage error={errors.category} />
                    {isCategoryPickerVisible && (
                        <View style={styles.searchResultsContainer}>
                            <ScrollView nestedScrollEnabled={true} style={{maxHeight: 200}}>
                                {categoryOptions.map((cat, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.searchResultItem}
                                        onPress={() => handleCategorySelect(cat)}>
                                        <Text>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Notes / Description <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput placeholder="Describe the complaint..." value={notesDescription} onChangeText={handleDescriptionChange} style={[styles.textInput, {height: 120}, !!errors.notesDescription && styles.inputError]} multiline textAlignVertical="top"/>
                    <ErrorMessage error={errors.notesDescription} />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Status</Text>
                    <TextInput value={status} style={[styles.textInput, styles.readOnlyInput]} editable={false} />
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={saveComplaint} style={[styles.submitButton, isSaving && styles.buttonDisabled]} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="white"/> : <Text style={styles.submitButtonText}>Submit Complaint</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};
// Styles
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
    readOnlyInput: { backgroundColor: '#ECEFF1', color: '#546E7A' },
    pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
    picker: { height: 50, width: '100%', color: '#333' },
    datePickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 12, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, minHeight: 48 },
    datePickerButtonText: { fontSize: 16, color: '#333' },
    searchResultsContainer: { marginTop: 5, borderColor: '#DDD', borderWidth: 1, borderRadius: 8, maxHeight: 150, backgroundColor: 'white', zIndex: 1, position: 'relative' },
    searchResultItem: { padding: 12, borderBottomWidth: 1, borderColor: '#EEE' },
    searchLoader: { marginVertical: 5 },
    noResultsTextSmall: { textAlign: 'center', color: '#777', padding: 8, fontSize: 13 },
    selectedNameHint: { fontSize: 13, color: 'green', marginTop: 5, marginLeft: 2 },
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'},
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

export default NewComplaintScreen;