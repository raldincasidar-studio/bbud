import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
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

// Constants for attachment limits
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_MB = 50; // 50MB per file (adjust as per your backend limits and mobile performance)
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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
    const [aiNotesError, setAiNotesError] = useState<string>('');

    const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    
    const [borrow_proof_attachments_base64, setBorrow_proof_attachments_base64] = useState<string[]>([]);
    const borrowProofAttachmentsBase64Ref = useRef(borrow_proof_attachments_base64); 
    useEffect(() => {
        borrowProofAttachmentsBase64Ref.current = borrow_proof_attachments_base64;
        console.log("borrow_proof_attachments_base64 state updated:", borrow_proof_attachments_base64.length, "items.");
        if (borrow_proof_attachments_base64.length > 0) {
            console.log("First proof in state (first 50 chars):", borrow_proof_attachments_base64[0].substring(0, 50) + "...");
        }
    }, [borrow_proof_attachments_base64]);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    // Re-added: State for AI validation modal
    const [isAiValidating, setIsAiValidating] = useState(false);

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
                } else {
                    // Create a Date object from the YYYY-MM-DD string as if it's local time for comparison
                    // Using `new Date(value)` directly can be unreliable across browsers/platforms for YYYY-MM-DD.
                    // For safe comparison, parse it manually or compare date parts.
                    const [year, month, day] = value.split('-').map(Number);
                    const selectedDate = new Date(year, month - 1, day); // Month is 0-indexed
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Normalize today to start of day for comparison
                    
                    if (selectedDate < today) {
                        error = 'Return date cannot be in the past.';
                    }
                }
                break;
            case 'notes': // Added: Basic validation for notes field (must not be empty)
                if (!value.trim()) {
                    error = 'Please provide a reason or notes for borrowing.';
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

            // Clear AI notes error when the user types in the notes field
            if (field === 'notes') {
                setAiNotesError('');
            }

            return newTransactionState;
        });
    };

    // FIX: Format the date object into YYYY-MM-DD using local components
    const handleDateConfirm = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${day}`; // This will store "2025-09-30" if 30th Sep was picked
        handleInputChange('expected_return_date', dateString);
        setDatePickerVisibility(false);
    };


    const pickProof = async () => {
        console.log("pickProof function called.");

        const currentProofsCount = borrow_proof_attachments_base64.length;

        if (currentProofsCount >= MAX_ATTACHMENTS) {
            Alert.alert('Attachment Limit Reached', `You can attach a maximum of ${MAX_ATTACHMENTS} files as proof.`);
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log("Permission status:", status);

        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to select files.');
            return;
        }

        console.log("Permissions granted, launching media library...");

        let result;
        try {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow all media types (images and videos)
                allowsMultipleSelection: true, // Allow selecting multiple files
                quality: 0.7,
                // We'll handle base64 manually for all types to ensure consistency and proper video handling
                base64: false, 
            });
            console.log("ImagePicker Result:", JSON.stringify(result, null, 2));
        } catch (error) {
            console.error("Error launching ImagePicker:", error);
            Alert.alert("Error", "Failed to open file picker: " + (error as Error).message);
            return;
        }
        
        if (result.canceled) {
            console.log("Media picker was canceled.");
        } else if (result.assets && result.assets.length > 0) {
            console.log("Assets found:", result.assets.length);

            const remainingSlots = MAX_ATTACHMENTS - currentProofsCount;
            // Take only up to remaining slots, or fewer if user selected fewer
            const selectedAssets = result.assets.slice(0, remainingSlots); 

            if (result.assets.length > remainingSlots) {
                Alert.alert(
                    'Attachment Limit',
                    `You selected ${result.assets.length} files, but only ${remainingSlots} more can be added. Only the first ${remainingSlots} files will be attached.`
                );
            }

            const newProofs = await Promise.all(selectedAssets.map(async (asset, index) => {
                console.log(`--- Processing asset ${index + 1} ---`);
                console.log("  Asset URI:", asset.uri);
                console.log("  Asset MediaType (from Expo):", asset.mediaType);
                console.log("  Asset MimeType (from Expo):", asset.mimeType);

                let base64Data: string | null = null;
                let detectedMimeType = asset.mimeType || 'application/octet-stream'; // Default or from asset

                if (!asset.uri) {
                    console.error(`  [LOG] ERROR: Asset URI is missing for asset ${index + 1}. Skipping.`);
                    return null;
                }

                try {
                    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
                    console.log(`  [LOG] FileInfo for URI: ${JSON.stringify(fileInfo)}`);

                    if (!fileInfo.exists) {
                        console.error(`  [LOG] ERROR: File does not exist at URI: ${asset.uri}`);
                        Alert.alert("Error", `File does not exist at path: ${asset.uri}`);
                        return null;
                    }

                    if (fileInfo.isDirectory) {
                        console.error(`  [LOG] ERROR: URI points to a directory, not a file: ${asset.uri}`);
                        Alert.alert("Error", `URI points to a directory: ${asset.uri}`);
                        return null;
                    }

                    if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE_BYTES) {
                        console.warn(`  [LOG] WARNING: File size (${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB) exceeds ${MAX_FILE_SIZE_MB}MB limit. Skipping.`);
                        Alert.alert("File Too Large", `The selected file "${asset.uri.split('/').pop()}" is ${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB, which exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please select a smaller file.`);
                        return null; // Skip this asset if too large
                    }

                    base64Data = await FileSystem.readAsStringAsync(asset.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    console.log(`  [LOG] Manual base64 read completed for ${asset.mediaType}. Length: ${base64Data ? base64Data.length : '0'}`);
                    
                    if (!base64Data || base64Data.length === 0) {
                        console.warn("  [LOG] Manual base64 read returned null or empty string.");
                    }

                    // Refine MIME type if not explicitly provided by ImagePicker or if it's a common video type
                    if (!asset.mimeType) { 
                        if (asset.mediaType === ImagePicker.MediaTypeOptions.Video) {
                            // Attempt to guess common video types by extension or default to mp4
                            const fileExtension = asset.uri.split('.').pop()?.toLowerCase();
                            if (fileExtension === 'mov') detectedMimeType = 'video/quicktime';
                            else if (fileExtension === 'avi') detectedMimeType = 'video/x-msvideo';
                            else detectedMimeType = 'video/mp4'; // Common video type fallback
                            console.log(`  [LOG] Detected video, setting mimeType to: ${detectedMimeType}`);
                        } else if (asset.mediaType === ImagePicker.MediaTypeOptions.Image) {
                            const fileExtension = asset.uri.split('.').pop()?.toLowerCase();
                            if (fileExtension === 'jpg' || fileExtension === 'jpeg') detectedMimeType = 'image/jpeg';
                            else if (fileExtension === 'png') detectedMimeType = 'image/png';
                            else if (fileExtension === 'gif') detectedMimeType = 'image/gif';
                            else if (fileExtension === 'webp') detectedMimeType = 'image/webp';
                            else detectedMimeType = 'image/jpeg'; // General image fallback
                            console.log(`  [LOG] Detected image, setting mimeType to: ${detectedMimeType}`);
                        } else {
                            console.log("  [LOG] Unknown media type, defaulting mimeType.");
                        }
                    } else {
                        console.log(`  [LOG] Using existing asset.mimeType: ${asset.mimeType}`);
                    }

                } catch (readError: any) { // Explicitly type readError as any for easier access to .message
                    console.error(`  [LOG] ERROR: Error reading file ${asset.uri} for base64 encoding:`, readError);
                    Alert.alert("Error", `Could not read selected file: ${(readError as Error).message}`);
                    return null; // Skip this asset if reading fails
                }
                
                if (base64Data && base64Data.length > 0) {
                    const dataUri = `data:${detectedMimeType};base64,${base64Data}`;
                    console.log("  [LOG] Generated data URI (first 50 chars):", dataUri.substring(0, 50));
                    console.log("  [LOG] Generated data URI (length):", dataUri.length);
                    return dataUri;
                } else {
                    console.warn(`  [LOG] Asset ${index + 1} still missing valid base64 data after processing (base64Data was null or empty). Skipping:`, asset.uri);
                    return null;
                }
            }));
            
            const proofsToAdd = newProofs.filter(Boolean) as string[]; // Filter out any nulls
            console.log("Proofs successfully extracted and filtered (count):", proofsToAdd.length);
            if (proofsToAdd.length > 0) {
                console.log("First filtered proof (first 50 chars):", proofsToAdd[0].substring(0, 50));
            }

            setBorrow_proof_attachments_base64(prev => {
                const updatedProofs = [...prev, ...proofsToAdd];
                console.log("Proofs state AFTER setBorrow_proof_attachments_base64 (total count):", updatedProofs.length);
                return updatedProofs;
            });
        } else if (!result.canceled && (!result.assets || result.assets.length === 0)) {
            console.warn("User selected files, but no assets were returned or assets array is empty.");
        }
    };

    const removeProof = (indexToRemove: number) => {
        Alert.alert(
            "Remove Attachment",
            "Are you sure you want to remove this attachment?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        setBorrow_proof_attachments_base64(prev => prev.filter((_, index) => index !== indexToRemove));
                        Alert.alert("Removed", "Attachment removed successfully.");
                    },
                },
            ]
        );
    };

    const saveTransaction = async () => {
        const fieldsToValidate = ['item_borrowed', 'quantity_borrowed', 'expected_return_date', 'notes'];
        let hasErrors = false;
        
        fieldsToValidate.forEach(field => {
            if (validateField(field, transaction[field as keyof typeof transaction], transaction, inventoryItems)) {
                hasErrors = true;
            }
        });

        if (hasErrors) {
            Alert.alert("Validation Error", "Please correct the errors before submitting.");
            return;
        }

        setAiNotesError(''); // Clear any previous AI error before starting validation

        try {
            // NEW: Trigger AI validation modal
            setIsAiValidating(true);
            // Simulate AI "thinking" time for the frontend animation
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate 2-second AI validation

            // NEW: Hide AI validation modal after simulated check
            setIsAiValidating(false);
            
            // Now proceed with the actual saving process, which includes backend AI validation
            setIsSaving(true); 

            console.log('Current borrow_proof_attachments_base64 state via ref before sending:', borrowProofAttachmentsBase64Ref.current.length, 'proofs');
            if (borrowProofAttachmentsBase64Ref.current.length > 0) {
                console.log('First proof in ref (first 50 chars):', borrowProofAttachmentsBase64Ref.current[0].substring(0, 50));
            }

            // FIX: Generate borrow_datetime in local YYYY-MM-DDTHH:mm:ss format
            const now = new Date();
            const localBorrowDateTime = now.getFullYear() + '-' + 
                                        (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                                        now.getDate().toString().padStart(2, '0') + 'T' +
                                        now.getHours().toString().padStart(2, '0') + ':' +
                                        now.getMinutes().toString().padStart(2, '0') + ':' +
                                        now.getSeconds().toString().padStart(2, '0');

            const payload = {
                borrower_resident_id: loggedInUser!._id,
                borrower_display_name: loggedInUser!.name,
                borrow_datetime: localBorrowDateTime, // FIX: Use locally formatted string
                item_borrowed: transaction.item_borrowed,
                quantity_borrowed: parseInt(transaction.quantity_borrowed, 10),
                expected_return_date: transaction.expected_return_date, // FIX: Send the YYYY-MM-DD string directly
                notes: transaction.notes.trim(), // Send the notes to the backend for AI validation
                borrow_proof_attachments_base64: borrowProofAttachmentsBase64Ref.current,
            };
            console.log('Borrow transaction payload being sent:', payload);
            console.log('borrow_proof_attachments_base64 type in payload:', Array.isArray(payload.borrow_proof_attachments_base64) ? 'array' : typeof payload.borrow_proof_attachments_base64);
            if (Array.isArray(payload.borrow_proof_attachments_base64) && payload.borrow_proof_attachments_base64.length > 0) {
                console.log('First proof in payload length (approx):', payload.borrow_proof_attachments_base64[0].length);
            }

            const response = await apiRequest('POST', '/api/borrowed-assets', payload);

            if (response && (response.message || response.transaction?._id)) {
                Alert.alert("Success", "Your borrowing request has been submitted successfully!");
                router.replace('/borrowed-assets'); // Navigate back to the list
            } else {
                // Handle cases where the backend explicitly returns an error message
                Alert.alert("Error", response?.error || response?.message || "Could not submit your request due to unresolved issues. On Hold/Deactivated");
            }
        } catch (error: any) {
            console.error("Error saving transaction:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "An unexpected error occurred.";
            
            // If the backend specifically sends an AI validation error, display it for notes
            if (error.response?.data?.error === 'Invalid notes/reason for borrowing.' && error.response?.data?.message) {
                setAiNotesError(error.response.data.message);
                Alert.alert("Validation Error", error.response.data.message);
            } else {
                Alert.alert("Error", errorMessage);
            }
        } finally {
            setIsSaving(false);
            // Ensure AI modal is hidden even if an error occurred during the simulated phase
            setIsAiValidating(false); 
        }
    };

    if (isLoadingData) {
        return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading Form...</Text></View>;
    }

    const isAttachButtonDisabled = borrow_proof_attachments_base64.length >= MAX_ATTACHMENTS;

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
                    <Text style={styles.label}>Notes / Reason for Borrowing <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        placeholder="e.g., 'For a community event'"
                        value={transaction.notes}
                        onChangeText={(val) => handleInputChange('notes', val)}
                        style={[styles.textInput, { height: 100 }, (!!errors.notes || !!aiNotesError) && styles.inputError]}
                        multiline
                        textAlignVertical="top"
                    />
                    <ErrorMessage error={errors.notes || aiNotesError} />
                </View>

                {/* Proof of Borrowing Section */}
                <Text style={styles.sectionTitle}>Proof of Borrowing</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Attach Proof (Photos or Videos)</Text>
                    <TouchableOpacity 
                        onPress={pickProof} 
                        style={[styles.attachButton, isAttachButtonDisabled && styles.buttonDisabled]}
                        disabled={isAttachButtonDisabled}
                    >
                        <MaterialCommunityIcons name="attachment" size={24} color={isAttachButtonDisabled ? '#A9B4FF' : '#5E76FF'} />
                        <Text style={[styles.attachButtonText, isAttachButtonDisabled && { color: '#A9B4FF' }]}>
                            {borrow_proof_attachments_base64.length > 0
                                ? `${borrow_proof_attachments_base64.length} / ${MAX_ATTACHMENTS} File(s) Attached`
                                : `Select Files (Max ${MAX_ATTACHMENTS})`}
                        </Text>
                    </TouchableOpacity>
                    {borrow_proof_attachments_base64.length > 0 && (
                        <ScrollView horizontal style={styles.proofsPreviewScroll}>
                            <View style={styles.proofsPreviewContainer}>
                                {borrow_proof_attachments_base64.map((base64String, index) => (
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
                    <TouchableOpacity 
                        onPress={saveTransaction} 
                        style={[styles.submitButton, (isSaving || isAiValidating) && styles.buttonDisabled]} 
                        disabled={isSaving || isAiValidating} // Disable if either is true
                    >
                        {(isSaving || isAiValidating) ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Submit Request</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Re-added: AI Validation Modal */}
            <Modal
                transparent={true}
                animationType="fade"
                visible={isAiValidating}
                // onRequestClose prevents closing by back button on Android during AI check
                onRequestClose={() => { /* Alert.alert("Please wait", "AI is validating your request."); */ }} 
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ActivityIndicator size="large" color="#0F00D7" />
                        <Text style={styles.modalText}>Please take a moment, our AI is validating your request...</Text>
                    </View>
                </View>
            </Modal>
            {/* End AI Validation Modal */}
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
    // Re-added: Styles for AI Validation Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%', // Make the modal a bit narrower
    },
    modalText: {
        marginTop: 15,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default NewBorrowAssetScreen;