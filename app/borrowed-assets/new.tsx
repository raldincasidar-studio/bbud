// app/borrowed-assets/new.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// DateTimePicker is not strictly needed if we auto-set current date/time and make it read-only,
// but could be kept if you want to show it, or for consistency if other forms use it.
// For simplicity and your requirement, we'll auto-set it.

const NewBorrowAssetScreen = () => {
    const router = useRouter();

    // Borrower (Logged-in User) - Auto-filled
    const [borrowerResidentId, setBorrowerResidentId] = useState(null);
    const [borrowerDisplayName, setBorrowerDisplayName] = useState('');
    // No need for borrower address/contact here unless you want to display it read-only

    // Borrowing Details
    const [borrowDatetime, setBorrowDatetime] = useState(new Date()); // Auto-set to current
    const [borrowedFromPersonnel, setBorrowedFromPersonnel] = useState(''); // Admin/Official name processing it
    const [itemBorrowed, setItemBorrowed] = useState(''); // Will be selected from Picker
    const [status, setStatus] = useState('Borrowed'); // Initial status - ReadOnly
    const [notes, setNotes] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

    const assetItems = [
        { label: 'Select Item Borrowed', value: '' },
        { label: 'Chairs', value: 'Chairs' },
        { label: 'Tables', value: 'Tables' },
        { label: 'Tents', value: 'Tents' },
        { label: 'Oxygen Tank', value: 'Oxygen Tank' },
        { label: 'Blood Pressure Monitor (BP Monitor)', value: 'Blood Pressure Monitor (BP Monitor)' },
        { label: 'First Aid Kit', value: 'First Aid Kit' },
        { label: 'Wheelchair', value: 'Wheelchair' },
        { label: 'Nebulizer', value: 'Nebulizer' },
        { label: 'Walking Stick', value: 'Walking Stick' },
    ];

    useEffect(() => {
        const loadUserData = async () => {
            setIsLoadingInitialData(true);
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsed = JSON.parse(storedUserDataString);
                    setBorrowerResidentId(parsed._id);
                    setBorrowerDisplayName(`${parsed.first_name||''} ${parsed.middle_name||''} ${parsed.last_name||''}`.trim());
                } else {
                    Alert.alert("Authentication Error", "User data not found. Please log in again.", [{ text: "OK", onPress: () => router.replace('/') }]);
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

    const formatDateForDisplay = (date, includeTime = true) => {
        if (!date) return 'N/A';
        try {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return new Date(date).toLocaleString('en-US', options);
        } catch (e) { return String(date); }
    };

    const formatDateForAPI = (date) => {
        if (!date) return null;
        return date.toISOString(); // Send full ISO string for datetime
    };

    const validateForm = () => {
        if (!borrowerResidentId) { Alert.alert("Error", "Borrower information missing. Please re-login."); return false; }
        if (!itemBorrowed) { Alert.alert("Validation Error", "Please select the item borrowed."); return false; }
        if (!borrowedFromPersonnel.trim()) { Alert.alert("Validation Error", "Please enter the name of the personnel borrowed from."); return false; }
        // Status and borrow_datetime are auto-set/readonly
        return true;
    };

    const saveTransaction = async () => {
        if (!validateForm()) return;
        setIsSaving(true);
        try {
            const payload = {
                borrower_resident_id: borrowerResidentId,
                borrower_display_name: borrowerDisplayName,
                borrow_datetime: formatDateForAPI(new Date()), // Always current date and time
                borrowed_from_personnel: borrowedFromPersonnel.trim(),
                item_borrowed: itemBorrowed,
                status: "Borrowed", // Always this initial status
                notes: notes.trim() || null,
                // date_returned and return_condition will be null initially
            };

            const response = await apiRequest('POST', '/api/borrowed-assets', payload);

            if (response && (response.message || response.transaction?._id)) {
                Alert.alert("Success", response.message || "Borrowing transaction logged successfully!");
                router.push('/borrowed-assets'); // Or to a general list if preferred
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not log transaction.");
            }
        } catch (error) {
            console.error("Error saving transaction:", error);
            Alert.alert("Error", error.response?.data?.message || error.message || "An unexpected error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingInitialData) {
        return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading...</Text></View>;
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Log New Borrowing</Text>
                <View style={{width:28}}/>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionTitle}>Borrower Information (You)</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name of Borrower:</Text>
                    <TextInput value={borrowerDisplayName} style={[styles.textInput, styles.readOnlyInput]} editable={false} />
                </View>

                <Text style={styles.sectionTitle}>Borrowing Details</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Date and Time of Borrowing:</Text>
                    <TextInput value={formatDateForDisplay(borrowDatetime, true)} style={[styles.textInput, styles.readOnlyInput]} editable={false} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Item Borrowed <Text style={styles.requiredStar}>*</Text></Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={itemBorrowed}
                            onValueChange={(itemValue) => setItemBorrowed(itemValue)}
                            style={styles.picker}
                            prompt="Select Item Borrowed"
                        >
                            {assetItems.map((opt) => (
                                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                            ))}
                        </Picker>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Borrowed From (Personnel Name) <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        placeholder="Enter name of personnel"
                        value={borrowedFromPersonnel}
                        onChangeText={setBorrowedFromPersonnel}
                        style={styles.textInput}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Status:</Text>
                    <TextInput value={status} style={[styles.textInput, styles.readOnlyInput]} editable={false} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Notes (Optional):</Text>
                    <TextInput
                        placeholder="Any additional notes..."
                        value={notes}
                        onChangeText={setNotes}
                        style={[styles.textInput, {height: 100}]}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={saveTransaction} style={[styles.submitButton, isSaving && styles.buttonDisabled]} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="white"/> : <Text style={styles.submitButtonText}>Save Transaction</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    // ... (Copy relevant styles from NewComplaintScreen or NewDocumentRequestScreen)
    // Ensure styles for readOnlyInput, sectionTitle, etc., are present.
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
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'},
    loadingText: { marginTop: 10, fontSize: 16, color: '#555'},
});

export default NewBorrowAssetScreen;