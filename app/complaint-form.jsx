// app/profile.js
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';


const RequestDocumentForm = () => {
    
    const router = useRouter();

    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [incidentDetails, setIncidentDetails] = useState('');

    const submit = () => {
        if (location == '' || date == '' || incidentDetails == '') {
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
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'left', color: '#000',margin: 20 }}>Complaint Form</Text>
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
                        Location
                    </Text>
                    <TextInput placeholder='Location' style={{
                        borderWidth: 1,
                        borderColor: 'grey',
                        borderRadius: 10,
                        fontSize: 18,
                        padding: 12,
                        color: 'black'
                    }} value={location} onChangeText={(text) => setLocation(text)}></TextInput>
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
                        Date
                    </Text>
                    <TextInput placeholder='Date' style={{
                        borderWidth: 1,
                        borderColor: 'grey',
                        borderRadius: 10,
                        fontSize: 18,
                        padding: 12,
                        color: 'black'
                    }} value={date} onChangeText={(text) => setDate(text)}></TextInput>
                    </View>

                    {/* Form Inputs */}
                    <View style={{
                    width: '100%',
                    padding: 10,
                    }}>
                    <Text
                        style={{
                        color: 'black',
                        fontSize: 16,
                        marginBottom: 10
                        }}
                    >
                        Incident Details
                    </Text>
                    <TextInput placeholder='Incident Details' style={{
                        borderWidth: 1,
                        borderColor: 'grey',
                        borderRadius: 10,
                        fontSize: 18,
                        padding: 12,
                        color: 'black',
                        height: 150,
                    }} multiline={true} value={incidentDetails} onChangeText={(text) => setIncidentDetails(text)}></TextInput>
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
