import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker'; // Import ImagePicker
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
    
    // State for proofs, renamed to borrow_proof_image_base64 as per backend
    const [borrow_proof_image_base64, setBorrow_proof_image_base64] = useState<string[]>([]);
    // Using useRef to get the current state value inside saveTransaction without re-rendering issues
    const borrowProofImageBase64Ref = useRef(borrow_proof_image_base64); 
    useEffect(() => {
        borrowProofImageBase64Ref.current = borrow_proof_image_base64;
        console.log("borrow_proof_image_base64 state updated:", borrow_proof_image_base64.length, "items.");
        if (borrow_proof_image_base64.length > 0) {
            console.log("First proof in state:", borrow_proof_image_base64[0].substring(0, 50) + "...");
        }
    }, [borrow_proof_image_base64]);

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

    const pickProof = async () => {
        console.log("pickProof function called.");

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log("Permission status:", status);

        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to select files.');
            return;
        }

        console.log("Permissions granted, launching image library...");

        let result;
        try {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow all media types (images and videos)
                allowsMultipleSelection: true,
                quality: 0.7,
                base64: true,
            });
            console.log("ImagePicker Result:", JSON.stringify(result, null, 2));
        } catch (error) {
            console.error("Error launching ImagePicker:", error);
            Alert.alert("Error", "Failed to open file picker: " + (error as Error).message);
            return;
        }
        
        if (result.canceled) {
            console.log("Image picker was canceled.");
        } else if (result.assets && result.assets.length > 0) {
            console.log("Assets found:", result.assets.length);

            const newProofs = await Promise.all(result.assets.map(async (asset, index) => {
                console.log(`--- Processing asset ${index + 1} ---`);
                console.log("  Asset URI:", asset.uri);
                console.log("  Asset MediaType (from Expo):", asset.mediaType); 
                console.log("  Asset MimeType (from Expo):", asset.mimeType);
                console.log("  Is asset.base64 a string?", typeof asset.base64 === 'string');
                console.log("  Length of asset.base64:", asset.base64 ? asset.base64.length : 'N/A');

                // Ensure base64 data is present and a valid string
                if (asset.base64 && typeof asset.base64 === 'string' && asset.base64.length > 0) {
                    let detectedMimeType = 'application/octet-stream'; // Default generic binary
                    
                    if (asset.mimeType) {
                        detectedMimeType = asset.mimeType;
                    } else if (asset.mediaType === ImagePicker.MediaType.Video) {
                        detectedMimeType = 'video/mp4'; // Common video type
                    } else { // Assume image, try to get from URI or default
                        const fileExtension = asset.uri.split('.').pop()?.toLowerCase();
                        if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
                            detectedMimeType = 'image/jpeg';
                        } else if (fileExtension === 'png') {
                            detectedMimeType = 'image/png';
                        } else if (fileExtension === 'gif') {
                            detectedMimeType = 'image/gif';
                        } else {
                            detectedMimeType = 'image/jpeg'; // Fallback for image
                        }
                    }

                    const dataUri = `data:${detectedMimeType};base64,${asset.base64}`;
                    console.log("  Generated data URI (first 50 chars):", dataUri.substring(0, 50));
                    console.log("  Generated data URI (length):", dataUri.length);
                    return dataUri;
                } else {
                    console.warn(`Asset ${index + 1} missing valid base64 data or empty string, skipping:`, asset.uri);
                    console.warn("  Problematic asset.base64:", asset.base64);
                    return null;
                }
            }));
            
            const proofsToAdd = newProofs.filter(Boolean) as string[]; // Filter out any nulls
            console.log("Proofs successfully extracted and filtered (count):", proofsToAdd.length);
            if (proofsToAdd.length > 0) {
                console.log("First filtered proof (first 50 chars):", proofsToAdd[0].substring(0, 50));
            }

            setBorrow_proof_image_base64(prev => {
                const updatedProofs = [...prev, ...proofsToAdd];
                console.log("Proofs state AFTER setBorrow_proof_image_base64 (total count):", updatedProofs.length);
                return updatedProofs;
            });
        } else if (!result.canceled && (!result.assets || result.assets.length === 0)) {
            console.warn("User selected files, but no assets were returned or assets array is empty.");
        }
    };

    const removeProof = (indexToRemove: number) => {
        setBorrow_proof_image_base64(prev => prev.filter((_, index) => index !== indexToRemove));
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
            console.log('Current borrow_proof_image_base64 state via ref before sending:', borrowProofImageBase64Ref.current.length, 'proofs');
            if (borrowProofImageBase64Ref.current.length > 0) {
                console.log('First proof in ref (first 50 chars):', borrowProofImageBase64Ref.current[0].substring(0, 50));
            }

            const payload = {
                borrower_resident_id: loggedInUser!._id,
                borrower_display_name: loggedInUser!.name,
                borrow_datetime: new Date().toISOString(),
                item_borrowed: transaction.item_borrowed,
                quantity_borrowed: parseInt(transaction.quantity_borrowed, 10),
                expected_return_date: new Date(transaction.expected_return_date).toISOString(),
                notes: transaction.notes.trim() || null,
                // MODIFIED: Send only the first proof as a single string, or null,
                // to match the expected format for the admin display.
                borrow_proof_image_base64: borrowProofImageBase64Ref.current.length > 0
                                            ? borrowProofImageBase64Ref.current[0]
                                            : null,
            };
            console.log('Borrow transaction payload being sent:', payload);
            // Adjusted log to reflect the single string or null being sent
            console.log('borrow_proof_image_base64 type in payload:', typeof payload.borrow_proof_image_base64);
            if (typeof payload.borrow_proof_image_base64 === 'string') {
                console.log('First proof in payload length (approx):', payload.borrow_proof_image_base64.length);
            }


            const response = await apiRequest('POST', '/api/borrowed-assets', payload);

            if (response && (response.message || response.transaction?._id)) {
                Alert.alert("Success", "Your borrowing request has been submitted successfully!");
                router.replace('/borrowed-assets'); // Navigate back to the list
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not submit your request due to unresolved issues. On Hold/Deactivated");
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
                            itemStyle={{ color: 'black' }}
                        >
                            <Picker.Item label="Select an available item..." value="" />
                            {inventoryItems.map((item) => (
                                <Picker.Item 
                                    key={item.name}
                                    label={`${item.name} (Available: ${item.available})`} 
                                    value={item.name}
                                    enabled={item.available > 0} // Disable items with no stock
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
                        onChangeText={(val) => handleInputChange('quantity_borrowed', val.replace(/[^0-9]/g, ''))} // Only allow numbers
                        keyboardType="numeric"
                        placeholder="1"
                        editable={!!transaction.item_borrowed} // Enable only if an item is selected
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
                    minimumDate={new Date()} // Prevent selecting past dates
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

                {/* Proof of Borrowing Section */}
                <Text style={styles.sectionTitle}>Proof of Borrowing</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Attach Proof (Photos or Videos)</Text>
                    <TouchableOpacity onPress={pickProof} style={styles.attachButton}>
                        <MaterialCommunityIcons name="attachment" size={24} color="#5E76FF" />
                        <Text style={styles.attachButtonText}>
                            {borrow_proof_image_base64.length > 0
                                ? `${borrow_proof_image_base64.length} File(s) Attached`
                                : 'Select Files'}
                        </Text>
                    </TouchableOpacity>
                    {borrow_proof_image_base64.length > 0 && (
                        <ScrollView horizontal style={styles.proofsPreviewScroll}>
                            <View style={styles.proofsPreviewContainer}>
                                {borrow_proof_image_base64.map((base64String, index) => (
                                    <View key={index} style={styles.proofPreviewItem}>
                                        {/* Display thumbnail for images, icon for videos/unknown */}
                                        {base64String.startsWith('data:image') ? (
                                            <Image source={{ uri: base64String }} style={styles.proofThumbnail} />
                                        ) : base64String.startsWith('data:video') ? (
                                            <MaterialCommunityIcons name="video" size={40} color="#555" />
                                        ) : (
                                            // Fallback for unknown type or if something went wrong
                                            <MaterialCommunityIcons name="file-question" size={40} color="#555" />
                                        )}
                                        <TouchableOpacity onPress={() => removeProof(index)} style={styles.removeProofButton}>
                                            <MaterialCommunityIcons name="close-circle" size={20} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    )}
                </View>
                {/* End Proof of Borrowing Section */}

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
    // Styles for Proof of Borrowing
    attachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#5E76FF',
        borderRadius: 8,
        paddingVertical: 12,
        backgroundColor: '#EBF0FF',
    },
    attachButtonText: {
        fontSize: 16,
        color: '#5E76FF',
        fontWeight: '500',
        marginLeft: 10,
    },
    proofsPreviewScroll: {
        marginTop: 10,
        maxHeight: 120, // Limit height of horizontal scroll
    },
    proofsPreviewContainer: {
        flexDirection: 'row', // Ensure items lay out horizontally
        alignItems: 'center',
        // When ScrollView is horizontal, its direct child (this View) should ideally have its width determined by its content,
        // rather than taking 100% of the ScrollView width and pushing content off-screen.
        // flexWrap: 'wrap' is counterproductive for horizontal ScrollViews.
    },
    proofPreviewItem: {
        flexDirection: 'column', // Align content vertically
        alignItems: 'center',
        marginRight: 10,
        marginBottom: 10, // Gives some vertical spacing
        padding: 5,
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        backgroundColor: '#F9F9F9',
        position: 'relative',
    },
    proofThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 5,
        resizeMode: 'cover',
    },
    removeProofButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'white',
        borderRadius: 15,
    },
});

export default NewBorrowAssetScreen;