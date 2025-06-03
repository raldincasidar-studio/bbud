import apiRequest from '@/plugins/axios'; // Ensure this path is correct for your project structure
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { Ionicons } from '@expo/vector-icons'; // Make sure this is installed
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import DateTimePickerModal from "react-native-modal-datetime-picker";

// Debounce utility
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// Helper to calculate age
const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  if (isNaN(birthDate.getTime())) return null; // Invalid date
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

// Helper to format date for display
const formatDateForDisplay = (date) => {
    if (!date) return '';
    if (!(date instanceof Date)) { // If it's a string, try to parse it
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return 'Invalid Date';
        return parsedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
    }
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
};
// Helper to format date for API
const formatDateForAPI = (date) => {
    if (!date) return null;
    if (!(date instanceof Date)) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return null;
        return parsedDate.toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
};


const OCCUPATION_OPTIONS_CONFIG = [
    {label: 'Select Occupation', value: ''}, {label:'Employed', value:'Employed'}, {label:'Unemployed', value:'Unemployed'},
    {label:'Student', value:'Student'}, {label:'Retired', value:'Retired'},
    {label: 'Labor force', value: 'Labor force'},
    {label: 'Out of School Youth', value: 'Out of School Youth'},
    {label:'Other', value:'Other'}
];


export default function SignupScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [age, setAge] = useState(''); // Display string, auto-filled

  const [civilStatus, setCivilStatus] = useState('');
  const [occupationStatus, setOccupationStatus] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [isPwd, setIsPwd] = useState('No');

  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [addressSubdivisionZone, setAddressSubdivisionZone] = useState('');
  const [cityMunicipality, setCityMunicipality] = useState('Manila City');
  const [yearsLivedCurrentAddress, setYearsLivedCurrentAddress] = useState('');

  const [contactNo, setContactNo] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isVoter, setIsVoter] = useState('No');
  const [precinctNumber, setPrecinctNumber] = useState('');
  const [voterProofFile, setVoterProofFile] = useState(null);
  const [voterProofBase64, setVoterProofBase64] = useState('');
  const [voterProofName, setVoterProofName] = useState('');

  const [residencyProofFile, setResidencyProofFile] = useState(null);
  const [residencyProofBase64, setResidencyProofBase64] = useState('');
  const [residencyProofName, setResidencyProofName] = useState('');

  const [isHouseholdHead, setIsHouseholdHead] = useState('No');
  const [householdMembersToCreate, setHouseholdMembersToCreate] = useState([]);
  const [isMemberModalVisible, setMemberModalVisible] = useState(false);
  const [currentMemberData, setCurrentMemberData] = useState(null);
  const [editingMemberIndex, setEditingMemberIndex] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (dateOfBirth) {
      const calculated = calculateAge(dateOfBirth);
      setAge(calculated !== null ? String(calculated) : '');
    } else {
      setAge('');
    }
  }, [dateOfBirth]);

  const showMainDatePicker = () => setDatePickerVisibility(true);
  const hideMainDatePicker = () => setDatePickerVisibility(false);
  const handleConfirmMainDate = (selectedDate) => {
    hideMainDatePicker();
    if (selectedDate) setDateOfBirth(selectedDate);
  };

  const pickDocumentFor = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.name) {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
          const mimeType = asset.mimeType || (asset.name.endsWith('.pdf') ? 'application/pdf' : (asset.name.endsWith('.png') ? 'image/png' : 'image/jpeg'));
          const base64WithPrefix = `data:${mimeType};base64,${base64}`;
          if (type === 'residency') {
            setResidencyProofFile(asset); setResidencyProofName(asset.name); setResidencyProofBase64(base64WithPrefix);
          } else if (type === 'voter') {
            setVoterProofFile(asset); setVoterProofName(asset.name); setVoterProofBase64(base64WithPrefix);
          }
        } else { Alert.alert('Error', 'Failed to get file details.'); }
      }
    } catch (err) { console.error('Error picking document:', err); Alert.alert('Error', 'Could not pick document.'); }
  };

  const openMemberModal = (memberData = null, index = null) => {
    setCurrentMemberData(memberData || {
      first_name: '', last_name: '', middle_name: '', sex: '', date_of_birth: null,
      email: '', password: '', confirmPassword: '', occupation_status: '',
    });
    setEditingMemberIndex(index);
    setMemberModalVisible(true);
  };

  const handleSaveMember = (memberDetails) => {
    if (!memberDetails.first_name || !memberDetails.last_name || !memberDetails.sex || !memberDetails.date_of_birth || !memberDetails.email || !memberDetails.password) {
        Alert.alert("Error", "Please fill all required fields (marked with *) for the household member."); return;
    }
    if (memberDetails.password !== memberDetails.confirmPassword) {
        Alert.alert("Error", "Member's passwords do not match."); return;
    }
    if (memberDetails.password.length < 6) {
        Alert.alert("Error", "Member's password must be at least 6 characters."); return;
    }
    const allEmailsInForm = [emailAddress.trim().toLowerCase()];
    householdMembersToCreate.forEach((mem, i) => {
        if (editingMemberIndex === null || i !== editingMemberIndex) {
            allEmailsInForm.push(mem.email.trim().toLowerCase());
        }
    });
    if (allEmailsInForm.includes(memberDetails.email.trim().toLowerCase())) {
        Alert.alert("Error", `Email address ${memberDetails.email} is already in use within this registration form.`); return;
    }

    if (editingMemberIndex !== null) {
      const updatedMembers = [...householdMembersToCreate];
      updatedMembers[editingMemberIndex] = memberDetails;
      setHouseholdMembersToCreate(updatedMembers);
    } else {
      setHouseholdMembersToCreate([...householdMembersToCreate, memberDetails]);
    }
    setMemberModalVisible(false); setCurrentMemberData(null); setEditingMemberIndex(null);
  };

  const removeMemberFromCreateList = (indexToRemove) => {
    setHouseholdMembersToCreate(householdMembersToCreate.filter((_, index) => index !== indexToRemove));
  };

  const saveResidentData = async () => {
    const mainRegistrantAgeNum = calculateAge(dateOfBirth);
    if (mainRegistrantAgeNum === null || mainRegistrantAgeNum < 16) {
      Alert.alert('Validation Error', 'Registrant must be at least 16 years old.'); return;
    }
    if (isVoter === 'Yes' && !precinctNumber && !voterProofBase64) {
      Alert.alert('Validation Error', "If registered voter, provide Voter's ID Number or upload Voter's ID."); return;
    }
    if (!firstName || !lastName || !gender || !dateOfBirth || !emailAddress || !password || !confirmPassword ) {
        Alert.alert('Error', 'Please fill all required fields marked with *.'); return;
    }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters long.'); return; }
    
    for (const member of householdMembersToCreate) {
        const memberAgeNum = calculateAge(member.date_of_birth);
        if (memberAgeNum === null) {
            Alert.alert('Validation Error', `Valid date of birth required for member: ${member.first_name}.`); return;
        }
        // Add more member specific validations if needed (e.g. age > 0)
    }

    setIsSaving(true);
    try {
      const apiPayload = {
        first_name: firstName, middle_name: middleName || null, last_name: lastName,
        sex: gender, date_of_birth: formatDateForAPI(dateOfBirth),
        civil_status: civilStatus, occupation_status: occupationStatus, place_of_birth: placeOfBirth,
        citizenship: citizenship, is_pwd: isPwd === 'Yes',
        address_house_number: houseNumber, address_street: street, address_subdivision_zone: addressSubdivisionZone,
        address_city_municipality: cityMunicipality,
        years_lived_current_address: yearsLivedCurrentAddress ? parseInt(yearsLivedCurrentAddress) : null,
        contact_number: contactNo, email: emailAddress.trim().toLowerCase(),
        password: password,
        is_registered_voter: isVoter === 'Yes',
        precinct_number: isVoter === 'Yes' ? precinctNumber : null,
        voter_registration_proof_base64: isVoter === 'Yes' ? voterProofBase64 : null,
        // voter_registration_proof_name: isVoter === 'Yes' ? voterProofName : null, // Name not usually needed by API
        residency_proof_base64: residencyProofBase64,
        // residency_proof_name: residencyProofName, // Name not usually needed by API
        is_household_head: isHouseholdHead === 'Yes',
        household_members_to_create: isHouseholdHead === 'Yes'
          ? householdMembersToCreate.map(mem => ({
              first_name: mem.first_name,
              middle_name: mem.middle_name || null,
              last_name: mem.last_name,
              sex: mem.sex,
              date_of_birth: formatDateForAPI(mem.date_of_birth),
              email: mem.email.trim().toLowerCase(),
              password: mem.password, // API will hash this
              occupation_status: mem.occupation_status,
              // Include other member-specific fields here if collected in modal
              // civil_status: mem.civil_status,
              // is_pwd: mem.is_pwd === 'Yes',
            }))
          : [],
      };

      const response = await apiRequest('POST', '/api/residents', apiPayload);

      if (response && (response.message || response.resident)) {
        Alert.alert('Success', response.message || 'Registration successful!');
        router.replace('/login');
      } else {
        Alert.alert('Error', response?.error || response?.message || 'Registration failed. Please check your input and try again.');
      }
    } catch (error) {
      console.error('Save Resident API error:', error.response ? error.response.data : error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const formFields = [
    { key: 'firstName', label: 'First Name', value: firstName, setter: setFirstName, type: 'textInput', required: true },
    { key: 'middleName', label: 'Middle Name', value: middleName, setter: setMiddleName, type: 'textInput', required: false },
    { key: 'lastName', label: 'Last Name', value: lastName, setter: setLastName, type: 'textInput', required: true },
    { key: 'gender', label: 'Sex', value: gender, setter: setGender, type: 'picker', options: [{label: 'Select Sex *', value: ''}, {label:'Male', value:'Male'}, {label:'Female', value:'Female'}], required: true },
    { key: 'dateOfBirth', label: 'Date of Birth', value: dateOfBirth, setter: showMainDatePicker, type: 'datePicker', required: true },
    { key: 'age', label: 'Age', value: age, type: 'textInput', editable: false },
    { key: 'civilStatus', label: 'Civil Status', value: civilStatus, setter: setCivilStatus, type: 'picker', options: [{label: 'Select Civil Status', value: ''}, {label:'Single', value:'Single'}, {label:'Married', value:'Married'}, {label:'Divorced', value:'Divorced'}, {label:'Widowed', value:'Widowed'}, {label:'Separated', value:'Separated'}] },
    { key: 'occupationStatus', label: 'Occupation Status', value: occupationStatus, setter: setOccupationStatus, type: 'picker', options: OCCUPATION_OPTIONS_CONFIG },
    { key: 'placeOfBirth', label: 'Place of Birth', value: placeOfBirth, setter: setPlaceOfBirth, type: 'textInput' },
    { key: 'citizenship', label: 'Citizenship', value: citizenship, setter: setCitizenship, type: 'textInput' },
    { key: 'isPwd', label: 'PWD?', value: isPwd, setter: setIsPwd, type: 'picker', options: [{label: 'No', value: 'No'}, {label:'Yes', value:'Yes'}] },
    { type: 'divider', label: 'Address Information'},
    { key: 'houseNumber', label: 'House Number', value: houseNumber, setter: setHouseNumber, type: 'textInput' },
    { key: 'street', label: 'Street', value: street, setter: setStreet, type: 'textInput' },
    { key: 'addressSubdivisionZone', label: 'Subdivision/Zone/Purok', value: addressSubdivisionZone, setter: setAddressSubdivisionZone, type: 'textInput' },
    { key: 'cityMunicipality', label: 'City/Municipality', value: cityMunicipality, setter: setCityMunicipality, type: 'textInput' },
    { key: 'yearsLivedCurrentAddress', label: 'Years at Current Address', value: yearsLivedCurrentAddress, setter: setYearsLivedCurrentAddress, type: 'textInput', keyboardType: 'numeric', maxLength: 3 },
    { key: 'residencyProof', label: 'Proof of Residency', value: residencyProofName, setter: () => pickDocumentFor('residency'), type: 'filePicker' },
    { type: 'divider', label: 'Contact & Credentials'},
    { key: 'contactNo', label: 'Contact No.', value: contactNo, setter: setContactNo, type: 'textInput', keyboardType: 'phone-pad', maxLength: 15 },
    { key: 'emailAddress', label: 'Email Address', value: emailAddress, setter: setEmailAddress, type: 'textInput', keyboardType: 'email-address', autoCapitalize: 'none', required: true },
    { key: 'password', label: 'Password', value: password, setter: setPassword, type: 'textInput', secureTextEntry: true, required: true },
    { key: 'confirmPassword', label: 'Confirm Password', value: confirmPassword, setter: setConfirmPassword, type: 'textInput', secureTextEntry: true, required: true },
    { type: 'divider', label: 'Voter Information'},
    { key: 'isVoter', label: 'Registered Voter?', value: isVoter, setter: setIsVoter, type: 'picker', options: [{label: 'No', value: 'No'}, {label:'Yes', value:'Yes'}] },
    { key: 'precinctNumber', label: "Voter's ID Number", value: precinctNumber, setter: setPrecinctNumber, type: 'textInput', conditionalRender: () => isVoter === 'Yes' },
    { key: 'voterProof', label: "Voter's ID Upload", value: voterProofName, setter: () => pickDocumentFor('voter'), type: 'filePicker', conditionalRender: () => isVoter === 'Yes' },
    { type: 'divider', label: 'Household Role'},
    { key: 'isHouseholdHead', label: 'Are you the Household Head?', value: isHouseholdHead, setter: setIsHouseholdHead, type: 'picker', options: [{label: 'No', value: 'No'}, {label:'Yes', value:'Yes'}] },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resident Registration</Text>
        <View style={{width: 24}} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          {formFields.map((field) => {
            if (field.type === 'divider') {
                return <Text key={field.label} style={styles.dividerText}>{field.label}</Text>;
            }
            if (field.conditionalRender && !field.conditionalRender()) return null;
            return (
            <View key={field.key} style={styles.fieldContainer}>
              <Text style={styles.label}>{field.label}{field.required && <Text style={styles.requiredAsterisk}>*</Text>}</Text>
              {field.type === 'textInput' && ( <TextInput placeholder={`Enter ${field.label.toLowerCase()}`} value={field.value} onChangeText={field.setter} keyboardType={field.keyboardType || 'default'} style={field.editable === false ? [styles.textInput, styles.textInputDisabled] : styles.textInput} editable={field.editable !== false} secureTextEntry={field.secureTextEntry} autoCapitalize={field.autoCapitalize || 'sentences'} maxLength={field.maxLength} /> )}
              {field.type === 'picker' && ( <View style={styles.pickerWrapper}><Picker selectedValue={field.value} onValueChange={(itemValue) => field.setter(itemValue)} style={styles.picker} prompt={field.label}>{field.options.map(opt => (<Picker.Item key={opt.value} label={opt.label} value={opt.value} />))}</Picker></View> )}
              {field.type === 'datePicker' && ( <TouchableOpacity onPress={field.setter} style={styles.datePickerButton}><Text style={styles.datePickerButtonText}>{dateOfBirth ? formatDateForDisplay(dateOfBirth) : 'Select Date *'}</Text></TouchableOpacity> )}
              {field.type === 'filePicker' && ( <View><TouchableOpacity onPress={field.setter} style={styles.filePickerButton}><Text style={styles.filePickerButtonText}>Choose File</Text></TouchableOpacity>{field.value ? (<Text style={styles.fileNameText}>Selected: {field.value}</Text>) : (<Text style={styles.fileNameText}>No file selected.</Text>)}</View> )}
            </View>
          )})}

          {isVoter === 'Yes' && (
            <View style={styles.fullWidthField}>
                {!precinctNumber && !voterProofName && ( <Text style={styles.validationMessage}>For registered voters: Please provide Voter's ID Number OR upload Voter's ID.</Text> )}
            </View>
          )}

          {isHouseholdHead === 'Yes' && (
            <View style={[styles.fullWidthField, styles.householdSection]}>
              <Text style={styles.sectionTitle}>Register Household Members</Text>
              {householdMembersToCreate.map((member, index) => (
                <View key={index} style={styles.memberCard}>
                  <View style={styles.memberHeader}><Text style={styles.memberTitle}>{member.first_name} {member.last_name || `Member ${index + 1}`}</Text><View style={{flexDirection: 'row'}}><TouchableOpacity onPress={() => openMemberModal(member, index)} style={{marginRight: 15}}><Ionicons name="pencil-outline" size={22} color="#0F00D7" /></TouchableOpacity><TouchableOpacity onPress={() => removeMemberFromCreateList(index)}><Ionicons name="trash-bin-outline" size={22} color="#D32F2F" /></TouchableOpacity></View></View>
                  <Text style={styles.memberDetailText}>Email: {member.email}</Text>
                  <Text style={styles.memberDetailText}>DOB: {member.date_of_birth ? formatDateForDisplay(member.date_of_birth) : 'Not set'}</Text>
                </View>
              ))}
              <TouchableOpacity onPress={() => openMemberModal()} style={styles.addMemberButton}><Ionicons name="add-circle-outline" size={22} color="white" style={{marginRight: 8}} /><Text style={styles.addMemberButtonText}>Add New Household Member</Text></TouchableOpacity>
            </View>
          )}

          <View style={styles.fullWidthFieldWithMargin}>
            <TouchableOpacity onPress={saveResidentData} style={styles.signUpButton} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.signUpButtonText}>Register Account</Text>}
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>Please ensure all information provided is accurate.</Text>
        </View>
      </ScrollView>

      <DateTimePickerModal isVisible={isDatePickerVisible} mode="date" onConfirm={handleConfirmMainDate} onCancel={hideMainDatePicker} date={dateOfBirth || new Date()} maximumDate={new Date()} />
      <HouseholdMemberModal isVisible={isMemberModalVisible} onClose={() => { setMemberModalVisible(false); setCurrentMemberData(null); setEditingMemberIndex(null); }} onSave={handleSaveMember} memberData={currentMemberData} isEditing={editingMemberIndex !== null} />
    </KeyboardAvoidingView>
  );
}

