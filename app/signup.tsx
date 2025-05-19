import apiRequest from '@/plugins/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
// Import useEffect for debouncing
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Import new components
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Debounce utility (simple version)
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

  // ... (all your existing state variables for the form: firstName, lastName, etc.)
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [civilStatus, setCivilStatus] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [block, setBlock] = useState('');
  const [lot, setLot] = useState('');
  const [yearLived, setYearLived] = useState('');
  const [occupation, setOccupation] = useState('');
  const [isVoter, setIsVoter] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [proofOfResidency, setProofOfResidency] = useState('');
  const [proofOfResidencyName, setProofOfResidencyName] = useState('');
  const [isHouseholdHead, setIsHouseholdHead] = useState('');
  const [householdList, setHouseholdList] = useState([]); // This state was missing in your formFields but used in signUp

  // --- Search Specific State ---
  const [searchQuery, setSearchQuery] = useState(''); // This will control the TextInput value
  const [searchResults, setSearchResults] = useState<any[]>([]); // Ensure it's an array, added type
  const [isSearching, setIsSearching] = useState(false); // For loading indicator
  const [showSearchResults, setShowSearchResults] = useState(false); // To control visibility of dropdown


  // ... (handleDateChange, showDatepickerMode, pickDocument, formatDate are fine)
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const showDatepickerMode = () => {
    setShowDatePicker(true);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.name) {
            setProofOfResidencyName(asset.name);
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            setProofOfResidency(base64);
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
  
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const signUp = async () => {
    // --- In your signUp payload, you had hardcoded proofOfResidency: '' ---
    // --- Make sure you are sending the actual base64 string: proofOfResidency ---
    // --- Also, your field names in payload vs. backend (dateOfBirth vs date_of_birth) need to match ---
    const formattedDateOfBirth = dateOfBirth ? formatDate(dateOfBirth) : '';

    // Validation logic (seems okay, but ensure it covers all required fields correctly)
    if (!firstName || (!middleName && middleName !== '') || !lastName || !gender || !formattedDateOfBirth || !civilStatus || !subdivision || !block || !lot || !yearLived || !occupation || !isVoter || !contactNo || !emailAddress || !proofOfResidencyName || !isHouseholdHead || (isHouseholdHead === 'No' && !householdList) ) {
      let errorMessage = 'Please fill in all required fields.';
      if (isHouseholdHead === 'Yes' && !householdList?.length) {
          errorMessage = "Household List is required if you are the household head."
      } else if (!proofOfResidencyName) { // Check name, as base64 might be large
          errorMessage = "Please upload Proof of Residency."
      } else if (!formattedDateOfBirth) {
          errorMessage = "Please select your Date of Birth."
      }
      Alert.alert('Error', errorMessage);
      return;
    }

    const fieldsToValidate = [
      { field: 'First Name', value: firstName, format: /^[a-zA-Z\s.'-]+$/ },
      // ... your other validations
      { field: 'Is Household Head', value: isHouseholdHead, format: /^(Yes|No)$/ },
    ];
    if (isHouseholdHead === 'Yes') {
        fieldsToValidate.push({ field: 'Household List', value: householdList, format: /.+/ });
    }
    const invalidFields = fieldsToValidate.filter(({ value, format }) => value && !format.test(value)); // Check if value exists before testing
    if (invalidFields.length > 0) {
      Alert.alert('Error', `Invalid format or value for: ${invalidFields.map(({ field }) => field).join(', ')}`);
      return;
    }

    try {
        setIsSearching(true); // Indicate loading for signup too, if you like
        const apiPayload = {
            firstName: firstName,
            middleName: middleName,
            lastName: lastName,
            gender,
            dateOfBirth: formattedDateOfBirth, // Ensure backend expects this name
            civilStatus: civilStatus,
            subdivision,
            block,
            lot,
            yearLived: yearLived,
            occupation,
            isVoter: isVoter,
            contactNo: contactNo, // Ensure backend expects this name
            emailAddress: emailAddress,
            proofOfResidency: proofOfResidency, // Send the base64 string
            proofOfResidencyName: proofOfResidencyName,
            isHouseholdHead: isHouseholdHead,
            householdList: householdList?.map(({ id }) => id) || [],
            profile: 'N/A',
        };
        console.log("Signup Payload:", apiPayload);
        const response = await apiRequest('POST', '/api/residents', apiPayload); // Make sure path is /api/residents or /api/register

        setIsSearching(false);
        console.log("Signup Response:", response);
        
        // Adjust success/error check based on your ACTUAL API response structure
        if (response) { // More flexible check
            
            await AsyncStorage.setItem('userData', JSON.stringify({
                firstName: firstName,
                middleName: middleName,
                lastName: lastName,
                contactNo: contactNo,
                emailAddress: emailAddress,
            }));
            Alert.alert('Success', response.message || 'Account created successfully!');
            router.push('/portal');
        } else {
            Alert.alert('Error', response?.message || response?.error || 'Something went wrong during registration.');
        }
    } catch (error: any) {
        setIsSearching(false);
        console.error('Signup API error:', error);
        Alert.alert('Error', error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred.');
    }
  };

  // --- Search Functionality ---
  const triggerSearch = async () => {
    const keyword = searchQuery?.trim()
    if (keyword.trim().length < 2) { // Optional: minimum characters to search
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    setShowSearchResults(true); // Show dropdown while searching
    try {
      // Assuming apiRequest is already set up for GET requests correctly
      const response = await apiRequest('GET', `/api/residents/search?q=${encodeURIComponent(keyword)}`);
      if (response && response.residents) { // Check your API response structure
        setSearchResults(response.residents);
      } else {
        setSearchResults([]); // Clear if no results or bad response
        // Alert.alert('Info', 'No results found for your search.'); // Optional: provide feedback
      }
    } catch (error) {
      console.error('Search API error:', error);
      setSearchResults([]);
      Alert.alert('Error', 'An error occurred while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced version of triggerSearch
  const debouncedSearch = useCallback(debounce(triggerSearch, 500), []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text); // Update the input field's value immediately
    if (text.trim() === "") {
        setSearchResults([]);
        setShowSearchResults(false);
    } else {
        debouncedSearch(text); // Call the debounced API search
    }
  };

  const handleSearchResult = (result: any) => {
    console.log('yawa');
    Alert.alert('Success', `${result.name} has been added to the household list.`);
    setHouseholdList([...householdList, result]);
  };


  const handleSelectSearchResult = (result: any) => { // 'any' for now, define a type for your resident
    // This is where you decide what to do when a search result is clicked.
    // For this example, let's assume 'result' is an object with resident details.
    // We will populate the form fields with the selected resident's data.
    setFirstName(result.firstname || '');
    setMiddleName(result.middlename || '');
    setLastName(result.lastname || '');
    setGender(result.gender || '');
    // For dateOfBirth, you'll need to parse it if it's a string from API
    if (result.date_of_birth) {
        const dobDate = new Date(result.date_of_birth);
        if (!isNaN(dobDate.getTime())) { // Check if date is valid
            setDateOfBirth(dobDate);
        } else {
            setDateOfBirth(null);
        }
    } else {
        setDateOfBirth(null);
    }
    setCivilStatus(result.civil_status || '');
    setSubdivision(result.subdivision || '');
    setBlock(result.block || '');
    setLot(result.lot || '');
    setYearLived(result.year_lived ? String(result.year_lived) : '');
    setOccupation(result.occupation || '');
    setIsVoter(result.is_voter || '');
    setContactNo(result.contact_no || ''); // Ensure field names match API
    setEmailAddress(result.email_address || '');

    // Clear search results and hide dropdown
    setSearchQuery(result.firstname + ' ' + result.lastname); // Or just the name to show in search bar
    setShowSearchResults(false);
    setSearchResults([]);
  };


  const formFields = [
    { key: 'firstName', label: 'First Name', value: firstName, setter: setFirstName, type: 'textInput' },
    { key: 'middleName', label: 'Middle Name', value: middleName, setter: setMiddleName, type: 'textInput', required: false },
    { key: 'lastName', label: 'Last Name', value: lastName, setter: setLastName, type: 'textInput' },
    { key: 'gender', label: 'Gender', value: gender, setter: setGender, type: 'picker', options: [{label: 'Select Gender', value: ''}, {label:'Male', value:'Male'}, {label:'Female', value:'Female'}, {label:'Other', value:'Other'}] },
    { key: 'dateOfBirth', label: 'Date of Birth', value: dateOfBirth, setter: showDatepickerMode, type: 'datePicker' },
    { key: 'civilStatus', label: 'Civil Status', value: civilStatus, setter: setCivilStatus, type: 'picker', options: [{label: 'Select Civil Status', value: ''}, {label:'Single', value:'Single'}, {label:'Married', value:'Married'}, {label:'Divorced', value:'Divorced'}, {label:'Widowed', value:'Widowed'}, {label:'Separated', value:'Separated'}] },
    { key: 'subdivision', label: 'Subdivision/Village', value: subdivision, setter: setSubdivision, type: 'textInput' },
    { key: 'block', label: 'Block', value: block, setter: setBlock, type: 'textInput' },
    { key: 'lot', label: 'Lot', value: lot, setter: setLot, type: 'textInput' },
    { key: 'yearLived', label: 'Year Started Living Here', value: yearLived, setter: setYearLived, type: 'textInput', keyboardType: 'numeric', maxLength: 4 },
    { key: 'occupation', label: 'Occupation', value: occupation, setter: setOccupation, type: 'textInput' },
    { key: 'isVoter', label: 'Registered Voter?', value: isVoter, setter: setIsVoter, type: 'picker', options: [{label: 'Are you a voter?', value: ''}, {label:'Yes', value:'Yes'}, {label:'No', value:'No'}] },
    { key: 'contactNo', label: 'Contact No.', value: contactNo, setter: setContactNo, type: 'textInput', keyboardType: 'phone-pad', maxLength: 11 },
    { key: 'emailAddress', label: 'Email Address', value: emailAddress, setter: setEmailAddress, type: 'textInput', keyboardType: 'email-address' },
    { key: 'proofOfResidency', label: 'Proof of Residency', value: proofOfResidencyName, setter: pickDocument, type: 'filePicker' },
    { key: 'isHouseholdHead', label: 'Are you the Household Head?', value: isHouseholdHead, setter: setIsHouseholdHead, type: 'picker', options: [{label: 'Select an option', value: ''}, {label:'Yes', value:'Yes'}, {label:'No', value:'No'}] },
    // Added householdList to formFields to be rendered conditionally
    { key: 'searchQuery', label: 'Household Members (if not head)', value: searchQuery, setter: setSearchQuery, type: 'textInput', multiline: true, numberOfLines: 3, placeholder: 'Enter names, separated by comma', fullWidth: true, conditionalRender: () => isHouseholdHead === 'Yes',
      onKeyPress: (event) => {
        triggerSearch()
      } 
    },
  ];


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Image source={require('@/assets/images/back-white.png')} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Signup / Edit Resident</Text> {/* Changed title slightly */}
        <Image source={require('@/assets/images/back-white.png')} style={[styles.headerIcon, { opacity: 0 }]} />
      </View>
      <ScrollView 
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled" // Important for scrollview + textinput + touchable results
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
                  placeholder={field.placeholder || field.label}
                  value={field.value as string}
                  onChangeText={field.setter as (text: string) => void}
                  keyboardType={field.keyboardType as any || 'default'}
                  style={styles.textInput}
                  multiline={field.multiline}
                  onKeyPress={field.onKeyPress}
                  numberOfLines={field.numberOfLines}
                  maxLength={field.maxLength}
                />
              )}
              {field.type === 'picker' && (
                <View style={styles.pickerWrapper}>
                    <Picker
                    selectedValue={field.value}
                    onValueChange={(itemValue) => (field.setter as (value: string) => void)(itemValue as string)}
                    style={styles.picker}
                    >
                    {(field.options as Array<{label: string, value: string}>).map(opt => (
                        <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                    ))}
                    </Picker>
                </View>
              )}
              {field.type === 'datePicker' && (
                <>
                  <TouchableOpacity onPress={field.setter as () => void} style={styles.datePickerButton}>
                    <Text style={styles.datePickerButtonText}>
                      {dateOfBirth ? formatDate(dateOfBirth) : 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dateOfBirth || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </>
              )}
              {field.type === 'filePicker' && (
                <View>
                    <TouchableOpacity onPress={field.setter as () => void} style={styles.filePickerButton}>
                        <Text style={styles.filePickerButtonText}>Choose File</Text>
                    </TouchableOpacity>
                    {proofOfResidencyName ? (
                        <Text style={styles.fileNameText}>Selected: {proofOfResidencyName}</Text>
                    ) : (
                        <Text style={styles.fileNameText}>No file selected.</Text>
                    )}
                </View>
              )}
            </View>
          )})}
          
          {/* Removed the previous hardcoded search result mapping, handled above */}

          {/* Example Household Members display IF the head of household is editing their own data */}
          {/* This part needs more logic if it's for managing actual members */}
          
          {isHouseholdHead === 'Yes' && (
            <View style={{width: '100%', padding: 10, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 15}}>
              <Text style={[styles.label, {marginBottom: 10}]}>Search Result</Text>
              {searchResults.map((data, index) => ( // Example
                <TouchableOpacity key={index} onPress={() => handleSearchResult(data)} style={{paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#F5F5F5'}}>
                  <Text style={{flex: 1}}>{data.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {isHouseholdHead === 'Yes' && (
            <View style={{width: '100%', padding: 10, marginTop: 15, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 15}}>
              <Text style={[styles.label, {marginBottom: 10}]}>Household Members</Text>
              {householdList.map((name, index) => ( // Example
                <View key={index} style={{paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#F5F5F5'}}>
                  <Text style={{flex: 1}}>{name.name}</Text>
                  <TouchableOpacity style={{paddingHorizontal: 10}} onPress={() => setHouseholdList(householdList.filter((member) => member.id !== name.id))}>
                    <Text style={{color: 'red'}}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.fullWidthFieldWithMargin}>
            <TouchableOpacity
              onPress={signUp} // This will now act as "Save" or "Update" if fields are populated
              style={styles.signUpButton}
              disabled={isSearching} // Disable button while an API call is in progress
            >
              {isSearching ? <ActivityIndicator color="white" /> : <Text style={styles.signUpButtonText}>Save Resident Data</Text>}
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>
            Can't Signup? Contact Administrator
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ... (Header, ScrollView, FormContainer, FieldContainer, FullWidthField styles are mostly fine)
  header: {
    paddingTop: Platform.OS === 'android' ? 25 : 60, // Adjust for status bar
    paddingBottom: 40,
    paddingLeft: 20,
    paddingRight: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F00D7',
  },
  headerIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain', // Changed from objectFit
  },
  headerTitle: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
   scrollView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20, 
    paddingTop: 10, // Reduced paddingTop slightly
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  fieldContainer: {
    width: '50%',
    padding: 10,
  },
  fullWidthField: {
      width: '100%',
      paddingHorizontal: 10, // Ensure consistent padding for full-width search
  },
  label: {
    color: 'black',
    fontSize: 15,
    marginBottom: 8,
    fontWeight: '500'
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: 'black',
    backgroundColor: '#F8F8F8'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
  },
  picker: {
    height: 44, // Adjusted height for consistency
    color: 'black',
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingVertical: 12, // Ensure consistent padding
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    height: 46, // Match TextInput approx height
  },
  datePickerButtonText: {
    fontSize: 16,
    color: 'black',
  },
  filePickerButton: {
    backgroundColor: '#5E76FF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 5,
  },
  filePickerButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  fileNameText: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
    paddingLeft: 5,
  },
  // --- New Search Styles ---
  searchResultsContainer: {
    position: 'relative', // Or absolute if you want it to overlay
    // For absolute positioning:
    // position: 'absolute',
    // top: '100%', // Position below the search input
    // left: 10, right: 10, // Match formContainer padding
    // zIndex: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginTop: -1, // Overlap border slightly if not absolute
    maxHeight: 200, // Limit height and make it scrollable if needed
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  // --- End New Search Styles ---
  fullWidthFieldWithMargin: {
    paddingHorizontal: 10, // Use paddingHorizontal consistent with other fullWidthField
    width: '100%',
    marginTop: 20,
  },
  signUpButton: {
    width: '100%',
    backgroundColor: '#5E76FF',
    padding: 15,
    borderRadius: 99,
    marginTop: 10,
    minHeight: 50, // Ensure button has a decent tap area
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 15,
    textAlign: 'center',
    width: '100%',
    marginTop: 30,
    marginBottom: 50,
    color: '#555'
  },
});