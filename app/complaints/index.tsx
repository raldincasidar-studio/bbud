// mobile: // index.tsx (Complaints Screen)

import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Define filterConfig outside the component to ensure stability and prevent recreation on re-renders
const filterConfig: { [key: string]: { color: string, icon: string, hexColor: string } } = {
    'All': { color: 'primary', icon: 'filter-variant', hexColor: '#0F00D7' },
    'New': { color: 'info', icon: 'bell-ring-outline', hexColor: '#2196F3' },
    'Under Investigation': { color: 'warning', icon: 'magnify-scan', hexColor: '#FFC107' },
    'Unresolved': { color: 'purple', icon: 'help-circle-outline', hexColor: '#9C27B0' },
    'Resolved': { color: 'success', icon: 'check-circle-outline', hexColor: '#4CAF50' },
    'Closed': { color: 'grey-darken-1', icon: 'archive-outline', hexColor: '#616161' },
    'Dismissed': { color: 'error', icon: 'cancel', hexColor: '#F44336' },
};

// Define localStyles outside the component to prevent recreation on re-renders
const localStyles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' },
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        backgroundColor: '#0F00D7'
    },
    navbarTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white'
    },
    container: {
        flex: 1,
        backgroundColor: '#F4F7FC',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -1,
        paddingTop: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 15,
        marginHorizontal: 15,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 45,
        fontSize: 16,
    },
    filterContainer: {
        marginBottom: 15,
    },
    filterScrollContainer: {
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    filterIcon: {
        marginRight: 5,
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555'
    },
    list: {
        flex: 1,
        paddingHorizontal: 15,
    },
    itemContainer: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#E8E8E8'
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 10,
        marginBottom: 10,
    },
    itemHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    itemCategory: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1A2C47',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 15
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    itemContent: {
        paddingLeft: 5,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        width: 100,
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
        textAlign: 'center',
        marginBottom: 8
    },
    emptyStateSubText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center'
    },
});

// Using 'styles' for consistency, but it's referencing localStyles
const styles = localStyles;


interface FilterButtonProps {
    item: string;
    activeFilter: string;
    onPress: (item: string) => void;
    styles: typeof localStyles; // Use typeof localStyles for typing
}

const FilterButton = memo(({ item, activeFilter, onPress, styles }: FilterButtonProps) => {
    const statusDetail = filterConfig[item];
    const isActive = activeFilter === item;

    const buttonBackgroundColor = isActive ? statusDetail.hexColor : 'white';
    const buttonBorderColor = isActive ? statusDetail.hexColor : '#E0E0E0';
    const textColor = isActive ? 'white' : '#555';
    const iconColor = isActive ? 'white' : '#555';

    return (
        <TouchableOpacity
            style={[
                styles.filterButton,
                { backgroundColor: buttonBackgroundColor, borderColor: buttonBorderColor },
            ]}
            onPress={() => onPress(item)}
        >
            <MaterialCommunityIcons name={statusDetail.icon} size={16} color={iconColor} style={styles.filterIcon} />
            <Text style={[styles.filterButtonText, { color: textColor }]}>
                {item}
            </Text>
        </TouchableOpacity>
    );
});


