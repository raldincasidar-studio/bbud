// app/profile.js (or your relevant file for My Requested Documents)
import apiRequest from '@/plugins/axios'; // Ensure this path is correct
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Import the icon library
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MyRequestedDocumentsScreen = () => {
    const router = useRouter();
    const [userData, setUserData] = useState(null);
    const [requestedDocuments, setRequestedDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUserDataAndDocuments = async () => {
        // ... (fetchUserDataAndDocuments logic remains the same as before) ...
        setIsLoading(true);
        setRefreshing(false); // Reset refreshing if called by onRefresh
        try {
            const storedUserData = await AsyncStorage.getItem('userData');
            if (storedUserData) {
                const parsedUserData = JSON.parse(storedUserData);
                setUserData(parsedUserData);

                if (parsedUserData && parsedUserData._id) {
                    const response = await apiRequest('GET', `/api/document-requests?requestor_resident_id=${parsedUserData._id}&sortBy=date_of_request&sortOrder=desc`);
                    if (response && response.requests) {
                        setRequestedDocuments(response.requests);
                    } else {
                        setRequestedDocuments([]);
                    }
                } else {
                    setRequestedDocuments([]);
                    Alert.alert("Error", "User ID not found. Please log in again.");
                    router.replace('/');
                }
            } else {
                Alert.alert("Authentication Error", "Please log in to view your requested documents.");
                router.replace('/');
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Alert.alert("Error", "Could not load your requested documents.");
            setRequestedDocuments([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUserDataAndDocuments();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchUserDataAndDocuments();
            return () => {};
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchUserDataAndDocuments();
    }, []);

    const getStatusColor = (status) => {
        const colors = {
            "Pending": '#FFA726', "Processing": '#29B6F6', "Ready for Pickup": '#66BB6A',
            "Released": '#4CAF50', "Denied": '#EF5350', "Cancelled": '#BDBDBD',
        };
        return colors[status] || '#757575';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return dateString; }
    };

    const renderDocumentItem = ({ item }) => (
        <TouchableOpacity
            style={styles.documentItem}
            onPress={() => router.push(`/document-requests/${item._id}`)}
        >
            <View style={styles.itemHeader}>
                 <MaterialCommunityIcons name="file-document-outline" size={24} color="#5E76FF" style={styles.itemIcon} />
                <Text style={styles.documentType}>{item.request_type}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.document_status) }]}>
                    <Text style={styles.statusText}>{item.document_status}</Text>
                </View>
            </View>
            <Text style={styles.detailText}>Purpose: {item.purpose_of_request}</Text>
            <Text style={styles.detailText}>Date Requested: {formatDate(item.date_of_request)}</Text>
            {item.requested_by_name && <Text style={styles.detailText}>Processed by: {item.requested_by_name}</Text>}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>My Requested Documents</Text>
                <TouchableOpacity onPress={() => router.push('/portal')}>
                    <MaterialCommunityIcons name="home-outline" size={28} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.container}>
                <View style={styles.headerActions}>
                    <Text style={styles.screenTitle}>My Requests</Text>
                    <Link href="/document-requests/new" asChild>
                        <TouchableOpacity style={styles.newRequestButton}>
                            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="white" style={styles.buttonIcon} />
                            <Text style={styles.newRequestButtonText}>New Request</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {isLoading && !refreshing ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#0F00D7" />
                        <Text style={styles.loadingText}>Loading documents...</Text>
                    </View>
                ) : requestedDocuments.length === 0 ? (
                     <View style={styles.emptyStateContainer}>
                        <MaterialCommunityIcons name="file-multiple-outline" size={80} color="#B0BEC5" style={styles.emptyStateIcon} />
                        <Text style={styles.emptyStateText}>You haven't requested any documents yet.</Text>
                        <Text style={styles.emptyStateSubText}>Tap the "+ New Request" button to get started.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={requestedDocuments}
                        renderItem={renderDocumentItem}
                        keyExtractor={(item) => item._id.toString()}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />
                        }
                    />
                )}
            </View>
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
        paddingHorizontal: 15, // Adjusted padding
        paddingVertical: 10, // Adjusted padding
        paddingTop: Platform.OS === 'android' ? 30 : 45, // Adjusted for status bar
        backgroundColor: '#0F00D7',
    },
    // navIcon removed as we use MaterialCommunityIcons directly
    navbarTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 20,
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A2C47',
    },
    newRequestButton: {
        flexDirection: 'row',
        backgroundColor: '#5E76FF',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    buttonIcon: { // Style for the icon inside the button
        marginRight: 8,
    },
    newRequestButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    list: {
        flex: 1,
    },
    documentItem: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center', // Align icon with text
        marginBottom: 8,
    },
    itemIcon: { // Style for the icon next to document type
        marginRight: 10,
    },
    documentType: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
        flex: 1, // Allow document type to take available space
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 15,
        marginLeft: 10, // Space from document type
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    detailText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
        paddingLeft: 34, // Indent details to align with text after icon
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateIcon: { // Style for the MaterialCommunityIcons in empty state
        marginBottom: 20,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyStateSubText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
    }
});

export default MyRequestedDocumentsScreen;