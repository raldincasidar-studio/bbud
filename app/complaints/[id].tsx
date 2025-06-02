// app/complaints/[id].jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

const ViewComplaintScreen = () => {
    const router = useRouter();
    const { id: complaintId } = useLocalSearchParams();

    const [complaintData, setComplaintData] = useState(null);
    const [editableComplaint, setEditableComplaint] = useState({
        complainant_resident_id: null,
        complainant_display_name: '',
        complainant_address: '',
        contact_number: '',
        date_of_complaint: new Date().toISOString().split('T')[0],
        time_of_complaint: new Date().toTimeString().slice(0,5),
        person_complained_against_name: '',
        person_complained_against_resident_id: null,
        status: 'New',
        notes_description: '',
    });

    const getStatusColor = (status) => {
    const colors = {
        "New": '#2196F3',                 // Blue
        "Under Investigation": '#FF9800', // Orange
        "Resolved": '#4CAF50',            // Green
        "Closed": '#9E9E9E',              // Grey
        "Dismissed": '#F44336',           // Red
        // Add more statuses and their corresponding colors if needed
    };
        return colors[status] || '#757575'; // Default Grey for any other status
    };

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorLoading, setErrorLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [complainantSearchQuery, setComplainantSearchQuery] = useState('');
    const [complainantSearchResults, setComplainantSearchResults] = useState([]);
    const [isLoadingComplainants, setIsLoadingComplainants] = useState(false);

    const [personComplainedSearchQuery, setPersonComplainedSearchQuery] = useState('');
    const [personComplainedSearchResults, setPersonComplainedSearchResults] = useState([]);
    const [isLoadingPersonComplained, setIsLoadingPersonComplained] = useState(false);
    const [selectedPersonComplainedIsResident, setSelectedPersonComplainedIsResident] = useState(false);

    const statusOptions = [
        { label: 'New', value: 'New' }, { label: 'Under Investigation', value: 'Under Investigation' },
        { label: 'Resolved', value: 'Resolved' }, { label: 'Closed', value: 'Closed' }, { label: 'Dismissed', value: 'Dismissed' }
    ];
    // const rules = { /* ... your rules object, or implement manual checks ... */ }; // Define if using form library

    const formatDateForInput = (isoStr, type = 'date') => {
        if (!isoStr) return (type === 'date' ? new Date().toISOString().split('T')[0] : new Date().toTimeString().slice(0,5));
        try {
            const date = new Date(isoStr);
            if (isNaN(date.getTime())) {
                 return (type === 'date' ? new Date().toISOString().split('T')[0] : new Date().toTimeString().slice(0,5));
            }
            if (type === 'date') return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            if (type === 'time') return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            return isoStr;
        } catch (e) { return (type === 'date' ? new Date().toISOString().split('T')[0] : new Date().toTimeString().slice(0,5)); }
    };
    const formatDateForAPI = (dateStr) => { if (!dateStr) return null; return new Date(dateStr).toISOString(); };
    const formatTimeForAPI = (timeStr) => { if (!timeStr) return null; return timeStr; };
    const formatDateForDisplay = (dateStr, includeTime = false) => {
        if(!dateStr)return'N/A';
        try{
            const opt = { year: 'numeric', month: 'long', day: 'numeric' };
            if(includeTime){ opt.hour='2-digit'; opt.minute='2-digit';}
            return new Date(dateStr).toLocaleDateString('en-US',opt);
        } catch(e){ return dateStr; }
    };

    const fetchComplaintDetails = useCallback(async () => {
        if (!complaintId) {
            Alert.alert("Error", "Complaint ID is missing.");
            setIsLoading(false); setRefreshing(false); setErrorLoading(true); return;
        }
        setIsLoading(true); setErrorLoading(false);
        try {
            const response = await apiRequest('GET', `/api/complaints/${complaintId}`);
            if (response && response.complaint) {
                const fetched = response.complaint;
                setComplaintData(fetched); // Store original
                // Prepare editable data more carefully
                const initialEditable = {
                    ...fetched,
                    date_of_complaint: formatDateForInput(fetched.date_of_complaint, 'date'),
                    time_of_complaint: fetched.time_of_complaint || formatDateForInput(new Date().toISOString(), 'time'),
                    complainant_display_name: fetched.complainant_display_name || `${fetched.complainant_details?.first_name || ''} ${fetched.complainant_details?.middle_name || ''} ${fetched.complainant_details?.last_name || ''}`.trim(),
                    person_complained_against_name: fetched.person_complained_against_name || `${fetched.person_complained_details?.first_name || ''} ${fetched.person_complained_details?.middle_name || ''} ${fetched.person_complained_details?.last_name || ''}`.trim(),
                };
                setEditableComplaint(initialEditable);
                setComplainantSearchQuery(initialEditable.complainant_display_name);
                setPersonComplainedSearchQuery(initialEditable.person_complained_against_name);
                setSelectedPersonComplainedIsResident(!!fetched.person_complained_against_resident_id);
            } else {
                setComplaintData(null); setErrorLoading(true);
                Alert.alert("Error", response?.message || response?.error || "Could not fetch complaint details.");
            }
        } catch (error) {
            console.error("Error fetching complaint details:", error);
            setErrorLoading(true); Alert.alert("Error", "An error occurred while fetching details."); setComplaintData(null);
        } finally {
            setIsLoading(false); setRefreshing(false);
        }
    }, [complaintId]);

    useEffect(() => { fetchComplaintDetails(); }, [fetchComplaintDetails]);
    useFocusEffect(fetchComplaintDetails);
    const onRefresh = useCallback(() => { setRefreshing(true); fetchComplaintDetails(); }, [fetchComplaintDetails]);

    const resetEditableData = useCallback(() => {
        if (!complaintData || !complaintData._id) {
             setEditableComplaint({
                complainant_resident_id: null, complainant_display_name: '', complainant_address: '', contact_number: '',
                date_of_complaint: new Date().toISOString().split('T')[0], time_of_complaint: new Date().toTimeString().slice(0,5),
                person_complained_against_name: '', person_complained_against_resident_id: null,
                status: 'New', notes_description: '',
            });
            setComplainantSearchQuery('');
            setPersonComplainedSearchQuery('');
            setSelectedPersonComplainedIsResident(false);
            return;
        }
        const newEditable = {
            ...complaintData,
            date_of_complaint: formatDateForInput(complaintData.date_of_complaint, 'date'),
            time_of_complaint: complaintData.time_of_complaint || formatDateForInput(new Date().toISOString(), 'time'),
            complainant_display_name: complaintData.complainant_display_name || `${complaintData.complainant_details?.first_name || ''} ${complaintData.complainant_details?.middle_name || ''} ${complaintData.complainant_details?.last_name || ''}`.trim(),
            person_complained_against_name: complaintData.person_complained_against_name || `${complaintData.person_complained_details?.first_name || ''} ${complaintData.person_complained_details?.middle_name || ''} ${complaintData.person_complained_details?.last_name || ''}`.trim(),
        };
        setEditableComplaint(newEditable);
        setComplainantSearchQuery(newEditable.complainant_display_name);
        setPersonComplainedSearchQuery(newEditable.person_complained_against_name);
        setSelectedPersonComplainedIsResident(!!complaintData.person_complained_against_resident_id);
        setComplainantSearchResults([]);
        setPersonComplainedSearchResults([]);
    }, [complaintData]);

    const toggleEditMode = (enable) => { setEditMode(enable); if (enable) resetEditableData(); };
    const cancelEdit = () => { setEditMode(false); resetEditableData(); };

    const searchResidentsAPI = useCallback(async (query, type) => {
        const trimmedQuery = typeof query === 'string' ? query.trim() : '';
        const setIsLoading = type === 'complainant' ? setIsLoadingComplainants : setIsLoadingPersonComplained;
        const setSearchResults = type === 'complainant' ? setComplainantSearchResults : setPersonComplainedSearchResults;

        if (trimmedQuery.length < 2) { setSearchResults([]); setIsLoading(false); return; }
        setIsLoading(true); setSearchResults([]);
        try {
            const response = await apiRequest('GET', '/api/residents/search', null, { q: trimmedQuery });
            if (response && response.residents) { setSearchResults(response.residents || []); }
            else { setSearchResults([]); }
        } catch (e) { console.error(`Exception searching ${type}:`, e); setSearchResults([]); }
        finally { setIsLoading(false); }
    }, []);

    // Complainant Search
    const debouncedComplainantSearch = useCallback(debounce((q) => searchResidentsAPI(q, 'complainant'), 500), [searchResidentsAPI]);
    useEffect(() => {
        if (!editMode) return;
        // Check against the current value in editableComplaint, not its previous state
        if (complainantSearchQuery === editableComplaint.complainant_display_name && editableComplaint.complainant_resident_id) {
            if (complainantSearchResults.length > 0) setComplainantSearchResults([]); return;
        }
        if (!complainantSearchQuery || complainantSearchQuery.trim().length < 2) {
            setComplainantSearchResults([]); return;
        }
        debouncedComplainantSearch(complainantSearchQuery);
    }, [complainantSearchQuery, editMode, editableComplaint.complainant_display_name, editableComplaint.complainant_resident_id, debouncedComplainantSearch]);

    const selectComplainant = (res) => {
        const name = `${res.first_name||''} ${res.middle_name||''} ${res.last_name||''}`.trim();
        setEditableComplaint(prev => ({
            ...prev,
            complainant_resident_id: res._id,
            complainant_display_name: name,
            complainant_address: `${res.address_house_number||''} ${res.address_street||''}, ${res.address_subdivision_zone||''}, ${res.address_city_municipality||''}`.replace(/ ,/g,',').replace(/^,|,$/g,'').trim(),
            contact_number: res.contact_number||''
        }));
        setComplainantSearchQuery(name);
        setComplainantSearchResults([]);
    };
    const clearComplainantSelection = () => {
        setComplainantSearchQuery('');
        setEditableComplaint(prev => ({
            ...prev,
            complainant_resident_id: null, complainant_display_name: '',
            complainant_address: '', contact_number: ''
        }));
        setComplainantSearchResults([]);
    };

    // Person Complained Against Search
    const debouncedPersonComplainedSearch = useCallback(debounce((q) => searchResidentsAPI(q, 'personComplained'), 500), [searchResidentsAPI]);
    useEffect(() => {
        if (!editMode) return;
        // When user types in personComplainedSearchQuery, update editableComplaint.person_complained_against_name
        // and if it differs from a previously selected resident, clear the resident ID.
        if (personComplainedSearchQuery !== editableComplaint.person_complained_against_name) {
             setEditableComplaint(prev => ({
                ...prev,
                person_complained_against_name: personComplainedSearchQuery, // Update name from input
                person_complained_against_resident_id: (prev.person_complained_against_name === personComplainedSearchQuery && prev.person_complained_against_resident_id) ? prev.person_complained_against_resident_id : null // Clear ID if name manually changed from selected
            }));
            setSelectedPersonComplainedIsResident(false); // Assume manual entry until new selection
        }


        if (!personComplainedSearchQuery || personComplainedSearchQuery.trim().length < 2) {
            setPersonComplainedSearchResults([]); return;
        }

        // Only search if not confirming a selection or if it's a new manual query
        if (!selectedPersonComplainedIsResident || personComplainedSearchQuery !== editableComplaint.person_complained_against_name) {
            debouncedPersonComplainedSearch(personComplainedSearchQuery);
        } else if (selectedPersonComplainedIsResident && personComplainedSearchQuery === editableComplaint.person_complained_against_name) {
            setPersonComplainedSearchResults([]); // Hide list if query matches current selected name
        }
    }, [personComplainedSearchQuery, editMode, editableComplaint.person_complained_against_name, selectedPersonComplainedIsResident, debouncedPersonComplainedSearch]); // Added selectedPersonComplainedIsResident


    const selectPersonComplained = (res) => {
        const name = `${res.first_name || ''} ${res.middle_name || ''} ${res.last_name || ''}`.trim();
        setEditableComplaint(prev => ({
            ...prev,
            person_complained_against_resident_id: res._id,
            person_complained_against_name: name,
        }));
        setPersonComplainedSearchQuery(name);
        setSelectedPersonComplainedIsResident(true);
        setPersonComplainedSearchResults([]);
    };
    const clearPersonComplainedSelection = () => {
        setPersonComplainedSearchQuery('');
        setEditableComplaint(prev => ({
            ...prev,
            person_complained_against_resident_id: null,
            person_complained_against_name: '',
        }));
        setSelectedPersonComplainedIsResident(false);
        setPersonComplainedSearchResults([]);
    };

    const saveChanges = async () => { /* ... same validation and save logic as before ... */
        if (!editableComplaint.complainant_resident_id) { Alert.alert("Error", "Complainant info is missing."); return; }
        if (!editableComplaint.date_of_complaint || !editableComplaint.time_of_complaint) { Alert.alert("Validation Error", "Date and Time of Complaint are required."); return; }
        if (!editableComplaint.person_complained_against_name?.trim()) { Alert.alert("Validation Error", "Person Complained Against is required."); return; }
        if (!editableComplaint.status) { Alert.alert("Validation Error", "Status is required."); return; }
        if (!editableComplaint.notes_description?.trim()) { Alert.alert("Validation Error", "Notes/Description is required."); return; }

        setIsSaving(true);
        try {
            const complaintDateForAPI = new Date(editableComplaint.date_of_complaint);
            const [hours, minutes] = editableComplaint.time_of_complaint.split(':');
            complaintDateForAPI.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

            const payload = {
                complainant_resident_id: editableComplaint.complainant_resident_id,
                complainant_display_name: editableComplaint.complainant_display_name,
                complainant_address: editableComplaint.complainant_address?.trim(),
                contact_number: editableComplaint.contact_number?.trim(),
                date_of_complaint: complaintDateForAPI.toISOString(),
                time_of_complaint: editableComplaint.time_of_complaint,
                person_complained_against_name: editableComplaint.person_complained_against_name.trim(),
                person_complained_against_resident_id: selectedPersonComplainedIsResident ? editableComplaint.person_complained_against_resident_id : null,
                status: editableComplaint.status,
                notes_description: editableComplaint.notes_description.trim(),
            };
            const { complainant_details, person_complained_details, ...payloadToSend } = payload; // Remove details objects

            const response = await apiRequest('PUT', `/api/complaints/${complaintId}`, payloadToSend);
            if (response && (response.message || response.complaint?._id)) {
                Alert.alert("Success", response.message || "Complaint updated successfully!");
                fetchComplaintDetails();
                setEditMode(false);
            } else { Alert.alert("Error", response?.error || response?.message || "Could not update complaint."); }
        } catch (error) { console.error("Error saving changes:", error); Alert.alert("Error", error.response?.data?.message || error.message || "An unexpected error occurred.");
        } finally { setIsSaving(false); }
    };
    const showDeleteConfirmation = () => { /* ... same ... */ };
    const deleteComplaint = async () => { /* ... same ... */ };


    // --- JSX for rendering ---
    if (isLoading) return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading Complaint...</Text></View>;
    if (errorLoading || !complaintData) return <View style={styles.loaderContainerFullPage}><MaterialCommunityIcons name="alert-circle-outline" size={50} color="red" /><Text style={styles.errorText}>Failed to load complaint details.</Text><TouchableOpacity onPress={fetchComplaintDetails} style={styles.retryButton}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity></View>;

    const displayComplainantName = !editMode && complaintData ? (complaintData.complainant_display_name || `${complaintData.complainant_details?.first_name || ''} ${complaintData.complainant_details?.middle_name || ''} ${complaintData.complainant_details?.last_name || ''}`.trim() || 'N/A') : editableComplaint.complainant_display_name;
    const displayPersonComplained = !editMode && complaintData ? (complaintData.person_complained_against_name || `${complaintData.person_complained_details?.first_name || ''} ${complaintData.person_complained_details?.middle_name || ''} ${complaintData.person_complained_details?.last_name || ''}`.trim() || 'N/A') : editableComplaint.person_complained_against_name;


    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.navbarTitle} numberOfLines={1}>{editMode ? "Edit Complaint" : "Complaint Details"}</Text>
                <View style={{width:28}}/>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}>
                <Text style={styles.sectionTitle}>Complainant Information</Text>
                 <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name:</Text>
                    {editMode && complaintData?.complainant_resident_id ? (
                        <>
                        <TextInput placeholder="Search Complainant..." value={complainantSearchQuery} onChangeText={setComplainantSearchQuery} style={styles.textInput}
                                   onBlur={() => { if(complainantSearchResults.length > 0) setTimeout(() => setComplainantSearchResults([]), 200) }}/>
                        {isLoadingComplainants && <ActivityIndicator style={styles.searchLoader} />}
                        {complainantSearchQuery.trim().length >= 2 && !isLoadingComplainants && (
                            <View style={styles.searchResultsContainer}>
                                {complainantSearchResults.length > 0 ? complainantSearchResults.map((res) => (
                                    <TouchableOpacity key={res._id} style={styles.searchResultItem} onPress={() => selectComplainant(res)}>
                                        <Text>{`${res.first_name} ${res.middle_name || ''} ${res.last_name}`.trim()}</Text>
                                    </TouchableOpacity>
                                )) : <Text style={styles.noResultsTextSmall}>No residents found.</Text>}
                            </View>
                        )}
                        {editableComplaint.complainant_display_name && <Text style={styles.selectedNameHint}>Selected: {editableComplaint.complainant_display_name}</Text>}
                        </>
                    ) : <Text style={styles.detailValueDisplay}>{displayComplainantName}</Text>}
                </View>
                <View style={styles.inputContainer}><Text style={styles.label}>Address:</Text>{editMode ? <TextInput value={editableComplaint.complainant_address} onChangeText={val => setEditableComplaint(prev => ({...prev, complainant_address: val}))} style={styles.textInput} multiline/> : <Text style={styles.detailValueDisplay}>{editableComplaint.complainant_address || 'N/A'}</Text>}</View>
                <View style={styles.inputContainer}><Text style={styles.label}>Contact No.:</Text>{editMode ? <TextInput value={editableComplaint.contact_number} onChangeText={val => setEditableComplaint(prev => ({...prev, contact_number: val}))} style={styles.textInput} keyboardType="phone-pad"/> : <Text style={styles.detailValueDisplay}>{editableComplaint.contact_number || 'N/A'}</Text>}</View>

                <Text style={styles.sectionTitle}>Complaint Details</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Date of Complaint <Text style={editMode && styles.requiredStar}>*</Text></Text>
                    {editMode ? (
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                            <Text style={styles.datePickerButtonText}>{new Date(editableComplaint.date_of_complaint || Date.now()).toLocaleDateString('en-CA')}</Text>
                        </TouchableOpacity>
                    ) : <Text style={styles.detailValueDisplay}>{formatDateForDisplay(new Date(editableComplaint.date_of_complaint))}</Text>}
                    {showDatePicker && editMode && <DateTimePicker value={new Date(editableComplaint.date_of_complaint || Date.now())} mode="date" display="default" onChange={(e,d) => {setShowDatePicker(Platform.OS === 'ios'); if(e.type==='set'&&d)setEditableComplaint(p=>({...p,date_of_complaint:d.toISOString().split('T')[0]}))}} />}
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Time of Complaint <Text style={editMode && styles.requiredStar}>*</Text></Text>
                     {editMode ? (
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}>
                            <Text style={styles.datePickerButtonText}>{editableComplaint.time_of_complaint || new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</Text>
                        </TouchableOpacity>
                    ) : <Text style={styles.detailValueDisplay}>{editableComplaint.time_of_complaint || 'N/A'}</Text>}
                    {showTimePicker && editMode && <DateTimePicker value={new Date(`1970-01-01T${editableComplaint.time_of_complaint || '00:00'}`)} mode="time" display="default" onChange={(e,t)=>{setShowTimePicker(Platform.OS === 'ios'); if(e.type==='set'&&t)setEditableComplaint(p=>({...p,time_of_complaint:t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).replace(/\s(A|P)M$/,'')}));}} is24Hour={Platform.OS === 'ios' ? false : true}/>}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Person Complained Against <Text style={editMode && styles.requiredStar}>*</Text></Text>
                     {editMode ? (
                        <>
                        <TextInput placeholder="Search Resident or Enter Name..." value={personComplainedSearchQuery} onChangeText={setPersonComplainedSearchQuery} style={styles.textInput}
                                   onBlur={() => { if(personComplainedSearchResults.length > 0) setTimeout(() => setPersonComplainedSearchResults([]), 200) }}/>
                        {isLoadingPersonComplained && <ActivityIndicator style={styles.searchLoader} />}
                        {personComplainedSearchQuery.trim().length >= 2 && !isLoadingPersonComplained && !selectedPersonComplainedIsResident && (
                            <View style={styles.searchResultsContainer}>
                                {personComplainedSearchResults.length > 0 ? personComplainedSearchResults.map((res) => (
                                    <TouchableOpacity key={res._id} style={styles.searchResultItem} onPress={() => selectPersonComplained(res)}>
                                        <Text>{`${res.first_name} ${res.middle_name || ''} ${res.last_name}`.trim()}</Text>
                                    </TouchableOpacity>
                                )) : <Text style={styles.noResultsTextSmall}>No residents. Enter name manually.</Text>}
                            </View>
                        )}
                        {editableComplaint.person_complained_against_name && <Text style={styles.selectedNameHint}>{selectedPersonComplainedIsResident ? "Selected Resident: " : "Entered Name: "}{editableComplaint.person_complained_against_name}</Text>}
                        </>
                    ) : <Text style={styles.detailValueDisplay}>{displayPersonComplained}</Text>}
                </View>

                <View style={styles.inputContainer}><Text style={styles.label}>Notes / Description <Text style={editMode && styles.requiredStar}>*</Text></Text>{editMode ? <TextInput placeholder="Describe complaint..." value={editableComplaint.notes_description} onChangeText={val => setEditableComplaint(prev => ({...prev, notes_description: val}))} style={[styles.textInput, {height:120}]} multiline textAlignVertical="top"/> : <Text style={styles.detailValueDisplay}>{editableComplaint.notes_description || 'N/A'}</Text>}</View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Status <Text style={editMode && styles.requiredStar}>*</Text></Text>
                    {editMode ? (
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={editableComplaint.status} onValueChange={val => setEditableComplaint(prev => ({...prev, status: val}))} style={styles.picker}>
                                {statusOptions.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}
                            </Picker>
                        </View>
                    ) : <Text style={[styles.detailValueDisplay, { color: getStatusColor(editableComplaint.status), fontWeight: 'bold'}]}>{editableComplaint.status || 'N/A'}</Text>}
                </View>

                 {!editMode && complaintData.created_at && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Filed On:</Text>
                        <Text style={styles.detailValueDisplay}>{formatDateForDisplay(complaintData.created_at, true)}</Text>
                    </View>
                )}
                 {!editMode && complaintData.updated_at && complaintData.updated_at !== complaintData.created_at && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Last Updated:</Text>
                        <Text style={styles.detailValueDisplay}>{formatDateForDisplay(complaintData.updated_at, true)}</Text>
                    </View>
                )}
            </ScrollView>
            {/* Delete button in header actions, confirmation handled by Alert */}
        </SafeAreaView>
    );
};

