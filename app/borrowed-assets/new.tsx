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
    View,
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface InventoryItem {
    name: string;
    total: number;
    borrowed: number;
    available: number;
}

interface LoggedInUser {
    _id: string;
    name: string;
}

const NewBorrowAssetScreen = () => {
    const router = useRouter();

    // State for the form
    const [transaction, setTransaction] = useState({
        item_borrowed: '',
        quantity_borrowed: '1',
        expected_return_date: '',
        notes: '',
    });

    // State for user and inventory data
    const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    
    // State for UI and async operations
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    // Fetch initial data (user info and inventory)
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingData(true);
            try {
                // Fetch logged-in user data
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsed = JSON.parse(storedUserDataString);
                    setLoggedInUser({
                        _id: parsed._id,
                        name: `${parsed.first_name || ''} ${parsed.last_name || ''}`.trim(),
                    });
                } else {
                    Alert.alert("Authentication Error", "User data not found. Please log in again.", [{ text: "OK", onPress: () => router.replace('/login') }]);
                    return;
                }

                // Fetch inventory status
                const inventoryResponse = await apiRequest('GET', '/api/assets/inventory-status');
                if (inventoryResponse && inventoryResponse.inventory) {
                    setInventoryItems(inventoryResponse.inventory);
                } else {
                    Alert.alert("Error", "Could not load available items from inventory.");
                }
            } catch (e) {
                console.error("Failed to load initial data:", e);
                Alert.alert("Error", "Failed to load required information to make a request.");
            } finally {
                setIsLoadingData(false);
            }
        };
        loadInitialData();
    }, []);

    const handleInputChange = (field: keyof typeof transaction, value: string) => {
        setTransaction(prev => ({ ...prev, [field]: value }));
    };

    const handleDateConfirm = (date: Date) => {
        handleInputChange('expected_return_date', date.toISOString().split('T')[0]);
        setDatePickerVisibility(false);
    };

    const validateForm = () => {
        if (!loggedInUser?._id) {
            Alert.alert("Error", "Your user information is missing. Please re-login.");
            return false;
        }
        if (!transaction.item_borrowed) {
            Alert.alert("Validation Error", "Please select an item to borrow.");
            return false;
        }
        const selectedItem = inventoryItems.find(i => i.name === transaction.item_borrowed);
        if (!selectedItem) {
            Alert.alert("Error", "Selected item not found in inventory. Please refresh.");
            return false;
        }
        const quantity = parseInt(transaction.quantity_borrowed, 10);
        if (isNaN(quantity) || quantity <= 0) {
            Alert.alert("Validation Error", "Quantity must be a number greater than 0.");
            return false;
        }
        if (quantity > selectedItem.available) {
            Alert.alert("Insufficient Stock", `You cannot borrow ${quantity} ${selectedItem.name}(s). Only ${selectedItem.available} available.`);
            return false;
        }
        if (!transaction.expected_return_date) {
            Alert.alert("Validation Error", "Please select an expected return date.");
            return false;
        }
        if (new Date(transaction.expected_return_date) < new Date(new Date().toDateString())) {
            Alert.alert("Validation Error", "Expected return date cannot be in the past.");
            return false;
        }
        return true;
    };

    const saveTransaction = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            const payload = {
                borrower_resident_id: loggedInUser!._id,
                borrower_display_name: loggedInUser!.name,
                borrow_datetime: new Date().toISOString(), // Current timestamp
                item_borrowed: transaction.item_borrowed,
                quantity_borrowed: parseInt(transaction.quantity_borrowed, 10),
                expected_return_date: new Date(transaction.expected_return_date).toISOString(),
                notes: transaction.notes.trim() || null,
                // The backend will handle setting the initial 'Pending' status and personnel upon approval
            };

            const response = await apiRequest('POST', '/api/borrowed-assets', payload);

            if (response && (response.message || response.transaction?._id)) {
                Alert.alert("Success", "Your borrowing request has been submitted successfully!");
                router.push('/borrowed-assets');
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not submit your request.");
            }
        } catch (error: any) {
            console.error("Error saving transaction:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "An unexpected error occurred.";
            Alert.alert("Error", errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingData) {
        return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading Form...</Text></View>;
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>New Borrow Request</Text>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionTitle}>Borrower Information</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Your Name:</Text>
                    <TextInput value={loggedInUser?.name || 'Loading...'} style={[styles.textInput, styles.readOnlyInput]} editable={false} />
                </View>

                <Text style={styles.sectionTitle}>Request Details</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Item to Borrow <Text style={styles.requiredStar}>*</Text></Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={transaction.item_borrowed}
                            onValueChange={(itemValue) => handleInputChange('item_borrowed', itemValue)}
                            enabled={inventoryItems.length > 0}
                        >
                            <Picker.Item label="Select an available item..." value="" />
                            {inventoryItems.map((item) => (
                                <Picker.Item 
                                    key={item.name}
                                    label={`${item.name} (Available: ${item.available})`} 
                                    value={item.name}
                                    enabled={item.available > 0}
                                />
                            ))}
                        </Picker>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Quantity <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        style={styles.textInput}
                        value={transaction.quantity_borrowed}
                        onChangeText={(val) => handleInputChange('quantity_borrowed', val.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        placeholder="1"
                        editable={!!transaction.item_borrowed}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Expected Return Date <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity style={styles.datePickerButton} onPress={() => setDatePickerVisibility(true)}>
                        <Text style={transaction.expected_return_date ? styles.datePickerText : styles.datePickerPlaceholder}>
                            {transaction.expected_return_date || 'Select a date'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={handleDateConfirm}
                    onCancel={() => setDatePickerVisibility(false)}
                    minimumDate={new Date()}
                />

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Notes / Reason for Borrowing (Optional)</Text>
                    <TextInput
                        placeholder="e.g., 'For a community event'"
                        value={transaction.notes}
                        onChangeText={(val) => handleInputChange('notes', val)}
                        style={[styles.textInput, { height: 100 }]}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={saveTransaction} style={[styles.submitButton, isSaving && styles.buttonDisabled]} disabled={isSaving}>
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
    datePickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, justifyContent: 'center' },
    datePickerText: { fontSize: 16, color: '#333' },
    datePickerPlaceholder: { fontSize: 16, color: '#999' },
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
});

export default NewBorrowAssetScreen;