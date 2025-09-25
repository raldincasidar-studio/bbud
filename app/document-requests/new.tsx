import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import debounce from 'lodash.debounce';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Master list of available document types
const DOCUMENT_TYPES = [
    { label: 'Select Document Type *', value: '', enabled: false },
    { label: 'Barangay Clearance', value: 'Barangay Clearance' },
    { label: 'Barangay Permit (for installations)', value: 'Barangay Permit (for installations)' },
    { label: 'Certificate of Indigency', value: 'Certificate of Indigency' },
    { label: 'Certificate of Solo Parent', value: 'Certificate of Solo Parent' },
    { label: 'Certificate of Residency', value: 'Certificate of Residency' },
    { label: 'Barangay Business Permit', value: 'Barangay Business Permit' },
    { label: 'Barangay BADAC Certificate', value: 'Barangay BADAC Certificate' },
    { label: 'Certificate of Good Moral', value: 'Certificate of Good Moral' },
    { label: 'Certificate of Cohabitation', value: 'Certificate of Cohabitation' },
    { label: 'Barangay Business Clearance', value: 'Barangay Business Clearance' },
    { label: 'Barangay Certification (First Time Jobseeker)', value: 'Barangay Certification (First Time Jobseeker)' },
    { label: 'Certificate of Oneness', value: 'Certificate of Oneness' }
];

// Helper component to display error messages
const ErrorMessage = ({ error }) => {
    if (!error) return null;
    return <Text style={styles.errorText}>{error}</Text>;
};

