// app/document-requests/[id].tsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ViewDocumentRequestScreen = () => {
    const router = useRouter();
    const { id: documentRequestId } = useLocalSearchParams();

    const [requestDetails, setRequestDetails] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorLoading, setErrorLoading] = useState(false);

    // State for media viewer
    const [isMediaViewerVisible, setIsMediaViewerVisible] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
    const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');

    const fetchDocumentRequestDetails = useCallback(async (isRefresh = false) => {
        if (!documentRequestId) {
            Alert.alert("Error", "Document Request ID is missing.");
            setIsLoading(false);
            if (isRefresh) setRefreshing(false);
            setErrorLoading(true);
            return;
        }

        if (!isRefresh) {
            setIsLoading(true);
            setErrorLoading(false);
        }

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
    }, [documentRequestId]);

    useFocusEffect(
        useCallback(() => {
            fetchDocumentRequestDetails();
        }, [fetchDocumentRequestDetails])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDocumentRequestDetails(true);
    }, [fetchDocumentRequestDetails]);

    const openMediaViewer = (uri: string) => {
        setSelectedMedia(uri);
        // Basic check for video URLs, adjust if necessary
        if (uri.endsWith('.mp4') || uri.endsWith('.mov')) {
            setSelectedMediaType('video');
        } else {
            setSelectedMediaType('image');
        }
        setIsMediaViewerVisible(true);
    };

    const closeMediaViewer = () => {
        setIsMediaViewerVisible(false);
        setSelectedMedia(null);
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            "Pending": '#FFA726', "Processing": '#29B6F6', "Approved": '#26C6DA',
            "Ready for Pickup": '#26A69A', "Released": '#66BB6A', "Declined": '#EF5350',
        };
        return colors[status] || '#9E9E9E';
    };

    const formatDate = (dateString?: string, includeTime = false) => {
        if (!dateString) return 'N/A';
        try {
            const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
                options.hour12 = true;
            }
            return new Date(dateString).toLocaleDateString('en-US', options);
        } catch (e) { return dateString; }
    };

    const formatDetailKey = (key: string) => {
        if (!key) return '';
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.navbar}><TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity><Text style={styles.navbarTitle}>Request Details</Text><View style={{ width: 28 }} /></View>
                <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading details...</Text></View>
            </SafeAreaView>
        );
    }

    if (errorLoading || !requestDetails) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.navbar}><TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity><Text style={styles.navbarTitle}>Error</Text><View style={{ width: 28 }} /></View>
                <View style={styles.emptyStateContainer}><MaterialCommunityIcons name="alert-circle-outline" size={80} color="#EF5350" /><Text style={styles.emptyStateText}>Could not load document request.</Text><TouchableOpacity onPress={() => fetchDocumentRequestDetails(true)} style={styles.retryButton}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity></View>
            </SafeAreaView>
        );
    }

    const requestorFullName = `${requestDetails.requestor_details?.first_name || ''} ${requestDetails.requestor_details?.last_name || ''}`.trim() || 'N/A';

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}><TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity><Text style={styles.navbarTitle} numberOfLines={1} ellipsizeMode="tail">{requestDetails.request_type}</Text><View style={{ width: 28 }} /></View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />}>
                <View style={styles.headerSection}><Text style={styles.mainTitle}>{requestDetails.request_type}</Text><View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(requestDetails.document_status) }]}><Text style={styles.statusTextLarge}>{requestDetails.document_status}</Text></View></View>
                {requestDetails.document_status === "Declined" && requestDetails.status_reason && ( <View style={styles.detailCard}><Text style={styles.cardTitle}>Declined Reason</Text><View style={styles.detailRow}><MaterialCommunityIcons name="information-outline" size={20} color="#EF5350" style={styles.detailIcon} /><Text style={styles.detailLabel}>Reason:</Text><Text style={[styles.detailValue, { color: '#EF5350', fontWeight: 'bold' }]}>{requestDetails.status_reason}</Text></View></View> )}
                <View style={styles.detailCard}>
                    <Text style={styles.cardTitle}>Requestor Information</Text>
                    <View style={styles.detailRow}><MaterialCommunityIcons name="account-outline" size={20} color="#555" style={styles.detailIcon} /><Text style={styles.detailLabel}>Name:</Text><Text style={styles.detailValue}>{requestorFullName}</Text></View>
                    <View style={styles.detailRow}><MaterialCommunityIcons name="map-marker-outline" size={20} color="#555" style={styles.detailIcon} /><Text style={styles.detailLabel}>Address:</Text><Text style={styles.detailValue}>{`${requestDetails.requestor_details?.address_house_number || ''} ${requestDetails.requestor_details?.address_street || ''}, ${requestDetails.requestor_details?.address_subdivision_zone || ''}`.trim()}</Text></View>
                    <View style={styles.detailRow}><MaterialCommunityIcons name="phone-outline" size={20} color="#555" style={styles.detailIcon} /><Text style={styles.detailLabel}>Contact:</Text><Text style={styles.detailValue}>{requestDetails.requestor_details?.contact_number || 'N/A'}</Text></View>
                </View>
                {requestDetails.details && Object.keys(requestDetails.details).length > 0 && (
                    <View style={styles.detailCard}>
                        <Text style={styles.cardTitle}>{requestDetails.request_type} Specifics</Text>
                        {Object.entries(requestDetails.details).map(([key, value]) => (
                            <View key={key} style={styles.detailRow}><MaterialCommunityIcons name="pencil-box-outline" size={20} color="#555" style={styles.detailIcon} /><Text style={styles.detailLabel}>{formatDetailKey(key)}:</Text><Text style={styles.detailValue}>{String(value) || 'N/A'}</Text></View>
                        ))}
                    </View>
                )}
                <View style={styles.detailCard}>
                    <Text style={styles.cardTitle}>Request Timeline</Text>
                    <View style={styles.detailRow}><MaterialCommunityIcons name="calendar-plus" size={20} color="#555" style={styles.detailIcon} /><Text style={styles.detailLabel}>Date Requested:</Text><Text style={styles.detailValue}>{formatDate(requestDetails.created_at, true)}</Text></View>
                    {requestDetails.updated_at && ( <View style={styles.detailRow}><MaterialCommunityIcons name="update" size={20} color="#555" style={styles.detailIcon} /><Text style={styles.detailLabel}>Last Updated:</Text><Text style={styles.detailValue}>{formatDate(requestDetails.updated_at, true)}</Text></View> )}
                </View>

                {/* Updated Proof of Release Section */}
                {requestDetails.document_status === "Released" && requestDetails.proof_of_release_photo && (
                    <View style={styles.detailCard}>
                        <Text style={styles.cardTitle}>Proof of Release</Text>
                        {requestDetails.released_at && (
                            <View style={styles.detailRow}><MaterialCommunityIcons name="calendar-check" size={20} color="#555" style={styles.detailIcon} /><Text style={styles.detailLabel}>Released On:</Text><Text style={styles.detailValue}>{formatDate(requestDetails.released_at, true)}</Text></View>
                        )}
                        <TouchableOpacity onPress={() => openMediaViewer(requestDetails.proof_of_release_photo)}>
                            <Image source={{ uri: requestDetails.proof_of_release_photo }} style={styles.proofOfReleaseImage} resizeMode="contain" />
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left-circle-outline" size={22} color="#5E76FF" style={{ marginRight: 8 }} /><Text style={styles.backButtonText}>Back to My Requests</Text></TouchableOpacity>
            </ScrollView>

            {/* Media Viewer Modal */}
            <Modal animationType="slide" transparent={true} visible={isMediaViewerVisible} onRequestClose={closeMediaViewer}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {selectedMedia && selectedMediaType === 'image' && ( <Image source={{ uri: selectedMedia }} style={styles.fullMedia} resizeMode="contain" /> )}
                        {selectedMedia && selectedMediaType === 'video' && ( <Video source={{ uri: selectedMedia }} style={styles.fullMedia} useNativeControls resizeMode="contain" isLooping /> )}
                        <TouchableOpacity style={styles.closeButton} onPress={closeMediaViewer}><MaterialCommunityIcons name="close" size={30} color="white" /></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F7FC' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 40 : 50, backgroundColor: '#0F00D7' },
    navbarTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    scrollView: { flex: 1 },
    scrollViewContent: { padding: 15, paddingBottom: 30 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    headerSection: { alignItems: 'center', marginBottom: 25, padding: 15, backgroundColor: 'white', borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    mainTitle: { fontSize: 26, fontWeight: 'bold', color: '#1A2C47', textAlign: 'center', marginBottom: 10 },
    statusBadgeLarge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    statusTextLarge: { color: 'white', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
    detailCard: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1.5 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: '#0F00D7', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    detailIcon: { marginRight: 10, marginTop: 1 },
    detailLabel: { fontSize: 15, color: '#444', fontWeight: '500', width: 120 },
    detailValue: { fontSize: 15, color: '#333', flex: 1 },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyStateText: { fontSize: 18, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 15 },
    retryButton: { backgroundColor: '#5E76FF', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, marginTop: 10 },
    retryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 20, backgroundColor: '#E8EAF6', borderRadius: 8 },
    backButtonText: { color: '#5E76FF', fontSize: 16, fontWeight: '600' },
    proofOfReleaseImage: { width: '100%', height: 250, borderRadius: 8, marginTop: 10 },
    // Styles for Media Viewer Modal
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)' },
    modalContent: { width: '95%', height: '80%', backgroundColor: 'black', borderRadius: 10, overflow: 'hidden' },
    fullMedia: { flex: 1, width: '100%', height: '100%' },
    closeButton: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5, zIndex: 2000 },
});

export default ViewDocumentRequestScreen;