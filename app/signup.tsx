import apiRequest from '@/plugins/axios'; // Ensure this path is correct
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios'; // Import AxiosError from axios
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image, // Import Image for preview
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";


// --- Helper Functions and Components (Keep these the same) ---

const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return <Text style={styles.errorText}>{error}</Text>;
};

const calculateAge = (dobString: string | null): number | null => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 0 ? age : null;
};

// --- Proof of Relationship Configuration (Keep these the same) ---
const ALL_POSSIBLE_PROOF_DOCUMENTS = [
    { label: "PSA Birth Certificate", value: "PSA Birth Certificate" },
    { label: "Adoption Certificate", value: "Adoption Certificate" },
    { label: "Baptismal Certificate", value: "Baptismal Certificate" },
    { label: "PSA Marriage Certificate", value: "PSA Marriage Certificate" },
    { label: "LCR Marriage Certificate", value: "LCR Marriage Certificate" },
    { label: "Joint Affidavit", value: "Joint Affidavit" },
    { label: "Guardianship Affidavit", value: "Guardianship Affidavit" },
    { label: "Affidavit of Siblinghood", value: "Affidavit of Siblinghood" },
    { label: "Affidavit of Relationship", value: "Affidavit of Relationship" },
    { label: "Valid ID Card (e.g., Driver's License, Passport)", value: "Valid ID Card" },
];

interface ProofRequirement {
    allowedProofValues: string[];
    displayInfo: string;
}

const getProofConfigKey = (relationshipLabel: string): string => {
    switch (relationshipLabel) {
        case "Son": case "Daughter": return "Child";
        case "Father": case "Mother": return "Parent";
        case "Brother": case "Sister": return "Sibling";
        case "Grandfather": case "Grandmother": case "Grandchild": case "Uncle": case "Aunt": case "Cousin": case "Nephew": case "Niece": case "In-law": return "Other Relative";
        case "Household Help/Kasambahay": return "House Helper";
        case "Spouse": return "Spouse";
        case "Other Relative": return "Other Relative";
        case "Other": return "Other Relative";
        default: return relationshipLabel;
    }
};

const RELATIONSHIP_PROOF_CONFIG: { [key: string]: ProofRequirement } = {
    Child: { allowedProofValues: ["PSA Birth Certificate", "Adoption Certificate", "Baptismal Certificate"], displayInfo: 'Primary proof: PSA Birth Certificate (of child). Optional supporting: Adoption Certificate, Baptismal Certificate.', },
    Spouse: { allowedProofValues: ["PSA Marriage Certificate", "LCR Marriage Certificate", "Joint Affidavit"], displayInfo: 'Primary proof: PSA Marriage Certificate. Optional supporting: LCR Marriage Certificate, Joint Affidavit.', },
    Parent: { allowedProofValues: ["PSA Birth Certificate", "Guardianship Affidavit"], displayInfo: 'Primary proof: PSA Birth Certificate (of child). Optional supporting: Guardianship Affidavit.', },
    Sibling: { allowedProofValues: ["PSA Birth Certificate", "Affidavit of Siblinghood"], displayInfo: 'Primary proof: PSA Birth Certificates of both parties. Optional supporting: Affidavit of Siblinghood.', },
    'Other Relative': { allowedProofValues: ["PSA Birth Certificate", "Valid ID Card", "Affidavit of Relationship"], displayInfo: 'Primary proof: PSA Birth Certificate(s) or Valid ID Card. Optional supporting: Affidavit of Relationship.', },
    'House Helper': { allowedProofValues: ALL_POSSIBLE_PROOF_DOCUMENTS.map(doc => doc.value), displayInfo: 'Any of the above-mentioned documents may be accepted as available.', },
};

const RELATIONSHIPS_REQUIRING_PROOF_KEYS = Object.keys(RELATIONSHIP_PROOF_CONFIG);
// --- End Proof of Relationship Configuration ---

// --- Suffix Options (Keep these the same) ---
const suffixOptions = ['Jr.', 'Sr.', 'I', 'II', 'III', 'IV', 'V', 'VI'];

// --- Relationship Picker Options (Keep these the same) ---
const relationshipPickerOptions = [
    { label: "Select Relationship*", value: "" },
    { label: "Spouse", value: "Spouse" },
    { label: "Son", value: "Son" },
    { label: "Daughter", value: "Daughter" },
    { label: "Father", value: "Father" },
    { label: "Mother", value: "Mother" },
    { label: "Brother", value: "Brother" },
    { label: "Sister", value: "Sister" },
    { label: "Grandfather", value: "Grandfather" },
    { label: "Grandmother", value: "Grandmother" }, // Corrected in previous step
    { label: "Grandchild", value: "Grandchild" }, // Corrected in previous step
    { label: "Uncle", value: "Uncle" },
    { label: "Aunt", value: "Aunt" },
    { label: "Cousin", value: "Cousin" },
    { label: "Nephew", value: "Nephew" },
    { label: "Niece", value: "Niece" },
    { label: "In-law", value: "In-law" },
    { label: "Household Help/Kasambahay", value: "Household Help/Kasambahay" },
    { label: "Other", value: "Other" },
];


// --- Initial State Definitions (Keep these the same) ---

const initialMemberState = {
    first_name: '', middle_name: '', last_name: '', suffix: null as string | null,
    sex: '',
    date_of_birth: null as string | null, civil_status: '', citizenship: 'Filipino', other_citizenship: '',
    occupation_status: '', contact_number: '', relationship_to_head: '',
    other_relationship: '', email: '', password: '', is_voter: false, voter_id_number: '',
    voter_registration_proof_base64: null as string | null, is_pwd: false, pwd_id: '',
    pwd_card_base64: null as string | null, is_senior_citizen: false, senior_citizen_id: '',
    senior_citizen_card_base64: null as string | null,
    proof_of_relationship_type: null as string | null,
    proof_of_relationship_base64: null as string | null,
};

type Member = typeof initialMemberState;

const initialHeadState = {
    ...initialMemberState, relationship_to_head: '', other_relationship: '', password: '',
    confirmPassword: '', address_house_number: '',
    address_unit_room_apt_number: '', // NEW FIELD
    address_street: '', address_subdivision_zone: '',
    address_city_municipality: 'Manila City',
    type_of_household: null as string | null, // NEW FIELD
    years_at_current_address: '',
    proof_of_residency_base64: [] as string[],
    authorization_letter_base64: null as string | null,
    proof_of_relationship_type: null,
    proof_of_relationship_base64: null,
};

type Head = Omit<typeof initialHeadState, 'proof_of_relationship_type' | 'proof_of_relationship_base64'> & {
    suffix: string | null;
    proof_of_relationship_type?: null;
    proof_of_relationship_base64?: null;
};


// Reusable component for toggled sections with validation (Keep these the same)
const ToggleSection = ({ label, value, onValueChange, idLabel, idValue, onIdChange, error, proofLabel, proofValue, onProofPress, showPreview = true }: any) => (
    <View style={styles.toggleContainer}>
        <View style={styles.toggleSwitchRow}>
            <Text style={styles.label}>{label}</Text>
            <Switch trackColor={{ false: "#767577", true: "#4CAF50" }} thumbColor={"#f4f3f4"} onValueChange={onValueChange} value={value} />
        </View>
        {value && (
            <View style={styles.conditionalContainer}>
                <Text style={styles.label}>{idLabel}</Text>
                <TextInput style={[styles.textInput, !!error && styles.inputError]} value={idValue} onChangeText={onIdChange} placeholder={idLabel.replace('*','')} placeholderTextColor="#A9A9A9" />
                <ErrorMessage error={error} />
                <TouchableOpacity style={styles.filePickerButton} onPress={onProofPress}>
                    <Text style={styles.filePickerButtonText}>{proofValue ? 'Change Proof' : proofLabel}</Text>
                </TouchableOpacity>
                {proofValue && showPreview && <Image source={{ uri: proofValue }} style={styles.previewImageSmall} />}
            </View>
        )}
    </View>
);

// NEW: Ai Validation Loading Modal Component
const AiValidationLoadingModal = ({ isVisible }: { isVisible: boolean }) => (
    <Modal
        animationType="fade"
        transparent={true}
        visible={isVisible}
        onRequestClose={() => {}} // Prevent closing with back button
    >
        <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0F00D7" />
                <Text style={styles.loadingText}>Please take a moment...</Text>
                <Text style={styles.loadingSubText}>Our AI is validating your documents for residency.</Text>
            </View>
        </View>
    </Modal>
);

