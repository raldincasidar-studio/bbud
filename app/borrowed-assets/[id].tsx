// app/borrowed-assets/[id].jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Debounce utility (if needed for any future search additions, currently not used here)
// function debounce(func, delay) { /* ... */ }

const ViewBorrowAssetScreen = () => {
    const router = useRouter();
    const { id: transactionId } = useLocalSearchParams();

    const [transactionData, setTransactionData] = useState(null);
    const [editableTransaction, setEditableTransaction] = useState({
        status: '',
        date_returned: null, // Store as Date object or null
        return_condition: '',
        notes: '',
        // Fields below are mostly for display from transactionData, not directly edited in this screen's primary flow
        item_borrowed: '',
        borrower_display_name: '',
        borrow_datetime: '',
        borrowed_from_personnel: '',
    });

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorLoading, setErrorLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    // No separate state for delete dialog, using Alert.alert

    const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);

    const statusOptions = [
        { label: 'Borrowed', value: 'Borrowed' },
        { label: 'Returned', value: 'Returned' },
        { label: 'Overdue', value: 'Overdue' },
        { label: 'Damaged', value: 'Damaged' },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Borrowed': return '#4CAF50'; // Green
            case 'Returned': return '#2196F3'; // Blue
            case 'Overdue': return '#FF9800'; // Orange
            case 'Damaged': return '#F44336'; // Red
            default: return '#9E9E9E'; // Gray
        }
    };

    const formatDateForInput = (isoOrDate) => {
        if (!isoOrDate) return ''; // Return empty string for null/undefined dates
        try {
            const date = new Date(isoOrDate);
            if (isNaN(date.getTime())) return ''; // Invalid date
            return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        } catch (e) { return ''; }
    };

    const formatDateTimeForInput = (isoOrDate) => { // For datetime-local if needed, or just display
        if (!isoOrDate) return '';
        try {
            const date = new Date(isoOrDate);
            if (isNaN(date.getTime())) return '';
             return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        } catch (e) { return ''; }
    }


    const formatDateForDisplay = (dateStr, includeTime = true) => {
        if (!dateStr) return 'N/A';
        try {
            const opt = { year: 'numeric', month: 'long', day: 'numeric' };
            if (includeTime) { opt.hour = '2-digit'; opt.minute = '2-digit'; }
            return new Date(dateStr).toLocaleDateString('en-US', opt);
        } catch (e) { return dateStr; }
    };
    const formatDateForAPI = (dateObj) => { // Expects a Date object or null
        if (!dateObj) return null;
        return dateObj.toISOString();
    };


    const fetchTransactionDetails = useCallback(async () => {
        if (!transactionId) {
            Alert.alert("Error", "Transaction ID is missing.");
            setIsLoading(false); setRefreshing(false); setErrorLoading(true); return;
        }
        setIsLoading(true); setErrorLoading(false);
        try {
            const response = await apiRequest('GET', `/api/borrowed-assets/${transactionId}`);
            if (response && response.transaction) {
                setTransactionData(response.transaction); // Store original for view mode
                // Populate editableTransaction based on fetched data
                setEditableTransaction({
                    _id: response.transaction._id,
                    status: response.transaction.status || 'Borrowed',
                    // Use formatDateTimeForInput if date_returned is full datetime, else formatDateForInput
                    date_returned: response.transaction.date_returned ? formatDateForInput(response.transaction.date_returned) : null,
                    return_condition: response.transaction.return_condition || '',
                    notes: response.transaction.notes || '',
                    // Display fields (usually not edited here but needed for context)
                    item_borrowed: response.transaction.item_borrowed || 'N/A',
                    borrower_display_name: response.transaction.borrower_name || response.transaction.borrower_display_name || 'N/A',
                    borrow_datetime: response.transaction.borrow_datetime || '',
                    borrowed_from_personnel: response.transaction.borrowed_from_personnel || 'N/A',
                });
            } else {
                setTransactionData(null); setErrorLoading(true);
                Alert.alert("Error", response?.message || response?.error || "Could not fetch transaction details.");
            }
        } catch (error) {
            console.error("Error fetching transaction details:", error);
            setErrorLoading(true); Alert.alert("Error", "An error occurred while fetching details."); setTransactionData(null);
        } finally {
            setIsLoading(false); setRefreshing(false);
        }
    }, [transactionId]);

    useEffect(() => { fetchTransactionDetails(); }, [fetchTransactionDetails]);
    useFocusEffect(fetchTransactionDetails);
    const onRefresh = useCallback(() => { setRefreshing(true); fetchTransactionDetails(); }, [fetchTransactionDetails]);


    const resetEditableData = useCallback(() => { // Reset to the original fetched data
        if (!transactionData || !transactionData._id) {
             setEditableTransaction({ status: 'Borrowed', date_returned: null, return_condition: '', notes: '', item_borrowed: '', borrower_display_name: '', borrow_datetime: '', borrowed_from_personnel: '' });
            return;
        }
        setEditableTransaction({
            _id: transactionData._id,
            status: transactionData.status || 'Borrowed',
            date_returned: transactionData.date_returned ? formatDateForInput(transactionData.date_returned) : null,
            return_condition: transactionData.return_condition || '',
            notes: transactionData.notes || '',
            item_borrowed: transactionData.item_borrowed || 'N/A',
            borrower_display_name: transactionData.borrower_name || transactionData.borrower_display_name || 'N/A',
            borrow_datetime: transactionData.borrow_datetime || '',
            borrowed_from_personnel: transactionData.borrowed_from_personnel || 'N/A',
        });
    }, [transactionData]);

    const toggleEditMode = (enable) => { setEditMode(enable); if (enable) resetEditableData(); };
    const cancelEdit = () => { setEditMode(false); resetEditableData(); };

    const onReturnDateChange = (event, selectedDate) => {
        setShowReturnDatePicker(Platform.OS === 'ios'); // Keep picker open on iOS until done
        if (event.type === 'set' && selectedDate) {
            setEditableTransaction(prev => ({ ...prev, date_returned: formatDateForInput(selectedDate.toISOString()) }));
        } else if (event.type === 'dismissed' && Platform.OS !== 'ios') {
            // On Android, dismissed means user cancelled
            setShowReturnDatePicker(false);
        }
    };

    const saveChanges = async () => {
        if ((editableTransaction.status === 'Returned' || editableTransaction.status === 'Damaged') && !editableTransaction.date_returned) {
            Alert.alert("Validation Error", "Date Returned is required if status is 'Returned' or 'Damaged'.");
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                status: editableTransaction.status,
                // Convert YYYY-MM-DD string back to a Date object then to ISO string for API
                date_returned: editableTransaction.date_returned ? formatDateForAPI(new Date(editableTransaction.date_returned)) : null,
                return_condition: editableTransaction.return_condition?.trim() || null,
                notes: editableTransaction.notes?.trim() || null,
            };
            // Only send fields that are meant to be updated via this screen.
            // Do not send borrower_resident_id, item_borrowed etc., unless intended.

            const response = await apiRequest('PUT', `/api/borrowed-assets/${transactionId}`, payload);
            if (response && (response.message || response.transaction?._id)) {
                Alert.alert("Success", response.message || "Transaction updated successfully!");
                fetchTransactionDetails(); // Re-fetch to update transactionData
                setEditMode(false);
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not update transaction.");
            }
        } catch (error) {
            console.error("Error saving changes:", error);
            Alert.alert("Error", error.response?.data?.message || error.message || "An unexpected error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    const showDeleteConfirmation = () => {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete this borrowing transaction for "${transactionData?.item_borrowed || 'item'}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: deleteTransaction }
            ]
        );
    };

    const deleteTransaction = async () => {
        setIsDeleting(true);
        try {
            const response = await apiRequest('DELETE', `/api/borrowed-assets/${transactionId}`);
            if (response && response.message) {
                Alert.alert("Success", response.message);
                router.push('/borrowed-assets'); // Or appropriate list screen
            } else {
                Alert.alert("Error", response?.error || "Could not delete transaction.");
            }
        } catch (e) {
            console.error("Error deleting transaction:", e);
            Alert.alert("Error", e.response?.data?.message || e.message || "An error occurred.");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (editMode) {
            if (editableTransaction.status !== 'Returned' && editableTransaction.status !== 'Damaged') {
                setEditableTransaction(prev => ({ ...prev, date_returned: null, return_condition: '' }));
            } else if (!editableTransaction.date_returned) { // If changed to Returned/Damaged and date is empty
                 setEditableTransaction(prev => ({ ...prev, date_returned: formatDateForInput(new Date().toISOString()) }));
            }
        }
    }, [editableTransaction.status, editMode]);


    if (isLoading) return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading Transaction...</Text></View>;
    if (errorLoading || !transactionData) return <View style={styles.loaderContainerFullPage}><MaterialCommunityIcons name="alert-circle-outline" size={50} color="red" /><Text style={styles.errorText}>Failed to load transaction details.</Text><TouchableOpacity onPress={fetchTransactionDetails} style={styles.retryButton}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity></View>;

    // Use editableTransaction for form fields, transactionData for static display parts if needed
    const displayItem = editableTransaction.item_borrowed || 'N/A';
    const displayBorrowerName = editableTransaction.borrower_display_name || 'N/A';
    const displayBorrowDatetime = editableTransaction.borrow_datetime ? formatDateForDisplay(editableTransaction.borrow_datetime) : 'N/A';
    const displayBorrowedFrom = editableTransaction.borrowed_from_personnel || 'N/A';

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.navbarTitle} numberOfLines={1}>{editMode ? "Edit Transaction" : "Borrowing Details"}</Text>
                {/* <TouchableOpacity onPress={showDeleteConfirmation} disabled={editMode || isDeleting}>
                    <MaterialCommunityIcons name="delete-outline" size={26} color={editMode ? "grey" : "white"} />
                </TouchableOpacity> */}
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}>
                <View style={styles.actionButtonsContainer}>
                    {/* {!editMode && <TouchableOpacity style={[styles.headerButton, styles.editButton]} onPress={() => toggleEditMode(true)}><MaterialCommunityIcons name="pencil" size={18} color="white" /><Text style={styles.headerButtonText}>Edit</Text></TouchableOpacity>} */}
                    {editMode && <TouchableOpacity style={[styles.headerButton, styles.saveButton]} onPress={saveChanges} disabled={isSaving}>{isSaving ? <ActivityIndicator color="white" size="small"/> : <><MaterialCommunityIcons name="check" size={18} color="white" /><Text style={styles.headerButtonText}>Save</Text></>}</TouchableOpacity>}
                    {editMode && <TouchableOpacity style={[styles.headerButton, styles.cancelButton]} onPress={cancelEdit}><MaterialCommunityIcons name="close" size={18} color="#333" /><Text style={[styles.headerButtonText, {color: '#333'}]}>Cancel</Text></TouchableOpacity>}
                </View>


                <Text style={styles.sectionTitle}>Item & Borrower</Text>
                <View style={styles.detailRow}><MaterialCommunityIcons name="package-variant-closed" style={styles.detailIcon} size={20}/><Text style={styles.detailLabel}>Item:</Text><Text style={styles.detailValue}>{displayItem}</Text></View>
                <View style={styles.detailRow}><MaterialCommunityIcons name="account-outline" style={styles.detailIcon} size={20}/><Text style={styles.detailLabel}>Borrower:</Text><Text style={styles.detailValue}>{displayBorrowerName}</Text></View>
                <View style={styles.detailRow}><MaterialCommunityIcons name="calendar-clock" style={styles.detailIcon} size={20}/><Text style={styles.detailLabel}>Borrowed:</Text><Text style={styles.detailValue}>{displayBorrowDatetime}</Text></View>
                <View style={styles.detailRow}><MaterialCommunityIcons name="account-tie-outline" style={styles.detailIcon} size={20}/><Text style={styles.label}>From:</Text><TextInput value={editableTransaction.borrowed_from_personnel} style={[styles.textInput, !editMode && styles.readOnlyInput]} editable={editMode} onChangeText={val => setEditableTransaction(prev => ({...prev, borrowed_from_personnel: val}))}/></View>


                <Text style={styles.sectionTitle}>Return Details & Status</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Status <Text style={editMode && styles.requiredStar}>*</Text></Text>
                    {editMode ? (
                        <View style={styles.pickerWrapper}>
                            <Picker selectedValue={editableTransaction.status} onValueChange={val => setEditableTransaction(prev => ({...prev, status: val}))} style={styles.picker}>
                                {statusOptions.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}
                            </Picker>
                        </View>
                    ) : <Text style={[styles.detailValueDisplay, {color: getStatusColor(editableTransaction.status), fontWeight: 'bold'}]}>{editableTransaction.status}</Text>}
                </View>

                {(editMode && (editableTransaction.status === 'Returned' || editableTransaction.status === 'Damaged')) || (!editMode && editableTransaction.date_returned) ? (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Date Returned <Text style={editMode && (editableTransaction.status === 'Returned' || editableTransaction.status === 'Damaged') && styles.requiredStar}>*</Text></Text>
                        {editMode ? (
                             <TouchableOpacity onPress={() => setShowReturnDatePicker(true)} style={styles.datePickerButton}>
                                <Text style={styles.datePickerButtonText}>{editableTransaction.date_returned ? formatDateForDisplay(new Date(editableTransaction.date_returned), false) : 'Select Return Date'}</Text>
                            </TouchableOpacity>
                        ) : <Text style={styles.detailValueDisplay}>{formatDateForDisplay(new Date(editableTransaction.date_returned), false)}</Text>}
                        {showReturnDatePicker && editMode && <DateTimePicker value={new Date(editableTransaction.date_returned || Date.now())} mode="date" display="default" onChange={onReturnDateChange} />}
                    </View>
                ) : null}

                {(editMode && (editableTransaction.status === 'Returned' || editableTransaction.status === 'Damaged')) || (!editMode && editableTransaction.return_condition) ? (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Return Condition:</Text>
                        {editMode ? <TextInput placeholder="Describe condition" value={editableTransaction.return_condition} onChangeText={val => setEditableTransaction(prev => ({...prev, return_condition: val}))} style={[styles.textInput, {height:80}]} multiline textAlignVertical="top"/> : <Text style={styles.detailValueDisplay}>{editableTransaction.return_condition || 'N/A'}</Text>}
                    </View>
                ) : null}

                <View style={styles.inputContainer}><Text style={styles.label}>Notes:</Text>{editMode ? <TextInput placeholder="Additional notes" value={editableTransaction.notes} onChangeText={val => setEditableTransaction(prev => ({...prev, notes: val}))} style={[styles.textInput, {height:100}]} multiline textAlignVertical="top"/> : <Text style={styles.detailValueDisplay}>{editableTransaction.notes || 'N/A'}</Text>}</View>

                {!editMode && transactionData?.created_at && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Transaction Logged:</Text>
                        <Text style={styles.detailValueDisplay}>{formatDateForDisplay(transactionData.created_at, true)}</Text>
                    </View>
                )}
                 {!editMode && transactionData?.updated_at && transactionData.updated_at !== transactionData.created_at && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Last Updated:</Text>
                        <Text style={styles.detailValueDisplay}>{formatDateForDisplay(transactionData.updated_at, true)}</Text>
                    </View>
                )}
            </ScrollView>
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
    actionButtonsContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15, },
    headerButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginLeft: 10, },
    editButton: { backgroundColor: '#0F00D7'},
    saveButton: { backgroundColor: '#4CAF50'},
    cancelButton: { backgroundColor: '#E0E0E0'},
    headerButtonText: { color: 'white', marginLeft: 6, fontWeight: '500'},
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
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 4 }, // Added padding for better spacing
    detailIcon: { marginRight: 10, color: '#555' }, // Standardized icon color
    detailLabel: { fontSize: 15, color: '#4A4A4A', fontWeight: '500', width: 100 }, // Adjusted width
    detailValue: { fontSize: 15, color: '#333', flex: 1 }, // Allow value to wrap
    // Styles for getStatusColor are applied via inline style
});
export default ViewBorrowAssetScreen;