import apiRequest from '@/plugins/axios'; // Ensure this path is correct
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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

// --- Helper Functions and Components ---

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

// --- Proof of Relationship Configuration (Copied from my-household.tsx) ---
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

// Maps the display label of a relationship to the key used in RELATIONSHIP_PROOF_CONFIG
const getProofConfigKey = (relationshipLabel: string): string => {
    switch (relationshipLabel) {
        case "Son":
        case "Daughter":
            return "Child";
        case "Father":
        case "Mother":
            return "Parent";
        case "Brother":
        case "Sister":
            return "Sibling";
        case "Grandfather":
        case "Grandmother":
        case "Grandchild":
        case "Uncle":
        case "Aunt":
        case "Cousin":
        case "Nephew":
        case "Niece":
        case "In-law":
            return "Other Relative";
        case "Household Help/Kasambahay":
            return "House Helper";
        case "Spouse":
            return "Spouse";
        case "Other Relative": // Keep this if user directly selects "Other Relative"
            return "Other Relative";
        case "Other": // "Other" relationships generally fall under "Other Relative" for proof purposes
            return "Other Relative";
        default:
            return relationshipLabel; // Fallback, though should be covered
    }
};

const RELATIONSHIP_PROOF_CONFIG: { [key: string]: ProofRequirement } = {
    Child: {
        allowedProofValues: ["PSA Birth Certificate", "Adoption Certificate", "Baptismal Certificate"],
        displayInfo: 'Primary proof: PSA Birth Certificate (of child). Optional supporting: Adoption Certificate, Baptismal Certificate.',
    },
    Spouse: {
        allowedProofValues: ["PSA Marriage Certificate", "LCR Marriage Certificate", "Joint Affidavit"],
        displayInfo: 'Primary proof: PSA Marriage Certificate. Optional supporting: LCR Marriage Certificate, Joint Affidavit.',
    },
    Parent: {
        allowedProofValues: ["PSA Birth Certificate", "Guardianship Affidavit"],
        displayInfo: 'Primary proof: PSA Birth Certificate (of child). Optional supporting: Guardianship Affidavit.',
    },
    Sibling: {
        allowedProofValues: ["PSA Birth Certificate", "Affidavit of Siblinghood"],
        displayInfo: 'Primary proof: PSA Birth Certificates of both parties. Optional supporting: Affidavit of Siblinghood.',
    },
    'Other Relative': { // This will now cover many specific family relations from the new list
        allowedProofValues: ["PSA Birth Certificate", "Valid ID Card", "Affidavit of Relationship"],
        displayInfo: 'Primary proof: PSA Birth Certificate(s) or Valid ID Card. Optional supporting: Affidavit of Relationship.',
    },
    'House Helper': { // Renamed from "House Helper" to "Household Help/Kasambahay" in UI
        allowedProofValues: ALL_POSSIBLE_PROOF_DOCUMENTS.map(doc => doc.value),
        displayInfo: 'Any of the above-mentioned documents may be accepted as available.',
    },
};

// This array now contains the keys that require proof from RELATIONSHIP_PROOF_CONFIG
const RELATIONSHIPS_REQUIRING_PROOF_KEYS = Object.keys(RELATIONSHIP_PROOF_CONFIG);
// --- End Proof of Relationship Configuration ---

// --- Suffix Options ---
const suffixOptions = ['Jr.', 'Sr.', 'I', 'II', 'III', 'IV', 'V', 'VI'];

// --- Relationship Picker Options ---
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
    { label: "Grandmother", value: "Grandmother" },
    { label: "Grandchild", value: "Grandchild" },
    { label: "Uncle", value: "Uncle" },
    { label: "Aunt", value: "Aunt" },
    { label: "Cousin", value: "Cousin" },
    { label: "Nephew", value: "Nephew" },
    { label: "Niece", value: "Niece" },
    { label: "In-law", value: "In-law" },
    { label: "Household Help/Kasambahay", value: "Household Help/Kasambahay" },
    { label: "Other", value: "Other" },
];


// --- Initial State Definitions ---