// NEW: Password Checklist Component
const PasswordChecklist = ({ password }: { password: string }) => {
    const minLength = password.length >= 8;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password); // Adjusted regex for common special characters

    const characterTypeCount = [hasLowercase, hasUppercase, hasNumber, hasSpecialChar].filter(Boolean).length;
    const hasThreeOfFour = characterTypeCount >= 3;

    const renderCheckItem = (isValid: boolean, text: string) => (
        <View style={styles.passwordChecklistItem}>
            <Ionicons name={isValid ? "checkmark-circle" : "ellipse-outline"} size={16} color={isValid ? "#4CAF50" : "#A9A9A9"} style={{marginRight: 8}} />
            <Text style={[styles.passwordChecklistText, isValid ? styles.validCheck : styles.invalidCheck]}>{text}</Text>
        </View>
    );

    return (
        <View style={styles.passwordChecklistContainer}>
            <Text style={styles.passwordChecklistTitle}>Your password must contain:</Text>
            {renderCheckItem(minLength, 'At least 8 characters')}
            <View style={styles.passwordChecklistItem}>
                <Ionicons name={hasThreeOfFour ? "checkmark-circle" : "ellipse-outline"} size={16} color={hasThreeOfFour ? "#4CAF50" : "#A9A9A9"} style={{ marginRight: 8 }} />
                <Text style={[styles.passwordChecklistText, hasThreeOfFour ? styles.validCheck : styles.invalidCheck]}>At least 3 of the following:</Text>
            </View>
            <View style={{ marginLeft: 30 }}> {/* Indent these items */}
                {renderCheckItem(hasLowercase, 'Lower case letters (a-z)')}
                {renderCheckItem(hasUppercase, 'Upper case letters (A-Z)')}
                {renderCheckItem(hasNumber, 'Numbers (0-9)')}
                {renderCheckItem(hasSpecialChar, 'Special characters (e.g. !@#$%^&*)')}
            </View>
        </View>
    );
};


