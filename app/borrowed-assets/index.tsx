import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const STATUS_CONFIG: { [key: string]: { color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap } } = {
  Pending:    { color: '#78909C', icon: 'clock-outline' },
  Processing: { color: '#42A5F5', icon: 'cogs' },
  Approved:   { color: '#FF7043', icon: 'check-circle-outline' },
  Returned:   { color: '#66BB6A', icon: 'check-all' },
  Overdue:    { color: '#EF5350', icon: 'alert-octagon-outline' },
  Lost:       { color: '#212121', icon: 'help-rhombus-outline' },
  Damaged:    { color: '#FFB300', icon: 'alert-decagram-outline' },
  Resolved:   { color: '#26A69A', icon: 'handshake-outline' },
  Rejected:   { color: '#E57373', icon: 'cancel' },
};

const STATUS_FILTER_OPTIONS = Object.keys(STATUS_CONFIG);

const BorrowedAssetsScreen = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<{ _id: string } | null>(null);
    const [borrowedItems, setBorrowedItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // --- NEW: State for filters ---
    const [searchKey, setSearchKey] = useState('');
    const [statusFilter, setStatusFilter] = useState<string[]>([]); // Array for multi-select
    
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // --- REVISED: Data Fetching Function ---
    const fetchBorrowedItems = async (page = 1, isInitialLoad = false) => {
        if (page === 1 && !refreshing) setIsLoading(true);

        let currentUserId = userData?._id;
        if (!currentUserId && isInitialLoad) {
            try {
                const storedData = await AsyncStorage.getItem('userData');
                if (storedData) {
                    const parsed = JSON.parse(storedData);
                    setUserData(parsed);
                    currentUserId = parsed._id;
                }
            } catch (e) { /* handle error */ }
        }
        
        if (!currentUserId) {
            setIsLoading(false);
            setRefreshing(false);
            // Optionally show an alert or redirect
            return;
        }

        try {
            const params: any = {
                search: searchKey,
                page: page,
                itemsPerPage: itemsPerPage,
                sortBy: 'created_at',
                sortOrder: 'desc',
                byResidentId: currentUserId
            };
            // Add status filter if any are selected
            if (statusFilter.length > 0) {
                params.status = statusFilter.join(',');
            }
            
            // The API must be able to filter by the borrower's ID on this main endpoint
            // This is a more robust approach than a separate endpoint.
            // params.borrower_resident_id = currentUserId; 
            
            // Based on the provided API, there's a specific endpoint for this.
            // Let's use that for clarity, but the above approach is also valid.
            const response = await apiRequest('GET', `/api/borrowed-assets?${new URLSearchParams(params).toString()}`);

            if (response && response.transactions) {
                setBorrowedItems(page === 1 ? response.transactions : [...borrowedItems, ...response.transactions]);
                setTotalItems(response.total || 0);
                setCurrentPage(page);
            } else {
                if (page === 1) setBorrowedItems([]);
            }
        } catch (error) {
            console.error("Error fetching borrowed items:", error);
            Alert.alert("Error", "Could not load your borrowed items.");
            if (page === 1) setBorrowedItems([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };
    
    // Initial data load effect
    useEffect(() => {
        fetchBorrowedItems(1, true);
    }, [userData]); // Run when userData is first set

    // Filter change effect
    useEffect(() => {
        const handler = setTimeout(() => {
            if (userData?._id) { // Ensure user data is available before fetching
                fetchBorrowedItems(1);
            }
        }, 500); // Debounce search
        return () => clearTimeout(handler);
    }, [searchKey, statusFilter, userData]); // Re-fetch on any filter change

    useFocusEffect(useCallback(() => {
        if (userData?._id) fetchBorrowedItems(1);
    }, [userData]));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBorrowedItems(1);
    }, [userData, searchKey, statusFilter]);

    const handleLoadMore = () => {
        if (!isLoading && !refreshing && borrowedItems.length < totalItems) {
            fetchBorrowedItems(currentPage + 1);
        }
    };

    const handleStatusFilterToggle = (status: string) => {
        setStatusFilter(prev => {
            const isSelected = prev.includes(status);
            if (isSelected) {
                return prev.filter(s => s !== status); // Remove status
            } else {
                return [...prev, status]; // Add status
            }
        });
    };

    const formatDate = (dateString?: string, includeTime = true) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
                options.hour12 = true;
            }
            return date.toLocaleString('en-US', options);
        } catch (e) {
            return dateString;
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => router.push(`/borrowed-assets/${item._id}`)}>
            <View style={styles.itemHeader}>
                <View style={styles.itemHeaderLeft}>
                    <MaterialCommunityIcons name={STATUS_CONFIG[item.status]?.icon || 'help-circle-outline'} size={24} color={STATUS_CONFIG[item.status]?.color || '#757575'} />
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.item_borrowed}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[item.status]?.color || '#757575' }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.itemContent}>
                 <Text style={styles.itemDetail}><Text style={styles.detailLabel}>Borrowed:</Text> {formatDate(item.borrow_datetime)}</Text>
                 <Text style={styles.itemDetail}><Text style={styles.detailLabel}>Expected Return:</Text> {formatDate(item.expected_return_date, false)}</Text>
                 {item.date_returned && <Text style={styles.itemDetail}><Text style={styles.detailLabel}>Returned:</Text> {formatDate(item.date_returned)}</Text>}
            </View>
        </TouchableOpacity>
    );

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
                 <View style={styles.searchBar}>
                     <MaterialCommunityIcons name="magnify" size={22} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your borrowed items..."
                        value={searchKey}
                        onChangeText={setSearchKey}
                        placeholderTextColor="#888"
                    />
                </View>
                
                <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                        {STATUS_FILTER_OPTIONS.map(status => (
                            <TouchableOpacity
                                key={status}
                                style={[styles.chip, statusFilter.includes(status) && styles.chipActive]}
                                onPress={() => handleStatusFilterToggle(status)}
                            >
                                <MaterialCommunityIcons name={STATUS_CONFIG[status]?.icon || 'help-circle'} size={16} color={statusFilter.includes(status) ? 'white' : STATUS_CONFIG[status]?.color} style={{ marginRight: 6 }} />
                                <Text style={[styles.chipText, statusFilter.includes(status) && styles.chipTextActive]}>{status}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {isLoading && borrowedItems.length === 0 ? (
                    <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading your items...</Text></View>
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
                        ListFooterComponent={refreshing ? <ActivityIndicator style={{ marginVertical: 20 }} color="#0F00D7" /> : null}
                        ListEmptyComponent={!isLoading ? (
                             <View style={styles.emptyStateContainer}>
                                <MaterialCommunityIcons name="archive-search-outline" size={80} color="#B0BEC5" />
                                <Text style={styles.emptyStateText}>No Items Found</Text>
                                <Text style={styles.emptyStateSubText}>No items match your filters, or you have no borrowed items.</Text>
                            </View>
                        ) : null}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 40 : 50, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    container: { flex: 1, backgroundColor: '#F4F7FC', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 15, paddingHorizontal: 15 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10, },
    searchIcon: { marginRight: 8, },
    searchInput: { flex: 1, height: 45, fontSize: 16, },
    chipContainer: { paddingVertical: 5, paddingBottom: 15, },
    chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E8EAF6', marginRight: 8, borderWidth: 1, borderColor: '#C5CAE9' },
    chipActive: { backgroundColor: '#5E76FF', borderColor: '#3D5AFE', },
    chipText: { fontSize: 14, fontWeight: '600', color: '#3F51B5' },
    chipTextActive: { color: 'white', },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    list: { flex: 1, marginTop: 5, },
    itemContainer: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, borderWidth: 1, borderColor: '#E8E8E8' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, },
    itemHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
    statusText: { color: 'white', fontSize: 12, fontWeight: 'bold', },
    itemContent: { borderTopWidth: 1, borderColor: '#F0F0F0', paddingTop: 10 },
    itemDetail: { fontSize: 14, color: '#666', marginBottom: 4 },
    detailLabel: { fontWeight: '600', color: '#333' },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50 },
    emptyStateText: { fontSize: 18, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 8 },
    emptyStateSubText: { fontSize: 14, color: '#777', textAlign: 'center' },
});

export default BorrowedAssetsScreen;