// import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  const [gender, setGender] = useState('');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={{
      padding: 60,
      backgroundColor: '#0F00D7',
    }}>
      <Text style={{
        color: 'white',
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold'
      }}>Signup</Text>
    </View>
    <ScrollView style={{
      backgroundColor: 'white',
      borderRadius: 20,
      marginTop: -40,
      paddingTop: 40,
      height: '100%',
    }}>
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
          <TextInput placeholder='First Name' style={{
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
          <TextInput placeholder='First Name' style={{
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
          <TextInput placeholder='First Name' style={{
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
            Gender
          </Text>
          <TextInput placeholder='First Name' style={{
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
          <TextInput placeholder='Date of Birth' style={{
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
          <TextInput placeholder='Civil Status' style={{
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
            Subdivision
          </Text>
          <TextInput placeholder='Subdivision' style={{
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
            Block
          </Text>
          <TextInput placeholder='Block' style={{
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
            Lot
          </Text>
          <TextInput placeholder='Lot' style={{
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
            Year Lived
          </Text>
          <TextInput placeholder='Year Lived' style={{
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
            Occupation
          </Text>
          <TextInput placeholder='Occupation' style={{
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
            Voters
          </Text>
          <TextInput placeholder='Voters' style={{
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
            Contact No.
          </Text>
          <TextInput placeholder='Contact No.' style={{
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
            Email Address
          </Text>
          <TextInput placeholder='Email Address' style={{
            borderWidth: 1,
            borderColor: 'grey',
            borderRadius: 10,
            fontSize: 18,
            padding: 12,
            color: 'black'
          }}></TextInput>
        </View>

        <View style={{
          padding: 10,
          width: "100%",
        }}>
          <TouchableOpacity
            onPress={() => router.push('/portal')}
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
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
          fontSize: 15,
          textAlign: 'center',
          width: '100%',
          marginTop: 30,
          marginBottom: 30,
        }}>
          Can't Signup? Contact Administrator
        </Text>

      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