// Styles
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F7FC' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7' },
    navbarTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    scrollView: { flex: 1 },
    scrollViewContent: { padding: 15, paddingBottom: 30 },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    errorText: { marginTop: 10, fontSize: 16, color: 'red', textAlign: 'center' },
    retryButton: { backgroundColor: '#0F00D7', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5, marginTop:15 },
    retryButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold'},
    inputContainer: { marginBottom: 15 },
    label: { color: '#444', fontSize: 15, marginBottom: 7, fontWeight: '500' },
    requiredStar: { color: 'red' },
    textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, fontSize: 16, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, color: '#333', backgroundColor: '#F9F9F9' },
    readOnlyInput: { backgroundColor: '#ECEFF1', color: '#546E7A' },
    pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
    picker: { height: 50, width: '100%', color: '#333' },
    datePickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 12, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48 },
    datePickerButtonText: { fontSize: 16, color: '#333' },
    detailValueDisplay: { fontSize: 16, color: '#333', paddingVertical: Platform.OS === 'ios' ? 13 : 11, paddingHorizontal: 12, borderWidth:1, borderColor: '#F0F0F0', borderRadius: 8, backgroundColor: '#F9F9F9', minHeight: 48, textAlignVertical: 'center'},
    sectionTitle: { fontSize: 17, fontWeight: '600', color: '#0F00D7', marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 6},
    searchResultsContainer: { marginTop: 5, borderColor: '#DDD', borderWidth: 1, borderRadius: 8, maxHeight: 150, backgroundColor: 'white', zIndex: 1000, /* position: 'absolute', top: '100%', left:0, right:0 */ },
    searchResultItem: { padding: 12, borderBottomWidth: 1, borderColor: '#EEE' },
    searchLoader: { marginVertical: 5 },
    noResultsTextSmall: { textAlign: 'center', color: '#777', padding: 8, fontSize: 13 },
    selectedNameHint: { fontSize: 13, color: 'green', marginTop: 5, marginLeft: 2 },
    // getStatusColor is used inline
});

export default ViewComplaintScreen;