// app/emergency-hotlines.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
// Import FlatList instead of ScrollView for list rendering
import { Alert, FlatList, Linking, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
        number: '117',
        icon: 'shield-account',
        description: 'For police assistance and reporting crimes.',
    },
    {
        id: '3',
        name: 'Bureau of Fire Protection (BFP)',
        number: '(02) 8426-0219',
        icon: 'fire-truck',
        description: 'For fire emergencies and rescue.',
    },
    {
        id: '4',
        name: 'Philippine Red Cross',
        number: '143',
        icon: 'hospital-box-outline',
        description: 'For medical emergencies, ambulance, and blood services.',
    },
    {
        id: '5',
        name: 'NDRRMC (Disaster Response)',
        number: '(02) 8911-5061',
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
        number: '1555',
        icon: 'virus-outline',
        description: 'For COVID-19 related inquiries and emergencies.',
    },
    // Add more hotlines as needed
];

const EmergencyHotlinesScreen = () => {
    const router = useRouter();

    // This function for handling the call is correct and has been preserved.
    const handleCall = (phoneNumber) => {
        // Create a clean phone number string by removing everything except digits.
        const sanitizedNumber = phoneNumber.replace(/[^\d+]/g, '');
        const dialUrl = `tel:${sanitizedNumber}`;

        Linking.canOpenURL(dialUrl)
            .then((supported) => {
                if (!supported) {
                    Alert.alert('Not Supported', 'Phone calls are not supported on this device.');
                }
                return Linking.openURL(dialUrl);
            })
            .catch((err) => {
                // Log the specific error to the console for debugging
                console.error('An error occurred trying to open the URL:', err);
                Alert.alert('Error', 'An error occurred while trying to make a call.');
            });
    };

    // This function renders each individual hotline item for the FlatList.
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

    // This component renders the header content above the list.
    const ListHeader = () => (
        <View style={styles.headerContainer}>
            <MaterialCommunityIcons name="phone-in-talk-outline" size={50} color="#0F00D7" style={{ marginBottom: 10 }} />
            <Text style={styles.pageTitle}>Important Contacts</Text>
            <Text style={styles.pageSubtitle}>Tap any item to call directly in case of an emergency.</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Custom Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Emergency Hotlines</Text>
                <View style={{ width: 28 }} /> {/* Spacer for balance */}
            </View>

            {/* Use FlatList for rendering the list of hotlines */}
            <FlatList
                data={emergencyHotlinesData}
                renderItem={renderHotlineItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContentContainer}
                ListHeaderComponent={ListHeader}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F7FC',
    },
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        paddingTop: Platform.OS === 'android' ? 30 : 45,
        backgroundColor: '#D32F2F',
    },
    navbarTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    listContentContainer: {
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
        color: '#D32F2F',
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
        backgroundColor: '#E8EAF6',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
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
        color: '#0F00D7',
        marginBottom: 4,
    },
    hotlineDescription: {
        fontSize: 13,
        color: '#666',
    },
});

export default EmergencyHotlinesScreen;