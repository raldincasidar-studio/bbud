import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Image, ImageBackground, Text, TouchableOpacity } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem('userData').then((token) => {
      if (token) router.replace('/portal');
    });
  }, [router]);

  return (
    <ImageBackground
      source={require('@/assets/images/splash-screen.png')}
      style={{
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 20,
      }}
    >
      <Image
        style={{ width: 70, height: 70, alignSelf: 'center', margin: 20 }}
        source={require('@/assets/images/logo.png')}
      />
      <Text
        style={{
          fontSize: 35,
          fontFamily: 'Poppins-Bold',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: 20,
        }}
      >
        Join Us Today
      </Text>
      <Text
        style={{
          fontSize: 20,
          textAlign: 'center',
          color: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        Enter your details to proceed further
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/login')}
        style={{
          width: '100%',
          backgroundColor: '#5E76FF',
          padding: 15,
          borderRadius: 99,
          marginTop: 30,
          marginBottom: 5,
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
          Login
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push('/signup')}
        style={{
          width: '100%',
          backgroundColor: '#E2E2E2',
          padding: 15,
          borderRadius: 99,
          marginTop: 5,
          marginBottom: 5,
        }}
      >
        <Text
          style={{
            color: 'black',
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          Register
        </Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}
