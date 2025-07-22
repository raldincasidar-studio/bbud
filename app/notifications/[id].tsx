// app/notifications/[id].tsx
import apiRequest from '@/plugins/axios'; // Adjust path to your axios plugin
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Interface for the structure of a detailed notification
interface NotificationDetail {
  _id: string;
  name: string;
  content: string;
  date: string; // ISO Date string from API
  by: string;
  type: 'Announcement' | 'Alert' | 'Notification';
  created_at?: string;
  updated_at?: string;
  read_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'; // Potentially from a resident-specific fetch
  read_at?: string | null;
  recipients?: Array<{ resident_id: string, status: string, read_at?: string | null }>; // Full list, possibly for admin
  target_audience?: 'All' | 'SpecificResidents'; // Added for context
}

// Helper to format date for display
const formatDate = (dateString?: string | null, includeTime = true): string => {
    if (!dateString) return 'N/A';
    try {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString; // Fallback
    }
};

// Helper for notification type icon and color
const getTypeIconAndColor = (type: NotificationDetail['type'] | undefined) => {
    if (!type) return { icon: 'information-outline', color: '#757575' }; // Default
    switch (type) {
        case 'Announcement': return { icon: 'bullhorn-variant-outline', color: '#1E88E5' }; // Blue
        case 'Alert': return { icon: 'alert-octagon-outline', color: '#E53935' }; // Red
        case 'Notification': return { icon: 'bell-outline', color: '#43A047' }; // Green
        default: return { icon: 'information-outline', color: '#757575' };
    }
};


const ViewNotificationScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>(); // Make id optional for initial check
    const notificationId = params.id;

    const [notification, setNotification] = useState<NotificationDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorLoading, setErrorLoading] = useState<string | null>(null);
    const [residentId, setResidentId] = useState<string | null>(null);

    // Effect to load residentId from AsyncStorage
    useEffect(() => {
        const loadResidentId = async () => {
            try {
                const storedResidentData = await AsyncStorage.getItem('residentData');
                if (storedResidentData) {
                    const resident = JSON.parse(storedResidentData);
                    setResidentId(resident?._id || null);
                } else {
                    // Not critical to block UI if residentId not found,
                    // as notification might be general or viewed by non-logged-in user in some scenarios.
                    // However, for marking as read, residentId is needed.
                    console.warn("Resident ID not found in AsyncStorage.");
                }
            } catch (e) {
                console.error("Failed to load resident ID from AsyncStorage", e);
            }
        };
        loadResidentId();
    }, []);

    const fetchNotificationDetails = useCallback(async (isRefresh = false) => {
        if (!notificationId) {
            setErrorLoading("Notification ID is missing.");
            setIsLoading(false);
            if(isRefresh) setRefreshing(false);
            return;
        }

        if (!isRefresh) setIsLoading(true);
        setErrorLoading(null);

        try {
            let fetchedNotificationData: NotificationDetail | null = null;
            let initialReadStatusForUser: NotificationDetail['read_status'] = 'pending';

            // Fetch the generic notification details first
            const genericResponse = await apiRequest('GET', `/api/notifications/${notificationId}`);
            if (genericResponse && genericResponse.notification) {
                fetchedNotificationData = genericResponse.notification;

                // If residentId is known, try to determine their specific read status
                // This might come from the main notification document's recipients array
                // or a top-level field if the API GET /api/notifications/:id was enhanced
                // to return resident-specific status when a residentId is passed (e.g. via query param or header)
                if (residentId && fetchedNotificationData.recipients && Array.isArray(fetchedNotificationData.recipients)) {
                    const recipientEntry = fetchedNotificationData.recipients.find(r => r.resident_id === residentId);
                    initialReadStatusForUser = recipientEntry?.status || 'pending';
                } else if (fetchedNotificationData.read_status) {
                    // Fallback if API provided a top-level read_status (e.g., from a resident-specific endpoint)
                    initialReadStatusForUser = fetchedNotificationData.read_status;
                }
            }

            if (fetchedNotificationData) {
                setNotification(fetchedNotificationData);

                // Automatically mark as read if residentId is known and status wasn't 'read'
                if (residentId && fetchedNotificationData._id && initialReadStatusForUser !== 'read') {
                    try {
                        await apiRequest('PATCH', `/api/notifications/${fetchedNotificationData._id}/mark-as-read`, {
                            resident_id: residentId,
                        });
                        // Optimistically update the local state for immediate UI feedback
                        setNotification(prev => prev ? {
                            ...prev,
                            read_status: 'read', // Assuming API returns this or we infer it
                            // Update recipients array if present and needed for display
                            recipients: prev.recipients?.map(r =>
                                r.resident_id === residentId ? { ...r, status: 'read', read_at: new Date().toISOString() } : r
                            )
                        } : null);
                    } catch (markReadError) {
                        console.warn("Could not mark notification as read automatically:", markReadError);
                        // Notification is still displayed even if marking read fails
                    }
                }
            } else {
                setErrorLoading(genericResponse?.message || genericResponse?.error || "Could not fetch notification details.");
                setNotification(null);
            }
        } catch (error: any) {
            console.error("Error fetching notification details:", error);
            setErrorLoading(error.response?.data?.message || error.message || "An error occurred while fetching details.");
            setNotification(null);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [notificationId, residentId]); // Depends on notificationId and residentId

    // Initial fetch and refetch when notificationId or residentId changes
    useEffect(() => {
        if (notificationId) { // Only fetch if notificationId is present
            fetchNotificationDetails(false);
        }
    }, [notificationId, fetchNotificationDetails]); // fetchNotificationDetails is already memoized with residentId

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotificationDetails(true);
    }, [fetchNotificationDetails]);


    if (isLoading && !refreshing && !notification) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push("/notifications")}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.navbarTitle}>Loading...</Text>
                    <View style={{width: 28}} />
                </View>
                <View style={styles.loaderContainerFullPage}>
                    <ActivityIndicator size="large" color="#0F00D7" />
                    <Text style={styles.loadingText}>Loading notification details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (errorLoading || !notification) {
        return (
            <SafeAreaView style={styles.safeArea}>
                 <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push("/notifications")}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.navbarTitle}>Error</Text>
                     <View style={{ width: 28 }} />
                </View>
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#D32F2F" />
                    <Text style={styles.emptyStateText}>{errorLoading || "Notification not found."}</Text>
                    <TouchableOpacity onPress={() => fetchNotificationDetails(true)} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const { icon: typeIcon, color: typeColor } = getTypeIconAndColor(notification.type);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push("/notifications")}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle} numberOfLines={1} ellipsizeMode="tail">
                    {notification.name}
                </Text>
                <View style={{ width: 28 }} /> {/* Placeholder for symmetry */}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} tintColor={"#0F00D7"}/>
                }
            >
                <View style={styles.headerContent}>
                    <MaterialCommunityIcons name={typeIcon as any} size={48} color={typeColor} style={styles.headerIconVisual} />
                    <View style={[styles.notificationTypeBadge, {backgroundColor: typeColor || '#757575'}]}>
                        <Text style={styles.notificationTypeBadgeText}>{notification.type}</Text>
                    </View>
                    <Text style={styles.notificationTitle}>{notification.name}</Text>
                </View>

                <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="calendar-month-outline" size={22} color="#455A64" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>{formatDate(notification.date, true)}</Text>
                    </View>
                    <View style={styles.detailRowNoBorder}>
                        <MaterialCommunityIcons name="account-tie-outline" size={22} color="#455A64" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>By:</Text>
                        <Text style={styles.detailValue}>{notification.by || 'System Notification'}</Text>
                    </View>
                </View>

                <View style={styles.contentCard}>
                    <Text style={styles.contentLabel}>Message Details</Text>
                    <Text style={styles.contentText}>{notification.content}</Text>
                </View>

                {notification.created_at && (
                     <Text style={styles.timestampText}>
                        Posted: {formatDate(notification.created_at, true)}
                    </Text>
                )}
                 {notification.updated_at && notification.updated_at !== notification.created_at && (
                    <Text style={styles.timestampText}>
                        Last Updated: {formatDate(notification.updated_at, true)}
                    </Text>
                )}
                {/* If admin actions are needed, they can be added here based on user role */}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F6F8', // Light background for the content area
    },
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 10 : 12, // Adjusted padding
        paddingTop: Platform.OS === 'android' ? 40 : 50, // Status bar height
        backgroundColor: '#0F00D7',
    },
    navbarTitle: {
        fontSize: 18, // Slightly smaller for potentially long titles
        fontWeight: 'bold',
        color: 'white',
        flex: 1, // Allow text to take available space
        textAlign: 'center',
        marginHorizontal: 10, // Give space from icons
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 15, // Consistent padding
        paddingBottom: 40, // Ensure space at the bottom
    },
    loaderContainerFullPage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F6F8',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#424242', // Darker grey
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F4F6F8',
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#424242',
        textAlign: 'center',
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: '#0F00D7',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25, // More rounded
        marginTop:15,
        elevation: 2,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerContent: {
        alignItems: 'center',
        marginBottom: 25,
        paddingVertical: 25, // More padding
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        elevation: 3,
        shadowColor: '#B0BEC5', // Softer shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    headerIconVisual: {
        marginBottom: 10,
    },
    notificationTypeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 15,
        marginBottom: 12,
        // backgroundColor is set dynamically
    },
    notificationTypeBadgeText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    notificationTitle: {
        fontSize: 22, // Slightly larger
        fontWeight: 'bold',
        color: '#212121', // Darker title
        textAlign: 'center',
        marginBottom: 5,
        paddingHorizontal: 10,
    },
    detailCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal:15,
        paddingTop: 10, // Less top padding if header is separate
        paddingBottom:5,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        elevation: 1,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Align items to the start for potentially multi-line values
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5', // Lighter separator
    },
    detailRowNoBorder: { // For the last item in a card
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    detailIcon: {
        marginRight: 15, // More space
        marginTop: 2,    // Fine-tune vertical alignment
        color: '#546E7A', // Consistent icon color
    },
    detailLabel: {
        fontSize: 15,
        color: '#546E7A',
        fontWeight: '600', // Bolder label
        width: 75, // Adjusted width
    },
    detailValue: {
        fontSize: 15,
        color: '#263238', // Darker text for value
        flex: 1, // Allow value to wrap lines
    },
    contentCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        elevation: 1,
    },
    contentLabel: {
        fontSize: 17, // Slightly larger
        fontWeight: 'bold',
        color: '#0F00D7',
        marginBottom: 12, // More space
        borderBottomWidth: 1,
        borderColor: '#E0E0E0',
        paddingBottom: 8,
    },
    contentText: {
        fontSize: 16, // Larger for readability
        lineHeight: 24, // Improved line spacing
        color: '#37474F', // Slightly darker content text
    },
    timestampText: {
        fontSize: 12,
        color: '#78909C',
        textAlign: 'center',
        marginTop: 20, // More space from content
    },
});

export default ViewNotificationScreen;