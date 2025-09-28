import { registerForPushNotificationsAsync } from '@/lib/notifications'; // Import the new function
import apiRequest from '@/plugins/axios'; // Adjust path
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For getting resident ID
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Assume this type is defined elsewhere or define it here
interface ResidentNotification {
  _id: string;
  name: string;
  content: string;
  date: string;
  by: string;
  type: 'Announcement' | 'Alert' | 'Notification';
  read_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'; // From API
  read_at?: string | null;
  created_at: string;
  read_by?: { resident_id: string; read_at: string }[];
}

const NotificationsScreen = () => {
    const router = useRouter();
    const [notifications, setNotifications] = useState<ResidentNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [residentId, setResidentId] = useState<string | null>(null);

    // Get logged-in resident's ID (assuming it's stored)
    useEffect(() => {
        const loadResidentId = async () => {
            const storedResidentData = await AsyncStorage.getItem('userData');
            if (storedResidentData) {
                const resident = JSON.parse(storedResidentData);
                setResidentId(resident?._id);
            } else {
                Alert.alert("Authentication Error", "Could not find resident information. Please log in again.");
                router.replace('/login'); // Redirect to login
            }
        };
        loadResidentId();
    }, []);

    // Effect to register for push notifications
    useEffect(() => {
        if (residentId) {
            registerForPushNotificationsAsync();
        }
    }, [residentId]);

    const fetchNotifications = useCallback(async (page = 1, isRefreshing = false) => {
        if (!residentId) {
            if (!isRefreshing) setIsLoading(false);
            if (isRefreshing) setRefreshing(false);
            return;
        }

        if (page === 1 && !isRefreshing) setIsLoading(true);
        else if (isRefreshing) setRefreshing(true);

        try {
            const response = await apiRequest('GET', `/api/residents/${residentId}/notifications`, null, {
                page: page,
                itemsPerPage: itemsPerPage,
            });

            if (response && response.notifications) {
                const notificationsWithReadStatus = response.notifications.map((n: ResidentNotification) => ({
                    ...n,
                    read_status: n.read_by?.some(reader => reader.resident_id === residentId) ? 'read' : 'pending',
                }));

                if (page === 1) {
                    setNotifications(notificationsWithReadStatus);
                } else {
                    setNotifications(prev => [...prev, ...notificationsWithReadStatus]);
                }
                
                setTotalItems(response.total || 0);
                setCurrentPage(page);
            } else {
                if (page === 1) setNotifications([]);
            }
        } catch (error) {
            console.error("Error fetching resident notifications:", error);
            Alert.alert("Error", "Could not load your notifications.");
            if (page === 1) setNotifications([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [residentId]);

    useFocusEffect(
        useCallback(() => {
            if (residentId) {
                fetchNotifications(1, false);
            }
        }, [residentId, fetchNotifications])
    );

    const onRefresh = useCallback(() => {
        if (residentId) {
            fetchNotifications(1, true);
        } else {
            setRefreshing(false);
        }
    }, [residentId, fetchNotifications]);

    const handleLoadMore = () => {
        if (!isLoading && !refreshing && notifications.length < totalItems && residentId) {
            fetchNotifications(currentPage + 1, false);
        }
    };

    const markNotificationAsRead = async (notificationIdToMark: string) => {
        if (!residentId) return;
        try {
            // Optimistically update UI
            setNotifications(prevNotifications =>
                prevNotifications.map(notif =>
                    notif._id === notificationIdToMark ? { ...notif, read_status: 'read', read_at: new Date().toISOString() } : notif
                )
            );

            await apiRequest('PATCH', `/api/notifications/${notificationIdToMark}/mark-as-read`, {
                resident_id: residentId,
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
            // Optionally revert optimistic update here
            Alert.alert("Error", "Could not update notification status.");
            fetchNotifications(1, true);
        }
    };


    const formatDate = (dateString?: string | null): string => {
        if (!dateString) return 'N/A';
        try {
            // Simpler date for list view
            return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) { return dateString; }
    };

    const getTypeIconAndColor = (type: ResidentNotification['type']) => {
        switch (type) {
            case 'Announcement': return { icon: 'bullhorn-variant-outline', color: '#1E88E5' }; // Blue
            case 'Alert': return { icon: 'alert-octagon-outline', color: '#E53935' }; // Red
            case 'Notification': return { icon: 'bell-outline', color: '#43A047' }; // Green
            default: return { icon: 'information-outline', color: '#757575' }; // Grey
        }
    };

    const handleNotificationPress = (item: ResidentNotification) => {
        if (item.read_status !== 'read') {
            markNotificationAsRead(item._id);
        }
        router.push(`/notifications/${item._id}`);
    };

    const renderNotificationItem = ({ item }: { item: ResidentNotification }) => {
        const { icon, color } = getTypeIconAndColor(item.type);
        const isUnread = item.read_status !== 'read';
        return (
            <TouchableOpacity
                style={[styles.notificationItem, isUnread && styles.unreadItem]}
                onPress={() => handleNotificationPress(item)}
            >
                <View style={[styles.iconColumn, { backgroundColor: isUnread ? color : '#E0E0E0' }]}>
                    <MaterialCommunityIcons name={icon as any} size={26} color={isUnread? "white" : "#757575"} />
                </View>
                <View style={styles.contentColumn}>
                    <Text style={[styles.notificationName, isUnread && styles.unreadText]} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.notificationContent} numberOfLines={2}>{item.content}</Text>
                    <View style={styles.footerRow}>
                        <Text style={styles.notificationDetail}>{item.type}</Text>
                        <Text style={styles.notificationDetail}>{formatDate(item.created_at)}</Text>
                    </View>
                </View>
                 <View style={styles.chevronColumn}>
                    {isUnread && <View style={styles.unreadDot} />}
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#B0BEC5" />
                </View>
            </TouchableOpacity>
        );
    };

    if (!residentId && isLoading) { // Still waiting for residentId to load
        return (
             <SafeAreaView style={styles.safeArea}>
                <View style={styles.navbar}><Text style={styles.navbarTitle}>Notifications</Text></View>
                <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" color="#0F00D7" /></View>
            </SafeAreaView>
        );
    }
     if (isLoading && notifications.length === 0 && !refreshing) { /* ... (full page loader as before) ... */ }


    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Announcements and Notifications</Text>
                <View style={{width: 28}} />
            </View>

            <View style={styles.container}>
                {/* Search bar can be removed if not needed for resident's view */}
                {/* <TextInput style={styles.searchInput} ... /> */}

                {notifications.length === 0 && !isLoading && !refreshing ? (
                    <ScrollView
                        contentContainerStyle={styles.emptyStateContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}
                    >
                        <MaterialCommunityIcons name="email-outline" size={80} color="#B0BEC5" />
                        <Text style={styles.emptyStateText}>You have no notifications yet.</Text>
                        <Text style={styles.emptyStateSubText}>We'll let you know when something new arrives.</Text>
                    </ScrollView>
                ) : (
                    <FlatList
                        data={notifications}
                        renderItem={renderNotificationItem}
                        keyExtractor={(item) => item._id.toString()}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={isLoading && notifications.length > 0 && !refreshing && currentPage * itemsPerPage < totalItems ? <ActivityIndicator style={{ marginVertical: 20 }} color="#0F00D7" /> : null}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 40 : 50, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', paddingLeft: 15 },
    container: { flex: 1, backgroundColor: '#F4F6F8', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 5, paddingHorizontal: 0 }, // No horizontal padding here
    // searchInput: { backgroundColor: 'white', marginHorizontal:15, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderRadius: 10, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F8' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    list: { flex: 1, paddingHorizontal: 15, }, // Add padding here for list items
    notificationItem: {
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#404040',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        flexDirection: 'row',
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: '#E3F2FD', // A light blue for unread items
        borderLeftWidth: 4,
        borderLeftColor: '#1E88E5', // Accent color for unread
    },
    iconColumn: {
        width: 48, height: 48, borderRadius: 24, // Circular icon background
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
        // backgroundColor will be set dynamically
    },
    contentColumn: { flex: 1, marginRight: 5 },
    chevronColumn: { justifyContent: 'center', alignItems: 'center', paddingLeft: 5 },
    notificationName: { fontSize: 16, fontWeight: 'bold', color: '#263238', marginBottom: 3 },
    unreadText: { color: '#0D47A1' }, // Darker blue for unread title
    notificationContent: { fontSize: 14, color: '#546E7A', marginBottom: 8, lineHeight: 19 },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    notificationDetail: { fontSize: 12, color: '#78909C' },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E88E5', marginRight: 8 },
    emptyStateContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F4F6F8' },
    emptyStateText: { fontSize: 20, fontWeight: '600', color: '#455A64', textAlign: 'center', marginBottom: 10 },
    emptyStateSubText: { fontSize: 15, color: '#78909C', textAlign: 'center' },
});

export default NotificationsScreen;