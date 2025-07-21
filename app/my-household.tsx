// app/my-household.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MyHouseholdScreen = () => {
    const router = useRouter();
    const [loggedInUserId, setLoggedInUserId] = useState(null);
    const [householdData, setHouseholdData] = useState(null); // Stores { resident, isHouseholdHead, isMemberOfAnotherHousehold, householdHead, householdMembers }
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [newMember, setNewMember] = useState({
        first_name: '',
        last_name: '',
        middle_name: '',
        sex: '',
        date_of_birth: '',
        relationship_to_head: '',
        email: '',
        password: '',
    });

    const handleAddMember = async () => {
        if (!loggedInUserId) return;

        try {
            await apiRequest('POST', `/api/residents/${loggedInUserId}/members`, newMember);
            Alert.alert("Success", "Household member added successfully.");
            setModalVisible(false);
            fetchHouseholdData(loggedInUserId);
        } catch (error) {
            console.error("Error adding household member:", error);
            Alert.alert("Error", error.response?.data?.message || "Could not add household member.");
        }
    };

    const fetchHouseholdData = useCallback(async (userId) => {
        if (!userId) {
            setError("User ID not available. Please log in again.");
            setIsLoading(false); setRefreshing(false);
            return;
        }
        setIsLoading(true); setError(null);
        try {
            const response = await apiRequest('GET', `/api/residents/${userId}/household-details`);
            if (response) { // Check if response itself is truthy
                setHouseholdData(response); // The entire response object
            } else {
                setError("Failed to fetch household data or data is incomplete.");
                setHouseholdData(null);
                // Alert.alert("Error", response?.message || response?.error || "Could not load household information.");
            }
        } catch (err) {
            console.error("Error fetching household data:", err);
            setError(err.response?.data?.message || err.message || "An error occurred.");
            setHouseholdData(null);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);


    useEffect(() => {
        const loadUserAndFetchHousehold = async () => {
            setIsLoading(true);
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsed = JSON.parse(storedUserDataString);
                    if (parsed?._id) {
                        setLoggedInUserId(parsed._id);
                        await fetchHouseholdData(parsed._id); // Fetch household data after getting user ID
                    } else {
                        setError("User ID not found. Please log in again.");
                        setIsLoading(false);
                        Alert.alert("Error", "User ID not found.", [{ text: "OK", onPress: () => router.replace('/') }]);
                    }
                } else {
                    setError("Not logged in.");
                    setIsLoading(false);
                    Alert.alert("Authentication Error", "Please log in to view your household.", [{ text: "OK", onPress: () => router.replace('/') }]);
                }
            } catch (e) {
                console.error("Error loading user data from storage:", e);
                setError("Failed to load user information.");
                setIsLoading(false);
            }
        };
        loadUserAndFetchHousehold();
    }, [fetchHouseholdData]); // fetchHouseholdData is memoized

    useFocusEffect(
        useCallback(() => {
            if (loggedInUserId) { // Only refetch if we already have the user ID
                fetchHouseholdData(loggedInUserId);
            }
        }, [loggedInUserId, fetchHouseholdData])
    );

    const onRefresh = useCallback(() => {
        if (loggedInUserId) {
            setRefreshing(true);
            fetchHouseholdData(loggedInUserId);
        } else {
            setRefreshing(false); // Can't refresh if no user ID
        }
    }, [loggedInUserId, fetchHouseholdData]);


    const renderMemberItem = (member, isCurrentUser = false) => (
        <View key={member._id} style={[styles.memberItem, isCurrentUser && styles.currentUserMemberItem]}>
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={isCurrentUser ? "#0F00D7" : "#555"} style={styles.memberIcon} />
            <View style={styles.memberTextContainer}>
                <Text style={[styles.memberName, isCurrentUser && styles.currentUserName]}>
                    {`${member.first_name || ''} ${member.middle_name || ''} ${member.last_name || ''}`.trim()}
                    {isCurrentUser && " (You)"}
                </Text>
                <Text style={styles.memberDetail}>{member.relationship_to_head || 'N/A'}</Text>
                {/* Add other member details you want to show, e.g., age */}
            </View>
        </View>
    );

    if (isLoading && !refreshing) {
        return <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading household information...</Text></View>;
    }
    if (error) {
        return <View style={styles.loaderContainer}><MaterialCommunityIcons name="alert-circle-outline" size={50} color="red" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => loggedInUserId ? fetchHouseholdData(loggedInUserId) : router.replace('/')} style={styles.retryButton}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity></View>;
    }
    if (!householdData || !householdData.resident) {
        return <View style={styles.loaderContainer}><Text>No household data available.</Text></View>;
    }

    const { resident, isHouseholdHead, isMemberOfAnotherHousehold, householdHead, householdMembers } = householdData;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>My Household</Text>
                <View style={{ width: 28 }} /> {/* Spacer */}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />}
            >
                <View style={styles.profileCard}>
                    <MaterialCommunityIcons name="account-details-outline" size={30} color="#0F00D7" />
                    <Text style={styles.profileName}>{`${resident.first_name || ''} ${resident.middle_name || ''} ${resident.last_name || ''}`.trim()}</Text>
                    <Text style={styles.profileEmail}>{resident.email || 'No Email'}</Text>
                </View>

                {isHouseholdHead && (
                    <View style={styles.householdSection}>
                        <Text style={styles.sectionTitle}>You are the Household Head</Text>
                        <Text style={styles.sectionSubtitle}>Members in your household:</Text>
                        {householdMembers && householdMembers.length > 0 ? (
                            householdMembers.map(member => renderMemberItem(member, member._id === loggedInUserId))
                        ) : (
                            <Text style={styles.noMembersText}>No members listed in your household yet.</Text>
                        )}
                        {/* <TouchableOpacity style={styles.manageButton} onPress={() => {}}>
                            <MaterialCommunityIcons name="account-plus-outline" size={20} color="white" style={{marginRight: 8}}/>
                            <Text style={styles.manageButtonText}>Add Household Member</Text>
                        </TouchableOpacity> */}
                    </View>
                )}

                {!isHouseholdHead && isMemberOfAnotherHousehold && householdHead && (
                    <View style={styles.householdSection}>
                        <Text style={styles.sectionTitle}>You are a Member of a Household</Text>
                        <Text style={styles.sectionSubtitle}>Household Head:</Text>
                        <View style={styles.headInfoCard}>
                             <MaterialCommunityIcons name="crown-outline" size={24} color="#FFC107" style={styles.memberIcon} />
                             <Text style={styles.memberName}>{`${householdHead.first_name || ''} ${householdHead.middle_name || ''} ${householdHead.last_name || ''}`.trim()}</Text>
                        </View>
                        <Text style={styles.sectionSubtitle}>Other Members in this household:</Text>
                        {householdMembers && householdMembers.length > 0 ? (
                            householdMembers.map(member => renderMemberItem(member, member._id === loggedInUserId))
                        ) : (
                            <Text style={styles.noMembersText}>No other members listed.</Text>
                        )}
                    </View>
                )}

                {!isHouseholdHead && !isMemberOfAnotherHousehold && (
                    <View style={styles.householdSection}>
                        <MaterialCommunityIcons name="home-alert-outline" size={50} color="#757575" style={{alignSelf: 'center', marginBottom: 10}}/>
                        <Text style={styles.sectionTitleCentered}>Not Part of a Household</Text>
                        <Text style={styles.noHouseholdText}>
                            You are not currently registered as a household head or a member of another household in the system.
                        </Text>
                        {/* Optionally, a button to request to join a household or create one, if applicable */}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F7FC' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    scrollView: { flex: 1 },
    scrollViewContent: { padding: 15, paddingBottom: 30 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    errorText: { marginTop: 10, fontSize: 16, color: 'red', textAlign: 'center' },
    retryButton: { backgroundColor: '#0F00D7', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5, marginTop:15 },
    retryButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold'},
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        marginBottom: 25,
        elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
    },
    profileName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
    },
    profileEmail: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    householdSection: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F00D7',
        marginBottom: 5,
    },
    sectionTitleCentered: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    sectionSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#444',
        marginTop: 15,
        marginBottom: 10,
    },
    headInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9C4', // Light yellow for head
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    currentUserMemberItem: {
        backgroundColor: '#E3F2FD', // Light blue highlight for current user in member list
        borderRadius: 6,
        paddingHorizontal: 8, // Add some horizontal padding for the highlight
    },
    memberIcon: {
        marginRight: 12,
    },
    memberTextContainer: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    currentUserName: {
        fontWeight: 'bold',
        color: '#0D47A1', // Darker blue for emphasis
    },
    memberDetail: {
        fontSize: 13,
        color: '#777',
    },
    noMembersText: {
        fontSize: 15,
        color: '#777',
        textAlign: 'center',
        paddingVertical: 10,
    },
    noHouseholdText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    manageButton: {
        flexDirection: 'row',
        backgroundColor: '#5E76FF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        alignSelf: 'center', // Center the button
        elevation: 2,
    },
    manageButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#0F00D7',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    cancelButton: {
        backgroundColor: '#757575',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default MyHouseholdScreen;