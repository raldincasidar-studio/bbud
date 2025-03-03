// app/profile.js
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';


const RequestDocumentForm = () => {
    
    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [civilStatus, setCivilStatus] = useState('');
    const [natureOfBusiness, setNatureOfBusiness] = useState('');
    const [contactNumber, setContactNumber] = useState('');

    const submit = () => {
        if (firstName == '' || middleName == '' || lastName == '' || businessName == '' || businessAddress == '' || civilStatus == '' || natureOfBusiness == '' || contactNumber == '') {
            Alert.alert('Form Error', 'You have empty fields in your form');
            return;
        }

        Alert.alert('Success', 'You have successfully submitted your form');

        router.push('/doc-status/1');
    }

    return (
        <ScrollView>
          
          {/* Navbar */}
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 30, width: '100%', paddingTop: 40 }}>
              <TouchableOpacity onPress={() => router.back()}>
                  <Image style={{ height: 20, width: 20, objectFit: 'contain' }} source={require('@/assets/images/back.png')} />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'center', margin: 20 }}>Request Document</Text>
              <TouchableOpacity>
                  <Image style={{ height: 25, width: 25, objectFit: 'contain' }} source={require('@/assets/images/home.png')} />
              </TouchableOpacity>
          </View>

          {/* Headers */}
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 20, width: '100%' }}>
                <Image style={{ height: 50, width: 50, objectFit: 'contain' }} source={require('@/assets/images/business-permit.png')} />
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'left', color: '#000',margin: 20 }}>Business Permit</Text>
          </View>

            {/* FOrm */}
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
                        placeholder='First Name'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                        value={firstName}
                        onChangeText={(text) => setFirstName(text)}
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
                        Middle name
                    </Text>
                    <TextInput
                        placeholder='First Name'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                        value={middleName}
                        onChangeText={(text) => setMiddleName(text)}
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
                        placeholder='First Name'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                        value={lastName}
                        onChangeText={(text) => setLastName(text)}
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
                        Business Name
                    </Text>
                    <TextInput
                        placeholder='First Name'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                        value={businessName}
                        onChangeText={(text) => setBusinessName(text)}
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
                        Business Address
                    </Text>
                    <TextInput
                        placeholder='Date of Birth'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                        value={businessAddress}
                        onChangeText={(text) => setBusinessAddress(text)}
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
                        Civil Status
                    </Text>
                    <TextInput
                        placeholder='Civil Status'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                        value={civilStatus}
                        onChangeText={(text) => setCivilStatus(text)}
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
                        Nature of Business
                    </Text>
                    <TextInput
                        placeholder='Subdivision'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                        value={natureOfBusiness}
                        onChangeText={(text) => setNatureOfBusiness(text)}
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
                        placeholder='Block'
                        style={{
                            borderWidth: 1,
                            borderColor: 'grey',
                            borderRadius: 10,
                            fontSize: 18,
                            padding: 12,
                            color: 'black'
                        }}
                        value={contactNumber}
                        onChangeText={(text) => setContactNumber(text)}
                    />
                    </View>


                    <View style={{
                    padding: 10,
                    width: "100%",
                    }}>
                    <TouchableOpacity
                        onPress={() => submit()}
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