// A platform-aware Picker component that uses a modal on iOS
const PickerInput = ({ label, value, onValueChange, items, error, placeholder, required = true }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const selectedItem = items.find(item => item.value === value);
    const displayLabel = selectedItem?.label ?? placeholder;

    if (Platform.OS === 'android') {
        return (
            <View style={styles.inputContainer}>
                {label && <Text style={styles.label}>{label} {required && <Text style={styles.requiredStar}>*</Text>}</Text>}
                <View style={[styles.pickerWrapper, !!error && styles.inputError]}>
                    <Picker
                        selectedValue={value}
                        onValueChange={onValueChange}
                        style={[styles.pickerText, !value && styles.pickerPlaceholder]}
                        itemStyle={{ color: 'black' }}
                    >
                        {items.map((opt, index) => (
                            <Picker.Item
                                key={index}
                                label={opt.label}
                                value={opt.value}
                                enabled={opt.enabled !== false}
                            />
                        ))}
                    </Picker>
                </View>
                <ErrorMessage error={error} />
            </View>
        );
    }

    // iOS implementation using a Modal
    return (
        <View style={styles.inputContainer}>
            {label && <Text style={styles.label}>{label} {required && <Text style={styles.requiredStar}>*</Text>}</Text>}
            <TouchableOpacity
                style={[styles.datePickerButton, !!error && styles.inputError]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={value ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>
                    {displayLabel}
                </Text>
            </TouchableOpacity>
            <ErrorMessage error={error} />

            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalDoneButton}>
                                <Text style={styles.modalDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={value}
                            onValueChange={onValueChange}
                            itemStyle={{ color: 'black' }}
                        >
                            {items.map((opt, index) => (
                                <Picker.Item key={index} label={opt.label} value={opt.value} />
                            ))}
                        </Picker>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

// Component for the date picker button
const DatePickerInput = ({ label, value, onPress, error }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label} <Text style={styles.requiredStar}>*</Text></Text>
        <TouchableOpacity
            style={[styles.datePickerButton, !!error && styles.inputError]}
            onPress={onPress}
        >
            <Text style={value ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>
                {value ? new Date(value).toLocaleDateString('en-CA') : 'Select Date'}
            </Text>
        </TouchableOpacity>
        <ErrorMessage error={error} />
    </View>
);

// Define Resident type based on backend search result mapping (including `birthdate` alias)
interface Resident {
    _id: string;
    first_name: string;
    last_name: string;
    birthdate?: string; // Made optional as it might not be immediately available or `null`
    address_house_number?: string;
    address_street?: string;
    address_subdivision_zone?: string;
    // Add other fields potentially used by the frontend here, e.g.:
    // email?: string;
    // contact_number?: string;
    // status?: string;
    // account_status?: string;
}

interface ResidentSearchAndSelectInputProps {
    label: string;
    selectedResident: Resident | null; // The selected resident object
    onSelectResident: (resident: Resident | null) => void;
    error?: string;
    placeholder?: string;
}

const ResidentSearchAndSelectInput: React.FC<ResidentSearchAndSelectInputProps> = ({
    label,
    selectedResident,
    onSelectResident,
    error,
    placeholder = "Search for a resident...",
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Resident[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false); // For iOS full-screen modal
    const [apiError, setApiError] = useState<string | null>(null); // To store API error messages

    // Debounced function for fetching residents
    const fetchResidents = useCallback(
        debounce(async (query: string) => {
            console.log(`[MOBILE SEARCH] fetchResidents called with query: "${query}"`);
            setApiError(null); // Clear previous API errors on new search
            setSearchResults([]); // Clear previous search results

            if (query.trim().length < 2) {
                console.log('[MOBILE SEARCH] Query too short (<2 chars), clearing results.');
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const response = await apiRequest('GET', '/api/residents/search', { q: query });
                console.log('[MOBILE SEARCH] API response received:', JSON.stringify(response));

                if (response && Array.isArray(response.residents)) {
                    const mappedResults: Resident[] = response.residents.map((r: any) => {
                        return {
                            _id: r._id,
                            first_name: r.first_name || '', // Ensure strings are not null/undefined
                            last_name: r.last_name || '',
                            // Ensure birthdate is handled defensively, backend sends `date_of_birth` and aliases to `birthdate`
                            birthdate: r.birthdate || r.date_of_birth,
                            address_house_number: r.address_house_number || '',
                            address_street: r.address_street || '',
                            address_subdivision_zone: r.address_subdivision_zone || '',
                            // Include other fields from backend response if needed for UI or logic
                        };
                    });
                    setSearchResults(mappedResults);
                    console.log(`[MOBILE SEARCH] Mapped ${mappedResults.length} results. First result:`, JSON.stringify(mappedResults[0]));
                    if (mappedResults.length === 0) {
                        setApiError("No residents found matching your search criteria.");
                    }
                } else {
                    console.log('[MOBILE SEARCH] Invalid API response or empty "residents" array. Clearing results.');
                    // If the backend returns an error message in the response body, display it
                    if (response && response.error) {
                        setApiError(response.message || response.error);
                    } else if (query.trim().length >= 2) {
                        setApiError("No residents found matching your search criteria.");
                    }
                }
            } catch (e: any) {
                console.error("[MOBILE SEARCH] Error searching residents:", e);
                setApiError(e.message || "Failed to fetch residents. Please check your network connection.");
            } finally {
                setIsLoading(false);
                console.log('[MOBILE SEARCH] Finished search operation. isLoading = false');
            }
        }, 500),
        []
    );

    // Effect to keep searchQuery in sync with selectedResident
    useEffect(() => {
        if (selectedResident) {
            const fullName = `${selectedResident.first_name} ${selectedResident.last_name}`;
            if (searchQuery !== fullName) { // Only update if different to avoid infinite loops with onChangeText
                setSearchQuery(fullName);
            }
            setSearchResults([]); // Clear search results when a resident is selected
            setApiError(null); // Clear API error as a selection is made
        } else if (!isLoading && !apiError && searchResults.length === 0 && searchQuery.trim().length === 0) {
            // Only clear search query if nothing is selected AND no active search/error/results
            // This prevents clearing user's typing prematurely
            setSearchQuery('');
        }
    }, [selectedResident, isLoading, apiError, searchResults.length]);


    // Effect to trigger search based on searchQuery changes (and modal visibility for iOS)
    useEffect(() => {
        console.log(`[MOBILE SEARCH useEffect] searchQuery: "${searchQuery}"`);
        console.log(`[MOBILE SEARCH useEffect] selectedResident: ${selectedResident ? selectedResident._id : 'null'}`);
        console.log(`[MOBILE SEARCH useEffect] isLoading: ${isLoading}, apiError: ${apiError}`);
        console.log(`[MOBILE SEARCH useEffect] searchResults.length: ${searchResults.length}`);

        // Only fetch if no resident is currently selected and the query is long enough
        const shouldFetch = !selectedResident && searchQuery.trim().length >= 2;

        if (Platform.OS === 'ios') {
            if (modalVisible && shouldFetch) {
                console.log('[MOBILE SEARCH useEffect] iOS modal visible and should fetch, triggering fetchResidents.');
                fetchResidents(searchQuery);
            } else if (!modalVisible) {
                // If iOS modal is closed, clear results and errors
                console.log('[MOBILE SEARCH useEffect] iOS modal not visible, clearing state.');
                setSearchResults([]);
                setApiError(null);
            }
        } else { // Android behavior
            if (shouldFetch) {
                console.log('[MOBILE SEARCH useEffect] Android platform and should fetch, triggering fetchResidents.');
                fetchResidents(searchQuery);
            } else {
                // For Android, if conditions for fetch are not met, clear results/errors
                console.log('[MOBILE SEARCH useEffect] Android platform, not fetching, clearing state.');
                setSearchResults([]);
                setApiError(null);
            }
        }
    }, [searchQuery, modalVisible, selectedResident, fetchResidents]);


    const handleSelect = (resident: Resident) => {
        onSelectResident(resident);
        setSearchQuery(`${resident.first_name} ${resident.last_name}`); // Update input to selected name
        setSearchResults([]); // Clear search results after selection
        setModalVisible(false); // Close modal on selection
        setApiError(null); // Clear any API errors
    };

    const handleClearSelection = () => {
        onSelectResident(null);
        setSearchQuery(''); // Clear input for new search
        setSearchResults([]); // Clear search results
        setApiError(null); // Clear any API errors
    };

    const renderItem = ({ item }: { item: Resident }) => {
        const fullName = `${item.first_name} ${item.last_name}`;
        const addressParts = [
            item.address_house_number,
            item.address_street,
            item.address_subdivision_zone
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ').trim() || 'No address available';

        return (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <Text style={styles.resultItemTitle}>{fullName}</Text>
                <Text style={styles.resultItemSubtitle}>{fullAddress}</Text>
            </TouchableOpacity>
        );
    };

    // Content for both iOS Modal and Android dropdown
    const SearchContent = (
        <View style={Platform.OS === 'ios' ? styles.modalContentInner : {}}>
            <TextInput
                style={[styles.textInput, !!error && styles.inputError, { marginBottom: 10 }]}
                placeholder={placeholder}
                placeholderTextColor="#A9A9A9"
                value={searchQuery}
                onChangeText={(text) => {
                    setSearchQuery(text);
                    // If a resident was selected and user starts typing again, clear the selection
                    if (selectedResident && `${selectedResident.first_name} ${selectedResident.last_name}` !== text) {
                        onSelectResident(null);
                    }
                }}
            />
            {isLoading && <ActivityIndicator size="small" color="#0F00D7" style={{ marginVertical: 10 }} />}
            {apiError && <ErrorMessage error={apiError} />}
            {searchResults.length > 0 && (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    style={styles.searchResultsList}
                    keyboardShouldPersistTaps="handled"
                />
            )}
            {/* Display 'No residents found' only if not loading, query is long enough, and no results, and no specific API error */}
            {!isLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && !apiError && (
                <Text style={styles.noResultsText}>No residents found.</Text>
            )}
        </View>
    );

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label} <Text style={styles.requiredStar}>*</Text></Text>
            {Platform.OS === 'ios' ? (
                <>
                    <TouchableOpacity
                        style={[styles.textInput, !!error && styles.inputError, styles.selectedResidentDisplay]}
                        onPress={() => {
                            // When opening modal, initialize searchQuery with selected name or empty
                            setSearchQuery(selectedResident ? `${selectedResident.first_name} ${selectedResident.last_name}` : '');
                            setModalVisible(true);
                            setSearchResults([]); // Clear previous results
                            setApiError(null); // Clear previous errors
                        }}
                    >
                        <Text style={selectedResident ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>
                            {selectedResident ? `${selectedResident.first_name} ${selectedResident.last_name}` : placeholder}
                        </Text>
                        {selectedResident && (
                            <TouchableOpacity onPress={handleClearSelection} style={styles.clearButton}>
                                <MaterialCommunityIcons name="close-circle" size={20} color="#666" />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                    <ErrorMessage error={error} />
                    {apiError && <ErrorMessage error={apiError} />} {/* Display API errors for iOS outside modal */}
                    <Modal
                        transparent={true}
                        visible={modalVisible}
                        animationType="slide"
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
                            <View style={styles.modalWrapper}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalDoneButton}>
                                        <Text style={styles.modalDoneText}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                {SearchContent}
                            </View>
                        </TouchableOpacity>
                    </Modal>
                </>
            ) : (
                <>
                    <View style={{ position: 'relative' }}>
                        <TextInput
                            style={[styles.textInput, !!error && styles.inputError]}
                            placeholder={placeholder}
                            placeholderTextColor="#A9A9A9"
                            value={selectedResident ? `${selectedResident.first_name} ${selectedResident.last_name}` : searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                // Clear selection if user types over a selected name
                                if (selectedResident && `${selectedResident.first_name} ${selectedResident.last_name}`.toLowerCase() !== text.toLowerCase()) {
                                    onSelectResident(null);
                                }
                            }}
                            // Removed: editable={!selectedResident} - This was the bug for Android
                        />
                        {selectedResident && (
                            <TouchableOpacity onPress={handleClearSelection} style={styles.clearButtonAndroid}>
                                <MaterialCommunityIcons name="close-circle" size={20} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <ErrorMessage error={error} />
                    {apiError && <ErrorMessage error={apiError} />} {/* Display API errors for Android */}
                    {isLoading && <ActivityIndicator size="small" color="#0F00D7" style={{ marginVertical: 10 }} />}
                    {searchQuery.trim().length >= 2 && searchResults.length > 0 && !selectedResident && !isLoading && (
                        <View style={styles.dropdownContainer}>
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item._id}
                                renderItem={renderItem}
                                style={styles.searchResultsList}
                                keyboardShouldPersistTaps="handled"
                            />
                        </View>
                    )}
                    {/* Display 'No residents found' only if not loading, query is long enough, no selection, and no other API error */}
                    {!isLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && !selectedResident && !apiError && (
                        <Text style={styles.noResultsText}>No residents found.</Text>
                    )}
                </>
            )}
        </View>
    );
};


const NewDocumentRequestScreen = () => {
    const router = useRouter();

    const [form, setForm] = useState({
        requestor_resident_id: '',
        request_type: '',
        purpose: '',
        details: {
            male_partner: null as Resident | null, // Changed to store Resident object
            male_partner_birthdate: '',
            female_partner: null as Resident | null, // Changed to store Resident object
            female_partner_birthdate: '',
            year_started_cohabiting: '',
        } as Record<string, any>,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loggedInUserData, setLoggedInUserData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
    // NEW state for AI validation modal
    const [showAiValidationModal, setShowAiValidationModal] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingInitialData(true);
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsedUserData = JSON.parse(storedUserDataString);
                    setLoggedInUserData(parsedUserData);
                    setForm(prev => ({ ...prev, requestor_resident_id: parsedUserData._id }));
                } else {
                    Alert.alert("Authentication Error", "Could not load user data. Please log in again.");
                    router.replace('/login');
                }
            } catch (e) {
                console.error("Failed to load initial data", e);
                Alert.alert("Error", "Failed to load user data. Please try again later.");
            } finally {
                setIsLoadingInitialData(false);
            }
        };
        loadInitialData();
    }, []);

    const validateField = (field: string, value: any): string => {
        let error = '';
        // Updated isRequired to handle resident objects
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim()) || (typeof val === 'object' && val !== null && !val._id);
        const isDate = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);
        const isYear = (val: string) => /^\d{4}$/.test(val);
        const isNumeric = (val: string) => /^\d+$/.test(val);

        switch (field) {
            case 'requestor_resident_id':
                if (isRequired(value)) error = 'Please select a requester.';
                break;
            case 'request_type':
                if (isRequired(value)) error = 'Please select a document type.';
                break;
            case 'purpose':
                if (isRequired(value)) error = 'A purpose for the request is required.';
                break;
            case 'details.male_partner': // Validating the resident object
                if (form.request_type === 'Certificate of Cohabitation' && isRequired(value)) error = "Male partner is required.";
                break;
            case 'details.male_partner_birthdate':
                if (form.request_type === 'Certificate of Cohabitation') {
                    if (isRequired(value)) error = "Birthdate is required.";
                    else if (!isDate(value)) error = 'Enter a valid date (YYYY-MM-DD).';
                }
                break;
            case 'details.female_partner': // Validating the resident object
                if (form.request_type === 'Certificate of Cohabitation' && isRequired(value)) error = "Female partner is required.";
                break;
            case 'details.female_partner_birthdate':
                if (form.request_type === 'Certificate of Cohabitation') {
                    if (isRequired(value)) error = "Birthdate is required.";
                    else if (!isDate(value)) error = 'Enter a valid date (YYYY-MM-DD).';
                }
                break;
            case 'details.year_started_cohabiting':
                if (form.request_type === 'Certificate of Cohabitation') {
                    if (isRequired(value)) error = "Year is required.";
                    else if (!isYear(value)) error = 'Enter a valid 4-digit year.';
                }
                break;
            case 'details.business_name':
                if ((form.request_type === 'Barangay Business Clearance' || form.request_type === 'Barangay Business Permit') && isRequired(value)) error = 'Business Trade Name is required.';
                break;
            case 'details.nature_of_business':
                if (form.request_type === 'Barangay Business Clearance' && isRequired(value)) error = 'Nature of Business is required.';
                break;
            case 'details.business_address':
                if (form.request_type === 'Barangay Business Permit' && isRequired(value)) error = 'Business Address is required.';
                break;
            case 'details.type_of_work':
                if (form.request_type === 'Barangay Clearance' && isRequired(value)) error = 'Type of Work is required.';
                break;
            case 'details.purpose_of_clearance':
                if (form.request_type === 'Barangay Clearance' && isRequired(value)) error = 'Purpose of Clearance is required.';
                break;
            case 'details.installation_construction_repair':
                if (form.request_type === 'Barangay Permit (for installations)' && isRequired(value)) error = 'Type of activity is required.';
                break;
            case 'details.project_site':
                if (form.request_type === 'Barangay Permit (for installations)' && isRequired(value)) error = 'Project site is required.';
                break;
            case 'details.years_lived':
            case 'details.months_lived':
                if (form.request_type === 'Barangay Certification (First Time Jobseeker)') {
                    if (isRequired(value)) error = 'This field is required.';
                    else if (!isNumeric(value)) error = 'Must be a number.';
                }
                break;
            case 'details.medical_educational_financial':
                if (form.request_type === 'Certificate of Indigency' && isRequired(value)) error = 'Please select a purpose.';
                break;
            case 'details.badac_certificate':
                if (form.request_type === 'Barangay BADAC Certificate' && isRequired(value)) error = 'BADAC purpose is required.';
                break;
            default:
                break;
        }

        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[field] = error;
            } else {
                delete newErrors[field];
            }
            return newErrors;
        });

        return error;
    };

    const handleFormChange = (field: keyof typeof form, value: any) => {
        setForm(prev => {
            const isRequestTypeChange = field === 'request_type';
            const updatedForm = {
                ...prev,
                [field]: value,
                details: isRequestTypeChange ? {} : prev.details, // Clear details on request type change
            };

            if (isRequestTypeChange) {
                setErrors(e => {
                    const newErrors = { ...e };
                    Object.keys(newErrors).forEach(key => {
                        if (key.startsWith('details.') || key === 'purpose') {
                            delete newErrors[key];
                        }
                    });
                    return newErrors;
                });
                // Initialize specific details fields based on the new request type
                // This ensures fields exist for binding and validation
                if (value === 'Certificate of Cohabitation') {
                    updatedForm.details = {
                        male_partner: null,
                        male_partner_birthdate: '',
                        female_partner: null,
                        female_partner_birthdate: '',
                        year_started_cohabiting: '',
                    };
                } else if (value === 'Barangay Clearance') {
                    updatedForm.details = { type_of_work: '', other_work: '', number_of_storeys: '', purpose_of_clearance: '' };
                } else if (value === 'Barangay Business Clearance') {
                    updatedForm.details = { business_name: '', nature_of_business: '' };
                } else if (value === 'Barangay Business Permit') {
                    updatedForm.details = { business_name: '', business_address: '' };
                } else if (value === 'Barangay Certification (First Time Jobseeker)') {
                    updatedForm.details = { years_lived: '', months_lived: '' };
                } else if (value === 'Certificate of Indigency') {
                    updatedForm.details = { medical_educational_financial: '' };
                } else if (value === 'Barangay BADAC Certificate') {
                    updatedForm.details = { badac_certificate: '' };
                } else if (value === 'Barangay Permit (for installations)') {
                    updatedForm.details = { installation_construction_repair: '', project_site: '' };
                } //else if (value === 'Certificate of Oneness') {
                //     updatedForm.purpose = 'For records purposes'; 
                // }  For 'Certificate of Good Moral', 'Certificate of Solo Parent', 'Certificate of Residency', 'Certificate of Oneness'
                // updatedForm.details will correctly remain an empty object from the `details: isRequestTypeChange ? {} : prev.details` line.
            }

            validateField(field, value);
            return updatedForm;
        });
    };

    const handleDetailChange = (detailField: string, value: any) => {
        setForm(prev => {
            let updatedDetails = { ...prev.details, [detailField]: value };

            // Auto-fill birthdate when a partner object is selected
            if (detailField === 'male_partner' && value && value.birthdate) {
                updatedDetails.male_partner_birthdate = value.birthdate.split('T')[0];
            } else if (detailField === 'male_partner' && !value) { // Clear birthdate if partner is cleared
                updatedDetails.male_partner_birthdate = '';
            }
            if (detailField === 'female_partner' && value && value.birthdate) {
                updatedDetails.female_partner_birthdate = value.birthdate.split('T')[0];
            } else if (detailField === 'female_partner' && !value) { // Clear birthdate if partner is cleared
                updatedDetails.female_partner_birthdate = '';
            }

            validateField(`details.${detailField}`, value);
            // Re-validate associated birthdate field if partner is set/cleared
            if (detailField === 'male_partner') validateField('details.male_partner_birthdate', updatedDetails.male_partner_birthdate);
            if (detailField === 'female_partner') validateField('details.female_partner_birthdate', updatedDetails.female_partner_birthdate);


            return { ...prev, details: updatedDetails };
        });
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (event.type === 'set' && selectedDate && datePickerTarget) { // 'set' indicates a date was selected
            const formattedDate = selectedDate.toISOString().split('T')[0];
            handleDetailChange(datePickerTarget, formattedDate);
            setDatePickerTarget('');
        } else if (event.type === 'dismissed') {
            console.log('[DATE PICKER] Date picker was dismissed.');
        }
    };

    const openDatePicker = (target: string) => {
        setDatePickerTarget(target);
        setShowDatePicker(true);
    };

    const saveRequest = async () => {
        let hasValidationErrors = false;
        const fieldsToValidate: Record<string, any> = {
            requestor_resident_id: form.requestor_resident_id,
            request_type: form.request_type,
        };

        fieldsToValidate.purpose = form.purpose;

        if (form.request_type) {
            const details = form.details;
            const requestType = form.request_type;

            if (requestType === 'Certificate of Cohabitation') {
                Object.assign(fieldsToValidate, {
                    'details.male_partner': details.male_partner,
                    'details.male_partner_birthdate': details.male_partner_birthdate,
                    'details.female_partner': details.female_partner,
                    'details.female_partner_birthdate': details.female_partner_birthdate,
                    'details.year_started_cohabiting': details.year_started_cohabiting,
                });
            } else if (requestType === 'Barangay Clearance') {
                Object.assign(fieldsToValidate, { 'details.type_of_work': details.type_of_work, 'details.purpose_of_clearance': details.purpose_of_clearance, 'details.number_of_storeys': details.number_of_storeys });
            } else if (requestType === 'Barangay Business Clearance') {
                Object.assign(fieldsToValidate, { 'details.business_name': details.business_name, 'details.nature_of_business': details.nature_of_business });
            } else if (requestType === 'Barangay Business Permit') {
                Object.assign(fieldsToValidate, { 'details.business_name': details.business_name, 'details.business_address': details.business_address });
            } else if (requestType === 'Barangay Certification (First Time Jobseeker)') {
                Object.assign(fieldsToValidate, { 'details.years_lived': details.years_lived, 'details.months_lived': details.months_lived });
            } else if (requestType === 'Certificate of Indigency') {
                Object.assign(fieldsToValidate, { 'details.medical_educational_financial': details.medical_educational_financial });
            } else if (requestType === 'Barangay Permit (for installations)') {
                Object.assign(fieldsToValidate, { 'details.installation_construction_repair': details.installation_construction_repair, 'details.project_site': details.project_site });
            } else if (requestType === 'Barangay BADAC Certificate') {
                Object.assign(fieldsToValidate, { 'details.badac_certificate': details.badac_certificate });
            }
            // Certificate of Oneness, Certificate of Good Moral, Certificate of Solo Parent, Certificate of Residency
            // have no specific 'details' fields required, so they won't be explicitly added here for validation.
        }

        // Run all validations
        const currentErrors: Record<string, string> = {};
        Object.keys(fieldsToValidate).forEach(field => {
            const error = validateField(field, fieldsToValidate[field]);
            if (error) {
                currentErrors[field] = error;
                hasValidationErrors = true;
            }
        });
        setErrors(currentErrors); // Update state with all errors at once

        if (hasValidationErrors) {
            Alert.alert("Validation Error", "Please fix the errors shown on the form.");
            return;
        }

        setIsSaving(true);
        // Show AI validation modal BEFORE sending the request
        setShowAiValidationModal(true);
        try {
            // --- UPDATED LOGIC FOR CONSTRUCTING PAYLOAD.DETAILS ---
            let requestDetails: Record<string, any> = { ...form.details }; // Start with current form.details (which should be {} for most non-cohab types)

            if (form.request_type === 'Certificate of Cohabitation') {
                // For Cohabitation, explicitly add partner IDs and names
                requestDetails = {
                    ...requestDetails, // This would already contain cohabitation-specific fields from form.details
                    male_partner_id: form.details.male_partner?._id || null,
                    male_partner_name: form.details.male_partner ? `${form.details.male_partner.first_name} ${form.details.male_partner.last_name}` : null,
                    female_partner_id: form.details.female_partner?._id || null,
                    female_partner_name: form.details.female_partner ? `${form.details.female_partner.first_name} ${form.details.female_partner.last_name}` : null,
                };
                // Remove the complex Resident objects, leaving only their IDs/names and other fields
                delete requestDetails.male_partner;
                delete requestDetails.female_partner;
            } else {
                // For all other document types, ensure `requestDetails` is genuinely empty
                // if `form.details` was intended to be empty.
                // We'll filter out potential remnants from initial state or previous selections.
                requestDetails = {}; // Start fresh for non-cohabitation types
                if (form.request_type === 'Barangay Clearance') {
                    requestDetails = {
                        type_of_work: form.details.type_of_work,
                        other_work: form.details.other_work,
                        number_of_storeys: form.details.number_of_storeys,
                        purpose_of_clearance: form.details.purpose_of_clearance,
                    };
                } else if (form.request_type === 'Barangay Business Clearance') {
                    requestDetails = {
                        business_name: form.details.business_name,
                        nature_of_business: form.details.nature_of_business,
                    };
                } else if (form.request_type === 'Barangay Business Permit') {
                    requestDetails = {
                        business_name: form.details.business_name,
                        business_address: form.details.business_address,
                    };
                } else if (form.request_type === 'Barangay Certification (First Time Jobseeker)') {
                    requestDetails = {
                        years_lived: form.details.years_lived,
                        months_lived: form.details.months_lived,
                    };
                } else if (form.request_type === 'Certificate of Indigency') {
                    requestDetails = {
                        medical_educational_financial: form.details.medical_educational_financial,
                    };
                } else if (form.request_type === 'Barangay BADAC Certificate') {
                    requestDetails = {
                        badac_certificate: form.details.badac_certificate,
                    };
                } else if (form.request_type === 'Barangay Permit (for installations)') {
                    requestDetails = {
                        installation_construction_repair: form.details.installation_construction_repair,
                        project_site: form.details.project_site,
                    };
                }
                // For 'Certificate of Good Moral', 'Certificate of Solo Parent', 'Certificate of Residency', 'Certificate of Oneness'
                // requestDetails will remain an empty object, which is the desired behavior.
            }
            // --- END UPDATED LOGIC ---

            const payload = {
                requestor_resident_id: form.requestor_resident_id,
                purpose: form.purpose,
                request_type: form.request_type,
                details: requestDetails, // Use the carefully constructed requestDetails
            };

            const response = await apiRequest('POST', '/api/document-requests', payload);
            if (response && (response.message || response.requestId)) {
                Alert.alert("Success", "Document request submitted successfully!");
                router.replace('/request-document');
            } else {
                const backendError = response?.error || response?.message || "Could not submit the request. Check status On Hold / Deactivated.";
                Alert.alert("Error", backendError);
            }
        } catch (error: any) {
            console.error("Error saving document request:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "An unexpected error occurred.";
            Alert.alert("Error", errorMessage);
        } finally {
            // Optional: Add a small delay for better UX before hiding the modal
            setTimeout(() => {
                setIsSaving(false);
                setShowAiValidationModal(false);
            }, 1500); // Wait for 1.5 seconds before hiding
        }
    };

    const renderDynamicFields = () => {
        if (!form.request_type) return null;

        // Define a dynamic placeholder for the purpose field
        let purposePlaceholder = "Be specific (e.g., For hospital application, For new job application)";
        if (form.request_type === 'Certificate of Oneness') {
            purposePlaceholder = "This Certificate of Oneness will be used as an official supporting document for school or administrative requirements, such as enrollment, scholarship applications, graduation clearance, employment needs, or for maintaining accurate personal records.";
        }


        return (
            <View>
                <Text style={styles.sectionTitle}>{form.request_type} - Required Information</Text>

                {form.request_type === 'Certificate of Cohabitation' && (
                    <>
                        <ResidentSearchAndSelectInput
                            label="Full Name of Male Partner"
                            selectedResident={form.details.male_partner}
                            onSelectResident={(resident) => handleDetailChange('male_partner', resident)}
                            error={errors['details.male_partner']}
                            placeholder="Search for male partner..."
                        />
                        <DatePickerInput
                            label="Birthdate of Male Partner"
                            value={form.details.male_partner_birthdate}
                            onPress={() => openDatePicker('male_partner_birthdate')}
                            error={errors['details.male_partner_birthdate']}
                        />
                        <ResidentSearchAndSelectInput
                            label="Full Name of Female Partner"
                            selectedResident={form.details.female_partner}
                            onSelectResident={(resident) => handleDetailChange('female_partner', resident)}
                            error={errors['details.female_partner']}
                            placeholder="Search for female partner..."
                        />
                        <DatePickerInput
                            label="Birthdate of Female Partner"
                            value={form.details.female_partner_birthdate}
                            onPress={() => openDatePicker('female_partner_birthdate')}
                            error={errors['details.female_partner_birthdate']}
                        />
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Year Started Living Together <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                style={[styles.textInput, !!errors['details.year_started_cohabiting'] && styles.inputError]}
                                placeholder="YYYY"
                                placeholderTextColor="#A9A9A9"
                                value={form.details.year_started_cohabiting || ''}
                                onChangeText={(val) => handleDetailChange('year_started_cohabiting', val)}
                                keyboardType="numeric"
                                maxLength={4}
                            />
                            <ErrorMessage error={errors['details.year_started_cohabiting']} />
                        </View>
                    </>
                )}

                {form.request_type === 'Barangay Clearance' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Type of Work (e.g., sidewalk repair) <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                style={[styles.textInput, !!errors['details.type_of_work'] && styles.inputError]}
                                placeholder="Type of Work (e.g., sidewalk repair)"
                                placeholderTextColor="#A9A9A9"
                                value={form.details.type_of_work || ''}
                                onChangeText={(val) => handleDetailChange('type_of_work', val)}
                            />
                            <ErrorMessage error={errors['details.type_of_work']} />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Other Work (Optional)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Other Work (e.g., drainage tapping)"
                                placeholderTextColor="#A9A9A9"
                                value={form.details.other_work || ''}
                                onChangeText={(val) => handleDetailChange('other_work', val)}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Number of Storeys <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                style={[styles.textInput, !!errors['details.number_of_storeys'] && styles.inputError]}
                                placeholder="Number of Storeys"
                                placeholderTextColor="#A9A9A9"
                                value={form.details.number_of_storeys || ''}
                                onChangeText={(val) => handleDetailChange('number_of_storeys', val)}
                                keyboardType="numeric"
                            />
                            <ErrorMessage error={errors['details.number_of_storeys']} />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Purpose of this Clearance <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                style={[styles.textInput, !!errors['details.purpose_of_clearance'] && styles.inputError]}
                                placeholder="Purpose of this Clearance"
                                placeholderTextColor="#A9A9A9"
                                value={form.details.purpose_of_clearance || ''}
                                onChangeText={(val) => handleDetailChange('purpose_of_clearance', val)}
                            />
                            <ErrorMessage error={errors['details.purpose_of_clearance']} />
                        </View>
                    </>
                )}

                {form.request_type === 'Barangay Business Clearance' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Business Trade Name <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput style={[styles.textInput, !!errors['details.business_name'] && styles.inputError]} placeholder="Business Trade Name" placeholderTextColor="#A9A9A9" value={form.details.business_name || ''} onChangeText={(val) => handleDetailChange('business_name', val)} />
                            <ErrorMessage error={errors['details.business_name']} />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Nature of Business <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput style={[styles.textInput, !!errors['details.nature_of_business'] && styles.inputError]} placeholder="Nature of Business" placeholderTextColor="#A9A9A9" value={form.details.nature_of_business || ''} onChangeText={(val) => handleDetailChange('nature_of_business', val)} />
                            <ErrorMessage error={errors['details.nature_of_business']} />
                        </View>
                    </>
                )}

                {form.request_type === 'Barangay Business Permit' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Business Trade Name <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput style={[styles.textInput, !!errors['details.business_name'] && styles.inputError]} placeholder="Business Trade Name" placeholderTextColor="#A9A9A9" value={form.details.business_name || ''} onChangeText={(val) => handleDetailChange('business_name', val)} />
                            <ErrorMessage error={errors['details.business_name']} />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Business Address <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput style={[styles.textInput, !!errors['details.business_address'] && styles.inputError]} placeholder="Business Address" placeholderTextColor="#A9A9A9" value={form.details.business_address || ''} onChangeText={(val) => handleDetailChange('business_address', val)} />
                            <ErrorMessage error={errors['details.business_address']} />
                        </View>
                    </>
                )}

                {form.request_type === 'Barangay Certification (First Time Jobseeker)' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Number of Years at Address <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput style={[styles.textInput, !!errors['details.years_lived'] && styles.inputError]} placeholder="Number of Years at Address" placeholderTextColor="#A9A9A9" value={form.details.years_lived || ''} onChangeText={(val) => handleDetailChange('years_lived', val)} keyboardType="numeric" />
                            <ErrorMessage error={errors['details.years_lived']} />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Number of Months at Address <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput style={[styles.textInput, !!errors['details.months_lived'] && styles.inputError]} placeholder="Number of Months at Address" placeholderTextColor="#A9A9A9" value={form.details.months_lived || ''} onChangeText={(val) => handleDetailChange('months_lived', val)} keyboardType="numeric" />
                            <ErrorMessage error={errors['details.months_lived']} />
                        </View>
                    </>
                )}

                {form.request_type === 'Certificate of Indigency' && (
                    <PickerInput
                        label="Purpose (Medical/Educational/Financial)"
                        value={form.details.medical_educational_financial || ''}
                        onValueChange={(val) => handleDetailChange('medical_educational_financial', val)}
                        items={[
                            { label: 'Select Purpose *', value: '', enabled: false },
                            { label: 'Medical', value: 'Medical' },
                            { label: 'Educational', value: 'Educational' },
                            { label: 'Financial', value: 'Financial' },
                        ]}
                        error={errors['details.medical_educational_financial']}
                        placeholder="Select Purpose *"
                    />
                )}

                {form.request_type === 'Barangay BADAC Certificate' && (
                    <PickerInput
                        label="BADAC Purpose"
                        value={form.details.badac_certificate || ''}
                        onValueChange={(val) => handleDetailChange('badac_certificate', val)}
                        items={[
                            { label: 'Select Purpose *', value: '', enabled: false },
                            { label: 'PNP Application', value: 'PNP Application' },
                            { label: 'School Requirement', value: 'School Requirement' },
                            { label: 'Job Application', value: 'Job Application' },
                            { label: 'Board Exam', value: 'Board Exam' },
                            { label: 'Others', value: 'Others' },
                        ]}
                        error={errors['details.badac_certificate']}
                        placeholder="Select BADAC Purpose *"
                    />
                )}

                {form.request_type === 'Barangay Permit (for installations)' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Installation/Construction/Repair <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                style={[styles.textInput, !!errors['details.installation_construction_repair'] && styles.inputError]}
                                placeholder="Installation/Construction/Repair"
                                placeholderTextColor="#A9A9A9"
                                value={form.details.installation_construction_repair || ''}
                                onChangeText={(val) => handleDetailChange('installation_construction_repair', val)}
                            />
                            <ErrorMessage error={errors['details.installation_construction_repair']} />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Project Site <Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                style={[styles.textInput, !!errors['details.project_site'] && styles.inputError]}
                                placeholder="Project Site"
                                placeholderTextColor="#A9A9A9"
                                value={form.details.project_site || ''}
                                onChangeText={(val) => handleDetailChange('project_site', val)}
                            />
                            <ErrorMessage error={errors['details.project_site']} />
                        </View>
                    </>
                )}

                {form.request_type === 'Certificate of Oneness' && (
                    <Text style={styles.label}>No specific additional details required for Certificate of Oneness.</Text>
                )}
                 {form.request_type === 'Certificate of Good Moral' && (
                    <Text style={styles.label}>No specific additional details required for Certificate of Good Moral.</Text>
                )}
                 {form.request_type === 'Certificate of Solo Parent' && (
                    <Text style={styles.label}>No specific additional details required for Certificate of Solo Parent.</Text>
                )}
                 {form.request_type === 'Certificate of Residency' && (
                    <Text style={styles.label}>No specific additional details required for Certificate of Residency.</Text>
                )}

                {/* Purpose is conditionally required, but the field always exists */}
                <View style={[styles.inputContainer, { paddingTop: 10 }]}>
                    <Text style={styles.label}>Purpose of this Request <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        placeholder={purposePlaceholder}
                        placeholderTextColor="#A9A9A9"
                        value={form.purpose}
                        onChangeText={(val) => handleFormChange('purpose', val)}
                        style={[styles.textInput, { height: 230 }, !!errors.purpose && styles.inputError]}
                        multiline
                        textAlignVertical="top"
                    />
                    <ErrorMessage error={errors.purpose} />
                </View>
            </View>
        );
    }

    if (isLoadingInitialData) {
        return (
            <View style={styles.loaderContainerFullPage}>
                <ActivityIndicator size="large" color="#0F00D7" />
                <Text style={{ marginTop: 10, color: '#000' }}>Loading your information...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Document Request</Text>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionTitle}>Requestor Information</Text>

                {/* The Requestor Picker is not for searching, but for selecting from already loaded user data */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Requesting For <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                        style={styles.textInput}
                        value={loggedInUserData ? `${loggedInUserData.first_name} ${loggedInUserData.last_name}` : ''}
                        editable={false} // This field should be read-only as it's the logged-in user
                        placeholderTextColor="#A9A9A9"
                    />
                </View>

                <Text style={styles.sectionTitle}>Document Details</Text>

                <PickerInput
                    label="Type of Document to Request"
                    value={form.request_type}
                    onValueChange={(itemValue) => handleFormChange('request_type', itemValue)}
                    items={DOCUMENT_TYPES}
                    error={errors.request_type}
                    placeholder="Select Document Type *"
                />

                {renderDynamicFields()}

                {showDatePicker && (
                    <DateTimePicker
                        value={form.details[datePickerTarget] ? new Date(form.details[datePickerTarget]) : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                    />
                )}

                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={saveRequest} style={[styles.submitButton, isSaving && styles.buttonDisabled]} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Submit Request</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* AI Validation Loading Modal */}
            <Modal
                transparent={true}
                visible={showAiValidationModal}
                animationType="fade"
                onRequestClose={() => {}} // Disable closing with back button on Android
            >
                <View style={styles.aiValidationModalBackground}>
                    <View style={styles.aiValidationModalContent}>
                        <ActivityIndicator size="large" color="#0F00D7" />
                        <Text style={styles.aiValidationModalTitle}>Please take a moment</Text>
                        <Text style={styles.aiValidationModalParagraph}>Our AI is validating your document request.</Text>
                    </View>
                </View>
            </Modal>
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
    textInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        marginTop: 5,
        marginBottom: 5,
        borderRadius: 8,
        fontSize: 16,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        color: '#000',
        backgroundColor: '#F9F9F9',
        flexDirection: 'row', // Added for clear button alignment
        alignItems: 'center', // Added for clear button alignment
    },
    pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
    pickerText: { color: '#000' },
    pickerPlaceholder: { color: '#A9A9A9' },
    buttonContainer: { marginTop: 25 },
    submitButton: { backgroundColor: '#5E76FF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    buttonDisabled: { backgroundColor: '#A9B4FF' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    inputError: { borderColor: '#D32F2F' },
    errorText: { color: '#D32F2F', fontSize: 12, marginTop: 4, marginBottom: 4 },
    datePickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, backgroundColor: '#F9F9F9', justifyContent: 'center', minHeight: 48 },
    datePickerButtonText: { fontSize: 16, color: '#000', flex: 1 },
    datePickerPlaceholderText: { fontSize: 16, color: '#A9A9A9', flex: 1 },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    modalHeader: {
        alignItems: 'flex-end',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalDoneButton: {
        padding: 8,
    },
    modalDoneText: {
        color: '#007AFF',
        fontSize: 17,
        fontWeight: '600',
    },
    // New styles for ResidentSearchAndSelectInput
    searchResultsList: {
        maxHeight: 200,
        borderColor: '#DDD',
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 5,
        backgroundColor: 'white',
    },
    resultItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    resultItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    resultItemSubtitle: {
        fontSize: 13,
        color: '#666',
    },
    noResultsText: {
        textAlign: 'center',
        paddingVertical: 10,
        color: '#666',
    },
    // Styles for ResidentSearchAndSelectInput's iOS modal
    modalWrapper: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
        maxHeight: '80%',
    },
    modalContentInner: {
        paddingHorizontal: 20,
    },
    selectedResidentDisplay: {
        justifyContent: 'space-between',
    },
    clearButton: {
        paddingLeft: 10,
    },
    clearButtonAndroid: {
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: [{ translateY: -10 }],
        zIndex: 1,
    },
    dropdownContainer: {
        position: 'absolute',
        top: 60, // Adjust based on TextInput height (input height + label height + margin)
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'white',
        borderRadius: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    // Styles for AI Validation Modal
    aiValidationModalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    aiValidationModalContent: {
        backgroundColor: 'white',
        paddingVertical: 30,
        paddingHorizontal: 25,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 10,
        marginHorizontal: 40,
        minWidth: 280,
    },
    aiValidationModalTitle: {
        marginTop: 20,
        fontSize: 18,
        textAlign: 'center',
        color: '#333',
        fontWeight: 'bold',
        lineHeight: 24,
        marginBottom: 5,
    },
    aiValidationModalParagraph: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        fontWeight: 'normal',
        lineHeight: 22,
    },
});

export default NewDocumentRequestScreen;