export default function SignupScreen() {
    const router = useRouter();

    const [formData, setFormData] = useState<Head>(initialHeadState);
    const [errors, setErrors] = useState<Partial<Record<keyof Head, string>>>({});

    const [members, setMembers] = useState<Member[]>([]);
    const [isMemberModalVisible, setMemberModalVisible] = useState(false);
    const [currentMember, setCurrentMember] = useState<Member>(initialMemberState);
    const [memberErrors, setMemberErrors] = useState<Partial<Record<keyof Member | 'proof_type' | 'proof_image', string>>>({});
    const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);

    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState<'head' | 'member'>('head'); // Corrected line
    const [isSaving, setIsSaving] = useState(false);
    // NEW: State for AI validation loading animation
    const [isAiValidating, setIsAiValidating] = useState(false);
    const [showHeadPassword, setShowHeadPassword] = useState(false);
    const [showMemberPassword, setShowMemberPassword] = useState(false);


    // --- Field Validation ---
    // This useCallback hook memoizes the validation function to prevent unnecessary re-renders.
    // It depends on `members` state because email validation needs to check for duplicates across the household.
    // `editingMemberIndex` is included to correctly exclude the member being edited from the duplicate check.

    const validateField = useCallback((fieldName: keyof Head | keyof Member, value: any, state: Head | Member, allMembers: Member[] = [], headEmail: string = '', editingIndex: number | null = null) => {
        let error = '';
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0);
        const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const containsNumber = (val: string) => /\d/.test(val);
        // Updated regex to allow alphanumeric, spaces, hyphens, and slashes for unit numbers
        const isInvalidUnitRoomApt = (val: string) => !/^[a-zA-Z0-9\s\-\/]*$/.test(val);
        const isInvalidName = (val: string) => !/^[a-zA-Z'.\-\s]+$/.test(val);

        switch (fieldName) {
            case 'first_name': case 'last_name':
                if (isRequired(value)) error = 'This field is required.';
                else if (isInvalidName(value)) error = 'This field cannot contain numbers.';
                break;
            case 'middle_name':
                if (value && isInvalidName(value)) error = 'This field cannot contain numbers.';
                break;
            case 'suffix':
                if (value && isInvalidName(value)) error = 'This field cannot contain numbers.';
                break;
            case 'citizenship':
                if (isRequired(value)) error = 'Citizenship is required.';
                else if (value === 'Other' && isRequired((state as Member | Head).other_citizenship)) error = 'Please specify your citizenship.';
                break;
            case 'other_citizenship':
                if ((state as Member | Head).citizenship === 'Other' && isRequired(value)) error = 'Please specify your citizenship.';
                else if (value && containsNumber(value)) error = 'Numbers are not allowed in citizenship.';
                break;
            case 'date_of_birth': if (isRequired(value)) error = 'Date of birth is required.'; break;
            case 'sex': case 'civil_status': case 'occupation_status': if (isRequired(value)) error = 'This field is required.'; break;
            case 'email':
                if (value && !isEmail(value)) {
                    error = 'Please enter a valid email address.';
                } else if (value) {
                    const allEmails = [headEmail.trim().toLowerCase()];
                    allMembers.forEach((mem, i) => {
                        if (editingIndex === null || i !== editingIndex) {
                            if (mem.email) allEmails.push(mem.email.trim().toLowerCase());
                        }
                    });
                    if (allEmails.filter(e => e === value.trim().toLowerCase()).length > 1) {
                         error = 'This email is already used by another household member or the head.';
                    }
                }
                break;
            case 'contact_number': if (isRequired(value)) error = 'Contact number is required.'; else if (!/^\d{11}$/.test(value)) error = 'Must be a valid 11-digit number.'; break;
            case 'address_house_number': case 'address_street': case 'address_subdivision_zone':
            if (isRequired(value)) error = 'This address field is required.'; break;
            case 'address_unit_room_apt_number': // NEW FIELD: Optional, only validate format if provided
                if (value && isInvalidUnitRoomApt(value)) error = 'Only alphanumeric characters, spaces, hyphens, and slashes are allowed.';
                break;
            case 'type_of_household': // NEW FIELD: Now optional
                // No validation added if it's optional
                break;
            case 'years_at_current_address': if (isRequired(value)) error = 'Years at address is required.'; else if (!/^\d+$/.test(value)) error = 'Must be a valid number.'; break;
            case 'proof_of_residency_base64':
                if (isRequired(value)) error = 'At least one proof of residency document is required.';
                break;
            case 'authorization_letter_base64':
                if (value && !value.startsWith('data:image/')) error = 'Invalid authorization letter format. Must be an image.';
                break;
            case 'password':
                const passwordValue = String(value);
                const isHeadPassword = 'confirmPassword' in state;
                const isMemberPasswordOptionalButProvided = 'email' in state && !isHeadPassword && (state as Member).email;

                if (isRequired(passwordValue)) {
                    if (isHeadPassword) error = 'Password is required.';
                    else if (isMemberPasswordOptionalButProvided) error = 'Password is required for account creation if an email is provided.';
                } else if (passwordValue) {
                    // This regex implicitly checks all conditions. The UI checklist will break it down.
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
                    if (!passwordRegex.test(passwordValue)) error = 'Password must meet all specified criteria.';
                }
                break;
            case 'confirmPassword':
                if ('password' in state && state.password && isRequired(value)) error = 'Please confirm your password.';
                else if ('password' in state && value !== state.password) error = 'Passwords do not match.';
                break;
            case 'relationship_to_head': if (isRequired(value)) error = 'Relationship is required.'; break;
            case 'other_relationship': if ((state as Member).relationship_to_head === 'Other' && isRequired(value)) error = 'Please specify the relationship.'; break;
            case 'proof_of_relationship_type':
                const proofRelKey = getProofConfigKey((state as Member).relationship_to_head);
                if (RELATIONSHIPS_REQUIRING_PROOF_KEYS.includes(proofRelKey) && isRequired(value)) error = 'Please select a proof document type.';
                break;
            case 'proof_of_relationship_base64':
                const proofRelKeyImage = getProofConfigKey((state as Member).relationship_to_head);
                if (RELATIONSHIPS_REQUIRING_PROOF_KEYS.includes(proofRelKeyImage) && isRequired(value)) error = 'An image of the proof document is required.';
                break;
            case 'voter_id_number': if ((state as Head | Member).is_voter && isRequired(value)) error = "Voter ID is required."; break;
            case 'pwd_id': if ((state as Head | Member).is_pwd && isRequired(value)) error = "PWD ID is required."; break;
            case 'senior_citizen_id': if ((state as Head | Member).is_senior_citizen && isRequired(value)) error = "Senior Citizen ID is required."; break;
        }
        return error;
    }, [members]);

    const handleInputChange = useCallback((name: keyof Head, value: any) => {
        setFormData(prev => {
            let newState = { ...prev, [name]: value };

            if (name === 'citizenship' && value !== 'Other') {
                newState.other_citizenship = '';
            }

            const error = validateField(name, value, newState, members, newState.email, null);
            setErrors(currentErrors => ({ ...currentErrors, [name]: error || undefined }));

            if (name === 'password') {
                const confirmError = validateField('confirmPassword', newState.confirmPassword, newState);
                setErrors(currentErrors => ({ ...currentErrors, confirmPassword: confirmError || undefined }));
            }
            if (name === 'date_of_birth') {
                setErrors(currentErrors => ({...currentErrors, is_voter: undefined, is_senior_citizen: undefined}));
            }
            return newState;
        });
    }, [members]);

    const handleMemberInputChange = useCallback((name: keyof Member, value: any) => {
        setCurrentMember(prev => {
            let newState = { ...prev, [name]: value };

            if (name === 'relationship_to_head') {
                newState.proof_of_relationship_type = null;
                newState.proof_of_relationship_base64 = null;
                setMemberErrors(currentErrors => ({
                    ...currentErrors,
                    other_relationship: (value === 'Other') ? validateField('other_relationship', newState.other_relationship, newState) || undefined : undefined,
                    proof_type: undefined,
                    proof_image: undefined,
                }));
            } else if (name === 'other_relationship' && newState.relationship_to_head === 'Other') {
                const otherRelError = validateField('other_relationship', value, newState, members, formData.email, editingMemberIndex);
                setMemberErrors(currentErrors => ({ ...currentErrors, other_relationship: otherRelError || undefined }));
            }

            if (name === 'citizenship' && value !== 'Other') {
                newState.other_citizenship = '';
                setMemberErrors(currentErrors => ({ ...currentErrors, other_citizenship: undefined }));
            } else if (name === 'other_citizenship' && newState.citizenship === 'Other') {
                const otherCitizenshipError = validateField('other_citizenship', value, newState, members, formData.email, editingMemberIndex);
                setMemberErrors(currentErrors => ({ ...currentErrors, other_citizenship: otherCitizenshipError || undefined }));
            }

            if (name === 'date_of_birth') {
                const newAge = calculateAge(value as string | null);
                if (newAge !== null && newAge < 18) {
                    newState.is_voter = false;
                    newState.voter_id_number = '';
                    newState.voter_registration_proof_base64 = null;
                }
                if (newAge !== null && newAge < 60) {
                    newState.is_senior_citizen = false;
                    newState.senior_citizen_id = '';
                    newState.senior_citizen_card_base64 = null;
                }
                setMemberErrors(currentErrors => ({
                    ...currentErrors, is_voter: undefined, voter_id_number: undefined,
                    is_senior_citizen: undefined, senior_citizen_id: undefined,
                }));
            }

            const error = validateField(name, value, newState, members, formData.email, editingMemberIndex);
            setMemberErrors(currentErrors => ({ ...currentErrors, [name]: error || undefined }));

            return newState;
        });
    }, [members, formData.email, editingMemberIndex]);

    const handleConfirmDate = (date: Date) => {
        // This function is called when a date is selected from the DateTimePickerModal.
        // It formats the date into 'YYYY-MM-DD' format and updates the appropriate state
        // based on whether the date was for the 'head' or a 'member'.
        // The `datePickerTarget` state determines which part of the form is being updated.

        const formattedDate = date.toISOString().split('T')[0];
        if (datePickerTarget === 'head') { handleInputChange('date_of_birth', formattedDate); }
        else { handleMemberInputChange('date_of_birth', formattedDate); }
        hideDatePicker();
    };

    const pickImage = async (field: keyof Head | keyof Member, target: 'head' | 'member', isMultiple: boolean = false, proofTypeFieldName?: 'proof_type' | 'proof_image') => {
        // Check for proof of residency limit before opening the picker
        if (field === 'proof_of_residency_base64' && formData.proof_of_residency_base64.length >= 5) {
            Alert.alert('Limit Reached', 'You can only upload a maximum of 5 proof of residency documents.');
            return;
        }


        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll permissions are required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
            base64: true,
            allowsMultipleSelection: isMultiple && field === 'proof_of_residency_base64'
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            if (target === 'head') {
                if (isMultiple && field === 'proof_of_residency_base64') {
                    const currentCount = formData.proof_of_residency_base64.length;
                    const remainingSlots = 5 - currentCount;
                    const canAddCount = Math.min(result.assets.length, remainingSlots);

                    if (result.assets.length > remainingSlots) {
                        Alert.alert('Limit Exceeded', `You can only add ${remainingSlots} more document(s). ${canAddCount} file(s) will be added.`);
                    }

                    const newImages = result.assets.slice(0, canAddCount).map(asset => `data:image/jpeg;base64,${asset.base64}`);
                    setFormData(prev => {
                        const updatedProofs = [...prev.proof_of_residency_base64, ...newImages];
                        const error = validateField('proof_of_residency_base64', updatedProofs, prev, members, prev.email, null);
                        setErrors(currentErrors => ({ ...currentErrors, proof_of_residency_base64: error || undefined }));
                        return { ...prev, proof_of_residency_base64: updatedProofs };
                    });
                } else {
                    const data = `data:image/jpeg;base64,${result.assets[0].base64}`;
                    handleInputChange(field as keyof Head, data);
                }
            } else {
                const data = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setCurrentMember(prev => ({ ...prev, [field]: data }));
                if (proofTypeFieldName) {
                     setMemberErrors(prevErrors => ({ ...prevErrors, [proofTypeFieldName]: undefined }));
                }
            }
        }
    };

    const removeProofOfResidencyImage = (index: number) => {
        Alert.alert(
            "Remove Image",
            "Are you sure you want to remove this image?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    onPress: () => {
                        setFormData(prev => {
                            const updatedProofs = prev.proof_of_residency_base64.filter((_, i) => i !== index);
                            const error = validateField('proof_of_residency_base64', updatedProofs, prev, members, prev.email, null);
                            setErrors(currentErrors => ({ ...currentErrors, proof_of_residency_base64: error || undefined }));
                            return {
                                ...prev,
                                proof_of_residency_base64: updatedProofs
                            };
                        });
                    },
                    style: "destructive"
                }
            ]
        );
    };


    const handleSaveMember = () => {
        const fieldsToValidate: (keyof Member)[] = [
            'first_name', 'last_name', 'date_of_birth', 'relationship_to_head',
            'sex', 'civil_status', 'citizenship', 'occupation_status'
        ];

        if (currentMember.relationship_to_head === 'Other') fieldsToValidate.push('other_relationship');
        if (currentMember.citizenship === 'Other') fieldsToValidate.push('other_citizenship');

        let hasErrors = false;
        const newErrors: Partial<Record<keyof Member | 'proof_type' | 'proof_image', string>> = {};

        const memberAge = calculateAge(currentMember.date_of_birth);
        if (memberAge !== null && memberAge >= 15 && (currentMember.email || currentMember.password)) {
            fieldsToValidate.push('email', 'password');
        }

        fieldsToValidate.forEach(field => {
            const error = validateField(field, currentMember[field], currentMember, members, formData.email, editingMemberIndex);
            if (error) { hasErrors = true; newErrors[field] = error; }
        });

        const suffixError = validateField('suffix', currentMember.suffix, currentMember);
        if (suffixError) { hasErrors = true; newErrors.suffix = suffixError; }

        if (currentMember.is_voter) {
            const error = validateField('voter_id_number', currentMember.voter_id_number, currentMember);
            if(error) { hasErrors = true; newErrors.voter_id_number = error; }
        }
        if (currentMember.is_pwd) {
            const error = validateField('pwd_id', currentMember.pwd_id, currentMember);
            if(error) { hasErrors = true; newErrors.pwd_id = error; }
        }
        if (currentMember.is_senior_citizen) {
            const error = validateField('senior_citizen_id', currentMember.senior_citizen_id, currentMember);
            if(error) { hasErrors = true; newErrors.senior_citizen_id = error; }
        }

        const relationshipConfigKey = getProofConfigKey(currentMember.relationship_to_head);
        const requiresProof = RELATIONSHIPS_REQUIRING_PROOF_KEYS.includes(relationshipConfigKey);

        if (requiresProof) {
            const relationshipConfig = RELATIONSHIP_PROOF_CONFIG[relationshipConfigKey];

            if (!currentMember.proof_of_relationship_type) {
                newErrors.proof_type = 'Please select a proof document type.';
                hasErrors = true;
            } else if (!relationshipConfig.allowedProofValues.includes(currentMember.proof_of_relationship_type)) {
                newErrors.proof_type = `"${currentMember.proof_of_relationship_type}" is not a valid proof document for this relationship. Please choose from the allowed options.`;
                hasErrors = true;
            }

            if (!currentMember.proof_of_relationship_base64) {
                newErrors.proof_image = 'An image of the proof document is required.';
                hasErrors = true;
            }
        } else {
            currentMember.proof_of_relationship_type = null;
            currentMember.proof_of_relationship_base64 = null;
        }

        setMemberErrors(newErrors);

        if (hasErrors || Object.keys(newErrors).length > 0) {
            Alert.alert('Validation Error', 'Please fix the errors shown in the form.');
            return;
        }

        if (editingMemberIndex !== null) {
            const updatedMembers = [...members];
            updatedMembers[editingMemberIndex] = currentMember;
            setMembers(updatedMembers);
        } else {
            setMembers([...members, currentMember]);
        }
        setMemberModalVisible(false);
    };

    const handleRegister = async () => {
        const fieldsToValidate: (keyof Head)[] = [
            'first_name', 'last_name', 'email', 'contact_number', 'date_of_birth',
            'sex', 'civil_status', 'citizenship', 'occupation_status',
            'address_house_number', 'address_street', 'address_subdivision_zone',
            'years_at_current_address', 'proof_of_residency_base64', 'password', 'confirmPassword'
        ];
        // NOTE: 'type_of_household' and 'address_unit_room_apt_number' are now optional, so they are not in this list.

        if (formData.is_voter) fieldsToValidate.push('voter_id_number');
        if (formData.is_pwd) fieldsToValidate.push('pwd_id');
        if (formData.is_senior_citizen) fieldsToValidate.push('senior_citizen_id');
        if (formData.citizenship === 'Other') fieldsToValidate.push('other_citizenship');

        let hasErrors = false;
        const newErrors: Partial<Record<keyof Head, string>> = {};

        fieldsToValidate.forEach(field => {
            const error = validateField(field, formData[field], formData, members, formData.email);
            if (error) {
                hasErrors = true;
                newErrors[field] = error;
            }
        });

        const suffixError = validateField('suffix', formData.suffix, formData, members, formData.email);
        if (suffixError) { hasErrors = true; newErrors.suffix = suffixError; }

        // Validate address_unit_room_apt_number if provided (optional field validation)
        const unitRoomAptNumError = validateField('address_unit_room_apt_number', formData.address_unit_room_apt_number, formData, members, formData.email);
        if (unitRoomAptNumError) { hasErrors = true; newErrors.address_unit_room_apt_number = unitRoomAptNumError; }

        if (formData.authorization_letter_base64) {
            const authLetterError = validateField('authorization_letter_base64', formData.authorization_letter_base64, formData);
            if (authLetterError) { hasErrors = true; newErrors.authorization_letter_base64 = authLetterError; }
        }

        setErrors(newErrors);

        const headAge = calculateAge(formData.date_of_birth);
        if (headAge === null || headAge < 15) {
            Alert.alert("Validation Error", "Household Head must be at least 15 years old to register.");
            return;
        }
        if (hasErrors) {
            Alert.alert("Validation Error", "Please correct the errors on the form before submitting.");
            return;
        }

        setIsSaving(true);
        setIsAiValidating(true); // NEW: Show AI validation modal
        try {
            const payload: any = { ...formData, household_members_to_create: members };
            delete payload.confirmPassword;
            delete payload.relationship_to_head;
            delete payload.other_relationship;
            delete payload.proof_of_relationship_type;
            delete payload.proof_of_relationship_base64;

            if (payload.citizenship !== 'Other') { payload.other_citizenship = null; }

            payload.household_members_to_create = payload.household_members_to_create.map((member: Member) => {
                if (member.citizenship !== 'Other') { return { ...member, other_citizenship: null }; }
                return member;
            });

            // Normalize Head's name and address fields to lowercase for case-insensitive comparison on the backend
            const submissionPayload = { ...payload };

            submissionPayload.first_name = submissionPayload.first_name.toLowerCase();
            if (submissionPayload.middle_name) {
                submissionPayload.middle_name = submissionPayload.middle_name.toLowerCase();
            } else {
                submissionPayload.middle_name = null;
            }
            submissionPayload.last_name = submissionPayload.last_name.toLowerCase();
            if (submissionPayload.suffix) {
                submissionPayload.suffix = submissionPayload.suffix.toLowerCase();
            } else {
                submissionPayload.suffix = null;
            }

            submissionPayload.address_house_number = submissionPayload.address_house_number.toLowerCase();
            if (submissionPayload.address_unit_room_apt_number) {
                submissionPayload.address_unit_room_apt_number = submissionPayload.address_unit_room_apt_number.toLowerCase();
            } else {
                submissionPayload.address_unit_room_apt_number = null;
            }
            submissionPayload.address_street = submissionPayload.address_street.toLowerCase();
            submissionPayload.address_subdivision_zone = submissionPayload.address_subdivision_zone.toLowerCase();
            submissionPayload.address_city_municipality = submissionPayload.address_city_municipality.toLowerCase();


            try {
                const response = await apiRequest('POST', '/api/residents', submissionPayload);

                // If apiRequest returns null (e.g., due to a network error handled internally, though it now re-throws)
                if (!response || !response.message) {
                    // This case should ideally not be hit if apiRequest re-throws AxiosError as intended.
                    // If it does, it's a fallback for very unexpected scenarios or if apiRequest
                    // somehow returns null without throwing.
                    throw new Error('Registration failed. Please try again.');
                }

                Alert.alert(
                    'Registration Successful',
                    'Your household has been registered and is pending for approval by the Baranggay Secretary.',
                    [{ text: 'OK', onPress: () => router.replace({ pathname: '/login' }) }] // FIX: More robust navigation
                );
            } catch (error: any) { // Catch the specific error from apiRequest here
                console.error("Registration failed:", error);

                let errorMessage = "An unknown error occurred during registration. Please try again.";
                let title = "Registration Failed";

                // --- START UPDATED ERROR HANDLING LOGIC ---
                if (axios.isAxiosError(error) && error.response) {
                    const { data, status } = error.response;

                    if (status === 409 && data.error === 'Conflict') {
                        if (typeof data.message === 'string' && data.message.includes('email address for the Household Head is already in use')) {
                            title = 'Email Already Registered';
                            errorMessage = data.message; // Use the exact backend message
                            setErrors(current => ({ ...current, email: errorMessage })); // Set specific error for email field
                       } else if (typeof data.message === 'string' && data.message.includes('A primary household head with this name and main address already exists')) {
                          title = 'Duplicate Primary User';
                          errorMessage = data.message;
                           // Highlight relevant fields for the duplicate primary user
                           setErrors(current => ({
                               ...current,
                              first_name: errorMessage,
                               last_name: errorMessage,
                               address_house_number: errorMessage,
                               address_street: errorMessage,
                               address_subdivision_zone: errorMessage,
                               address_city_municipality: errorMessage,
                           }));
                        } else {
                            errorMessage = data.message || 'A conflict occurred. Please check your inputs.';
                        }
                    } else if (status === 400 && data.error === 'AI Validation Error') {
                        if (typeof data.message === 'string') {
                            title = 'Proof of Residency Validation Failed';
                             errorMessage = 'Please check the fields or upload a valid proof of residency.';
                            setErrors(current => ({ ...current, proof_of_residency_base64: errorMessage })); // Set error for proof field
                        }
                    } else if (status === 400 && data.error === 'Validation Error') {
                        if (typeof data.message === 'string') {
                            title = 'Validation Error';
                            errorMessage = data.message;
                            // The backend may return specific messages for the optional fields
                            // However, since they're optional on the frontend, we don't *force* a display error for them here
                            // unless it's a different kind of backend validation issue (e.g. invalid format if entered)
                        }
                        // Add more specific handling for other backend validation errors if they differ
                    } else if (typeof data.message === 'string') {
                        errorMessage = data.message;
                    } else if (typeof data.error === 'string') {
                        errorMessage = data.error;
                    } else if (typeof data === 'object' && data !== null) {
                         // Fallback for when 'message' or 'error' might be missing but data has other info
                        errorMessage = JSON.stringify(data); // Show raw data for debugging
                        console.log("Raw backend error data:", data);
                    }
                } else if (error instanceof Error && error.message.includes('Network Error')) { // Custom network error from axios.js
                    title = 'Network Error';
                    errorMessage = error.message;
                }
                // Fallback for any other unexpected errors
                else {
                    errorMessage = error.message || "An unknown error occurred during registration. Please try again.";
                }
                // --- END UPDATED ERROR HANDLING LOGIC ---

                Alert.alert(title, errorMessage);
            }

        } catch (error: any) { // This outer catch is for truly unexpected errors *outside* the apiRequest flow
            console.error("Registration failed (outer catch):", error);
            Alert.alert("Registration Failed", "An unexpected critical error occurred. Please contact support.");
        } finally {
            setIsSaving(false);
            setIsAiValidating(false); // NEW: Hide AI validation modal
        }
    };

    // --- Other handlers (Keep these the same) ---
    const showDatePicker = (target: 'head' | 'member') => { setDatePickerTarget(target); setDatePickerVisibility(true); };
    const hideDatePicker = () => setDatePickerVisibility(false);
    const openAddMemberModal = () => { setCurrentMember(initialMemberState); setEditingMemberIndex(null); setMemberErrors({}); setMemberModalVisible(true); };
    const openEditMemberModal = (index: number) => { setCurrentMember(members[index]); setEditingMemberIndex(index); setMemberErrors({}); setMemberModalVisible(true); };
    const handleRemoveMember = (indexToRemove: number) => { Alert.alert( "Remove Member", "Are you sure you want to remove this member?", [{ text: "Cancel", style: "cancel" }, { text: "Remove", onPress: () => setMembers(p => p.filter((_, i) => i !== indexToRemove)), style: "destructive" }] ); };
    const headAge = calculateAge(formData.date_of_birth);
    const memberAge = calculateAge(currentMember.date_of_birth);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/login' })}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Household Registration</Text>
                <View style={{width: 24}} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
                <View style={styles.formContainer}>
                    <Text style={styles.subHeader}>Step 1: Household Head Information</Text>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <Text style={styles.label}>First Name*</Text>
                    <TextInput style={[styles.textInput, !!errors.first_name && styles.inputError]} placeholder="First Name*" placeholderTextColor="#A9A9A9" value={formData.first_name} onChangeText={(v) => handleInputChange('first_name', v)} /><ErrorMessage error={errors.first_name} />
                    <Text style={styles.label}>Middle Name</Text>
                    <TextInput style={[styles.textInput, !!errors.middle_name && styles.inputError]} placeholder="Middle Name" placeholderTextColor="#A9A9A9" value={formData.middle_name} onChangeText={(v) => handleInputChange('middle_name', v)} /><ErrorMessage error={errors.middle_name} />
                    <Text style={styles.label}>Last Name*</Text>
                    <TextInput style={[styles.textInput, !!errors.last_name && styles.inputError]} placeholder="Last Name*" placeholderTextColor="#A9A9A9" value={formData.last_name} onChangeText={(v) => handleInputChange('last_name', v)} /><ErrorMessage error={errors.last_name} />

                    <Text style={styles.label}>Suffix</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={formData.suffix}
                            onValueChange={(v) => handleInputChange('suffix', v as string | null)}
                            style={[styles.pickerText, !formData.suffix && styles.pickerPlaceholder]}
                            itemStyle={{ color: 'black' }}
                        >
                            <Picker.Item label="Select Suffix (Optional)" value={null} />
                            {suffixOptions.map((option) => (
                                <Picker.Item key={option} label={option} value={option} />
                            ))}
                        </Picker>
                    </View>
                    <ErrorMessage error={errors.suffix} />

                    <Text style={styles.label}>Contact Number*</Text>
                    <TextInput style={[styles.textInput, !!errors.contact_number && styles.inputError]} placeholder="Contact Number*" placeholderTextColor="#A9A9A9" keyboardType="phone-pad" value={formData.contact_number} onChangeText={(v) => handleInputChange('contact_number', v)} maxLength={11} /><ErrorMessage error={errors.contact_number} />
                    <Text style={styles.label}>Date of Birth*</Text>
                    <TouchableOpacity style={[styles.datePickerButton, !!errors.date_of_birth && styles.inputError]} onPress={() => showDatePicker('head')}><Text style={formData.date_of_birth ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>{formData.date_of_birth || 'Date of Birth*'}</Text></TouchableOpacity><ErrorMessage error={errors.date_of_birth} />
                    <Text style={styles.label}>Age</Text>
                    <TextInput style={[styles.textInput, styles.textInputDisabled]} placeholder="Age" placeholderTextColor="#A9A9A9" value={headAge !== null ? String(headAge) : ''} editable={false} />
                    <Text style={styles.label}>Sex*</Text>
                    <View style={[styles.pickerWrapper, !!errors.sex && styles.inputError]}><Picker selectedValue={formData.sex} onValueChange={(v) => handleInputChange('sex', v)} style={[styles.pickerText, !formData.sex && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}><Picker.Item label="Select Sex*" value="" enabled={false} /><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View><ErrorMessage error={errors.sex} />
                    <Text style={styles.label}>Civil Status*</Text>
                    <View style={[styles.pickerWrapper, !!errors.civil_status && styles.inputError]}><Picker selectedValue={formData.civil_status} onValueChange={(v) => handleInputChange('civil_status', v)} style={[styles.pickerText, !formData.civil_status && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}><Picker.Item label="Select Civil Status*" value="" enabled={false} /><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View><ErrorMessage error={errors.civil_status} />

                    <Text style={styles.label}>Citizenship*</Text>
                    <View style={[styles.pickerWrapper, !!errors.citizenship && styles.inputError]}>
                        <Picker
                            selectedValue={formData.citizenship}
                            onValueChange={(v) => handleInputChange('citizenship', v)}
                            style={[styles.pickerText, !formData.citizenship && styles.pickerPlaceholder]}
                            itemStyle={{ color: 'black' }}
                        >
                            <Picker.Item label="Filipino" value="Filipino" />
                            <Picker.Item label="Other" value="Other" />
                        </Picker>
                    </View>
                    <ErrorMessage error={errors.citizenship} />
                    {formData.citizenship === 'Other' && (
                        <>
                            <Text style={styles.label}>Specify Citizenship*</Text>
                            <TextInput
                                style={[styles.textInput, !!errors.other_citizenship && styles.inputError]}
                                placeholder="e.g., American, Japanese"
                                placeholderTextColor="#A9A9A9"
                                value={formData.other_citizenship}
                                onChangeText={(v) => handleInputChange('other_citizenship', v)}
                            />
                            <ErrorMessage error={errors.other_citizenship} />
                        </>
                    )}

                    <Text style={styles.label}>Occupation Status*</Text>
                    <View style={[styles.pickerWrapper, !!errors.occupation_status && styles.inputError]}>
                        <Picker selectedValue={formData.occupation_status} onValueChange={(v) => handleInputChange('occupation_status', v)} style={[styles.pickerText, !formData.occupation_status && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}>
                            <Picker.Item label="Select Occupation Status*" value="" enabled={false} />
                            <Picker.Item label="Student" value="Student" />
                            <Picker.Item label="Labor force" value="Labor force" />
                            <Picker.Item label="Unemployed" value="Unemployed" />
                            <Picker.Item label="Out of School Youth" value="Out of School Youth" />
                            <Picker.Item label="Retired" value="Retired" />
                            <Picker.Item label="Not Applicable" value="Not Applicable" />
                        </Picker>
                    </View>
                    <ErrorMessage error={errors.occupation_status} />

                    <Text style={styles.sectionTitle}>Address Information</Text>

                    {/* NEW FIELD: Unit/Room/Apartment number - FIRST IN ADDRESS */}
                    <Text style={styles.label}>Unit/Room/Apartment number (Optional)</Text>
                    <TextInput
                        style={[styles.textInput, !!errors.address_unit_room_apt_number && styles.inputError]}
                        placeholder="Unit/Room/Apartment number"
                        placeholderTextColor="#A9A9A9"
                        value={formData.address_unit_room_apt_number}
                        onChangeText={(v) => handleInputChange('address_unit_room_apt_number', v)}
                    /><ErrorMessage error={errors.address_unit_room_apt_number} />



                    <Text style={styles.label}>House Number/Lot/Block*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_house_number && styles.inputError]} placeholder="House Number/Lot/Block*" placeholderTextColor="#A9A9A9" value={formData.address_house_number} onChangeText={(v) => handleInputChange('address_house_number', v)} /><ErrorMessage error={errors.address_house_number} />
                    <Text style={styles.label}>Street*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_street && styles.inputError]} placeholder="Street*" placeholderTextColor="#A9A9A9" value={formData.address_street} onChangeText={(v) => handleInputChange('address_street', v)} /><ErrorMessage error={errors.address_street} />
                    <Text style={styles.label}>Subdivision / Zone / Sitio / Purok*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_subdivision_zone && styles.inputError]} placeholder="Subdivision / Zone / Sitio / Purok*" placeholderTextColor="#A9A9A9" value={formData.address_subdivision_zone} onChangeText={(v) => handleInputChange('address_subdivision_zone', v)} /><ErrorMessage error={errors.address_subdivision_zone} />

                    {/* UPDATED FIELD: Type of Household - SECOND IN ADDRESS */}
                    <Text style={styles.label}>Type of Household (Optional)</Text>
                    {/* NEW NOTE/LABEL */}
                    <Text style={styles.noteText}>Fill out only if you live in an apartment, boarding house, dormitory, or condominium. Leave blank if not applicable.</Text>
                    <View style={[styles.pickerWrapper, !!errors.type_of_household && styles.inputError]}>
                        <Picker
                            selectedValue={formData.type_of_household}
                            onValueChange={(v) => handleInputChange('type_of_household', v as string | null)}
                            style={[styles.pickerText, !formData.type_of_household && styles.pickerPlaceholder]}
                            itemStyle={{ color: 'black' }}
                        >
                            <Picker.Item label="Select Type of Household (Optional)" value={null} />
                            <Picker.Item label="Owner - Owns the house/lot" value="Owner" />
                            <Picker.Item label="Tenant - Renting the house/lot" value="Tenant/Border" />
                        </Picker>
                    </View>
                    <ErrorMessage error={errors.type_of_household} />

                    <Text style={styles.label}>City/Municipality</Text>
                    <TextInput style={[styles.textInput, styles.textInputDisabled]} value={formData.address_city_municipality} editable={false} />

                    <Text style={styles.label}>Years at Current Address*</Text>
                    <TextInput style={[styles.textInput, !!errors.years_at_current_address && styles.inputError]} placeholder="Years at Current Address*" placeholderTextColor="#A9A9A9" keyboardType="numeric" value={formData.years_at_current_address} onChangeText={(v) => handleInputChange('years_at_current_address', v)} /><ErrorMessage error={errors.years_at_current_address} />

                    <Text style={styles.label}>Proof of Residency* (e.g., utility bills)</Text>
                    <TouchableOpacity
                        style={[styles.filePickerButton, !!errors.proof_of_residency_base64 && styles.inputErrorBorder]}
                        onPress={() => pickImage('proof_of_residency_base64', 'head', true)}
                    >
                        <Text style={styles.filePickerButtonText}>Add Proof of Residency</Text>
                    </TouchableOpacity>
                    {formData.proof_of_residency_base64.length > 0 && (
                        <View style={styles.imagePreviewContainer}>
                            {formData.proof_of_residency_base64.map((uri, index) => (
                                <View key={index} style={styles.imagePreviewWrapper}>
                                    <Image source={{ uri }} style={styles.previewImageSmall} />
                                    <TouchableOpacity onPress={() => removeProofOfResidencyImage(index)} style={styles.removeImageButton}>
                                        <Ionicons name="close-circle" size={24} color="#D32F2F" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                    <ErrorMessage error={errors.proof_of_residency_base64} />

                    <Text style={styles.label}>Authorization Letter (Optional, if name on bills doesn't match)</Text>
                    <TouchableOpacity
                        style={[styles.filePickerButton, !!errors.authorization_letter_base64 && styles.inputErrorBorder]}
                        onPress={() => pickImage('authorization_letter_base64', 'head', false)}
                    >
                        <Text style={styles.filePickerButtonText}>{formData.authorization_letter_base64 ? 'Change Authorization Letter' : 'Upload Authorization Letter'}</Text>
                    </TouchableOpacity>
                    {formData.authorization_letter_base64 && (
                        <View style={styles.imagePreviewContainer}>
                             <View style={styles.imagePreviewWrapper}>
                                <Image source={{ uri: formData.authorization_letter_base66 }} style={styles.previewImageSmall} />
                                <TouchableOpacity onPress={() => handleInputChange('authorization_letter_base64', null)} style={styles.removeImageButton}>
                                    <Ionicons name="close-circle" size={24} color="#D32F2F" />
                                ></TouchableOpacity>
                            </View>
                        </View>
                    )}
                    <ErrorMessage error={errors.authorization_letter_base64} />


                    <Text style={styles.sectionTitle}>Special Classifications</Text>
                    {(headAge === null || headAge >= 18) && <ToggleSection label="Are you a registered voter?" value={formData.is_voter} onValueChange={(v:boolean) => handleInputChange('is_voter', v)} idLabel="Voter ID Number*" idValue={formData.voter_id_number} onIdChange={(v:string) => handleInputChange('voter_id_number', v)} error={errors.voter_id_number} proofLabel="Upload Voter's Proof" proofValue={formData.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64', 'head', false)} />}
                    <ToggleSection label="Are you a PWD?" value={formData.is_pwd} onValueChange={(v:boolean) => handleInputChange('is_pwd', v)} idLabel="PWD ID Number*" idValue={formData.pwd_id} onIdChange={(v:string) => handleInputChange('pwd_id', v)} error={errors.pwd_id} proofLabel="Upload PWD Card*" proofValue={formData.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64', 'head', false)} />
                    {(headAge === null || headAge >= 60) && <ToggleSection label="Are you a Senior Citizen?" value={formData.is_senior_citizen} onValueChange={(v:boolean) => handleInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID*" idValue={formData.senior_citizen_id} onIdChange={(v:string) => handleInputChange('senior_citizen_id', v)} error={errors.senior_citizen_id} proofLabel="Upload Senior Citizen Card*" proofValue={formData.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64', 'head', false)} />}

                    <Text style={styles.sectionTitle}>Account Credentials</Text>
                    <Text style={styles.label}>Email*</Text>
                    <TextInput style={[styles.textInput, !!errors.email && styles.inputError]} placeholder="Email*" placeholderTextColor="#A9A9A9" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} /><ErrorMessage error={errors.email} />
                    <Text style={styles.label}>Password*</Text>
                    <View style={[styles.passwordContainer, !!errors.password && styles.inputError]}><TextInput style={styles.passwordInput} placeholder="Password*" placeholderTextColor="#A9A9A9" secureTextEntry={!showHeadPassword} value={formData.password} onChangeText={(v) => handleInputChange('password', v)} /><TouchableOpacity onPress={() => setShowHeadPassword(!showHeadPassword)} style={styles.eyeIcon}><Ionicons name={showHeadPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#888" /></TouchableOpacity></View><ErrorMessage error={errors.password} />
                    <Text style={styles.label}>Confirm Password*</Text>
                    <View style={[styles.passwordContainer, !!errors.confirmPassword && styles.inputError]}><TextInput style={styles.passwordInput} placeholder="Confirm Password*" placeholderTextColor="#A9A9A9" secureTextEntry={!showHeadPassword} value={formData.confirmPassword} onChangeText={(v) => handleInputChange('confirmPassword', v)} /><TouchableOpacity onPress={() => setShowHeadPassword(!showHeadPassword)} style={styles.eyeIcon}><Ionicons name={showHeadPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#888" /></TouchableOpacity></View><ErrorMessage error={errors.confirmPassword} />
                    {/* NEW: Password Checklist for Household Head */}
                    <PasswordChecklist password={formData.password} />

                    <Text style={styles.subHeader}>Step 2: Household Members</Text>
                    {members.map((member, index) => (
                        <View key={index} style={styles.memberCard}>
                            <View style={styles.memberHeader}>
                                <Text style={styles.memberTitle}>{`${member.first_name} ${member.middle_name ? member.middle_name + ' ' : ''}${member.last_name}${member.suffix ? ' ' + member.suffix : ''}`}</Text>
                                <View style={{flexDirection: 'row'}}><TouchableOpacity onPress={() => openEditMemberModal(index)} style={{marginRight: 15}}><Ionicons name="pencil-outline" size={22} color="#0F00D7" /></TouchableOpacity><TouchableOpacity onPress={() => handleRemoveMember(index)}><Ionicons name="trash-bin-outline" size={22} color="#D32F2F" /></TouchableOpacity></View>
                            </View>
                            <Text style={styles.memberDetailText}>Relationship: {member.relationship_to_head === 'Other' ? member.other_relationship : member.relationship_to_head}</Text>
                            <Text style={styles.memberDetailText}>Age: {calculateAge(member.date_of_birth)}</Text>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addMemberButton} onPress={openAddMemberModal}><Ionicons name="add-circle-outline" size={22} color="#0F00D7" style={{marginRight: 8}} /><Text style={styles.addMemberButtonText}>Add Household Member</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.signUpButton} onPress={handleRegister} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signUpButtonText}>Register Household</Text>}</TouchableOpacity>
                    <TouchableOpacity onPress={() => router.navigate({ pathname: '/login' })}><Text style={styles.loginText}>Already have an account? Login</Text></TouchableOpacity>
                </View>
                <DateTimePickerModal isVisible={isDatePickerVisible} mode="date" onConfirm={handleConfirmDate} onCancel={hideDatePicker} minimumDate={new Date(1900, 0, 1)} maximumDate={new Date()} display={Platform.OS === 'ios' ? 'spinner' : 'default'} />
            </ScrollView>

            <Modal animationType="slide" transparent={true} visible={isMemberModalVisible} onRequestClose={() => setMemberModalVisible(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingMemberIndex !== null ? 'Edit' : 'Add'} Household Member</Text>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={styles.label}>First Name*</Text>
                            <TextInput style={[styles.modalInput, !!memberErrors.first_name && styles.inputError]} placeholder="First Name*" placeholderTextColor="#A9A9A9" value={currentMember.first_name} onChangeText={(v) => handleMemberInputChange('first_name', v)} /><ErrorMessage error={memberErrors.first_name} />
                            <Text style={styles.label}>Middle Name</Text>
                            <TextInput style={[styles.modalInput, !!memberErrors.middle_name && styles.inputError]} placeholder="Middle Name" placeholderTextColor="#A9A9A9" value={currentMember.middle_name} onChangeText={(v) => handleMemberInputChange('middle_name', v)} /><ErrorMessage error={memberErrors.middle_name} />
                            <Text style={styles.label}>Last Name*</Text>
                            <TextInput style={[styles.modalInput, !!memberErrors.last_name && styles.inputError]} placeholder="Last Name*" placeholderTextColor="#A9A9A9" value={currentMember.last_name} onChangeText={(v) => handleMemberInputChange('last_name', v)} /><ErrorMessage error={memberErrors.last_name} />

                            <Text style={styles.label}>Suffix</Text>
                            <View style={styles.pickerWrapperSmall}>
                                <Picker
                                    selectedValue={currentMember.suffix}
                                    onValueChange={(v) => handleMemberInputChange('suffix', v as string | null)}
                                    style={[styles.pickerText, !currentMember.suffix && styles.pickerPlaceholder]}
                                    itemStyle={{ color: 'black' }}
                                >
                                    <Picker.Item label="Select Suffix (Optional)" value={null} />
                                    {suffixOptions.map((option) => (
                                        <Picker.Item key={option} label={option} value={option} />
                                    ))}
                                ></Picker>
                            </View>
                            <ErrorMessage error={memberErrors.suffix} />

                            <Text style={styles.label}>Date of Birth*</Text>
                            <TouchableOpacity style={[styles.datePickerButtonModal, !!memberErrors.date_of_birth && styles.inputError]} onPress={() => showDatePicker('member')}><Text style={currentMember.date_of_birth ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>{currentMember.date_of_birth || 'Date of Birth*'}</Text></TouchableOpacity><ErrorMessage error={memberErrors.date_of_birth} />

                            <Text style={styles.label}>Relationship to Head*</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.relationship_to_head && styles.inputError]}>
                                <Picker selectedValue={currentMember.relationship_to_head} onValueChange={(v) => handleMemberInputChange('relationship_to_head', v)} style={[styles.pickerText, !currentMember.relationship_to_head && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}>
                                    {relationshipPickerOptions.map((option) => (
                                        <Picker.Item key={option.value} label={option.label} value={option.value} enabled={option.enabled ?? true} />
                                    ))}
                                ></Picker>
                            </View>
                            <ErrorMessage error={memberErrors.relationship_to_head} />
                            {currentMember.relationship_to_head === 'Other' && (<><Text style={styles.label}>Specify Relationship*</Text><TextInput style={[styles.modalInput, !!memberErrors.other_relationship && styles.inputError]} placeholder="Please specify relationship*" placeholderTextColor="#A9A9A9" value={currentMember.other_relationship} onChangeText={(v) => handleMemberInputChange('other_relationship', v)} /><ErrorMessage error={memberErrors.other_relationship} /></>)}

                            <Text style={styles.label}>Sex*</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.sex && styles.inputError]}><Picker selectedValue={currentMember.sex} onValueChange={(v) => handleMemberInputChange('sex', v)} style={[styles.pickerText, !currentMember.sex && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}><Picker.Item label="Select Sex*" value="" enabled={false} /><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View><ErrorMessage error={memberErrors.sex} />
                            <Text style={styles.label}>Civil Status*</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.civil_status && styles.inputError]}><Picker selectedValue={currentMember.civil_status} onValueChange={(v) => handleMemberInputChange('civil_status', v)} style={[styles.pickerText, !currentMember.civil_status && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}><Picker.Item label="Select Civil Status*" value="" enabled={false} /><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View><ErrorMessage error={memberErrors.civil_status} />

                            <Text style={styles.label}>Citizenship*</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.citizenship && styles.inputError]}>
                                <Picker
                                    selectedValue={currentMember.citizenship}
                                    onValueChange={(v) => handleMemberInputChange('citizenship', v)}
                                    style={[styles.pickerText, !currentMember.citizenship && styles.pickerPlaceholder]}
                                    itemStyle={{ color: 'black' }}
                                >
                                    <Picker.Item label="Filipino" value="Filipino" />
                                    <Picker.Item label="Other" value="Other" />
                                </Picker>
                            </View>
                            <ErrorMessage error={memberErrors.citizenship} />
                            {currentMember.citizenship === 'Other' && (
                                <>
                                    <Text style={styles.label}>Specify Citizenship*</Text>
                                    <TextInput
                                        style={[styles.modalInput, !!memberErrors.other_citizenship && styles.inputError]}
                                        placeholder="e.g., American, Japanese"
                                        placeholderTextColor="#A9A9A9"
                                        value={currentMember.other_citizenship}
                                        onChangeText={(v) => handleMemberInputChange('other_citizenship', v)}
                                    />
                                    <ErrorMessage error={memberErrors.other_citizenship} />
                                </>
                            )}

                            <Text style={styles.label}>Occupation Status*</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.occupation_status && styles.inputError]}>
                                <Picker selectedValue={currentMember.occupation_status} onValueChange={(v) => handleMemberInputChange('occupation_status', v)} style={[styles.pickerText, !currentMember.occupation_status && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}>
                                    <Picker.Item label="Select Occupation Status*" value="" enabled={false} />
                                    <Picker.Item label="Student" value="Student" />
                                    <Picker.Item label="Labor force" value="Labor force" />
                                    <Picker.Item label="Unemployed" value="Unemployed" />
                                    <Picker.Item label="Out of School Youth" value="Out of School Youth" />
                                    <Picker.Item label="Retired" value="Retired" />
                                    <Picker.Item label="Not Applicable" value="Not Applicable" />
                                ></Picker>
                            </View>
                            <ErrorMessage error={memberErrors.occupation_status} />

                            {RELATIONSHIPS_REQUIRING_PROOF_KEYS.includes(getProofConfigKey(currentMember.relationship_to_head)) && (
                                <View style={styles.proofSection}>
                                    <Text style={styles.modalSectionTitle}>Proof of Relationship</Text>
                                    {RELATIONSHIP_PROOF_CONFIG[getProofConfigKey(currentMember.relationship_to_head)]?.displayInfo && (
                                        <Text style={styles.labelInfo}>{RELATIONSHIP_PROOF_CONFIG[getProofConfigKey(currentMember.relationship_to_head)].displayInfo}</Text>
                                    )}

                                    <Text style={styles.label}>Proof Document Type*</Text>
                                    <View style={[styles.pickerWrapperSmall, !!memberErrors.proof_type && styles.inputError]}>
                                        <Picker
                                            itemStyle={{ color: 'black' }}
                                            selectedValue={currentMember.proof_of_relationship_type}
                                            onValueChange={(itemValue: string) => {
                                                setCurrentMember(prev => ({ ...prev, proof_of_relationship_type: itemValue }));
                                                setMemberErrors(p => ({...p, proof_type: undefined}));
                                            }}
                                            style={!currentMember.proof_of_relationship_type ? styles.pickerPlaceholder : {}}
                                        >
                                            <Picker.Item label="Select Proof Document Type*" value={null} enabled={false} />
                                            {currentMember.relationship_to_head && RELATIONSHIP_PROOF_CONFIG[getProofConfigKey(currentMember.relationship_to_head)] &&
                                                ALL_POSSIBLE_PROOF_DOCUMENTS
                                                    .filter(option => RELATIONSHIP_PROOF_CONFIG[getProofConfigKey(currentMember.relationship_to_head)].allowedProofValues.includes(option.value))
                                                    .map(option => (
                                                        <Picker.Item key={option.value} label={option.label} value={option.value} />
                                                    ))
                                            }
                                        </Picker>
                                    </View>
                                    <ErrorMessage error={memberErrors.proof_type} />

                                    <Text style={styles.label}>Proof Document Image*</Text>
                                    <TouchableOpacity style={[styles.filePickerButton, !!memberErrors.proof_image && styles.inputErrorBorder]} onPress={() => pickImage('proof_of_relationship_base64', 'member', false, 'proof_image')}>
                                        <Text style={styles.filePickerButtonText}>{currentMember.proof_of_relationship_base64 ? 'Change Proof Image' : 'Upload Proof Image'}</Text>
                                    </TouchableOpacity>
                                    {currentMember.proof_of_relationship_base64 && <Image source={{ uri: currentMember.proof_of_relationship_base64 }} style={styles.previewImageSmall} />}
                                    <ErrorMessage error={memberErrors.proof_image} />
                                </View>
                            )}

                            <Text style={styles.modalSectionTitle}>Special Classifications</Text>
                            {(memberAge === null || memberAge >= 18) && <ToggleSection label="Is member a registered voter?" value={currentMember.is_voter} onValueChange={(v:boolean) => handleMemberInputChange('is_voter', v)} idLabel="Voter ID Number" idValue={currentMember.voter_id_number} onIdChange={(v:string) => handleMemberInputChange('voter_id_number', v)} error={memberErrors.voter_id_number} proofLabel="Upload Voter's Proof" proofValue={currentMember.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64', 'member', false)} />}
                            <ToggleSection label="Is member a PWD?" value={currentMember.is_pwd} onValueChange={(v:boolean) => handleMemberInputChange('is_pwd', v)} idLabel="PWD ID Number*" idValue={currentMember.pwd_id} onIdChange={(v:string) => handleMemberInputChange('pwd_id', v)} error={memberErrors.pwd_id} proofLabel="Upload PWD Card*" proofValue={currentMember.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64', 'member', false)} />
                            {(memberAge === null || memberAge >= 60) && <ToggleSection label="Is member a Senior Citizen?" value={currentMember.is_senior_citizen} onValueChange={(v:boolean) => handleMemberInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID*" idValue={currentMember.senior_citizen_id} onIdChange={(v:string) => handleMemberInputChange('senior_citizen_id', v)} error={memberErrors.senior_citizen_id} proofLabel="Upload Senior Citizen Card*" proofValue={currentMember.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64', 'member', false)} />}
                            {memberAge !== null && memberAge >= 15 && (<View><Text style={styles.modalSectionTitle}>Create Account (Optional)</Text><Text style={styles.accountInfoText}>Member is {memberAge} years old. They can create their own account.</Text><TextInput style={[styles.modalInput, !!memberErrors.email && styles.inputError]} placeholder="Email" placeholderTextColor="#A9A9A9" keyboardType="email-address" autoCapitalize="none" value={currentMember.email} onChangeText={(v) => handleMemberInputChange('email', v)} /><ErrorMessage error={memberErrors.email} /><View style={[styles.passwordContainerModal, !!memberErrors.password && styles.inputError]}><TextInput style={styles.passwordInputModal} placeholder="Password" placeholderTextColor="#A9A9A9" secureTextEntry={!showMemberPassword} value={currentMember.password} onChangeText={(v) => handleMemberInputChange('password', v)} /><TouchableOpacity onPress={() => setShowMemberPassword(!showMemberPassword)} style={styles.eyeIcon}><Ionicons name={showMemberPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" /></TouchableOpacity></View><ErrorMessage error={memberErrors.password} />
                            {/* NEW: Password Checklist for Household Member */}
                            <PasswordChecklist password={currentMember.password} />
                            </View>)}
                            <View style={styles.modalActions}><TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleSaveMember}><Text style={styles.modalButtonText}>Save Member</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.modalButtonClose]} onPress={() => setMemberModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity></View>
                        </ScrollView>
                    </View>
                </View>
                </KeyboardAvoidingView>
            </Modal>
            {/* NEW: AI Validation Loading Modal */}
            <AiValidationLoadingModal isVisible={isAiValidating} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: { paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F00D7' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    scrollView: { backgroundColor: '#F4F6F8', flex: 1 },
    formContainer: { paddingHorizontal: 20, paddingTop: 10 },
    subHeader: { fontSize: 22, fontWeight: '600', color: '#333', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 5 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F00D7', marginTop: 20, marginBottom: 15 },
    label: { fontSize: 16, color: '#333', fontWeight: '500', paddingBottom: 5 },
    labelInfo: { fontSize: 14, color: '#666', marginBottom: 10, fontStyle: 'italic' },
    // NEW style for note text
    noteText: {
        fontSize: 13,
        color: '#666',
        marginBottom: 10,
        fontStyle: 'italic',
        lineHeight: 18,
    },
    textInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, fontSize: 16, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, marginBottom: 15, color: '#000', backgroundColor: 'white' },
    textInputDisabled: { backgroundColor: '#EEEEEE', color: '#757575' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white', marginBottom: 15 },
    passwordInput: { flex: 1, fontSize: 16, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, color: '#000' },
    eyeIcon: { paddingHorizontal: 12, paddingVertical: 10 },
    pickerWrapper: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white', marginBottom: 15 },
    pickerText: { color: '#000' },
    pickerPlaceholder: { color: '#A9A9A9' },
    datePickerButton: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 14, height: 50, marginBottom: 15 },
    datePickerButtonText: { fontSize: 16, color: '#000' },
    datePickerPlaceholderText: { fontSize: 16, color: '#A9A9A9' },
    filePickerButton: { backgroundColor: '#E8E8FF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 4 },
    filePickerButtonText: { color: '#0F00D7', fontSize: 15, fontWeight: 'bold' },
    fileNameText: { fontSize: 13, color: 'green', marginTop: 4, fontStyle: 'italic', textAlign: 'center', marginBottom: 15 },
    loginText: { textAlign: 'center', marginTop: 20, color: '#0F00D7', fontSize: 16 },
    toggleContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
    toggleSwitchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    conditionalContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
    addMemberButton: { flexDirection: 'row', backgroundColor: 'white', borderWidth: 1, borderColor: '#0F00D7', borderStyle: 'dashed', paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    addMemberButtonText: { color: '#0F00D7', fontSize: 16, fontWeight: 'bold' },
    memberCard: { backgroundColor: 'white', borderRadius: 8, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
    memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    memberTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
    memberDetailText: { fontSize: 14, color: '#555', marginBottom: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
    modalContent: { width: '100%', maxHeight: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#0F00D7' },
    modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
    modalInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 15, fontSize: 15, backgroundColor: '#F9F9F9', color: '#000' },
    passwordContainerModal: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: '#F9F9F9', marginBottom: 15 },
    passwordInputModal: { flex: 1, fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#000' },
    pickerWrapperSmall: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, marginBottom: 15, backgroundColor: '#F9F9F9' },
    datePickerButtonModal: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 14, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48, marginBottom: 15 },
    accountInfoText: { fontSize: 14, color: '#666', marginBottom: 10, fontStyle: 'italic', textAlign: 'center' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 25, borderTopWidth: 1, paddingTop: 15, borderColor: '#EEEEEE' },
    modalButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', flex: 1, marginHorizontal: 5 },
    modalButtonSave: { backgroundColor: '#0F00D7' },
    modalButtonClose: { backgroundColor: '#757575' },
    modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    signUpButton: { backgroundColor: '#0F00D7', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 30, marginBottom: 15, elevation: 3 },
    signUpButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    inputError: {
        borderColor: '#D32F2F',
    },
    inputErrorBorder: {
        borderWidth: 1,
        borderColor: '#D32F2F',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        marginTop: -10,
        marginBottom: 10,
        paddingLeft: 2,
    },
    proofSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E0E0E0', marginBottom: 10 },
    previewImageSmall: { width: 70, height: 70, borderRadius: 4, alignSelf: 'center', marginTop: 10 },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 15,
        gap: 10,
    },
    imagePreviewWrapper: {
        position: 'relative',
    },
    removeImageButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'white',
        borderRadius: 15,
        zIndex: 1,
    },
    // NEW: Styles for AI validation loading modal - ADJUSTED DESIGN
    loadingOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    loadingContainer: {
        backgroundColor: 'white',
        // Increased padding slightly and added horizontal margin
        paddingVertical: 35, // Adjusted vertical padding
        paddingHorizontal: 25, // Adjusted horizontal padding
        marginHorizontal: 30, // Added horizontal margin
        // Made corners more rounded to give a "pill" or "squircle" shape
        borderRadius: 25, // Significantly increased from 10
        alignItems: 'center',
        elevation: 10, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    loadingSubText: {
        marginTop: 5,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    // NEW Password Checklist Styles
    passwordChecklistContainer: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    passwordChecklistTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    passwordChecklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    passwordChecklistText: {
        fontSize: 14,
        color: '#555',
    },
    validCheck: {
        color: '#4CAF50', // Green for valid
    },
    invalidCheck: {
        color: '#A9A9A9', // Gray for invalid or not yet met
    },
});