const HouseholdMemberModal = ({ isVisible, onClose, onSave, memberData, isEditing }) => {
  const [localMember, setLocalMember] = useState(null);
  const [isMemberDatePickerVisible, setMemberDatePickerVisibility] = useState(false);

  useEffect(() => {
    if (isVisible && memberData) { // Only update if visible and data is provided
      setLocalMember({
        ...memberData,
        date_of_birth: memberData.date_of_birth && !(memberData.date_of_birth instanceof Date)
            ? new Date(memberData.date_of_birth)
            : memberData.date_of_birth,
      });
    } else if (isVisible && !memberData) { // For adding new
        setLocalMember({
            first_name: '', last_name: '', middle_name: '', sex: '', date_of_birth: null,
            email: '', password: '', confirmPassword: '', occupation_status: '',
        });
    }
  }, [memberData, isVisible]);

  const handleChange = (key, value) => {
    setLocalMember(prev => ({ ...prev, [key]: value }));
  };

  const showMemberDatePicker = () => setMemberDatePickerVisibility(true);
  const hideMemberDatePicker = () => setMemberDatePickerVisibility(false);
  const handleConfirmMemberDate = (selectedDate) => {
    hideMemberDatePicker();
    if (selectedDate) handleChange('date_of_birth', selectedDate);
  };

  const formatDateForDisplayInModal = (date) => { /* Duplicated for modal, or make global util */
    if (!date) return 'Select Date of Birth *';
    if (!(date instanceof Date)) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return 'Select Date of Birth *';
        return parsedDate.toLocaleDateString('en-CA');
    }
    return date.toLocaleDateString('en-CA');
  };

  if (!localMember || !isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{isEditing ? 'Edit' : 'Add New'} Household Member</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: Platform.OS === 'ios' ? 450 : 400}}>
            <Text style={styles.modalLabel}>First Name <Text style={styles.requiredAsterisk}>*</Text></Text><TextInput style={styles.modalInput} placeholder="Member's First Name" value={localMember.first_name} onChangeText={val => handleChange('first_name', val)} />
            <Text style={styles.modalLabel}>Middle Name</Text><TextInput style={styles.modalInput} placeholder="Member's Middle Name" value={localMember.middle_name} onChangeText={val => handleChange('middle_name', val)} />
            <Text style={styles.modalLabel}>Last Name <Text style={styles.requiredAsterisk}>*</Text></Text><TextInput style={styles.modalInput} placeholder="Member's Last Name" value={localMember.last_name} onChangeText={val => handleChange('last_name', val)} />
            <Text style={styles.modalLabel}>Sex <Text style={styles.requiredAsterisk}>*</Text></Text><View style={styles.pickerWrapperSmall}><Picker selectedValue={localMember.sex} onValueChange={val => handleChange('sex', val)}><Picker.Item label="Select Sex" value="" /><Picker.Item label="Male" value="Male" /><Picker.Item label="Female" value="Female" /></Picker></View>
            <Text style={styles.modalLabel}>Date of Birth <Text style={styles.requiredAsterisk}>*</Text></Text><TouchableOpacity onPress={showMemberDatePicker} style={styles.datePickerButtonModal}><Text style={styles.datePickerButtonText}>{formatDateForDisplayInModal(localMember.date_of_birth)}</Text></TouchableOpacity>
            <Text style={styles.modalLabel}>Email Address <Text style={styles.requiredAsterisk}>*</Text></Text><TextInput style={styles.modalInput} placeholder="Member's Email" value={localMember.email} onChangeText={val => handleChange('email', val)} keyboardType="email-address" autoCapitalize="none" />
            <Text style={styles.modalLabel}>Password <Text style={styles.requiredAsterisk}>*</Text></Text><TextInput style={styles.modalInput} placeholder="Member's Password (min. 6 chars)" value={localMember.password} onChangeText={val => handleChange('password', val)} secureTextEntry />
            <Text style={styles.modalLabel}>Confirm Password <Text style={styles.requiredAsterisk}>*</Text></Text><TextInput style={styles.modalInput} placeholder="Confirm Member's Password" value={localMember.confirmPassword} onChangeText={val => handleChange('confirmPassword', val)} secureTextEntry />
            <Text style={styles.modalLabel}>Occupation Status</Text><View style={styles.pickerWrapperSmall}><Picker selectedValue={localMember.occupation_status} onValueChange={val => handleChange('occupation_status', val)}><Picker.Item label="Select Occupation" value="" />{OCCUPATION_OPTIONS_CONFIG.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}</Picker></View>
            {/* Add more fields here as needed for the member */}
          </ScrollView>
          <View style={styles.modalActions}><TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={() => onSave(localMember)}><Text style={styles.modalButtonText}>Save Member</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.modalButtonClose]} onPress={onClose}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity></View>
        </View>
      </View>
      <DateTimePickerModal isVisible={isMemberDatePickerVisible} mode="date" onConfirm={handleConfirmMemberDate} onCancel={hideMemberDatePicker} date={localMember.date_of_birth || new Date()} maximumDate={new Date()} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  requiredAsterisk: { color: 'red' },
  header: { paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F00D7' },
  headerIcon: { width: 24, height: 24, resizeMode: 'contain', tintColor: 'white' }, // Not used, using Ionicons
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  scrollView: { backgroundColor: '#F4F6F8', flex: 1 }, // Changed background
  formContainer: { paddingHorizontal: 20, paddingTop: 20 },
  fieldContainer: { marginBottom: 18 }, // Consistent margin
  fullWidthField: { width: '100%', marginBottom: 18 },
  label: { color: '#424242', fontSize: 14, marginBottom: 8, fontWeight: '600' }, // Bolder label
  textInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, fontSize: 15, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, color: '#212121', backgroundColor: 'white' },
  textInputDisabled: { backgroundColor: '#EEEEEE', color: '#757575' },
  pickerWrapper: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, backgroundColor: 'white' },
  picker: { height: 50, width: '100%', color: '#212121' }, // Standard picker height
  datePickerButton: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 14, height: 50 },
  datePickerButtonText: { fontSize: 15, color: '#212121' },
  filePickerButton: { backgroundColor: '#0F00D7', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  filePickerButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  fileNameText: { fontSize: 13, color: '#424242', marginTop: 6, fontStyle: 'italic' },
  validationMessage: { color: '#D32F2F', fontSize: 12, marginTop: 5, marginBottom: 10 },
  dividerText: { fontSize: 16, fontWeight: 'bold', color: '#0F00D7', marginTop: 25, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 5 },
  // Household Section
  householdSection: { marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderColor: '#E0E0E0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#0F00D7', textAlign: 'center' },
  addMemberButton: { flexDirection: 'row', backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 2 },
  addMemberButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  memberCard: { backgroundColor: 'white', borderRadius: 8, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0', elevation: 1 },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  memberTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
  memberDetailText: { fontSize: 14, color: '#555', marginBottom: 4 },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { width: '100%', maxHeight: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#0F00D7' },
  modalLabel: { color: '#424242', fontSize: 13, marginBottom: 5, fontWeight: '500' },
  modalInput: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 15, backgroundColor: '#F9F9F9'},
  pickerWrapperSmall: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, marginBottom: 12, backgroundColor: '#F9F9F9' },
  datePickerButtonModal: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, paddingVertical: 12, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 25, borderTopWidth: 1, paddingTop: 15, borderColor: '#EEEEEE'},
  modalButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 25, minWidth: 120, alignItems: 'center' },
  modalButtonSave: { backgroundColor: '#0F00D7' },
  modalButtonClose: { backgroundColor: '#757575' },
  modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  // Submit Button Area
  fullWidthFieldWithMargin: { width: '100%', marginTop: 30, paddingHorizontal: 5 },
  signUpButton: { width: '100%', backgroundColor: '#0F00D7', paddingVertical: 16, borderRadius: 8, alignItems: 'center', elevation: 3 },
  signUpButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  footerText: { fontSize: 13, textAlign: 'center', width: '100%', marginTop: 25, marginBottom: 40, color: '#666' },
});