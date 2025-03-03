// app/profile.js
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const RequestDocumentForm = () => {
    
    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [contactNumber, setContactNumber] = useState('');

    const submit = () => {
        if (firstName === '' || lastName === '' || dateOfBirth === '' || contactNumber === '') {
            Alert.alert('Form Error', 'You have empty fields in your form');
            return;
        }

        Alert.alert('Success', 'You have successfully submitted your form');
        router.push('/doc-status/1');
    };

    return (
        <ScrollView>
          
          {/* Navbar */}
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 30, width: '100%', paddingTop: 40 }}>
              <TouchableOpacity onPress={() => router.back()}>
                  <Image style={{ height: 20, width: 20, objectFit: 'contain' }} source={require('@/assets/images/back.png')} />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'center', margin: 20 }}>Event Information</Text>
              <TouchableOpacity>
                  <Image style={{ height: 25, width: 25, objectFit: 'contain' }} source={require('@/assets/images/home.png')} />
              </TouchableOpacity>
          </View>

          {/* Headers */}
          <View style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingBottom: 20, width: '100%' }}>
                <Image style={{ height: 50, width: 50, objectFit: 'contain' }} source={require('@/assets/images/business-permit.png')} />
              <Text style={{ fontSize: 25, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'center', color: '#000',margin: 20, marginBottom: 0 }}>Basketball League</Text>
              <Text style={{ fontSize: 18, lineHeight: 30, fontFamily: 'Poppins', fontWeight: 'normal', textAlign: 'center', color: '#000',margin: 20 }}>Join us on March 15, 2025, from 3:00 PM to 8:00 PM at the Barangay Sports Complex for an exciting tournament! Cheer for your teams, enjoy the opening ceremony, and witness thrilling matchups. Don’t miss out—support your barangay’s team!</Text>
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'center', color: '#000',margin: 20, marginTop: 20, }}>Registration Form</Text>
          </View>

            {/* Form */}
            <View style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
            }}>

                {/* Form Inputs */}
                <View style={{
                width: '50%',
                padding: 10,
                }}>
                    <Text
                        style={{
                        color: 'black',
                        fontSize: 16,
                        marginBottom: 10
                        }}
                    >
                        First Name
                    </Text>
                    <TextInput
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder='First Name'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                    />
                </View>

                {/* Form Inputs */}
                <View style={{
                width: '50%',
                padding: 10,
                }}>
                    <Text
                        style={{
                        color: 'black',
                        fontSize: 16,
                        marginBottom: 10
                        }}
                    >
                        Last Name
                    </Text>
                    <TextInput
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder='Last Name'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                    />
                </View>

                {/* Form Inputs */}
                <View style={{
                width: '50%',
                padding: 10,
                }}>
                    <Text
                        style={{
                        color: 'black',
                        fontSize: 16,
                        marginBottom: 10
                        }}
                    >
                        Date of Birth
                    </Text>
                    <TextInput
                        value={dateOfBirth}
                        onChangeText={setDateOfBirth}
                        placeholder='Date of Birth'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                    />
                </View>

                {/* Form Inputs */}
                <View style={{
                width: '50%',
                padding: 10,
                }}>
                    <Text
                        style={{
                        color: 'black',
                        fontSize: 16,
                        marginBottom: 10
                        }}
                    >
                        Contact Number
                    </Text>
                    <TextInput
                        value={contactNumber}
                        onChangeText={setContactNumber}
                        placeholder='Contact Number'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                    />
                </View>

                <View style={{
                padding: 10,
                width: "100%",
                }}>
                    <TouchableOpacity
                        onPress={submit}
                        style={{
                        width: '100%',
                        backgroundColor: '#5E76FF',
                        padding: 15,
                        borderRadius: 99,
                        marginTop: 30,
                        }}
                    >
                        <Text
                        style={{
                            color: 'white',
                            textAlign: 'center',
                            fontSize: 18,
                            fontWeight: 'bold',
                        }}
                        >
                        Submit
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        
        </ScrollView>
      )
};

export default RequestDocumentForm;
