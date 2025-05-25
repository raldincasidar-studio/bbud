import apiRequest from '@/plugins/axios'; // Ensure this path is correct
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react'; // Added useEffect
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Debounce utility
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

export default function Index() {
  const router = useRouter();

  // --- Personal Information States ---
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState(''); // Corresponds to 'sex'
  const [dateOfBirth, setDateOfBirth] = useState(null); // Date object or null
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [age, setAge] = useState(''); // Will be string from input, parse to int for API
  const [civilStatus, setCivilStatus] = useState('');
  const [occupationStatus, setOccupationStatus] = useState(''); // New schema: occupation_status
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [isPwd, setIsPwd] = useState('No'); // Default 'No', send boolean to API

  // --- Address Information States ---
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [addressSubdivisionZone, setAddressSubdivisionZone] = useState(''); // Replaces old subdivision, block, lot
  const [cityMunicipality, setCityMunicipality] = useState('Manila City'); // Default or make it editable
  const [yearsLivedCurrentAddress, setYearsLivedCurrentAddress] = useState(''); // Will be string, parse to int

  // --- Contact Information States ---
  const [contactNo, setContactNo] = useState('');
  const [emailAddress, setEmailAddress] = useState('');

  // --- Voter Information States ---
  const [isVoter, setIsVoter] = useState('No'); // Default 'No', send boolean to API
  const [precinctNumber, setPrecinctNumber] = useState('');
  const [voterProofFile, setVoterProofFile] = useState(null); // For the file object
  const [voterProofBase64, setVoterProofBase64] = useState('');
  const [voterProofName, setVoterProofName] = useState('');

  // --- Proof of Residency States ---
  const [residencyProofFile, setResidencyProofFile] = useState(null); // For the file object
  const [residencyProofBase64, setResidencyProofBase64] = useState('');
  const [residencyProofName, setResidencyProofName] = useState('');


  // --- Household Information States ---
  const [isHouseholdHead, setIsHouseholdHead] = useState('No'); // Default 'No', send boolean to API
  const [householdMemberList, setHouseholdMemberList] = useState([]); // Stores {id, name, gender} objects

  // --- Search Specific State (for eligible household members) ---
  const [householdMemberSearchQuery, setHouseholdMemberSearchQuery] = useState('');
  const [eligibleMemberSearchResults, setEligibleMemberSearchResults] = useState([]);
  const [isLoadingEligibleMembers, setIsLoadingEligibleMembers] = useState(false);
  const [showEligibleMemberResults, setShowEligibleMemberResults] = useState(false);


  const [isSaving, setIsSaving] = useState(false); // For the main save button

  // --- Date Picker Logic ---
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };
  const showDatepickerMode = () => setShowDatePicker(true);
  const formatDateForDisplay = (date) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD for display, easily parsable
  };
  const formatDateForAPI = (date) => {
    if (!date) return null;
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };


  // --- File Picker Logic (Generic) ---
  const pickDocumentFor = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.name) {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mimeType = asset.mimeType || (asset.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'); // Basic MIME type inference
          const base64WithPrefix = `data:${mimeType};base64,${base64}`;


          if (type === 'residency') {
            setResidencyProofFile(asset); // Store the asset if needed for more info
            setResidencyProofName(asset.name);
            setResidencyProofBase64(base64WithPrefix);
          } else if (type === 'voter') {
            setVoterProofFile(asset);
            setVoterProofName(asset.name);
            setVoterProofBase64(base64WithPrefix);
          }
          Alert.alert('Success', 'File selected: ' + asset.name);
        } else {
          Alert.alert('Error', 'Failed to get file details.');
        }
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'An error occurred while picking the document.');
    }
  };

  // --- Save Resident Logic (formerly signUp) ---
  const saveResidentData = async () => {
    // --- Basic Validation ---
    if (!firstName || !lastName || !gender || !dateOfBirth || !civilStatus || !occupationStatus || !placeOfBirth || !citizenship || !houseNumber || !street || !addressSubdivisionZone || !contactNo || !emailAddress) {
      Alert.alert('Error', 'Please fill in all required personal and address fields.');
      return;
    }
    if (isVoter === 'Yes' && !precinctNumber) {
        Alert.alert('Error', 'Precinct number is required if you are a registered voter.');
        return;
    }
    // Add more specific validations as needed

    setIsSaving(true);
    try {
      const apiPayload = {
        // Personal Info
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        sex: gender,
        age: age ? parseInt(age) : null, // Parse age
        date_of_birth: formatDateForAPI(dateOfBirth),
        civil_status: civilStatus,
        occupation_status: occupationStatus,
        place_of_birth: placeOfBirth,
        citizenship: citizenship,
        is_pwd: isPwd === 'Yes',

        // Address Info
        address_house_number: houseNumber,
        address_street: street,
        address_subdivision_zone: addressSubdivisionZone,
        address_city_municipality: cityMunicipality,
        years_lived_current_address: yearsLivedCurrentAddress ? parseInt(yearsLivedCurrentAddress) : null,

        // Contact Info
        contact_number: contactNo,
        email: emailAddress,

        // Voter Info
        is_registered_voter: isVoter === 'Yes',
        precinct_number: isVoter === 'Yes' ? precinctNumber : null,
        voter_registration_proof_base64: isVoter === 'Yes' ? voterProofBase64 : null,
        voter_registration_proof_name: isVoter === 'Yes' ? voterProofName : null, // Optional for backend

        // Proofs
        residency_proof_base64: residencyProofBase64,
        residency_proof_name: residencyProofName, // Optional for backend

        // Household Info
        is_household_head: isHouseholdHead === 'Yes',
        household_member_ids: isHouseholdHead === 'Yes' ? householdMemberList.map(member => member.id) : [],
      };

      console.log("Save Resident Payload:", JSON.stringify(apiPayload, null, 2)); // Log payload for debugging

      const response = await apiRequest('POST', '/api/residents', apiPayload);

      if (response && (response.message || response.residentId || response.resident)) { // Adjust based on actual success indicators
        Alert.alert('Success', response.message || 'Resident data saved successfully!');
        // Optionally save some user data to AsyncStorage if it's a self-registration


        // await AsyncStorage.setItem('userData', JSON.stringify({ /* relevant user data */ }));
        router.push('/portal'); // Navigate to residents list or dashboard
      } else {
        Alert.alert('Error', response?.error || response?.message || 'Something went wrong while saving resident data.');
      }
    } catch (error) {
      console.error('Save Resident API error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };


  // --- Search Eligible Household Members Logic ---
  const triggerEligibleMemberSearch = async (keyword) => {
    const query = keyword?.trim();
    if (!query || query.length < 2) {
      setEligibleMemberSearchResults([]);
      setShowEligibleMemberResults(false);
      return;
    }
    setIsLoadingEligibleMembers(true);
    setShowEligibleMemberResults(true);
    try {
      const response = await apiRequest('GET', `/api/residents/eligible-for-household-search?searchKey=${encodeURIComponent(query)}`);
      if (response && response.searchResults) {
        setEligibleMemberSearchResults(response.searchResults.map(r => ({
            ...r,
            // Create a display name (API returns first_name, last_name etc.)
            displayName: `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim()
        })));
      } else {
        setEligibleMemberSearchResults([]);
      }
    } catch (error) {
      console.error('Eligible Member Search API error:', error);
      setEligibleMemberSearchResults([]);
      Alert.alert('Error', 'Error searching for eligible members.');
    } finally {
      setIsLoadingEligibleMembers(false);
    }
  };

  const debouncedEligibleMemberSearch = useCallback(debounce(triggerEligibleMemberSearch, 500), []);

  const handleHouseholdMemberSearchChange = (text) => {
    setHouseholdMemberSearchQuery(text);
    if (text.trim() === "") {
      setEligibleMemberSearchResults([]);
      setShowEligibleMemberResults(false);
    } else {
      debouncedEligibleMemberSearch(text);
    }
  };

  const selectEligibleMember = (member) => {
    if (!householdMemberList.find(m => m.id === member._id)) {
      setHouseholdMemberList([...householdMemberList, {
          id: member._id,
          name: member.displayName, // Use the mapped displayName
          gender: member.sex // Assuming API returns 'sex'
      }]);
    } else {
        Alert.alert("Info", "Member already added to the list.");
    }
    setHouseholdMemberSearchQuery('');
    setEligibleMemberSearchResults([]);
    setShowEligibleMemberResults(false);
  };

  const removeHouseholdMember = (memberIdToRemove) => {
    setHouseholdMemberList(householdMemberList.filter(member => member.id !== memberIdToRemove));
  };


  // --- Form Fields Configuration ---
  const formFields = [
    // Personal Info
    { key: 'firstName', label: 'First Name', value: firstName, setter: setFirstName, type: 'textInput' },
    { key: 'middleName', label: 'Middle Name', value: middleName, setter: setMiddleName, type: 'textInput', required: false },
    { key: 'lastName', label: 'Last Name', value: lastName, setter: setLastName, type: 'textInput' },
    { key: 'gender', label: 'Sex', value: gender, setter: setGender, type: 'picker', options: [{label: 'Select Sex', value: ''}, {label:'Male', value:'Male'}, {label:'Female', value:'Female'}, {label:'Other', value:'Other'}] },
    { key: 'dateOfBirth', label: 'Date of Birth', value: dateOfBirth, setter: showDatepickerMode, type: 'datePicker' },
    { key: 'age', label: 'Age', value: age, setter: setAge, type: 'textInput', keyboardType: 'numeric', maxLength: 3 },
    { key: 'civilStatus', label: 'Civil Status', value: civilStatus, setter: setCivilStatus, type: 'picker', options: [{label: 'Select Civil Status', value: ''}, {label:'Single', value:'Single'}, {label:'Married', value:'Married'}, {label:'Divorced', value:'Divorced'}, {label:'Widowed', value:'Widowed'}, {label:'Separated', value:'Separated'}] },
    { key: 'occupationStatus', label: 'Occupation Status', value: occupationStatus, setter: setOccupationStatus, type: 'picker', options: [{label: 'Select Occupation', value: ''}, {label:'Employed', value:'Employed'}, {label:'Unemployed', value:'Unemployed'}, {label:'Student', value:'Student'}, {label:'Retired', value:'Retired'}, {label:'Other', value:'Other'}]},
    { key: 'placeOfBirth', label: 'Place of Birth', value: placeOfBirth, setter: setPlaceOfBirth, type: 'textInput' },
    { key: 'citizenship', label: 'Citizenship', value: citizenship, setter: setCitizenship, type: 'textInput' },
    { key: 'isPwd', label: 'Person with Disability (PWD)?', value: isPwd, setter: setIsPwd, type: 'picker', options: [{label: 'Select an option', value: 'No'}, {label:'Yes', value:'Yes'}, {label:'No', value:'No'}] },
    // Address Info
    { key: 'houseNumber', label: 'House Number', value: houseNumber, setter: setHouseNumber, type: 'textInput' },
    { key: 'street', label: 'Street', value: street, setter: setStreet, type: 'textInput' },
    { key: 'addressSubdivisionZone', label: 'Subdivision/Zone/Sitio/Purok', value: addressSubdivisionZone, setter: setAddressSubdivisionZone, type: 'textInput' },
    { key: 'cityMunicipality', label: 'City/Municipality', value: cityMunicipality, setter: setCityMunicipality, type: 'textInput' }, // Make editable or keep default
    { key: 'yearsLivedCurrentAddress', label: 'Years Lived (Current Address)', value: yearsLivedCurrentAddress, setter: setYearsLivedCurrentAddress, type: 'textInput', keyboardType: 'numeric', maxLength: 3 },
    // Contact Info
    { key: 'contactNo', label: 'Contact No.', value: contactNo, setter: setContactNo, type: 'textInput', keyboardType: 'phone-pad', maxLength: 15 },
    { key: 'emailAddress', label: 'Email Address', value: emailAddress, setter: setEmailAddress, type: 'textInput', keyboardType: 'email-address' },
    // Proofs
    { key: 'residencyProof', label: 'Proof of Residency', value: residencyProofName, setter: () => pickDocumentFor('residency'), type: 'filePicker' },
    // Voter Info
    { key: 'isVoter', label: 'Registered Voter?', value: isVoter, setter: setIsVoter, type: 'picker', options: [{label: 'Are you a voter?', value: 'No'}, {label:'Yes', value:'Yes'}, {label:'No', value:'No'}] },
    { key: 'precinctNumber', label: 'Precinct Number', value: precinctNumber, setter: setPrecinctNumber, type: 'textInput', conditionalRender: () => isVoter === 'Yes' },
    { key: 'voterProof', label: 'Proof of Voter\'s Registration', value: voterProofName, setter: () => pickDocumentFor('voter'), type: 'filePicker', conditionalRender: () => isVoter === 'Yes' },
    // Household Info
    { key: 'isHouseholdHead', label: 'Are you the Household Head?', value: isHouseholdHead, setter: setIsHouseholdHead, type: 'picker', options: [{label: 'Select an option', value: 'No'}, {label:'Yes', value:'Yes'}, {label:'No', value:'No'}] },
  ];


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/')}>
            <Image source={require('@/assets/images/back-white.png')} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Resident</Text>
        <View style={{width: 20}} /> {/* Spacer */}
      </View>
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {formFields.map((field) => {
            if (field.conditionalRender && !field.conditionalRender()) {
                return null;
            }
            return (
            <View key={field.key} style={[styles.fieldContainer, field.fullWidth && styles.fullWidthField]}>
              <Text style={styles.label}>{field.label}{field.required !== false && <Text style={{color: 'red'}}>*</Text>}</Text>
              {field.type === 'textInput' && (
                <TextInput
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.keyboardType || 'default'}
                  style={styles.textInput}
                  multiline={field.multiline}
                  numberOfLines={field.numberOfLines}
                  maxLength={field.maxLength}
                />
              )}
              {field.type === 'picker' && (
                <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={field.value}
                      onValueChange={(itemValue) => field.setter(itemValue)}
                      style={styles.picker}
                    >
                    {field.options.map(opt => (
                        <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                    ))}
                    </Picker>
                </View>
              )}
              {field.type === 'datePicker' && (
                <>
                  <TouchableOpacity onPress={field.setter} style={styles.datePickerButton}>
                    <Text style={styles.datePickerButtonText}>
                      {formatDateForDisplay(dateOfBirth)}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dateOfBirth || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()} // Cannot be born in the future
                    />
                  )}
                </>
              )}
              {field.type === 'filePicker' && (
                <View>
                    <TouchableOpacity onPress={field.setter} style={styles.filePickerButton}>
                        <Text style={styles.filePickerButtonText}>Choose File</Text>
                    </TouchableOpacity>
                    {field.value ? ( // field.value here is the *name* of the file
                        <Text style={styles.fileNameText}>Selected: {field.value}</Text>
                    ) : (
                        <Text style={styles.fileNameText}>No file selected.</Text>
                    )}
                </View>
              )}
            </View>
          )})}

          {/* Household Member Search and List (Only if isHouseholdHead is 'Yes') */}
          {isHouseholdHead === 'Yes' && (
            <View style={styles.fullWidthField}>
                <Text style={styles.label}>Search & Add Household Members</Text>
                <TextInput
                    placeholder="Search for eligible members..."
                    value={householdMemberSearchQuery}
                    onChangeText={handleHouseholdMemberSearchChange}
                    style={styles.textInput}
                />
                {isLoadingEligibleMembers && <ActivityIndicator style={{marginTop: 10}}/>}
                {showEligibleMemberResults && eligibleMemberSearchResults.length > 0 && (
                    <View style={styles.searchResultsContainer}>
                        {eligibleMemberSearchResults.map((member) => (
                            <TouchableOpacity
                                key={member._id}
                                style={styles.searchResultItem}
                                onPress={() => selectEligibleMember(member)}
                            >
                                <Text>{member.displayName} (Sex: {member.sex})</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {showEligibleMemberResults && !isLoadingEligibleMembers && eligibleMemberSearchResults.length === 0 && householdMemberSearchQuery.length >=2 && (
                    <Text style={styles.noResultsText}>No eligible members found.</Text>
                )}

                {householdMemberList.length > 0 && (
                    <View style={styles.householdMemberListContainer}>
                        <Text style={styles.label}>Added Household Members:</Text>
                        {householdMemberList.map((member, index) => (
                            <View key={member.id || index} style={styles.householdMemberItem}>
                                <Text style={styles.householdMemberText}>{member.name} ({member.gender})</Text>
                                <TouchableOpacity onPress={() => removeHouseholdMember(member.id)}>
                                    <Text style={styles.removeMemberText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>
          )}


          <View style={styles.fullWidthFieldWithMargin}>
            <TouchableOpacity
              onPress={saveResidentData}
              style={styles.signUpButton}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.signUpButtonText}>Save Resident Data</Text>}
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>
            Ensure all information is accurate.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? 25 : 60,
    paddingBottom: 20, // Reduced bottom padding
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F00D7',
  },
  headerIcon: { width: 24, height: 24, resizeMode: 'contain', tintColor: 'white' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  scrollView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 20,
  },
  formContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 5, // Reduced horizontal padding for form container
  },
  fieldContainer: {
    width: '50%', // Each field takes half width
    padding: 5,    // Reduced padding around each field
  },
  fullWidthField: {
    width: '100%',
    padding: 5,
  },
  label: { color: 'black', fontSize: 14, marginBottom: 6, fontWeight: '500' },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD', // Softer border
    borderRadius: 8,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8, // Adjust for platform
    color: 'black',
    backgroundColor: '#F9F9F9', // Slightly off-white
  },
  pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#F9F9F9' },
  picker: { height: Platform.OS === 'ios' ? undefined : 48, color: 'black' }, // iOS height is intrinsic
  datePickerButton: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    paddingVertical: 12, backgroundColor: '#F9F9F9',
    justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 12, height: 48,
  },
  datePickerButtonText: { fontSize: 15, color: 'black' },
  filePickerButton: {
    backgroundColor: '#5E76FF', paddingVertical: 10, paddingHorizontal: 15,
    borderRadius: 8, alignItems: 'center', marginBottom: 8,
  },
  filePickerButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  fileNameText: { fontSize: 13, color: '#555', marginTop: 3, paddingLeft: 2 },
  searchResultsContainer: {
    marginTop: 8,
    borderColor: '#DDD', borderWidth: 1, borderRadius: 8,
    maxHeight: 150, // Limit height
  },
  searchResultItem: { padding: 10, borderBottomWidth: 1, borderColor: '#EEE' },
  noResultsText: { textAlign: 'center', color: '#777', paddingVertical: 10},
  householdMemberListContainer: { marginTop: 15, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 10 },
  householdMemberItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F5F5F5',
  },
  householdMemberText: { flex: 1, fontSize: 14 },
  removeMemberText: { color: 'red', fontSize: 13, paddingHorizontal: 8 },
  fullWidthFieldWithMargin: { paddingHorizontal: 5, width: '100%', marginTop: 20 },
  signUpButton: {
    width: '100%', backgroundColor: '#5E76FF', paddingVertical: 14,
    borderRadius: 8, alignItems: 'center',
  },
  signUpButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footerText: { fontSize: 14, textAlign: 'center', width: '100%', marginTop: 25, marginBottom: 40, color: '#666' },
});