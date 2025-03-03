// app/profile.js
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';


const Profile = () => {
    
    const router = useRouter();

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
          <View>
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', fontWeight: 'bold', textAlign: 'left', color: '#4C67FF',margin: 20, marginBottom: 20 }}>Request Document</Text>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Regular', fontWeight: 'normal', textAlign: 'left', color: '#151515', margin: 20, marginTop: 0 }}>Choose the type of document you would like to request</Text>
          </View>

          {/* Selections */}
          <TouchableOpacity onPress={() => router.push('/request-document-form')}>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Regular', fontWeight: 'bold', textAlign: 'center', color: '#151515', backgroundColor: '#D8E9FC', padding: 20, margin: 20, marginTop: 0, marginBottom: 10, borderRadius: 15 }}>Barangay Clearance</Text>
          </TouchableOpacity>
          <TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Regular', fontWeight: 'bold', textAlign: 'center', color: '#151515', backgroundColor: '#D8E9FC', padding: 20, margin: 20, marginTop: 0, marginBottom: 10, borderRadius: 15 }}>Certificate of Residency</Text>
          </TouchableOpacity>
          <TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Regular', fontWeight: 'bold', textAlign: 'center', color: '#151515', backgroundColor: '#D8E9FC', padding: 20, margin: 20, marginTop: 0, marginBottom: 10, borderRadius: 15 }}>Business Permit</Text>
          </TouchableOpacity>
          <TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Regular', fontWeight: 'bold', textAlign: 'center', color: '#151515', backgroundColor: '#D8E9FC', padding: 20, margin: 20, marginTop: 0, marginBottom: 10, borderRadius: 15 }}>Certificate of Indigency</Text>
          </TouchableOpacity>
          <TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Regular', fontWeight: 'bold', textAlign: 'center', color: '#151515', backgroundColor: '#D8E9FC', padding: 20, margin: 20, marginTop: 0, marginBottom: 10, borderRadius: 15 }}>Certificate of Good Moral</Text>
          </TouchableOpacity>
        </ScrollView>
      )
};

export default Profile;