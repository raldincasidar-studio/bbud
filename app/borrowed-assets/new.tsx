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

// Reusable component for displaying validation errors
const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return <Text style={styles.errorText}>{error}</Text>;
};

const NewBorrowAssetScreen = () => {
    const router = useRouter();

    const [transaction, setTransaction] = useState({
        item_borrowed: '',
        quantity_borrowed: '1',
        expected_return_date: '',
        notes: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const validateField = (fieldName: string, value: any, currentTransactionState: typeof transaction, currentInventory: InventoryItem[]): string => {
        let error = '';
        switch (fieldName) {
            case 'item_borrowed':
                if (!value) error = 'Please select an item to borrow.';
                break;
            case 'quantity_borrowed':
                const selectedItem = currentInventory.find(i => i.name === currentTransactionState.item_borrowed);
                const quantity = parseInt(value, 10);
                if (!value) {
                    error = 'Quantity is required.';
                } else if (isNaN(quantity) || quantity <= 0) {
                    error = 'Quantity must be a positive number.';
                } else if (selectedItem && quantity > selectedItem.available) {
                    error = `Only ${selectedItem.available} available. You cannot borrow ${quantity}.`;
                }
                break;
            case 'expected_return_date':
                if (!value) {
                    error = 'Please select an expected return date.';
                } else if (new Date(value) < new Date(new Date().setHours(0, 0, 0, 0))) {
                    error = 'Return date cannot be in the past.';
                }
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
        const loadInitialData = async () => {
            setIsLoadingData(true);
            try {
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
        setTransaction(prev => {
            const newTransactionState = { ...prev, [field]: value };
            
            // Validate the current field
            validateField(field, value, newTransactionState, inventoryItems);

            // If the item changes, re-validate the quantity field as well
            if (field === 'item_borrowed') {
                validateField('quantity_borrowed', newTransactionState.quantity_borrowed, newTransactionState, inventoryItems);
            }

            return newTransactionState;
        });
    };

    const handleDateConfirm = (date: Date) => {
        const dateString = date.toISOString().split('T')[0];
        handleInputChange('expected_return_date', dateString);
        setDatePickerVisibility(false);
    };

    const saveTransaction = async () => {
        const fieldsToValidate = ['item_borrowed', 'quantity_borrowed', 'expected_return_date'];
        let hasErrors = false;
        
        fieldsToValidate.forEach(field => {
            if (validateField(field, transaction[field], transaction, inventoryItems)) {
                hasErrors = true;
            }
        });

        if (hasErrors) {
            Alert.alert("Validation Error", "Please correct the errors before submitting.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                borrower_resident_id: loggedInUser!._id,
                borrower_display_name: loggedInUser!.name,
                borrow_datetime: new Date().toISOString(),
                item_borrowed: transaction.item_borrowed,
                quantity_borrowed: parseInt(transaction.quantity_borrowed, 10),
                expected_return_date: new Date(transaction.expected_return_date).toISOString(),
                notes: transaction.notes.trim() || null,
            };

            const response = await apiRequest('POST', '/api/borrowed-assets', payload);

            if (response && (response.message || response.transaction?._id)) {
                Alert.alert("Success", "Your borrowing request has been submitted successfully!");
                router.replace('/borrowed-assets');
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
                    <View style={[styles.pickerWrapper, !!errors.item_borrowed && styles.inputError]}>
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
                    <ErrorMessage error={errors.item_borrowed} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Quantity <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        style={[styles.textInput, !!errors.quantity_borrowed && styles.inputError]}
                        value={transaction.quantity_borrowed}
                        onChangeText={(val) => handleInputChange('quantity_borrowed', val.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        placeholder="1"
                        editable={!!transaction.item_borrowed}
                    />
                    <ErrorMessage error={errors.quantity_borrowed} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Expected Return Date <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity style={[styles.datePickerButton, !!errors.expected_return_date && styles.inputError]} onPress={() => setDatePickerVisibility(true)}>
                        <Text style={transaction.expected_return_date ? styles.datePickerText : styles.datePickerPlaceholder}>
                            {transaction.expected_return_date || 'Select a date'}
                        </Text>
                    </TouchableOpacity>
                    <ErrorMessage error={errors.expected_return_date} />
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
    datePickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, justifyContent: 'center', minHeight: 48 },
    datePickerText: { fontSize: 16, color: '#333' },
    datePickerPlaceholder: { fontSize: 16, color: '#999' },
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
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

export default NewBorrowAssetScreen;