const initialMemberState = {
    first_name: '', middle_name: '', last_name: '', suffix: null as string | null,
    sex: '',
    date_of_birth: null as string | null, civil_status: '', citizenship: 'Filipino', other_citizenship: '', // ADDED other_citizenship
    occupation_status: '', contact_number: '', relationship_to_head: '',
    other_relationship: '', email: '', password: '', is_voter: false, voter_id_number: '',
    voter_registration_proof_base64: null as string | null, is_pwd: false, pwd_id: '',
    pwd_card_base64: null as string | null, is_senior_citizen: false, senior_citizen_id: '',
    senior_citizen_card_base64: null as string | null,
    // Add proof of relationship fields
    proof_of_relationship_type: null as string | null,
    proof_of_relationship_base64: null as string | null,
};

type Member = typeof initialMemberState;

const initialHeadState = {
    ...initialMemberState, relationship_to_head: '', other_relationship: '', password: '',
    confirmPassword: '', address_house_number: '', address_street: '', address_subdivision_zone: '',
    address_city_municipality: 'Manila City', years_at_current_address: '',
    proof_of_residency_base64: null as string | null,
    // Remove proof_of_relationship for Head as it's not applicable
    proof_of_relationship_type: null,
    proof_of_relationship_base64: null,
};

type Head = Omit<typeof initialHeadState, 'proof_of_relationship_type' | 'proof_of_relationship_base64'> & {
    suffix: string | null; // Explicitly add suffix to Head type as well
    proof_of_relationship_type?: null; // Explicitly make it optional/null for Head
    proof_of_relationship_base64?: null;
};


// Reusable component for toggled sections with validation
const ToggleSection = ({ label, value, onValueChange, idLabel, idValue, onIdChange, error, proofLabel, proofValue, onProofPress }: any) => (
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
                {proofValue && <Text style={styles.fileNameText}>Proof selected.</Text>}
            </View>
        )}
    </View>
);


