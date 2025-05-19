import apiRequest from '@/plugins/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Import new components
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function Index() {
  const router = useRouter();

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
  const [proofOfResidency, setProofOfResidency] = useState(''); // Will store base64
  const [proofOfResidencyName, setProofOfResidencyName] = useState('');
  const [isHouseholdHead, setIsHouseholdHead] = useState('');
  const [householdList, setHouseholdList] = useState('');

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false); // Hide picker on iOS immediately
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
        type: ['image/*', 'application/pdf'], // Allow images and PDFs
        copyToCacheDirectory: true,
      });

      console.log(result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.name) {
            setProofOfResidencyName(asset.name);
            // Read file and convert to base64
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            setProofOfResidency(base64);
            Alert.alert('Success', 'File selected: ' + asset.name);
        } else {
            Alert.alert('Error', 'Failed to get file details.');
        }
      } else {
        // Alert.alert('Cancelled', 'File selection was cancelled.');
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
    const formattedDateOfBirth = dateOfBirth ? formatDate(dateOfBirth) : '';

    if (!firstName || !middleName || !lastName || !gender || !formattedDateOfBirth || !civilStatus || !subdivision || !block || !lot || !yearLived || !occupation || !isVoter || !contactNo || !emailAddress || !proofOfResidency || !proofOfResidencyName || !isHouseholdHead || (isHouseholdHead === 'No' && !householdList) ) {
      // Updated condition for householdList: required only if not head of household
      // This logic might need adjustment based on actual requirements for householdList
      let errorMessage = 'Please fill in all required fields';
      if (isHouseholdHead === 'No' && !householdList) {
          errorMessage = "Please fill in all required fields. Household List is required if you are not the household head."
      } else if (!proofOfResidency || !proofOfResidencyName) {
          errorMessage = "Please upload Proof of Residency."
      } else if (!formattedDateOfBirth) {
          errorMessage = "Please select your Date of Birth."
      }
      Alert.alert('Error', errorMessage);
      return;
    }

    const fieldsToValidate = [
      { field: 'First Name', value: firstName, format: /^[a-zA-Z\s.'-]+$/ },
      { field: 'Middle Name', value: middleName, format: /^[a-zA-Z\s.'-]*$/ }, // Allow empty or valid
      { field: 'Last Name', value: lastName, format: /^[a-zA-Z\s.'-]+$/ },
      { field: 'Gender', value: gender, format: /^(Male|Female|Other)$/ },
      { field: 'Date of Birth', value: formattedDateOfBirth, format: /^\d{4}-\d{2}-\d{2}$/ },
      { field: 'Civil Status', value: civilStatus, format: /^(Single|Married|Divorced|Widowed|Separated)$/ },
      { field: 'Year Lived (Starting Year)', value: yearLived, format: /^\d{4}$/ },
      { field: 'Occupation', value: occupation, format: /^[a-zA-Z0-9\s.,'-]+$/ },
      { field: 'Voter', value: isVoter, format: /^(Yes|No)$/ },
      { field: 'Contact No.', value: contactNo, format: /^(09\d{9}|\+639\d{9})$/ }, // Common PH mobile formats
      { field: 'Email Address', value: emailAddress, format: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
      { field: 'Is Household Head', value: isHouseholdHead, format: /^(Yes|No)$/ },
    ];
    
    // Conditionally add householdList to validation if user is not head
    if (isHouseholdHead === 'No') {
        fieldsToValidate.push({ field: 'Household List', value: householdList, format: /.+/ }); // Basic check: not empty
    }


    const invalidFields = fieldsToValidate.filter(({ value, format }) => !format.test(value));

    if (invalidFields.length > 0) {
      Alert.alert('Error', `Invalid format or value for the following fields: ${invalidFields.map(({ field }) => field).join(', ')}`);
      return;
    }

    try {
        const response = await apiRequest('POST', '/api/register', {
        firstname: firstName,
        middlename: middleName,
        lastname: lastName,
        gender,
        date_of_birth: formattedDateOfBirth,
        civil_status: civilStatus,
        subdivision,
        block,
        lot,
        year_lived: yearLived,
        occupation,
        is_voter: isVoter,
        contact: contactNo,
        email: emailAddress,
        proof_of_residency: proofOfResidency, // This is the base64 string
        proof_of_residency_name: proofOfResidencyName,
        is_household_head: isHouseholdHead,
        household_list: householdList,
        profile: 'N/A', // As per original
        });

        console.log(response);
        
        if (!response || !response.newUserData) { // Check for newUserData as per your original logic
            Alert.alert('Error', response?.message || 'Something went wrong during registration.');
            return;
        }

        await AsyncStorage.setItem('userData', JSON.stringify(response.newUserData));
        Alert.alert('Success', 'Account created successfully!');
        router.push('/portal');

    } catch (error: any) {
        console.error('Signup API error:', error);
        Alert.alert('Error', error.response?.data?.message || error.message || 'An unexpected error occurred.');
    }
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
    { key: 'contactNo', label: 'Contact No.', value: contactNo, setter: setContactNo, type: 'textInput', keyboardType: 'phone-pad', maxLength: 11 }, // Assuming 09xxxxxxxxx format
    { key: 'emailAddress', label: 'Email Address', value: emailAddress, setter: setEmailAddress, type: 'textInput', keyboardType: 'email-address' },
    { key: 'proofOfResidency', label: 'Proof of Residency', value: proofOfResidencyName, setter: pickDocument, type: 'filePicker' },
    { key: 'isHouseholdHead', label: 'Are you the Household Head?', value: isHouseholdHead, setter: setIsHouseholdHead, type: 'picker', options: [{label: 'Select an option', value: ''}, {label:'Yes', value:'Yes'}, {label:'No', value:'No'}] },
    { key: 'householdList', label: 'Household Members (if not head)', value: householdList, setter: setHouseholdList, type: 'textInput', multiline: true, numberOfLines: 3, placeholder: 'Enter names, separated by comma', fullWidth: true, conditionalRender: () => isHouseholdHead === 'No' },
  ];


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Image source={require('@/assets/images/back-white.png')} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Signup</Text>
        <Image source={require('@/assets/images/back-white.png')} style={[styles.headerIcon, { opacity: 0 }]} />
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {formFields.map((field) => {
            if (field.conditionalRender && !field.conditionalRender()) {
                return null; // Skip rendering if conditionalRender returns false
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
                      maximumDate={new Date()} // Users cannot be born in the future
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

          <View style={styles.fullWidthFieldWithMargin}>
            <TouchableOpacity
              onPress={signUp}
              style={styles.signUpButton}>
              <Text style={styles.signUpButtonText}>Sign Up</Text>
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
  header: {
    padding: 60,
    paddingLeft: 20,
    paddingRight: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F00D7',
  },
  headerIcon: {
    width: 20,
    height: 20,
    objectFit: 'contain',
  },
  headerTitle: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20, // For the curved top edge effect
    borderTopRightRadius: 20,
    marginTop: -20, // Pulls scrollview up to overlap slightly with header bottom for curve
    paddingTop: 20, // Space above the first form element
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10, // Padding for the sides of the form content
  },
  fieldContainer: {
    width: '50%', // Two columns
    padding: 10,
  },
  fullWidthField: {
      width: '100%',
  },
  fullWidthFieldWithMargin: {
    padding: 10, 
    width: '100%',
    marginTop: 20, // Add some margin before the button
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
    justifyContent: 'center', // Centers picker text on Android
  },
  picker: {
    height: 45, // Standardize height
    color: 'black',
     // fontSize: 16, // Not directly applicable, text style is native
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  signUpButton: {
    width: '100%',
    backgroundColor: '#5E76FF',
    padding: 15,
    borderRadius: 99,
    marginTop: 10, // Adjusted from 30
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
    marginBottom: 50, // Added more bottom margin for scroll
    color: '#555'
  },
});