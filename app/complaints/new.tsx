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

    const [personComplainedSearchQuery, setPersonComplainedSearchQuery] = useState('');
    const [personComplainedSearchResults, setPersonComplainedSearchResults] = useState([]);
    const [isLoadingPersonComplained, setIsLoadingPersonComplained] = useState(false);
    const [selectedPersonComplainedId, setSelectedPersonComplainedId] = useState(null);
    const [selectedPersonComplainedName, setSelectedPersonComplainedName] = useState('');
    const [selectedPersonComplainedIsResident, setSelectedPersonComplainedIsResident] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

    const statusOptions = [
        { label: 'New', value: 'New' }, { label: 'Under Investigation', value: 'Under Investigation' },
        { label: 'Resolved', value: 'Resolved' }, { label: 'Closed', value: 'Closed' }, { label: 'Dismissed', value: 'Dismissed' }
    ];

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
                    setComplainantAddress(`${parsed.address_house_number||''} ${parsed.address_street||''}, ${parsed.address_subdivision_zone||''}, ${parsed.address_city_municipality||''}`.replace(/ ,/g,',').replace(/^,|,$/g,'').trim() || 'N/A');
                    setComplainantContactNumber(parsed.contact_number || 'N/A');
                } else {
                    Alert.alert("Auth Error", "Please log in.", [{ text: "OK", onPress: () => router.replace('/') }]);
                }
            } catch (e) { Alert.alert("Error", "Failed to load your info."); }
            finally { setIsLoadingInitialData(false); }
        };
        loadUserData();
    }, []);

    const onDateChange = (event, selectedDate) => { setShowDatePicker(Platform.OS === 'ios'); if (event.type === 'set' && selectedDate) setDateOfComplaint(selectedDate); };
    const onTimeChange = (event, selectedTime) => { setShowTimePicker(Platform.OS === 'ios'); if (event.type === 'set' && selectedTime) setTimeOfComplaint(selectedTime); };
    const formatDateForAPI = (date) => date ? date.toISOString().split('T')[0] : null;
    const formatTimeForAPI = (time) => time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

    // Generic resident search API call function
    const searchResidentsAPI = async (query, type) => {
        const trimmedQuery = typeof query === 'string' ? query.trim() : '';
        // For this form, 'type' will always be 'personComplained'
        const setIsLoading = setIsLoadingPersonComplained;
        const setSearchResults = setPersonComplainedSearchResults;

        if (trimmedQuery.length < 2) { setSearchResults([]); setIsLoading(false); return; }
        setIsLoading(true); setSearchResults([]);
        try {
            // Assuming apiRequest handles GET params correctly
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

    // --- Person Complained Against Search Logic ---
    const debouncedPersonComplainedSearch = useCallback(debounce((query) => searchResidentsAPI(query, 'personComplained'), 500), []); // Pass type here

    useEffect(() => {
        if (personComplainedSearchQuery !== selectedPersonComplainedName && selectedPersonComplainedId) {
            setSelectedPersonComplainedId(null);
            setSelectedPersonComplainedIsResident(false);
        }
        if (!personComplainedSearchQuery || personComplainedSearchQuery.trim().length < 2) {
            setPersonComplainedSearchResults([]);
            return;
        }
        // Only trigger search if the query is not just confirming a previous selection or if it's a new manual entry
        if (!selectedPersonComplainedIsResident || personComplainedSearchQuery !== selectedPersonComplainedName) {
            debouncedPersonComplainedSearch(personComplainedSearchQuery);
        } else if (selectedPersonComplainedIsResident && personComplainedSearchQuery === selectedPersonComplainedName) {
            // If query matches selected resident name, clear search results list but keep selection
            setPersonComplainedSearchResults([]);
        }
    }, [personComplainedSearchQuery, selectedPersonComplainedName, selectedPersonComplainedIsResident, debouncedPersonComplainedSearch]); // Added debouncedPersonComplainedSearch to deps

    const selectPersonComplained = (resident) => {
        setSelectedPersonComplainedId(resident._id);
        const name = `${resident.first_name || ''} ${resident.middle_name || ''} ${resident.last_name || ''}`.trim();
        setSelectedPersonComplainedName(name);
        setPersonComplainedSearchQuery(name); // Fill input with selected name
        setSelectedPersonComplainedIsResident(true);
        setPersonComplainedSearchResults([]);
    };
    const clearPersonComplainedSelection = () => {
        setPersonComplainedSearchQuery('');
        setSelectedPersonComplainedId(null);
        setSelectedPersonComplainedName('');
        setSelectedPersonComplainedIsResident(false);
        setPersonComplainedSearchResults([]);
    };

    const validateForm = () => { /* ... same validation logic ... */
        if (!complainantResidentId) { Alert.alert("Error", "Complainant information missing. Please re-login."); return false; }
        if (!dateOfComplaint) { Alert.alert("Validation Error", "Date of Complaint is required."); return false; }
        if (!timeOfComplaint) { Alert.alert("Validation Error", "Time of Complaint is required."); return false; }
        if (!personComplainedSearchQuery.trim()) { Alert.alert("Validation Error", "Person Complained Against is required."); return false; }
        if (!status) { Alert.alert("Validation Error", "Status is required."); return false; }
        if (!notesDescription.trim()) { Alert.alert("Validation Error", "Notes/Description of complaint is required."); return false; }
        return true;
    };

    const saveComplaint = async () => {
        if (!validateForm()) return;
        setIsSaving(true);
        try {
            const payload = {
                complainant_resident_id: complainantResidentId,
                complainant_display_name: complainantDisplayName,
                complainant_address: complainantAddress,
                contact_number: complainantContactNumber,
                date_of_complaint: formatDateForAPI(dateOfComplaint),
                time_of_complaint: formatTimeForAPI(timeOfComplaint),
                person_complained_against_name: personComplainedSearchQuery.trim(), // Name always comes from this input
                person_complained_against_resident_id: selectedPersonComplainedIsResident ? selectedPersonComplainedId : null,
                status: status,
                notes_description: notesDescription.trim(),
            };
            const response = await apiRequest('POST', '/api/complaints', payload);
            if (response && (response.message || response.complaint?._id)) {
                Alert.alert("Success", response.message || "Complaint submitted successfully!");
                // Navigate to a relevant screen, e.g., a list of user's complaints or all complaints
                router.push(loggedInUserData?.isAdmin ? '/complaints' : '/complaints/my-complaints'); // Example conditional navigation
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
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                        <Text style={styles.datePickerButtonText}>{dateOfComplaint.toLocaleDateString('en-CA')}</Text>
                    </TouchableOpacity>
                    {showDatePicker && <DateTimePicker testID="datePicker" value={dateOfComplaint} mode="date" display="default" onChange={onDateChange} />}
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Time of Complaint <Text style={styles.requiredStar}>*</Text></Text>
                     <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}>
                        <Text style={styles.datePickerButtonText}>{timeOfComplaint.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'})}</Text>
                    </TouchableOpacity>
                    {showTimePicker && <DateTimePicker testID="timePicker" value={timeOfComplaint} mode="time" display="default" onChange={onTimeChange} is24Hour={false} />}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Person Complained Against <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        placeholder="Search Resident or Enter Name..."
                        value={personComplainedSearchQuery}
                        onChangeText={setPersonComplainedSearchQuery}
                        style={styles.textInput}
                        onBlur={() => { if(personComplainedSearchResults.length > 0) setTimeout(() => setPersonComplainedSearchResults([]), 200) }}
                    />
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
                    <Text style={styles.label}>Notes / Description <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput placeholder="Describe the complaint..." value={notesDescription} onChangeText={setNotesDescription} style={[styles.textInput, {height: 120}]} multiline textAlignVertical="top"/>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Status</Text>
                    <TextInput value={status} style={[styles.textInput, styles.readOnlyInput]} editable={false} />
                    {/* If status needs to be editable by admin on new form, use Picker:
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={status} onValueChange={setStatus} style={styles.picker}>
                            {statusOptions.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}
                        </Picker>
                    </View>
                    */}
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
// Styles (Keep consistent with previous New screen styles)
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
    datePickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 12, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48 },
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
});

export default NewComplaintScreen;