const AllComplaintsScreen = () => {
    const router = useRouter();
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true); // For initial load, search, filter changes (full screen)
    const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh
    const [isFetchingMore, setIsFetchingMore] = useState(false); // For pagination (footer loader)
    const [searchKey, setSearchKey] = useState('');
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('All');
    const itemsPerPage = 15;

    const complaintStatuses = ["All", "New", "Under Investigation", "Unresolved", "Resolved", "Closed", "Dismissed"];

    const fetchComplaints = async (page = 1, searchTerm = searchKey, statusFilter = activeFilter) => {
        // Only set isLoading true for main fetches (initial, search, filter change for first page)
        // refreshing and isFetchingMore handle their own loading indicators.
        if (page === 1 && !refreshing) { // If it's the first page and not a pull-to-refresh
            setIsLoading(true);
        } else if (page > 1) { // If loading subsequent pages
            setIsFetchingMore(true);
        }

        console.log("DEBUG_FRONTEND: fetchComplaints called with:", { page, searchTerm, statusFilter });

        try {
            const storedUserData = await AsyncStorage.getItem('userData');
            if (!storedUserData) {
                Alert.alert("Authentication Error", "Please log in to view your complaints.");
                router.replace('/login');
                setIsLoading(false);
                setIsFetchingMore(false);
                setRefreshing(false);
                return;
            }
            const parsedUserData = JSON.parse(storedUserData);
            const residentId = parsedUserData?._id;

            if (!residentId) {
                Alert.alert("Error", "User ID not found. Please log in again.");
                router.replace('/login');
                setIsLoading(false);
                setIsFetchingMore(false);
                setRefreshing(false);
                return;
            }

            const params: { search: string; page: number; itemsPerPage: number; status?: string; } = {
                search: searchTerm,
                page: page,
                itemsPerPage: itemsPerPage,
            };

            if (statusFilter !== 'All') {
                params.status = statusFilter;
            }

            const queryString = new URLSearchParams(params as Record<string, string>).toString();
            const url = `/api/complaints/by-resident/${residentId}?${queryString}`;

            console.log("DEBUG_FRONTEND: API Request URL being sent:", url);

            const response = await apiRequest('GET', url);

            if (response && response.complaints) {
                console.log(`DEBUG_FRONTEND: Fetched ${response.complaints.length} complaints for filter '${statusFilter}'. Total: ${response.total}`);
                
                const newComplaints = page === 1 ? response.complaints : [...complaints, ...response.complaints];
                setComplaints(newComplaints);
                setTotalItems(response.total || 0);
                setCurrentPage(page);

                console.log(`DEBUG_FRONTEND: Content of 'complaints' state after update (first 5 items for filter '${statusFilter}'):`);
                newComplaints.slice(0, 5).forEach((c: any, index: number) => {
                    console.log(`  Complaint ${index} _id: ${c._id}, status: ${c.status}, category: ${c.category}`);
                });

            } else {
                console.log(`DEBUG_FRONTEND: No complaints or empty response for filter '${statusFilter}'. Full response:`, response);
                if (page === 1) setComplaints([]);
            }
        } catch (error) {
            console.error("DEBUG_FRONTEND: Error fetching complaints:", error);
            Alert.alert("Error", "Could not load complaints.");
            if (page === 1) setComplaints([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
            setIsFetchingMore(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchComplaints(1, searchKey, activeFilter);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchKey, activeFilter]);

    useFocusEffect(
        useCallback(() => {
            fetchComplaints(1, searchKey, activeFilter);
        }, [searchKey, activeFilter])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchComplaints(1, searchKey, activeFilter);
    }, [searchKey, activeFilter]);

    const handleLoadMore = () => {
        if (!isLoading && !refreshing && !isFetchingMore && complaints.length < totalItems) {
            fetchComplaints(currentPage + 1, searchKey, activeFilter);
        }
    };

    const handleFilterChange = useCallback((status: string) => {
        // Only trigger loading if the filter is actually changing
        if (status !== activeFilter) {
            setIsLoading(true); // Show full-screen loader immediately on filter click
            setActiveFilter(status); // This will trigger the useEffect to fetch data
        }
    }, [activeFilter]); // Depend on activeFilter to prevent unnecessary re-renders

    const getStatusColor = (status: string) => {
        const statusDetail = filterConfig[status];
        return statusDetail ? statusDetail.hexColor : '#757575';
    };

    const getStatusIcon = (status: string) => {
        const statusDetail = filterConfig[status];
        return statusDetail ? statusDetail.icon : "comment-alert-outline";
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) { return dateStr; }
    };

    const renderComplaintItem = ({ item }: { item: any }) => {
        if (!item || !item._id) {
            console.warn("DEBUG_FRONTEND: Skipping rendering for item with missing _id or invalid item:", item);
            return null;
        }
    
        const status = item.status || 'Unknown';
        const category = item.category || 'General Complaint';
        const refNo = item.ref_no || 'N/A';
        const complainedAgainstName = item.person_complained_against_name || 'N/A';
        const dateFiled = formatDate(item.date_of_complaint);
    
        return (
            <TouchableOpacity 
                style={styles.itemContainer} 
                onPress={() => router.push(`/complaints/${item._id}`)}
            >
                <View style={styles.itemHeader}>
                    <View style={styles.itemHeaderLeft}>
                        <MaterialCommunityIcons 
                            name={getStatusIcon(status)} 
                            size={22} 
                            color="#0F00D7" 
                            style={{ marginRight: 8 }} 
                        />
                        <Text style={styles.itemCategory} numberOfLines={1}>{category}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                        <Text style={styles.statusText}>{status}</Text>
                    </View>
                </View>
    
                <View style={styles.itemContent}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Ref #:</Text>
                        <Text style={styles.detailValue}>#{refNo}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Against:</Text>
                        <Text style={styles.detailValue}>{complainedAgainstName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date Filed:</Text>
                        <Text style={styles.detailValue}>{dateFiled}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderFilterButtonWrapper = useCallback(({ item }: { item: string }) => (
        <FilterButton
            item={item}
            activeFilter={activeFilter}
            onPress={handleFilterChange}
            styles={styles}
        />
    ), [activeFilter, handleFilterChange]);


    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>My Complaints</Text>
                <Link href="/complaints/new" asChild>
                    <TouchableOpacity>
                        <MaterialCommunityIcons name="plus-circle-outline" size={28} color="white" />
                    </TouchableOpacity>
                </Link>
            </View>

            <View style={styles.container}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="file-document-outline" size={24} color="#333" />
                    <Text style={styles.sectionTitle}>Complaint History</Text>
                </View>

                <View style={styles.searchBar}>
                     <MaterialCommunityIcons name="magnify" size={22} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by category, person, etc..."
                        value={searchKey}
                        onChangeText={setSearchKey}
                        placeholderTextColor="#888"
                    />
                </View>

                {/* Filter Buttons */}
                <View style={styles.filterContainer}>
                    <FlatList
                        data={complaintStatuses}
                        renderItem={renderFilterButtonWrapper}
                        keyExtractor={(item) => item}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScrollContainer}
                        extraData={activeFilter}
                    />
                </View>

                {/* --- UPDATED RENDERING LOGIC HERE --- */}
                {isLoading && !refreshing ? ( // Show full-screen loader for initial load, search, filter changes (if not just refreshing)
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#0F00D7" />
                        <Text style={styles.loadingText}>Loading complaints...</Text>
                    </View>
                ) : complaints.length === 0 ? ( // Show empty state if no complaints AND not currently loading
                    <View style={styles.emptyStateContainer}>
                        <MaterialCommunityIcons name="comment-search-outline" size={80} color="#B0BEC5" />
                        <Text style={styles.emptyStateText}>No Complaints Found</Text>
                        <Text style={styles.emptyStateSubText}>{searchKey || activeFilter !== 'All' ? "Try adjusting your search or filter term." : "You haven't filed any complaints yet."}</Text>
                    </View>
                ) : ( // Otherwise, display the FlatList with actual data
                    <FlatList
                        data={complaints}
                        key={`${searchKey}-${activeFilter}`}
                        renderItem={renderComplaintItem}
                        keyExtractor={(item) => item._id.toString()}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={isFetchingMore ? (
                            <ActivityIndicator style={{ marginVertical: 20 }} color="#0F00D7" />
                        ) : null}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

export default AllComplaintsScreen;