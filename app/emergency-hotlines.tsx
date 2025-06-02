// app/emergency-hotlines.jsx
import { MaterialCommunityIcons } from '@expo/vector-icons'; // For icons
import { useRouter } from 'expo-router'; // If you need a back button or other navigation
import React from 'react';
import { Alert, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const emergencyHotlinesData = [
    {
        id: '1',
        name: 'National Emergency Hotline',
        number: '911',
        icon: 'phone-alert',
        description: 'For all types of emergencies nationwide.',
    },
    {
        id: '2',
        name: 'Philippine National Police (PNP)',
        number: '117', // Or a specific local PNP number
        icon: 'shield-account',
        description: 'For police assistance and reporting crimes.',
    },
    {
        id: '3',
        name: 'Bureau of Fire Protection (BFP)',
        number: '(02) 8426-0219', // Example BFP National HQ, or local number
        icon: 'fire-truck',
        description: 'For fire emergencies and rescue.',
    },
    {
        id: '4',
        name: 'Philippine Red Cross',
        number: '143',
        icon: 'hospital-box-outline', // Or 'ambulance'
        description: 'For medical emergencies, ambulance, and blood services.',
    },
    {
        id: '5',
        name: 'NDRRMC (Disaster Response)',
        number: '(02) 8911-5061', // Example NDRRMC number
        icon: 'weather-hurricane',
        description: 'National Disaster Risk Reduction and Management Council.',
    },
    {
        id: '6',
        name: 'Local Barangay Hotline',
        number: '0912 345 6789', // Placeholder - REPLACE THIS
        icon: 'home-city-outline',
        description: 'For local community concerns and emergencies.',
    },
    {
        id: '7',
        name: 'COVID-19 Hotline (DOH)',
        number: '1555', // Or a specific DOH hotline
        icon: 'virus-outline',
        description: 'For COVID-19 related inquiries and emergencies.',
    },
    // Add more hotlines as needed
];

const EmergencyHotlinesScreen = () => {
    const router = useRouter();

    const handleCall = (phoneNumber) => {
        let dialNumber = '';
        if (Platform.OS === 'android') {
            dialNumber = `tel:${phoneNumber}`;
        } else {
            dialNumber = `telprompt:${phoneNumber}`;
        }
        Linking.canOpenURL(dialNumber)
            .then((supported) => {
                if (!supported) {
                    Alert.alert('Not Supported', 'Phone calls are not supported on this device.');
                } else {
                    return Linking.openURL(dialNumber);
                }
            })
            .catch((err) => console.error('An error occurred', err));
    };

    const renderHotlineItem = ({ item }) => (
        <TouchableOpacity style={styles.hotlineItem} onPress={() => handleCall(item.number)}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={item.icon || "phone"} size={30} color="#0F00D7" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.hotlineName}>{item.name}</Text>
                <Text style={styles.hotlineNumber}>{item.number}</Text>
                {item.description && <Text style={styles.hotlineDescription}>{item.description}</Text>}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#C5C5C5" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Custom Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Emergency Hotlines</Text>
                <View style={{width: 28}} /> {/* Spacer for balance */}
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.headerContainer}>
                     <MaterialCommunityIcons name="phone-in-talk-outline" size={50} color="#0F00D7" style={{marginBottom: 10}}/>
                    <Text style={styles.pageTitle}>Important Contacts</Text>
                    <Text style={styles.pageSubtitle}>Tap any number to call directly in case of an emergency.</Text>
                </View>

                {emergencyHotlinesData.map(item => (
                    <View key={item.id}>
                        {renderHotlineItem({item})}
                    </View>
                ))}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F7FC', // Light background for the whole screen
    },
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        paddingTop: Platform.OS === 'android' ? 30 : 45, // Adjust for status bar
        backgroundColor: '#D32F2F', // Emergency Red Color for Navbar
    },
    navbarTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 15,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 25,
        paddingVertical: 10,
    },
    pageTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#D32F2F', // Emergency Red
        textAlign: 'center',
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: 15,
        color: '#555',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    hotlineItem: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    iconContainer: {
        backgroundColor: '#E8EAF6', // Light blue/grey background for icon
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1, // Takes up remaining space
    },
    hotlineName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
        marginBottom: 3,
    },
    hotlineNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F00D7', // Primary app color for the number itself
        marginBottom: 4,
    },
    hotlineDescription: {
        fontSize: 13,
        color: '#666',
    },
});

export default EmergencyHotlinesScreen;