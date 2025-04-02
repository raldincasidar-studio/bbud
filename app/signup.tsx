import apiRequest from '@/plugins/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const router = useRouter();
 
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [block, setBlock] = useState('');
  const [lot, setLot] = useState('');
  const [yearLived, setYearLived] = useState('');
  const [occupation, setOccupation] = useState('');
  const [voters, setVoters] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');



  const signUp = async () => {
    if (!firstName || !lastName || !gender || !dob || !email || !contactNo) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Invalid email format');
      return;
    }
    if (!/^[0-9]+$/.test(contactNo)) {
      Alert.alert('Error', 'Invalid contact number');
      return;
    }
 

    const response = await apiRequest('POST', '/api/register', {
      firstname: firstName,
      middlename: middleName,
      lastname: lastName,
      gender,
      date_of_birth: dob,
      civil_status: civilStatus,
      subdivision,
      block,
      lot,
      year_lived: yearLived,
      occupation,
      voters,
      contact: contactNo,
      email,
      password,
      profile: 'N/A',
    });

    console.log(response);
    
    // save response to local storage

    if (!response) {
      Alert.alert('Error', 'Something went wrong');
      return;
    }

    // save data to asyncstorage
    await AsyncStorage.setItem('userData', JSON.stringify(response.newUserData));

    Alert.alert('Success', 'Account created successfully!');
    router.push('/portal');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ 
        padding: 60,
        paddingLeft: 20,
        paddingRight: 20,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0F00D7' 
      }}>
        <TouchableOpacity onPress={() => router.back()}>
            <Image source={require('@/assets/images/back-white.png')} style={{ width: 20, height: 20, objectFit: 'contain' }} />
        </TouchableOpacity>
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>Signup</Text>
        <Image source={require('@/assets/images/back-white.png')} style={{ width: 20, height: 20, opacity: 0, objectFit: 'contain' }} />
      </View>
      <ScrollView style={{ backgroundColor: 'white', borderRadius: 20, marginTop: -40, paddingTop: 40, height: '100%' }}>
        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
          {[ 
            { label: 'First Name', state: firstName, setState: setFirstName },
            { label: 'Middle Name', state: middleName, setState: setMiddleName },
            { label: 'Last Name', state: lastName, setState: setLastName },
            { label: 'Gender', state: gender, setState: setGender },
            { label: 'Date of Birth', state: dob, setState: setDob },
            { label: 'Civil Status', state: civilStatus, setState: setCivilStatus },
            { label: 'Subdivision', state: subdivision, setState: setSubdivision },
            { label: 'Block', state: block, setState: setBlock },
            { label: 'Lot', state: lot, setState: setLot },
            { label: 'Year Lived', state: yearLived, setState: setYearLived },
            { label: 'Occupation', state: occupation, setState: setOccupation },
            { label: 'Voters', state: voters, setState: setVoters },
            { label: 'Contact No.', state: contactNo, setState: setContactNo },
            { label: 'Email Address', state: email, setState: setEmail },
            { label: 'Password', state: password, setState: setPassword, isPassword: true },
          ].map(({ label, state, setState }, index) => (
            <View key={index} style={{ width: '50%', padding: 10 }}>
              <Text style={{ color: 'black', fontSize: 16, marginBottom: 10 }}>{label}</Text>
              <TextInput
                secureTextEntry={label === 'Password'}
                placeholder={label}
                value={state}
                onChangeText={setState}
                keyboardType={label === 'Contact No.' ? 'phone-pad' : 'default'}
                style={{ borderWidth: 1, borderColor: 'grey', borderRadius: 10, fontSize: 18, padding: 12, color: 'black' }}
              />
            </View>
          ))}

          <View style={{ padding: 10, width: '100%' }}>
            <TouchableOpacity
              onPress={signUp}
              style={{ width: '100%', backgroundColor: '#5E76FF', padding: 15, borderRadius: 99, marginTop: 30 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 15, textAlign: 'center', width: '100%', marginTop: 30, marginBottom: 30 }}>
            Can't Signup? Contact Administrator
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
