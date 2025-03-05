// app/profile.js
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';


const RequestDocumentForm = () => {
    
    const router = useRouter();

    // generate 5 random numbers
    const randomNumbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView>
          
          {/* Navbar */}
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 30, width: '100%', paddingTop: 40 }}>
              <TouchableOpacity onPress={() => router.back()}>
                  <Image style={{ height: 20, width: 20, objectFit: 'contain' }} source={require('@/assets/images/back.png')} />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'center', margin: 20 }}>Status Page</Text>
              <TouchableOpacity onPress={() => router.push('/portal')}>
                  <Image style={{ height: 25, width: 25, objectFit: 'contain' }} source={require('@/assets/images/home.png')} />
              </TouchableOpacity>
          </View>

          {/* Headers */}
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 20, width: '100%' }}>
                <Image style={{ height: 50, width: 50, objectFit: 'contain' }} source={require('@/assets/images/business-permit.png')} /> 
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'left', color: '#000',margin: 20 }}>Document No. {randomNumbers}</Text>
          </View>

            {/* Status */}
            <View style={{ padding: 10, backgroundColor: '#FF3A3B', borderRadius: 15, margin: 30, marginTop: 0 }}>
                <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'center', color: '#FFF',margin: 20 }}>Status</Text>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', }}>
                    <View style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 10}}>
                        <Image source={require('@/assets/images/status-check.png')} style={{ height: 20, width: 20, objectFit: 'contain'}} />
                        <Text style={{ fontSize: 15, fontFamily: 'Poppins-Bold', textAlign: 'center', color: 'white', marginTop: 10}}>Pending</Text>
                    </View>
                    <Image source={require('@/assets/images/status-arrow.png')} style={{ width: 50, objectFit: 'contain'}} />
                    <View style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 10}}>
                        <Image source={require('@/assets/images/status-blank.png')} style={{ height: 20, width: 20, objectFit: 'contain'}} />
                        <Text style={{ fontSize: 15, fontFamily: 'Poppins-Bold', textAlign: 'center', color: 'white', marginTop: 10}}>Approved</Text>
                    </View>
                    <Image source={require('@/assets/images/status-arrow.png')} style={{ width: 50, objectFit: 'contain'}} />
                    <View style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 10}}>
                        <Image source={require('@/assets/images/status-blank.png')} style={{ height: 20, width: 20, objectFit: 'contain'}} />
                        <Text style={{ fontSize: 15, fontFamily: 'Poppins-Bold', textAlign: 'center', color: 'white', marginTop: 10}}>Pickup</Text>
                    </View>
                </View>
            </View>

            {/* FOrm */}
            <View style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
            }}>

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
                        Choose to get document
                    </Text>
                    <TextInput placeholder='Recieve as' style={{
                        borderWidth: 1,
                        borderColor: 'grey',
                        borderRadius: 10,
                        fontSize: 18,
                        padding: 12,
                        color: 'black'
                    }}></TextInput>
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
                        Set an Appointment
                    </Text>
                    <TextInput placeholder='Write your message here ...' style={{
                        borderWidth: 1,
                        borderColor: 'grey',
                        borderRadius: 10,
                        fontSize: 18,
                        padding: 12,
                        height: 100,
                        color: 'black',
                        textAlignVertical: 'top'
                    }} multiline={true}></TextInput>
                    </View>


                    <View style={{
                    padding: 10,
                    width: "100%",
                    }}>
                    <TouchableOpacity
                        onPress={() => {}}
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
        </KeyboardAvoidingView>
      )
};

export default RequestDocumentForm;