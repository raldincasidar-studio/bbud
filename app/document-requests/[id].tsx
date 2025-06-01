// app/document-requests/[id].jsx
import apiRequest from '@/plugins/axios'; // Ensure this path is correct
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ViewDocumentRequestScreen = () => {
    const router = useRouter();
    const { id: documentRequestId } = useLocalSearchParams(); // Get the [id] from the route

    const [requestDetails, setRequestDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorLoading, setErrorLoading] = useState(false);

    const fetchDocumentRequestDetails = async () => {
        if (!documentRequestId) {
            Alert.alert("Error", "Document Request ID is missing.");
            setIsLoading(false);
            setRefreshing(false);
            setErrorLoading(true);
            return;
        }
        setIsLoading(true);
        setErrorLoading(false);
        try {
            const response = await apiRequest('GET', `/api/document-requests/${documentRequestId}`);
            if (response && response.request) {
                setRequestDetails(response.request);
            } else {
                setRequestDetails(null);
                setErrorLoading(true);
                Alert.alert("Error", response?.message || response?.error || "Could not fetch document request details.");
            }
        } catch (error) {
            console.error("Error fetching document request details:", error);
            setErrorLoading(true);
            Alert.alert("Error", "An error occurred while fetching details.");
            setRequestDetails(null);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDocumentRequestDetails();
    }, [documentRequestId]); // Re-fetch if ID changes (though typically it won't for a detail screen)

    useFocusEffect(
        useCallback(() => {
            console.log(`Document Request ${documentRequestId} screen focused, fetching details...`);
            fetchDocumentRequestDetails();
            return () => {};
        }, [documentRequestId])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDocumentRequestDetails();
    }, [documentRequestId]);

    const getStatusColor = (status) => {
        const colors = {
            "Pending": '#FFA726', "Processing": '#29B6F6', "Ready for Pickup": '#66BB6A',
            "Released": '#4CAF50', "Denied": '#EF5350', "Cancelled": '#BDBDBD',
        };
        return colors[status] || '#757575';
    };

    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return 'N/A';
        try {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return new Date(dateString).toLocaleDateString('en-US', options);
        } catch (e) { return dateString; }
    };

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.navbarTitle}>Request Details</Text>
                    <View style={{ width: 28 }} /> 
                </View>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#0F00D7" />
                    <Text style={styles.loadingText}>Loading details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (errorLoading || !requestDetails) {
        return (
            <SafeAreaView style={styles.safeArea}>
                 <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.navbarTitle}>Error</Text>
                     <View style={{ width: 28 }} /> 
                </View>
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#EF5350" />
                    <Text style={styles.emptyStateText}>Could not load document request.</Text>
                    <TouchableOpacity onPress={fetchDocumentRequestDetails} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    
    // Construct full names for display
    const requestorFullName = `${requestDetails.requestor_details?.first_name || ''} ${requestDetails.requestor_details?.middle_name || ''} ${requestDetails.requestor_details?.last_name || ''}`.trim() || requestDetails.requestor_display_name || 'N/A';
    const processedByFullName = requestDetails.requested_by_resident_id 
        ? `${requestDetails.requested_by_details?.first_name || ''} ${requestDetails.requested_by_details?.middle_name || ''} ${requestDetails.requested_by_details?.last_name || ''}`.trim() 
        : requestDetails.requested_by_display_name || 'N/A';


    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle} numberOfLines={1} ellipsizeMode="tail">
                    {requestDetails.request_type}
                </Text>
                {/* Placeholder for symmetry or potential right-side icon */}
                <View style={{ width: 28 }} /> 
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />
                }
            >
                <View style={styles.headerSection}>
                    <Text style={styles.mainTitle}>{requestDetails.request_type}</Text>
                    <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(requestDetails.document_status) }]}>
                        <Text style={styles.statusTextLarge}>{requestDetails.document_status}</Text>
                    </View>
                </View>

                <View style={styles.detailCard}>
                    <Text style={styles.cardTitle}>Requestor Information</Text>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="account-outline" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{requestorFullName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Address:</Text>
                        <Text style={styles.detailValue}>{requestDetails.requestor_address || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="phone-outline" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Contact:</Text>
                        <Text style={styles.detailValue}>{requestDetails.requestor_contact_number || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.detailCard}>
                    <Text style={styles.cardTitle}>Request Details</Text>
                     <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="calendar-check-outline" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Date Requested:</Text>
                        <Text style={styles.detailValue}>{formatDate(requestDetails.date_of_request)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="text-account" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Purpose:</Text>
                        <Text style={styles.detailValue}>{requestDetails.purpose_of_request}</Text>
                    </View>
                    {requestDetails.created_at && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="calendar-plus" size={20} color="#555" style={styles.detailIcon} />
                            <Text style={styles.detailLabel}>Filed On:</Text>
                            <Text style={styles.detailValue}>{formatDate(requestDetails.created_at, true)}</Text>
                        </View>
                    )}
                </View>

                 <View style={styles.detailCard}>
                    <Text style={styles.cardTitle}>Processing Information</Text>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="account-tie-outline" size={20} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Processed By:</Text>
                        <Text style={styles.detailValue}>{processedByFullName}</Text>
                    </View>
                     {requestDetails.updated_at && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="update" size={20} color="#555" style={styles.detailIcon} />
                            <Text style={styles.detailLabel}>Last Updated:</Text>
                            <Text style={styles.detailValue}>{formatDate(requestDetails.updated_at, true)}</Text>
                        </View>
                    )}
                </View>

                {/* Add a button to go back to the list or perform other actions */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left-circle-outline" size={22} color="#5E76FF" style={{marginRight: 8}}/>
                    <Text style={styles.backButtonText}>Back to My Requests</Text>
                </TouchableOpacity>

            </ScrollView>
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
        backgroundColor: '#0F00D7',
    },
    navbarTitle: {
        fontSize: 18, // Slightly smaller for potentially long doc types
        fontWeight: 'bold',
        color: 'white',
        flex: 1, // Allow text to take space and truncate
        textAlign: 'center',
        marginHorizontal: 10, // Space around title
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 15,
        paddingBottom: 30,
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
    headerSection: {
        alignItems: 'center',
        marginBottom: 25,
        paddingVertical:10,
        backgroundColor: 'white',
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    mainTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1A2C47',
        textAlign: 'center',
        marginBottom: 10,
    },
    statusBadgeLarge: {
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusTextLarge: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    detailCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1.5,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F00D7',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Align items to the start for multi-line values
        marginBottom: 10,
    },
    detailIcon: {
        marginRight: 10,
        marginTop: 1, // Align icon slightly with first line of text
    },
    detailLabel: {
        fontSize: 15,
        color: '#444',
        fontWeight: '500',
        width: 120, // Fixed width for labels for alignment
    },
    detailValue: {
        fontSize: 15,
        color: '#333',
        flex: 1, // Allow value to take remaining space and wrap
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
        textAlign: 'center',
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: '#5E76FF',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 20,
        marginTop:10,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 20,
        backgroundColor: '#E8EAF6', // Light primary variant
        borderRadius: 8,
    },
    backButtonText: {
        color: '#5E76FF', // Primary color
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ViewDocumentRequestScreen;