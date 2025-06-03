// app/borrowed-assets/my-borrowed-items.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, RefreshControl, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Debounce utility
function debounce(func, delay) { /* ... same as before ... */ }

const MyBorrowedItemsScreen = () => {
    const router = useRouter();
    const [userData, setUserData] = useState(null);
    const [borrowedItems, setBorrowedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchKey, setSearchKey] = useState('');
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const fetchMyBorrowedItems = async (page = 1, searchTerm = searchKey, userId = userData?._id) => {
        if (!userId) {
            setIsLoading(false); setRefreshing(false);
            return;
        }
        if (page === 1 && !refreshing) setIsLoading(true);
        else if (page > 1) setRefreshing(false); // Don't show main loader for load more

        try {
            const storedUserData: any = await AsyncStorage.getItem('userData');
            const parsedUserData = JSON.parse(storedUserData);
            setUserData(parsedUserData);


            const response = await apiRequest('GET', `/api/borrowed-assets/by-resident/${parsedUserData._id}`, null, {
                borrower_resident_id: userId, // Filter by logged-in user's ID
                search: searchTerm,
                page: page,
                itemsPerPage: itemsPerPage,
                // sortBy: 'borrow_datetime', // API already sorts by this
                // sortOrder: 'desc',
            });
            if (response && response.transactions) { // API for borrowed-assets returns { transactions: [] }
                setBorrowedItems(page === 1 ? response.transactions : [...borrowedItems, ...response.transactions]);
                setTotalItems(response.total || 0);
                setCurrentPage(page);
            } else {
                if (page === 1) setBorrowedItems([]);
            }
        } catch (error) {
            console.error("Error fetching my borrowed items:", error);
            Alert.alert("Error", "Could not load your borrowed items.");
            if (page === 1) setBorrowedItems([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const storedUserDataString = await AsyncStorage.getItem('userData');
                if (storedUserDataString) {
                    const parsed = JSON.parse(storedUserDataString);
                    setUserData(parsed);
                    if (parsed?._id) {
                        await fetchMyBorrowedItems(1, searchKey, parsed._id);
                    } else { setIsLoading(false); }
                } else {
                    Alert.alert("Auth Error", "Please log in.", [{ text: "OK", onPress: () => router.replace('/') }]);
                    setIsLoading(false);
                }
            } catch (e) { Alert.alert("Error", "Failed to load user information."); setIsLoading(false); }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!userData?._id || isLoading) return;
        const debouncedFetch = debounce(() => {
            setCurrentPage(1); // Reset page for new search
            fetchMyBorrowedItems(1, searchKey, userData._id);
        }, 500);

        if (searchKey.trim() === '') { // Fetch all if search is cleared
             setCurrentPage(1);
             fetchMyBorrowedItems(1, '', userData._id);
        } else {
            debouncedFetch();
        }
        return () => { /* cleanup debounce */ };
    }, [searchKey, userData]);

    useFocusEffect(
        useCallback(() => {
            if (userData?._id) {
                fetchMyBorrowedItems(1, searchKey, userData._id);
            }
        }, [userData, searchKey])
    );

    const onRefresh = useCallback(() => { if (userData?._id) { setRefreshing(true); fetchMyBorrowedItems(1, searchKey, userData._id); } else {setRefreshing(false);}}, [userData, searchKey]);
    const handleLoadMore = () => { if (!isLoading && !refreshing && borrowedItems.length < totalItems && userData?._id) { fetchMyBorrowedItems(currentPage + 1, searchKey, userData._id); }};
    const getStatusColor = (status) => { /* ... same as before ... */ };
    const formatDate = (dateStr, includeTime=true) => { /* ... same as new.jsx (formatDateForDisplay) ... */ };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => router.push(`/borrowed-assets/${item._id}`)}>
            <View style={styles.itemHeader}>
                <MaterialCommunityIcons name={ item.item_borrowed?.toLowerCase().includes('chair') ? "chair-school" :
                                            item.item_borrowed?.toLowerCase().includes('table') ? "table-furniture" :
                                            item.item_borrowed?.toLowerCase().includes('tent') ? "tent" :
                                            item.item_borrowed?.toLowerCase().includes('oxygen') ? "gas-cylinder" :
                                            item.item_borrowed?.toLowerCase().includes('bp') ? "heart-pulse" :
                                            item.item_borrowed?.toLowerCase().includes('aid') ? "medical-bag" :
                                            item.item_borrowed?.toLowerCase().includes('wheelchair') ? "wheelchair-accessibility" :
                                            item.item_borrowed?.toLowerCase().includes('nebulizer') ? "air-humidifier" : // or 'lungs'
                                            item.item_borrowed?.toLowerCase().includes('stick') ? "sign-direction" : // or 'hiking'
                                            "archive-outline" }
                                      size={24} color="#4A90E2" style={{marginRight: 10}}/>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.item_borrowed}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.itemDetail}>Borrowed on: {formatDate(item.borrow_datetime)}</Text>
            <Text style={styles.itemDetail}>From: {item.borrowed_from_personnel}</Text>
            {item.date_returned && <Text style={styles.itemDetail}>Returned on: {formatDate(item.date_returned)}</Text>}
            {item.notes && <Text style={styles.itemDescription} numberOfLines={2}>Notes: {item.notes}</Text>}
        </TouchableOpacity>
    );

    if (isLoading && borrowedItems.length === 0 && !refreshing) {
        return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" /><Text>Loading your items...</Text></View>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>My Borrowed Items</Text>
                 <Link href="/borrowed-assets/new" asChild>
                    <TouchableOpacity>
                        <MaterialCommunityIcons name="plus-circle-outline" size={28} color="white" />
                    </TouchableOpacity>
                </Link>
            </View>
            <View style={styles.container}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search your borrowed items..."
                    value={searchKey}
                    onChangeText={setSearchKey}
                    placeholderTextColor="#888"
                    clearButtonMode="while-editing"
                />
                {borrowedItems.length === 0 && !isLoading ? (
                    <ScrollView contentContainerStyle={styles.emptyStateContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                        <MaterialCommunityIcons name="archive-cancel-outline" size={80} color="#B0BEC5" />
                        <Text style={styles.emptyStateText}>You haven't borrowed any items yet.</Text>
                        <Text style={styles.emptyStateSubText}>Tap '+' to log a new borrowing.</Text>
                    </ScrollView>
                ) : (
                    <FlatList
                        data={borrowedItems}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id.toString()}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={isLoading && borrowedItems.length > 0 && !refreshing ? <ActivityIndicator style={{ marginVertical: 20 }} color="#0F00D7" /> : null}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};
// Styles (similar to AllComplaintsScreen styles, adjust as needed for item display)
const styles = StyleSheet.create({
    // ... (Copy relevant styles from AllComplaintsScreen or other list screens)
    safeArea: { flex: 1, backgroundColor: '#0F00D7' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    container: { flex: 1, backgroundColor: '#F4F7FC', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -1, paddingTop: 15, paddingHorizontal: 15 },
    searchInput: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderRadius: 10, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
    loaderContainerFullPage: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'},
    list: { flex: 1 },
    itemContainer: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    itemTitle: { fontSize: 17, fontWeight: '600', color: '#333', flex: 1, marginRight: 5 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
    statusText: { color: 'white', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    itemDetail: { fontSize: 13, color: '#777', marginBottom: 2 },
    itemDescription: { fontSize: 14, color: '#444', marginTop: 5 },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyStateText: { fontSize: 18, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 8 },
    emptyStateSubText: { fontSize: 14, color: '#777', textAlign: 'center' },
});

export default MyBorrowedItemsScreen;