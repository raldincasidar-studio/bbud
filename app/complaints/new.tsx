import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system'; // <--- ADD THIS IMPORT
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Constants for attachment limits
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_MB = 50; // 50MB per file (adjust as per your backend limits and mobile performance)
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

    const [personComplainedAgainstName, setPersonComplainedAgainstName] = useState('');
    
    const [proofsBase64, setProofsBase64] = useState([]);
    const proofsBase64Ref = useRef(proofsBase64); 
    useEffect(() => {
        proofsBase64Ref.current = proofsBase64;
        console.log("proofsBase64 state updated:", proofsBase64.length, "items.");
        if (proofsBase64.length > 0) {
            console.log("First proof in state (first 50 chars):", proofsBase64[0].substring(0, 50) + "...");
        }
    }, [proofsBase64]);

    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

    const validateField = (fieldName, value) => {
        let error = '';
        switch (fieldName) {
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
    
    const formatDateForAPI = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatTimeForAPI = (time) => time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

    const handlePersonComplainedAgainstNameChange = (text) => {
        setPersonComplainedAgainstName(text);
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

    const pickProof = async () => {
        console.log("pickProof function called.");

        const currentProofsCount = proofsBase64.length;

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
            // FIX: Reverted to MediaTypeOptions.All to resolve 'All of undefined' error
            // This will likely show a deprecation warning but should function.
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All, 
                allowsMultipleSelection: true,
                quality: 0.7,
                base64: false, // Explicitly set to false to manually handle base64 for better video support
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
                console.log("  Asset MediaType (from Expo):", asset.mediaType); // Note: still logs deprecated value
                console.log("  Asset MimeType (from Expo):", asset.mimeType);

                let base64Data = null;
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

                    // Refine MIME type using ImagePicker.MediaType (which should work for enum comparison)
                    if (!asset.mimeType) { 
                        if (asset.mediaType === ImagePicker.MediaType.Video) { 
                            const fileExtension = asset.uri.split('.').pop()?.toLowerCase();
                            if (fileExtension === 'mov') detectedMimeType = 'video/quicktime';
                            else if (fileExtension === 'avi') detectedMimeType = 'video/x-msvideo';
                            else detectedMimeType = 'video/mp4'; // Common video type fallback
                            console.log(`  [LOG] Detected video, setting mimeType to: ${detectedMimeType}`);
                        } else if (asset.mediaType === ImagePicker.MediaType.Image) { 
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
            
            const proofsToAdd = newProofs.filter(Boolean); // Filter out any nulls from failed reads
            console.log("Proofs successfully extracted and filtered (count):", proofsToAdd.length);
            if (proofsToAdd.length > 0) {
                console.log("First filtered proof (first 50 chars):", proofsToAdd[0].substring(0, 50));
            }
            
            setProofsBase64(prev => {
                const updatedProofs = [...prev, ...proofsToAdd];
                console.log("Proofs state AFTER setProofsBase64 (total count):", updatedProofs.length);
                return updatedProofs;
            });

        } else if (!result.canceled && (!result.assets || result.assets.length === 0)) {
            console.warn("User selected files, but no assets were returned or assets array is empty.");
        }
    };

    const removeProof = (indexToRemove) => {
        Alert.alert(
            "Remove Attachment",
            "Are you sure you want to remove this attachment?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        setProofsBase64(prev => prev.filter((_, index) => index !== indexToRemove));
                        Alert.alert("Removed", "Attachment removed successfully.");
                    },
                },
            ]
        );
    };
    
    const saveComplaint = async () => {
        const validationErrors = {};
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
            console.log('Current proofsBase64 state via ref before sending:', proofsBase64Ref.current.length, 'proofs');
            if (proofsBase64Ref.current.length > 0) {
                console.log('First proof in ref (first 50 chars):', proofsBase64Ref.current[0].substring(0, 50));
            }

            const payload = {
                complainant_resident_id: complainantResidentId,
                complainant_display_name: complainantDisplayName,
                complainant_address: complainantAddress,
                contact_number: complainantContactNumber,
                date_of_complaint: formatDateForAPI(dateOfComplaint),
                time_of_complaint: formatTimeForAPI(timeOfComplaint),
                person_complained_against_name: personComplainedAgainstName.trim(), 
                person_complained_against_resident_id: null,
                category: category,
                status: status,
                notes_description: notesDescription.trim(),
                proofs_base64: proofsBase64Ref.current, 
            };
            console.log('Complaint payload being sent:', payload);
            console.log('Number of proofs in payload:', payload.proofs_base64.length); 
            if (payload.proofs_base64.length > 0) {
                console.log('First proof in payload length (approx):', payload.proofs_base64[0].length);
            }

            const response = await apiRequest('POST', '/api/complaints', payload);
            if (response && (response.message || response.complaint?._id)) {
                Alert.alert("Success", response.message || "Complaint submitted successfully!");
                router.replace('/complaints');
            } else {
                Alert.alert("Error", response?.error || response?.message || "Could not submit complaint. Account maybe On Hold / Deactivated.");
            }
        } catch (error) { console.error("Error submitting complaint:", error); Alert.alert("Error", "An unexpected error occurred.");
        } finally { setIsSaving(false); }
    };

    if (isLoadingInitialData) {
        return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" /><Text>Loading your info...</Text></View>;
    }

    const isAttachButtonDisabled = proofsBase64.length >= MAX_ATTACHMENTS;

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
                    <Text style={styles.label}>Person Complained Against</Text>
                    <TextInput
                        placeholder="Enter Name (Optional)"
                        value={personComplainedAgainstName}
                        onChangeText={handlePersonComplainedAgainstNameChange}
                        style={styles.textInput}
                    />
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
                
                {/* Proof of Complaint Section */}
                <Text style={styles.sectionTitle}>Proof of Complaint</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Attach Proof (Photos or Videos)</Text>
                    <TouchableOpacity 
                        onPress={pickProof} 
                        style={[styles.attachButton, isAttachButtonDisabled && styles.buttonDisabled]}
                        disabled={isAttachButtonDisabled}
                    >
                        <MaterialCommunityIcons name="attachment" size={24} color={isAttachButtonDisabled ? '#A9B4FF' : '#5E76FF'} />
                        <Text style={[styles.attachButtonText, isAttachButtonDisabled && { color: '#A9B4FF' }]}>
                            {proofsBase64.length > 0
                                ? `${proofsBase64.length} / ${MAX_ATTACHMENTS} File(s) Attached`
                                : `Select Files (Max ${MAX_ATTACHMENTS})`}
                        </Text>
                    </TouchableOpacity>
                    {proofsBase64.length > 0 && (
                        <ScrollView horizontal style={styles.proofsPreviewScroll}>
                            <View style={styles.proofsPreviewContainer}>
                                {proofsBase64.map((base64String, index) => (
                                    <View key={index} style={styles.proofPreviewItem}>
                                        {/* Use base64String to determine if it's an image or video for display */}
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
                {/* End Proof of Complaint Section */}

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
    // New styles for Proof of Complaint
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
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap', // Allow items to wrap if not horizontal scroll
    },
    proofPreviewItem: {
        flexDirection: 'column', // Align content vertically
        alignItems: 'center',
        marginRight: 10,
        marginBottom: 10,
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

export default NewComplaintScreen;