export default function SignupScreen() {
    const router = useRouter();

    const [formData, setFormData] = useState<Head>(initialHeadState);
    const [errors, setErrors] = useState<Partial<Record<keyof Head, string>>>({});

    const [members, setMembers] = useState<Member[]>([]);
    const [isMemberModalVisible, setMemberModalVisible] = useState(false);
    const [currentMember, setCurrentMember] = useState<Member>(initialMemberState);
    // Update memberErrors type to include proof-related errors
    const [memberErrors, setMemberErrors] = useState<Partial<Record<keyof Member | 'proof_type' | 'proof_image', string>>>({});
    const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);

    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState<'head' | 'member'>('head');
    const [isSaving, setIsSaving] = useState(false);
    const [showHeadPassword, setShowHeadPassword] = useState(false);
    const [showMemberPassword, setShowMemberPassword] = useState(false);


    const validateField = (fieldName: keyof Head | keyof Member, value: any, state: Head | Member, allMembers: Member[] = [], headEmail: string = '', editingIndex: number | null = null) => {
        let error = '';
        // Helper validation functions
        const isRequired = (val: any) => !val || (typeof val === 'string' && !val.trim());
        const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const containsNumber = (val: string) => /\d/.test(val);
        const isInvalidName = (val: string) => !/^[a-zA-Z'.\-\s]+$/.test(val);

        switch (fieldName) {
            // --- Name and Text Field Validation ---
            case 'first_name':
            case 'last_name':
                if (isRequired(value)) {
                    error = 'This field is required.';
                } else if (isInvalidName(value)) {
                    error = 'This field cannot contain numbers.';
                }
                break;
            case 'middle_name':
                if (value && isInvalidName(value)) {
                    error = 'This field cannot contain numbers.';
                }
                break;
            case 'suffix': // ADDED SUFFIX VALIDATION (optional, but no numbers)
                if (value && isInvalidName(value)) {
                    error = 'This field cannot contain numbers.';
                }
                break;
            case 'citizenship':
                if (isRequired(value)) {
                    error = 'Citizenship is required.';
                } else if (value === 'Other') {
                    // If citizenship is 'Other', then 'other_citizenship' must be provided
                    if (isRequired((state as Member | Head).other_citizenship)) {
                        error = 'Please specify your citizenship.';
                    }
                }
                break;
            case 'other_citizenship': // Validate the 'Other' citizenship text input
                if ((state as Member | Head).citizenship === 'Other' && isRequired(value)) {
                    error = 'Please specify your citizenship.';
                } else if (value && containsNumber(value)) {
                    error = 'Numbers are not allowed in citizenship.';
                }
                break;

            // --- Other Common Fields ---
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
                    // Check for duplicate emails among all members and head
                    if (allEmails.filter(e => e === value.trim().toLowerCase()).length > 1) {
                         error = 'This email is already used by another household member or the head.';
                    }
                }
                break;

            // --- Head-specific fields ---
            case 'contact_number': if (isRequired(value)) error = 'Contact number is required.'; else if (!/^\d{11}$/.test(value)) error = 'Must be a valid 11-digit number.'; break;
            case 'address_house_number': case 'address_street': case 'address_subdivision_zone': if (isRequired(value)) error = 'This address field is required.'; break;
            case 'years_at_current_address': if (isRequired(value)) error = 'Years at address is required.'; else if (!/^\d+$/.test(value)) error = 'Must be a valid number.'; break;
            case 'proof_of_residency_base64': if (isRequired(value)) error = 'Proof of residency is required.'; break;
            case 'password':
                const passwordValue = String(value); // Ensure value is a string
                // Determine if password is required based on context
                const isHeadPassword = 'confirmPassword' in state;
                const isMemberPasswordOptionalButProvided = 'email' in state && !isHeadPassword && (state as Member).email;

                if (isRequired(passwordValue)) {
                    if (isHeadPassword) {
                        error = 'Password is required.';
                    } else if (isMemberPasswordOptionalButProvided) {
                        error = 'Password is required for account creation if an email is provided.';
                    }
                } else if (passwordValue) { // Only apply complex rules if password is not empty
                    // Password must be at least 8 characters, contain at least one uppercase letter,
                    // one lowercase letter, one number, and one special character.
                    // Special characters included: @$!%*?&
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                    if (!passwordRegex.test(passwordValue)) {
                        error = 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @$!%*?&).';
                    }
                }
                break;
            case 'confirmPassword':
                if ('password' in state && state.password && isRequired(value)) {
                    error = 'Please confirm your password.';
                } else if ('password' in state && value !== state.password) {
                    error = 'Passwords do not match.';
                }
                break;

            // --- Member-specific fields ---
            case 'relationship_to_head': if (isRequired(value)) error = 'Relationship is required.'; break;
            case 'other_relationship': if ((state as Member).relationship_to_head === 'Other' && isRequired(value)) error = 'Please specify the relationship.'; break;
            case 'proof_of_relationship_type': // This will be validated outside this function generally, but for consistency
                const proofRelKey = getProofConfigKey((state as Member).relationship_to_head);
                if (RELATIONSHIPS_REQUIRING_PROOF_KEYS.includes(proofRelKey) && isRequired(value)) {
                    error = 'Please select a proof document type.';
                }
                break;
            case 'proof_of_relationship_base64': // This will be validated outside this function generally, but for consistency
                const proofRelKeyImage = getProofConfigKey((state as Member).relationship_to_head);
                if (RELATIONSHIPS_REQUIRING_PROOF_KEYS.includes(proofRelKeyImage) && isRequired(value)) {
                    error = 'An image of the proof document is required.';
                }
                break;

            // --- Conditional fields ---
            case 'voter_id_number': if ((state as Head | Member).is_voter && isRequired(value)) error = "Voter ID is required."; break;
            case 'pwd_id': if ((state as Head | Member).is_pwd && isRequired(value)) error = "PWD ID is required."; break;
            case 'senior_citizen_id': if ((state as Head | Member).is_senior_citizen && isRequired(value)) error = "Senior Citizen ID is required."; break;
        }
        return error;
    };

    const handleInputChange = useCallback((name: keyof Head, value: any) => {
        setFormData(prev => {
            let newState = { ...prev, [name]: value };

            // Special handling for citizenship
            if (name === 'citizenship' && value !== 'Other') {
                newState.other_citizenship = ''; // Clear other_citizenship if not 'Other'
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

            // Relationship change specific logic
            if (name === 'relationship_to_head') {
                // Reset proof related fields when relationship changes
                newState.proof_of_relationship_type = null;
                newState.proof_of_relationship_base64 = null;
                setMemberErrors(currentErrors => ({
                    ...currentErrors,
                    other_relationship: (value === 'Other') ? validateField('other_relationship', newState.other_relationship, newState) || undefined : undefined,
                    proof_type: undefined, // Clear proof type error
                    proof_image: undefined, // Clear proof image error
                }));
            } else if (name === 'other_relationship' && newState.relationship_to_head === 'Other') {
                const otherRelError = validateField('other_relationship', value, newState, members, formData.email, editingMemberIndex);
                setMemberErrors(currentErrors => ({ ...currentErrors, other_relationship: otherRelError || undefined }));
            }

            // Citizenship change specific logic
            if (name === 'citizenship' && value !== 'Other') {
                newState.other_citizenship = ''; // Clear other_citizenship if not 'Other'
                setMemberErrors(currentErrors => ({ ...currentErrors, other_citizenship: undefined }));
            } else if (name === 'other_citizenship' && newState.citizenship === 'Other') {
                const otherCitizenshipError = validateField('other_citizenship', value, newState, members, formData.email, editingMemberIndex);
                setMemberErrors(currentErrors => ({ ...currentErrors, other_citizenship: otherCitizenshipError || undefined }));
            }


            // Age-related special classification resets
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

            // General field validation
            const error = validateField(name, value, newState, members, formData.email, editingMemberIndex);
            setMemberErrors(currentErrors => ({ ...currentErrors, [name]: error || undefined }));

            return newState;
        });
    }, [members, formData.email, editingMemberIndex]);

    const handleConfirmDate = (date: Date) => {
        const formattedDate = date.toISOString().split('T')[0];
        if (datePickerTarget === 'head') { handleInputChange('date_of_birth', formattedDate); }
        else { handleMemberInputChange('date_of_birth', formattedDate); }
        hideDatePicker();
    };

    const pickImage = async (field: keyof Head | keyof Member, target: 'head' | 'member', proofTypeFieldName?: 'proof_type' | 'proof_image') => {
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
        });

        if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64) {
            const data = `data:image/jpeg;base64,${result.assets[0].base64}`;
            if (target === 'head') {
                handleInputChange(field as keyof Head, data);
            } else {
                // Update currentMember for specific proof fields
                setCurrentMember(prev => ({ ...prev, [field]: data }));
                // Clear the specific proof image error if any
                if (proofTypeFieldName) {
                     setMemberErrors(prevErrors => ({ ...prevErrors, [proofTypeFieldName]: undefined }));
                }
            }
        }
    };

    const handleSaveMember = () => {
        const fieldsToValidate: (keyof Member)[] = [
            'first_name', 'last_name', 'date_of_birth', 'relationship_to_head',
            'sex', 'civil_status', 'citizenship', 'occupation_status'
        ];

        // Conditional validation for 'Other' relationship
        if (currentMember.relationship_to_head === 'Other') {
            fieldsToValidate.push('other_relationship');
        }

        // Conditional validation for 'Other' citizenship
        if (currentMember.citizenship === 'Other') {
            fieldsToValidate.push('other_citizenship');
        }

        let hasErrors = false;
        const newErrors: Partial<Record<keyof Member | 'proof_type' | 'proof_image', string>> = {};

        const memberAge = calculateAge(currentMember.date_of_birth);
        if (memberAge !== null && memberAge >= 15 && (currentMember.email || currentMember.password)) {
            fieldsToValidate.push('email', 'password');
        }

        // Validate basic fields
        fieldsToValidate.forEach(field => {
            const error = validateField(field, currentMember[field], currentMember, members, formData.email, editingMemberIndex);
            if (error) {
                hasErrors = true;
                newErrors[field] = error;
            }
        });

        // Validate suffix (optional field, but check for invalid characters if present)
        const suffixError = validateField('suffix', currentMember.suffix, currentMember);
        if (suffixError) {
            hasErrors = true;
            newErrors.suffix = suffixError;
        }


        // Validate conditional special classifications (already handled by ToggleSection passing errors)
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

        // --- Proof of Relationship Validation ---
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
        }
        // If relationship does not require proof, ensure proof fields are null/empty
        else {
            currentMember.proof_of_relationship_type = null;
            currentMember.proof_of_relationship_base64 = null;
        }


        setMemberErrors(newErrors);

        if (hasErrors || Object.keys(newErrors).length > 0) { // Double check newErrors just in case
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
        // --- All validation logic remains the same ---
        const fieldsToValidate: (keyof Head)[] = [
            'first_name', 'last_name', 'email', 'contact_number', 'date_of_birth',
            'sex', 'civil_status', 'citizenship', 'occupation_status',
            'address_house_number', 'address_street', 'address_subdivision_zone',
            'years_at_current_address', 'proof_of_residency_base64', 'password', 'confirmPassword'
        ];
        if (formData.is_voter) fieldsToValidate.push('voter_id_number');
        if (formData.is_pwd) fieldsToValidate.push('pwd_id');
        if (formData.is_senior_citizen) fieldsToValidate.push('senior_citizen_id');
        if (formData.citizenship === 'Other') fieldsToValidate.push('other_citizenship'); // Validate other citizenship for head

        let hasErrors = false;
        const newErrors: Partial<Record<keyof Head, string>> = {};

        fieldsToValidate.forEach(field => {
            const error = validateField(field, formData[field], formData, members, formData.email);
            if (error) {
                hasErrors = true;
                newErrors[field] = error;
            }
        });

        // Validate suffix for head
        const suffixError = validateField('suffix', formData.suffix, formData, members, formData.email);
        if (suffixError) {
            hasErrors = true;
            newErrors.suffix = suffixError;
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
        try {
            const payload: any = { ...formData, household_members_to_create: members };
            delete payload.confirmPassword;
            // Remove relationship_to_head, other_relationship, and proof fields from head payload
            delete payload.relationship_to_head;
            delete payload.other_relationship;
            delete payload.proof_of_relationship_type;
            delete payload.proof_of_relationship_base64;

            // If head's citizenship is not 'Other', ensure other_citizenship is null/empty for payload
            if (payload.citizenship !== 'Other') {
                payload.other_citizenship = null;
            }

            // For members, if citizenship is not 'Other', ensure other_citizenship is null/empty
            payload.household_members_to_create = payload.household_members_to_create.map((member: Member) => {
                if (member.citizenship !== 'Other') {
                    return { ...member, other_citizenship: null };
                }
                return member;
            });


            try {
                const response = await apiRequest('POST', '/api/residents', payload);

                console.log(response);

                if (!response || !response.message) {
                    throw new Error('Registration failed. Please try again.');
                }

                // This part only runs if the API call was successful
                Alert.alert(
                    'Registration Successful',
                    'Your household has been registered and is pending for approval by the Baranggay Secretary.',
                    [{ text: 'OK', onPress: () => router.replace('/login') }]
                );
            } catch (error) {
                Alert.alert("Registration Failed", "An error occurred during registration. Please try again.");
            }

        } catch (error: any) {
            console.error("Registration failed:", error);

            let errorMessage = "An unknown error occurred during registration. Please try again.";

            // Attempt to extract a user-friendly message from the API response
            if (error.response && error.response.data) {
                if (typeof error.response.data.message === 'string') {
                    // Use the 'message' field if it exists and is a string
                    errorMessage = error.response.data.message;
                } else if (typeof error.response.data === 'object' && error.response.data !== null) {
                    // If the response is an object of errors (e.g., from form validation), format it.
                    const messages = Object.values(error.response.data).flat();
                    if (messages.length > 0) {
                        errorMessage = messages.join('\n');
                    }
                }
            }

            // Display the extracted string message in the Alert.
            Alert.alert("Registration Failed", errorMessage || "An unknown error occurred during registration. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Other handlers ---
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
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
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

                    {/* NEW: Suffix field for Head */}
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
                    {/* END NEW: Suffix field for Head */}

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

                    {/* UPDATED: Citizenship Dropdown */}
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
                    {/* END UPDATED: Citizenship Dropdown */}

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
                    {/* RENAMED: House Number/Lot/Block */}
                    <Text style={styles.label}>House Number/Lot/Block*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_house_number && styles.inputError]} placeholder="House Number/Lot/Block*" placeholderTextColor="#A9A9A9" value={formData.address_house_number} onChangeText={(v) => handleInputChange('address_house_number', v)} /><ErrorMessage error={errors.address_house_number} />
                    <Text style={styles.label}>Street*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_street && styles.inputError]} placeholder="Street*" placeholderTextColor="#A9A9A9" value={formData.address_street} onChangeText={(v) => handleInputChange('address_street', v)} /><ErrorMessage error={errors.address_street} />
                    <Text style={styles.label}>Subdivision / Zone / Sitio / Purok*</Text>
                    <TextInput style={[styles.textInput, !!errors.address_subdivision_zone && styles.inputError]} placeholder="Subdivision / Zone / Sitio / Purok*" placeholderTextColor="#A9A9A9" value={formData.address_subdivision_zone} onChangeText={(v) => handleInputChange('address_subdivision_zone', v)} /><ErrorMessage error={errors.address_subdivision_zone} />
                    <Text style={styles.label}>City/Municipality</Text>
                    <TextInput style={[styles.textInput, styles.textInputDisabled]} value={formData.address_city_municipality} editable={false} />
                    <Text style={styles.label}>Years at Current Address*</Text>
                    <TextInput style={[styles.textInput, !!errors.years_at_current_address && styles.inputError]} placeholder="Years at Current Address*" placeholderTextColor="#A9A9A9" keyboardType="numeric" value={formData.years_at_current_address} onChangeText={(v) => handleInputChange('years_at_current_address', v)} /><ErrorMessage error={errors.years_at_current_address} />
                    <Text style={styles.label}>Proof of Residency*</Text>
                    <TouchableOpacity style={[styles.filePickerButton, !!errors.proof_of_residency_base64 && styles.inputErrorBorder]} onPress={() => pickImage('proof_of_residency_base64', 'head')}><Text style={styles.filePickerButtonText}>{formData.proof_of_residency_base64 ? 'Change Proof of Residency*' : 'Upload Proof of Residency*'}</Text></TouchableOpacity><ErrorMessage error={errors.proof_of_residency_base64} />
                    {formData.proof_of_residency_base64 && !errors.proof_of_residency_base64 && <Text style={styles.fileNameText}>Proof selected.</Text>}

                    <Text style={styles.sectionTitle}>Special Classifications</Text>
                    {(headAge === null || headAge >= 18) && <ToggleSection label="Are you a registered voter?" value={formData.is_voter} onValueChange={(v:boolean) => handleInputChange('is_voter', v)} idLabel="Voter ID Number*" idValue={formData.voter_id_number} onIdChange={(v:string) => handleInputChange('voter_id_number', v)} error={errors.voter_id_number} proofLabel="Upload Voter's Proof" proofValue={formData.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64', 'head')} />}
                    <ToggleSection label="Are you a PWD?" value={formData.is_pwd} onValueChange={(v:boolean) => handleInputChange('is_pwd', v)} idLabel="PWD ID Number*" idValue={formData.pwd_id} onIdChange={(v:string) => handleInputChange('pwd_id', v)} error={errors.pwd_id} proofLabel="Upload PWD Card*" proofValue={formData.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64', 'head')} />
                    {(headAge === null || headAge >= 60) && <ToggleSection label="Are you a Senior Citizen?" value={formData.is_senior_citizen} onValueChange={(v:boolean) => handleInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID*" idValue={formData.senior_citizen_id} onIdChange={(v:string) => handleInputChange('senior_citizen_id', v)} error={errors.senior_citizen_id} proofLabel="Upload Senior Citizen Card*" proofValue={formData.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64', 'head')} />}

                    <Text style={styles.sectionTitle}>Account Credentials</Text>
                    <Text style={styles.label}>Email*</Text>
                    <TextInput style={[styles.textInput, !!errors.email && styles.inputError]} placeholder="Email*" placeholderTextColor="#A9A9A9" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} /><ErrorMessage error={errors.email} />
                    <Text style={styles.label}>Password*</Text>
                    <View style={[styles.passwordContainer, !!errors.password && styles.inputError]}><TextInput style={styles.passwordInput} placeholder="Password*" placeholderTextColor="#A9A9A9" secureTextEntry={!showHeadPassword} value={formData.password} onChangeText={(v) => handleInputChange('password', v)} /><TouchableOpacity onPress={() => setShowHeadPassword(!showHeadPassword)} style={styles.eyeIcon}><Ionicons name={showHeadPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#888" /></TouchableOpacity></View><ErrorMessage error={errors.password} />
                    <Text style={styles.label}>Confirm Password*</Text>
                    <View style={[styles.passwordContainer, !!errors.confirmPassword && styles.inputError]}><TextInput style={styles.passwordInput} placeholder="Confirm Password*" placeholderTextColor="#A9A9A9" secureTextEntry={!showHeadPassword} value={formData.confirmPassword} onChangeText={(v) => handleInputChange('confirmPassword', v)} /><TouchableOpacity onPress={() => setShowHeadPassword(!showHeadPassword)} style={styles.eyeIcon}><Ionicons name={showHeadPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#888" /></TouchableOpacity></View><ErrorMessage error={errors.confirmPassword} />

                    <Text style={styles.subHeader}>Step 2: Household Members</Text>
                    {members.map((member, index) => (
                        <View key={index} style={styles.memberCard}>
                            <View style={styles.memberHeader}>
                                {/* UPDATED: Display middle name and suffix for members */}
                                <Text style={styles.memberTitle}>{`${member.first_name} ${member.middle_name ? member.middle_name + ' ' : ''}${member.last_name}${member.suffix ? ' ' + member.suffix : ''}`}</Text>
                                <View style={{flexDirection: 'row'}}><TouchableOpacity onPress={() => openEditMemberModal(index)} style={{marginRight: 15}}><Ionicons name="pencil-outline" size={22} color="#0F00D7" /></TouchableOpacity><TouchableOpacity onPress={() => handleRemoveMember(index)}><Ionicons name="trash-bin-outline" size={22} color="#D32F2F" /></TouchableOpacity></View>
                            </View>
                            {/* Display the actual relationship label selected */}
                            <Text style={styles.memberDetailText}>Relationship: {member.relationship_to_head === 'Other' ? member.other_relationship : member.relationship_to_head}</Text>
                            <Text style={styles.memberDetailText}>Age: {calculateAge(member.date_of_birth)}</Text>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addMemberButton} onPress={openAddMemberModal}><Ionicons name="add-circle-outline" size={22} color="#0F00D7" style={{marginRight: 8}} /><Text style={styles.addMemberButtonText}>Add Household Member</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.signUpButton} onPress={handleRegister} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signUpButtonText}>Register Household</Text>}</TouchableOpacity>
                    <TouchableOpacity onPress={() => router.navigate('/login')}><Text style={styles.loginText}>Already have an account? Login</Text></TouchableOpacity>
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

                            {/* NEW: Suffix field for Member */}
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
                                </Picker>
                            </View>
                            <ErrorMessage error={memberErrors.suffix} />
                            {/* END NEW: Suffix field for Member */}

                            <Text style={styles.label}>Date of Birth*</Text>
                            <TouchableOpacity style={[styles.datePickerButtonModal, !!memberErrors.date_of_birth && styles.inputError]} onPress={() => showDatePicker('member')}><Text style={currentMember.date_of_birth ? styles.datePickerButtonText : styles.datePickerPlaceholderText}>{currentMember.date_of_birth || 'Date of Birth*'}</Text></TouchableOpacity><ErrorMessage error={memberErrors.date_of_birth} />

                            {/* UPDATED: Relationship to Head Dropdown */}
                            <Text style={styles.label}>Relationship to Head*</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.relationship_to_head && styles.inputError]}>
                                <Picker selectedValue={currentMember.relationship_to_head} onValueChange={(v) => handleMemberInputChange('relationship_to_head', v)} style={[styles.pickerText, !currentMember.relationship_to_head && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}>
                                    {relationshipPickerOptions.map((option) => (
                                        <Picker.Item key={option.value} label={option.label} value={option.value} enabled={option.enabled ?? true} />
                                    ))}
                                </Picker>
                            </View>
                            <ErrorMessage error={memberErrors.relationship_to_head} />
                            {currentMember.relationship_to_head === 'Other' && (<><Text style={styles.label}>Specify Relationship*</Text><TextInput style={[styles.modalInput, !!memberErrors.other_relationship && styles.inputError]} placeholder="Please specify relationship*" placeholderTextColor="#A9A9A9" value={currentMember.other_relationship} onChangeText={(v) => handleMemberInputChange('other_relationship', v)} /><ErrorMessage error={memberErrors.other_relationship} /></>)}
                            {/* END UPDATED: Relationship to Head Dropdown */}

                            <Text style={styles.label}>Sex*</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.sex && styles.inputError]}><Picker selectedValue={currentMember.sex} onValueChange={(v) => handleMemberInputChange('sex', v)} style={[styles.pickerText, !currentMember.sex && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}><Picker.Item label="Select Sex*" value="" enabled={false} /><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View><ErrorMessage error={memberErrors.sex} />
                            <Text style={styles.label}>Civil Status*</Text>
                            <View style={[styles.pickerWrapperSmall, !!memberErrors.civil_status && styles.inputError]}><Picker selectedValue={currentMember.civil_status} onValueChange={(v) => handleMemberInputChange('civil_status', v)} style={[styles.pickerText, !currentMember.civil_status && styles.pickerPlaceholder]} itemStyle={{ color: 'black' }}><Picker.Item label="Select Civil Status*" value="" enabled={false} /><Picker.Item label="Single" value="Single" /><Picker.Item label="Married" value="Married" /><Picker.Item label="Widowed" value="Widowed" /><Picker.Item label="Separated" value="Separated" /></Picker></View><ErrorMessage error={memberErrors.civil_status} />

                            {/* UPDATED: Citizenship Dropdown for Member */}
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
                            {/* END UPDATED: Citizenship Dropdown for Member */}

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
                                </Picker>
                            </View>
                            <ErrorMessage error={memberErrors.occupation_status} />

                            {/* --- Proof of Relationship Section for Members --- */}
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
                                    <TouchableOpacity style={[styles.filePickerButton, !!memberErrors.proof_image && styles.inputErrorBorder]} onPress={() => pickImage('proof_of_relationship_base64', 'member', 'proof_image')}>
                                        <Text style={styles.filePickerButtonText}>{currentMember.proof_of_relationship_base64 ? 'Change Proof Image' : 'Upload Proof Image'}</Text>
                                    </TouchableOpacity>
                                    {currentMember.proof_of_relationship_base64 && <Image source={{ uri: currentMember.proof_of_relationship_base64 }} style={styles.previewImageSmall} />}
                                    <ErrorMessage error={memberErrors.proof_image} />
                                </View>
                            )}
                            {/* --- End Proof of Relationship Section --- */}

                            <Text style={styles.modalSectionTitle}>Special Classifications</Text>
                            {(memberAge === null || memberAge >= 18) && <ToggleSection label="Is member a registered voter?" value={currentMember.is_voter} onValueChange={(v:boolean) => handleMemberInputChange('is_voter', v)} idLabel="Voter ID Number" idValue={currentMember.voter_id_number} onIdChange={(v:string) => handleMemberInputChange('voter_id_number', v)} error={memberErrors.voter_id_number} proofLabel="Upload Voter's Proof" proofValue={currentMember.voter_registration_proof_base64} onProofPress={() => pickImage('voter_registration_proof_base64', 'member')} />}
                            <ToggleSection label="Is member a PWD?" value={currentMember.is_pwd} onValueChange={(v:boolean) => handleMemberInputChange('is_pwd', v)} idLabel="PWD ID Number*" idValue={currentMember.pwd_id} onIdChange={(v:string) => handleMemberInputChange('pwd_id', v)} error={memberErrors.pwd_id} proofLabel="Upload PWD Card*" proofValue={currentMember.pwd_card_base64} onProofPress={() => pickImage('pwd_card_base64', 'member')} />
                            {(memberAge === null || memberAge >= 60) && <ToggleSection label="Is member a Senior Citizen?" value={currentMember.is_senior_citizen} onValueChange={(v:boolean) => handleMemberInputChange('is_senior_citizen', v)} idLabel="Senior Citizen ID*" idValue={currentMember.senior_citizen_id} onIdChange={(v:string) => handleMemberInputChange('senior_citizen_id', v)} error={memberErrors.senior_citizen_id} proofLabel="Upload Senior Citizen Card*" proofValue={currentMember.senior_citizen_card_base64} onProofPress={() => pickImage('senior_citizen_card_base64', 'member')} />}
                            {memberAge !== null && memberAge >= 15 && (<View><Text style={styles.modalSectionTitle}>Create Account (Optional)</Text><Text style={styles.accountInfoText}>Member is {memberAge} years old. They can create their own account.</Text><TextInput style={[styles.modalInput, !!memberErrors.email && styles.inputError]} placeholder="Email" placeholderTextColor="#A9A9A9" keyboardType="email-address" autoCapitalize="none" value={currentMember.email} onChangeText={(v) => handleMemberInputChange('email', v)} /><ErrorMessage error={memberErrors.email} /><View style={[styles.passwordContainerModal, !!memberErrors.password && styles.inputError]}><TextInput style={styles.passwordInputModal} placeholder="Password" placeholderTextColor="#A9A9A9" secureTextEntry={!showMemberPassword} value={currentMember.password} onChangeText={(v) => handleMemberInputChange('password', v)} /><TouchableOpacity onPress={() => setShowMemberPassword(!showMemberPassword)} style={styles.eyeIcon}><Ionicons name={showMemberPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" /></TouchableOpacity></View><ErrorMessage error={memberErrors.password} /></View>)}
                            <View style={styles.modalActions}><TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleSaveMember}><Text style={styles.modalButtonText}>Save Member</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.modalButtonClose]} onPress={() => setMemberModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity></View>
                        </ScrollView>
                    </View>
                </View>
                </KeyboardAvoidingView>
            </Modal>

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
    labelInfo: { fontSize: 14, color: '#666', marginBottom: 10, fontStyle: 'italic' }, // Added for proof info
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
});