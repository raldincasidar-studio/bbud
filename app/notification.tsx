// app/notifications/index.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, RefreshControl, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Debounce utility
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

const NotificationsScreen = () => {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchKey, setSearchKey] = useState('');
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15; // Or make this configurable

    const fetchNotifications = async (page = 1, searchTerm = searchKey) => {
        if (page === 1 && !refreshing) setIsLoading(true);
        else if (page > 1 && !refreshing) setIsLoading(false); // Don't show main loader for "load more"

        try {
            // Ensure apiRequest handles GET params correctly
            const response = await apiRequest('GET', '/api/notifications', null, {
                search: searchTerm,
                page: page,
                itemsPerPage: itemsPerPage,
                // sortBy: 'date', // API sorts by date desc by default
                // sortOrder: 'desc',
            });

            if (response && response.notifications) {
                setNotifications(page === 1 ? response.notifications : [...notifications, ...response.notifications]);
                setTotalItems(response.total || 0);
                setCurrentPage(page);
            } else {
                if (page === 1) setNotifications([]);
                // Alert.alert("Info", "No notifications found or failed to fetch.");
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            Alert.alert("Error", "Could not load notifications.");
            if (page === 1) setNotifications([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    // Debounced search trigger
    useEffect(() => {
        const debouncedFetch = debounce(() => {
            setCurrentPage(1); // Reset to page 1 for new search
            fetchNotifications(1, searchKey);
        }, 500);

        if (searchKey.trim() === '') { // Fetch all if search is cleared
             setCurrentPage(1);
             fetchNotifications(1, '');
        } else if (searchKey.trim().length >= 2 || searchKey.trim().length === 0) { // Search if >=2 chars or empty
            debouncedFetch();
        } else {
            // Optionally clear results if search key is too short (e.g., 1 char) but not empty
            // setNotifications([]); 
            // setTotalItems(0);
        }
        
        return () => { /* cleanup debounce timer if debounce returns a clear function */ };
    }, [searchKey]);

    useFocusEffect( // Refetch when screen is focused
        useCallback(() => {
            // Fetch with current page and searchKey to maintain state or reset
            fetchNotifications(1, searchKey); 
        }, []) // Run on focus. searchKey effect handles search term changes.
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications(1, searchKey); // Fetch page 1 with current search
    }, [searchKey]);

    const handleLoadMore = () => {
        if (!isLoading && !refreshing && notifications.length < totalItems) {
            fetchNotifications(currentPage + 1, searchKey);
        }
    };

    const formatDate = (dateString, includeTime = true) => {
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

    const renderNotificationItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.notificationItem}
            onPress={() => router.push(`/notifications/${item._id}`)} // Navigate to detail view
        >
            <View style={styles.iconColumn}>
                <MaterialCommunityIcons name="bell-outline" size={28} color="#5E76FF" />
            </View>
            <View style={styles.contentColumn}>
                <Text style={styles.notificationName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.notificationContent} numberOfLines={2}>{item.content}</Text>
                <View style={styles.footerRow}>
                    <Text style={styles.notificationDetail}>By: {item.by || 'Admin'}</Text>
                    <Text style={styles.notificationDetail}>{formatDate(item.date, true)}</Text>
                </View>
            </View>
             <View style={styles.chevronColumn}>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#B0BEC5" />
            </View>
        </TouchableOpacity>
    );

    // Initial loading state for the whole page
    if (isLoading && notifications.length === 0 && !refreshing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.navbarTitle}>Notifications</Text>
                    <View style={{width: 28}} />{/* Placeholder for symmetry */}
                </View>
                <View style={styles.loaderContainerFullPage}>
                    <ActivityIndicator size="large" color="#0F00D7" />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Notifications</Text>
                {/* Optional: Add New Notification button if admins use this screen too */}
                {/* 
                <Link href="/notifications/new" asChild>
                    <TouchableOpacity>
                        <MaterialCommunityIcons name="plus-circle-outline" size={28} color="white" />
                    </TouchableOpacity>
                </Link> 
                */}
                 <View style={{width: 28}} />{/* Placeholder for symmetry */}
            </View>

            <View style={styles.container}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search notifications (name, content, author)..."
                    value={searchKey}
                    onChangeText={setSearchKey}
                    placeholderTextColor="#888"
                    clearButtonMode="while-editing"
                />
                {notifications.length === 0 && !isLoading ? ( // Check isLoading too, to avoid brief flash of empty state
                    <ScrollView 
                        contentContainerStyle={styles.emptyStateContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}
                    >
                        <MaterialCommunityIcons name="bell-off-outline" size={80} color="#B0BEC5" />
                        <Text style={styles.emptyStateText}>No notifications found.</Text>
                        <Text style={styles.emptyStateSubText}>{searchKey ? "Try a different search term." : "Check back later for updates."}</Text>
                    </ScrollView>
                ) : (
                    <FlatList
                        data={notifications}
                        renderItem={renderNotificationItem}
                        keyExtractor={(item) => item._id.toString()}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={isLoading && notifications.length > 0 && !refreshing ? <ActivityIndicator style={{ marginVertical: 20 }} color="#0F00D7" /> : null}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' }, // Match navbar for seamless top
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    container: { flex: 1, backgroundColor: '#F4F7FC', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -1, paddingTop: 15, paddingHorizontal: 15 },
    searchInput: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderRadius: 10, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FC' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    list: { flex: 1 },
    notificationItem: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2.5,
        flexDirection: 'row', // For icon, content, chevron layout
        alignItems: 'center',
    },
    iconColumn: {
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentColumn: {
        flex: 1, // Takes up available space
    },
    chevronColumn: {
        marginLeft: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    notificationContent: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
        lineHeight: 20,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    notificationDetail: {
        fontSize: 12,
        color: '#777',
    },
    emptyStateContainer: {
        flex: 1, // Ensure it takes available space if FlatList is not rendered
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
    },
});

export default NotificationsScreen;