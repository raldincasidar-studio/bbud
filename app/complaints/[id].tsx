// app/document-requests/[id].jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; // For date picker in edit mode
import { Picker } from '@react-native-picker/picker'; // For status and type dropdowns in edit mode
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

const ViewDocumentRequestScreen = () => {
    const router = useRouter();
    const { id: documentRequestId } = useLocalSearchParams();

    const [requestData, setRequestData] = useState(null); // Original fetched data for display
    const [editableRequest, setEditableRequest] = useState({ // For form binding in edit mode
        request_type: '',
        requestor_resident_id: null,
        requestor_display_name: '',
        requestor_address: '',
        requestor_contact_number: '',
        date_of_request: new Date().toISOString().split('T')[0],
        purpose_of_request: '',
        requested_by_resident_id: null,
        requested_by_display_name: '',
        document_status: 'Pending',
    });

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorLoading, setErrorLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false); // For RN Alert confirmation

    const [showDatePicker, setShowDatePicker] = useState(false);

    // Requestor search state (for edit mode)
    const [requestorSearchQuery, setRequestorSearchQuery] = useState('');
    const [requestorSearchResults, setRequestorSearchResults] = useState([]);
    const [isLoadingRequestors, setIsLoadingRequestors] = useState(false);

    // Requested By (Personnel) search state (for edit mode)
    const [processedBySearchQuery, setProcessedBySearchQuery] = useState('');
    const [processedBySearchResults, setProcessedBySearchResults] = useState([]);
    const [isLoadingProcessedBy, setIsLoadingProcessedBy] = useState(false);
    const [selectedProcessedByIsResident, setSelectedProcessedByIsResident] = useState(false);

    const documentTypeOptions = [
        { label: 'Select Document Type', value: '' },
        { label: 'Barangay Clearance', value: 'Barangay Clearance' },
        { label: 'Certificate of Indigency', value: 'Certificate of Indigency' },
        { label: 'Certificate of Residency', value: 'Certificate of Residency' },
        { label: 'Business Permit Application', value: 'Business Permit Application' },
        { label: 'Certificate of Good Moral Character', value: 'Certificate of Good Moral Character' },
    ];
    const statusOptions = [
        { label: 'Pending', value: 'Pending' }, { label: 'Processing', value: 'Processing' },
        { label: 'Ready for Pickup', value: 'Ready for Pickup' }, { label: 'Released', value: 'Released' },
        { label: 'Denied', value: 'Denied' }, { label: 'Cancelled', value: 'Cancelled' },
    ];

    const fetchDocumentRequestDetails = async () => {
        if (!documentRequestId) {
            Alert.alert("Error", "Document Request ID is missing.");
            setIsLoading(false); setRefreshing(false); setErrorLoading(true); return;
        }
        setIsLoading(true); setErrorLoading(false);
        try {
            const response = await apiRequest('GET', `/api/document-requests/${documentRequestId}`);
            if (response && response.request) {
                setRequestData(response.request);
                resetEditableData(response.request);
            } else {
                setRequestData(null); setErrorLoading(true);
                Alert.alert("Error", response?.message || response?.error || "Could not fetch document request details.");
            }
        } catch (error) {
            console.error("Error fetching document request details:", error);
            setErrorLoading(true); Alert.alert("Error", "An error occurred while fetching details."); setRequestData(null);
        } finally {
            setIsLoading(false); setRefreshing(false);
        }
    };

    useEffect(() => { fetchDocumentRequestDetails(); }, [documentRequestId]);
    useFocusEffect(useCallback(() => { fetchDocumentRequestDetails(); return () => {}; }, [documentRequestId]));
    const onRefresh = useCallback(() => { setRefreshing(true); fetchDocumentRequestDetails(); }, [documentRequestId]);

    const formatDateForInput = (isoStr) => {
        if (!isoStr) return new Date().toISOString().split('T')[0]; // Default to today if null
        try { const date = new Date(isoStr); return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`; }
        catch (e) { return new Date().toISOString().split('T')[0]; }
    };
    const formatDateForAPI = (dateStr) => { if (!dateStr) return null; return new Date(dateStr).toISOString(); };
     const formatDateForDisplay = (dateStr, includeTime = false) => {
        if (!dateStr) return 'N/A';
        try { const opt = { year: 'numeric', month: 'long', day: 'numeric' }; if(includeTime){opt.hour='2-digit'; opt.minute='2-digit';} return new Date(dateStr).toLocaleDateString('en-US', opt); }
        catch (e) { return dateStr; }
    };


    const resetEditableData = (sourceData = requestData) => {
        if (!sourceData || !sourceData._id) {
            setEditableRequest({
                request_type: '', requestor_resident_id: null, requestor_display_name: '', requestor_address: '',
                requestor_contact_number: '', date_of_request: formatDateForInput(new Date().toISOString()),
                purpose_of_request: '', requested_by_resident_id: null, requested_by_display_name: '', document_status: 'Pending',
            });
            setRequestorSearchQuery('');
            setProcessedBySearchQuery('');
            setSelectedProcessedByIsResident(false);
            return;
        }
        setEditableRequest({
            ...sourceData,
            date_of_request: formatDateForInput(sourceData.date_of_request),
            // Ensure linked display names are populated from source or details
            requestor_display_name: sourceData.requestor_display_name || `${sourceData.requestor_details?.first_name || ''} ${sourceData.requestor_details?.middle_name || ''} ${sourceData.requestor_details?.last_name || ''}`.trim(),
            requested_by_display_name: sourceData.requested_by_display_name || `${sourceData.requested_by_details?.first_name || ''} ${sourceData.requested_by_details?.middle_name || ''} ${sourceData.requested_by_details?.last_name || ''}`.trim(),
        });
        setRequestorSearchQuery(editableRequest.value.requestor_display_name);
        setProcessedBySearchQuery(editableRequest.value.requested_by_display_name);
        setSelectedProcessedByIsResident(!!editableRequest.value.requested_by_resident_id);
        setRequestorSearchResults([]);
        setProcessedBySearchResults([]);
    };

    const toggleEditMode = (enable) => { setEditMode(enable); if (enable) resetEditableData(requestData); else resetEditableData(requestData); }; // Reset from original on cancel
    const cancelEdit = () => { setEditMode(false); resetEditableData(requestData); };


    const searchResidentsAPI = async (query, type) => { /* ... same as new.jsx ... */ };
    // Requestor Search
    const debouncedRequestorSearch = useCallback(debounce((q) => searchResidentsAPI(q, 'requestor'), 500), []);
    useEffect(() => { if(editMode){ if (requestorSearchQuery === editableRequest.requestor_display_name && editableRequest.requestor_resident_id) { if (requestorSearchResults.length > 0) setRequestorSearchResults([]); return; } if (!requestorSearchQuery || requestorSearchQuery.trim().length < 2) { setRequestorSearchResults([]); return; } debouncedRequestorSearch(requestorSearchQuery); }}, [requestorSearchQuery, editMode, editableRequest.requestor_display_name]);
    const selectRequestor = (res) => { setEditableRequest(prev => ({ ...prev, requestor_resident_id: res._id, requestor_display_name: `${res.first_name||''} ${res.middle_name||''} ${res.last_name||''}`.trim(), requestor_address: `${res.address_house_number||''} ${res.address_street||''}, ${res.address_subdivision_zone||''}, ${res.address_city_municipality||''}`.replace(/ ,/g,',').replace(/^,|,$/g,'').trim(), requestor_contact_number: res.contact_number||'' })); setRequestorSearchQuery(editableRequest.value.requestor_display_name); setRequestorSearchResults([]); };
    const clearRequestorSelection = () => { setRequestorSearchQuery(''); setEditableRequest(prev => ({ ...prev, requestor_resident_id: null, requestor_display_name: '', requestor_address: '', requestor_contact_number: ''})); setRequestorSearchResults([]); };

    // Requested By (Personnel) Search
    const debouncedProcessedBySearch = useCallback(debounce((q) => searchResidentsAPI(q, 'processedBy'), 500), []);
    useEffect(() => { if(editMode){ if (processedBySearchQuery !== editableRequest.requested_by_display_name && editableRequest.requested_by_resident_id) { setEditableRequest(prev => ({...prev, requested_by_resident_id: null})); setSelectedProcessedByIsResident(false); } setEditableRequest(prev => ({...prev, requested_by_display_name: processedBySearchQuery})); if (!processedBySearchQuery || processedBySearchQuery.trim().length < 2) { setProcessedBySearchResults([]); return; } if (!selectedProcessedByIsResident || processedBySearchQuery !== editableRequest.requested_by_display_name) { debouncedProcessedBySearch(processedBySearchQuery); } else if (selectedProcessedByIsResident && processedBySearchQuery === editableRequest.requested_by_display_name) { setProcessedBySearchResults([]); }}}, [processedBySearchQuery, editMode]);
    const selectProcessedBy = (res) => { setEditableRequest(prev => ({...prev, requested_by_resident_id: res._id, requested_by_display_name: `${res.first_name||''} ${res.middle_name||''} ${res.last_name||''}`.trim()})); setProcessedBySearchQuery(editableRequest.value.requested_by_display_name); setSelectedProcessedByIsResident(true); setProcessedBySearchResults([]); };
    const clearProcessedBySelection = () => { setProcessedBySearchQuery(''); setEditableRequest(prev => ({...prev, requested_by_resident_id: null, requested_by_display_name: ''})); setSelectedProcessedByIsResident(false); setProcessedBySearchResults([]); };


    const saveChanges = async () => {
        // Manual validation (add more checks as needed)
        if (!editableRequest.request_type || !editableRequest.requestor_resident_id || !editableRequest.requestor_address?.trim() || !editableRequest.requestor_contact_number?.trim() || !editableRequest.date_of_request || !editableRequest.purpose_of_request?.trim() || !editableRequest.document_status) {
            Alert.alert("Validation Error", "Please fill all required fields and select a requestor."); return;
        }
        if (!editableRequest.requested_by_display_name?.trim() && selectedProcessedByIsResident) { // If was resident but name cleared
            Alert.alert("Validation Error", "Requested By name is required if a personnel was selected."); return;
        }


        setIsSaving(true);
        try {
            const payload = {
                request_type: editableRequest.request_type,
                requestor_resident_id: editableRequest.requestor_resident_id,
                requestor_display_name: editableRequest.requestor_display_name,
                requestor_address: editableRequest.requestor_address.trim(),
                requestor_contact_number: editableRequest.requestor_contact_number.trim(),
                date_of_request: formatDateForAPI(editableRequest.date_of_request),
                purpose_of_request: editableRequest.purpose_of_request.trim(),
                requested_by_resident_id: selectedProcessedByIsResident ? editableRequest.requested_by_resident_id : null,
                requested_by_display_name: editableRequest.requested_by_display_name?.trim() || null,
                document_status: editableRequest.document_status,
            };
            // Remove _id, created_at, updated_at, and details objects from payload if they exist
            delete payload._id; delete payload.created_at; delete payload.updated_at;
            delete payload.requestor_details; delete payload.requested_by_details;


            const response = await apiRequest('PUT', `/api/document-requests/${documentRequestId}`, payload);
            if (response && (response.message || response.request?._id)) {
                Alert.alert("Success", response.message || "Request updated successfully!");
                fetchDocumentRequestDetails(); // Re-fetch to show updated data in view mode
                setEditMode(false);
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not update request.");
            }
        } catch (error) {
            console.error("Error saving changes:", error);
            Alert.alert("Error", error.response?.data?.message || error.message || "An unexpected error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteRequest = async () => {
        Alert.alert( "Confirm Delete", "Are you sure you want to delete this document request?",
            [ { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: async () => {
                    setIsDeleting(true);
                    try { /* ... delete API call ... */ 
                        const response = await apiRequest('DELETE', `/api/document-requests/${documentRequestId}`);
                        if (response && response.message) { Alert.alert("Success", response.message); router.push('/document-requests'); }
                        else { Alert.alert("Error", response?.error || "Could not delete request."); }
                    } catch (e) { Alert.alert("Error", "An error occurred.");}
                    finally { setIsDeleting(false); setConfirmDeleteDialog(false); }
                }}
            ]
        );
    };

    // --- Date Picker specific for this form's date_of_request ---
    const onFormDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (event.type === 'set' && selectedDate) {
            setEditableRequest(prev => ({ ...prev, date_of_request: formatDateForInput(selectedDate.toISOString()) }));
        }
    };
    const showFormDatePicker = () => setShowDatePicker(true);


    // --- JSX for rendering ---
    if (isLoading) return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" /><Text>Loading...</Text></View>;
    if (errorLoading || !requestData) return <View style={styles.loaderContainerFullPage}><Text>Error loading request.</Text><TouchableOpacity onPress={fetchDocumentRequestDetails}><Text>Try Again</Text></TouchableOpacity></View>;


    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.navbarTitle} numberOfLines={1} ellipsizeMode="tail">{editMode ? "Edit Request" : (editableRequest.request_type || "Request Details")}</Text>
                <View style={{width:28}}/>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {/* Document Type */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Document Type <Text style={editMode && styles.requiredStar}>*</Text></Text>
                    {editMode ? (
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={editableRequest.request_type} onValueChange={(val) => setEditableRequest(prev => ({ ...prev, request_type: val }))} style={styles.picker}>
                                {documentTypeOptions.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}
                            </Picker>
                        </View>
                    ) : <Text style={styles.detailValueDisplay}>{editableRequest.request_type || 'N/A'}</Text>}
                </View>

                {/* Date of Request */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Date of Request <Text style={editMode && styles.requiredStar}>*</Text></Text>
                    {editMode ? (
                        <>
                        <TouchableOpacity onPress={showFormDatePicker} style={styles.datePickerButton}>
                            <Text style={styles.datePickerButtonText}>{formatDateForDisplay(new Date(editableRequest.date_of_request || Date.now()))}</Text>
                        </TouchableOpacity>
                        {showDatePicker && <DateTimePicker value={new Date(editableRequest.date_of_request || Date.now())} mode="date" display="default" onChange={onFormDateChange} />}
                        </>
                    ) : <Text style={styles.detailValueDisplay}>{formatDateForDisplay(new Date(editableRequest.date_of_request))}</Text>}
                </View>


                <Text style={styles.sectionTitle}>Requestor Information</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name of Requestor <Text style={editMode && styles.requiredStar}>*</Text></Text>
                    {editMode ? (
                        <>
                        <TextInput placeholder="Search Requestor..." value={requestorSearchQuery} onChangeText={setRequestorSearchQuery} style={styles.textInput} 
                                   onBlur={() => { if(requestorSearchResults.length > 0) setTimeout(() => setRequestorSearchResults([]), 200) }}/>
                        {isLoadingRequestors && <ActivityIndicator style={styles.searchLoader} />}
                        {requestorSearchQuery.trim().length >= 2 && !isLoadingRequestors && (
                            <View style={styles.searchResultsContainer}>
                                {requestorSearchResults.length > 0 ? requestorSearchResults.map((res) => (
                                    <TouchableOpacity key={res._id} style={styles.searchResultItem} onPress={() => selectRequestor(res)}>
                                        <Text>{`${res.first_name} ${res.middle_name || ''} ${res.last_name}`.trim()}</Text>
                                    </TouchableOpacity>
                                )) : <Text style={styles.noResultsTextSmall}>No residents found.</Text>}
                            </View>
                        )}
                        {editableRequest.requestor_display_name && <Text style={styles.selectedNameHint}>Selected: {editableRequest.requestor_display_name}</Text>}
                        </>
                    ) : <Text style={styles.detailValueDisplay}>{editableRequest.requestor_display_name || 'N/A'}</Text>}
                </View>
                <View style={styles.inputContainer}><Text style={styles.label}>Address <Text style={editMode && styles.requiredStar}>*</Text></Text>{editMode ? <TextInput placeholder="Address" value={editableRequest.requestor_address} onChangeText={val => setEditableRequest(prev => ({...prev, requestor_address: val}))} style={styles.textInput} multiline/> : <Text style={styles.detailValueDisplay}>{editableRequest.requestor_address || 'N/A'}</Text>}</View>
                <View style={styles.inputContainer}><Text style={styles.label}>Contact No. <Text style={editMode && styles.requiredStar}>*</Text></Text>{editMode ? <TextInput placeholder="Contact No." value={editableRequest.requestor_contact_number} onChangeText={val => setEditableRequest(prev => ({...prev, requestor_contact_number: val}))} style={styles.textInput} keyboardType="phone-pad"/> : <Text style={styles.detailValueDisplay}>{editableRequest.requestor_contact_number || 'N/A'}</Text>}</View>


                <Text style={styles.sectionTitle}>Request Details</Text>
                <View style={styles.inputContainer}><Text style={styles.label}>Purpose <Text style={editMode && styles.requiredStar}>*</Text></Text>{editMode ? <TextInput placeholder="Purpose of request" value={editableRequest.purpose_of_request} onChangeText={val => setEditableRequest(prev => ({...prev, purpose_of_request: val}))} style={[styles.textInput, {height:100}]} multiline textAlignVertical="top"/> : <Text style={styles.detailValueDisplay}>{editableRequest.purpose_of_request || 'N/A'}</Text>}</View>
                
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Requested By (Personnel - Optional)</Text>
                     {editMode ? (
                        <>
                        <TextInput placeholder="Search Personnel or Enter Name..." value={processedBySearchQuery} onChangeText={setProcessedBySearchQuery} style={styles.textInput} 
                                    onBlur={() => { if(processedBySearchResults.length > 0) setTimeout(() => setProcessedBySearchResults([]), 200) }}/>
                        {isLoadingProcessedBy && <ActivityIndicator style={styles.searchLoader} />}
                        {processedBySearchQuery.trim().length >= 2 && !isLoadingProcessedBy && !selectedProcessedByIsResident && (
                             <View style={styles.searchResultsContainer}>
                                {processedBySearchResults.length > 0 ? processedBySearchResults.map((res) => (
                                    <TouchableOpacity key={res._id} style={styles.searchResultItem} onPress={() => selectProcessedBy(res)}>
                                        <Text>{`${res.first_name} ${res.middle_name || ''} ${res.last_name}`.trim()}</Text>
                                    </TouchableOpacity>
                                )) : <Text style={styles.noResultsTextSmall}>No personnel. Enter name manually.</Text>}
                            </View>
                        )}
                        {editableRequest.requested_by_display_name && <Text style={styles.selectedNameHint}>{selectedProcessedByIsResident ? "Selected: " : "Entered: "}{editableRequest.requested_by_display_name}</Text>}
                        </>
                    ) : <Text style={styles.detailValueDisplay}>{editableRequest.requested_by_display_name || 'N/A'}</Text>}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Document Status <Text style={editMode && styles.requiredStar}>*</Text></Text>
                    {editMode ? (
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={editableRequest.document_status} onValueChange={val => setEditableRequest(prev => ({...prev, document_status: val}))} style={styles.picker}>
                                {statusOptions.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}
                            </Picker>
                        </View>
                    ) : <Text style={[styles.detailValueDisplay, { color: getStatusColor(editableRequest.document_status), fontWeight: 'bold'}]}>{editableRequest.document_status || 'N/A'}</Text>}
                </View>

                {!editMode && requestData.created_at && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Filed On:</Text>
                        <Text style={styles.detailValueDisplay}>{formatDateForDisplay(requestData.created_at, true)}</Text>
                    </View>
                )}
                 {!editMode && requestData.updated_at && requestData.updated_at !== requestData.created_at && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Last Updated:</Text>
                        <Text style={styles.detailValueDisplay}>{formatDateForDisplay(requestData.updated_at, true)}</Text>
                    </View>
                )}
            </ScrollView>
            {/* Delete Dialog (Using React Native Alert for simplicity here) */}
        </SafeAreaView>
    );
};

// Styles (Combine and refine styles from new.jsx and view/edit pattern)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F7FC' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7' },
    navbarTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    scrollView: { flex: 1 },
    scrollViewContent: { padding: 15, paddingBottom: 30 },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }, // Added for full page loading
    inputContainer: { marginBottom: 15 },
    label: { color: '#444', fontSize: 15, marginBottom: 7, fontWeight: '500' },
    requiredStar: { color: 'red' },
    textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, fontSize: 16, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, color: '#333', backgroundColor: '#F9F9F9' },
    pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
    picker: { height: 50, width: '100%', color: '#333' },
    datePickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 12, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48 },
    datePickerButtonText: { fontSize: 16, color: '#333' },
    detailValueDisplay: { fontSize: 16, color: '#333', paddingVertical: Platform.OS === 'ios' ? 13 : 11, paddingHorizontal: 5, borderWidth:1, borderColor: '#F0F0F0', borderRadius: 8, backgroundColor: '#F9F9F9', minHeight: 48 },
    sectionTitle: { fontSize: 17, fontWeight: '600', color: '#0F00D7', marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 6},
    searchResultsContainer: { marginTop: 5, borderColor: '#DDD', borderWidth: 1, borderRadius: 8, maxHeight: 150, backgroundColor: 'white', zIndex: 1000, /* position: 'absolute', top: 60, left:0, right:0 */ },
    searchResultItem: { padding: 12, borderBottomWidth: 1, borderColor: '#EEE' },
    searchLoader: { marginVertical: 5 },
    noResultsTextSmall: { textAlign: 'center', color: '#777', padding: 8, fontSize: 13 },
    selectedNameHint: { fontSize: 13, color: 'green', marginTop: 5, marginLeft: 2 },
    // Re-add getStatusColor if it was removed
    // getStatusColor: (status) => { /* ... your status color logic ... */ },
});

export default ViewDocumentRequestScreen;