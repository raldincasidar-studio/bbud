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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const AllComplaintsScreen = () => {
    const router = useRouter();
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchKey, setSearchKey] = useState('');
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const fetchComplaints = async (page = 1, searchTerm = searchKey) => {
        if (page === 1) setIsLoading(true);
        else setRefreshing(true);

        try {
            const storedUserData = await AsyncStorage.getItem('userData');
            if (!storedUserData) {
                Alert.alert("Authentication Error", "Please log in to view your complaints.");
                router.replace('/login');
                setIsLoading(false);
                return;
            }
            const parsedUserData = JSON.parse(storedUserData);
            const residentId = parsedUserData?._id;

            if (!residentId) {
                Alert.alert("Error", "User ID not found. Please log in again.");
                router.replace('/login');
                setIsLoading(false);
                return;
            }

            const response = await apiRequest('GET', `/api/complaints/by-resident/${residentId}`, {
                params: {
                    search: searchTerm,
                    page: page,
                    itemsPerPage: itemsPerPage,
                }
            });

            if (response && response.complaints) {
                setComplaints(page === 1 ? response.complaints : [...complaints, ...response.complaints]);
                setTotalItems(response.total || 0);
                setCurrentPage(page);
            } else {
                if (page === 1) setComplaints([]);
            }
        } catch (error) {
            console.error("Error fetching complaints:", error);
            Alert.alert("Error", "Could not load complaints.");
            if (page === 1) setComplaints([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    // Debounced search trigger
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchComplaints(1, searchKey);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchKey]);

    // Refetch when screen is focused
    useFocusEffect(
        useCallback(() => {
            fetchComplaints(1, searchKey);
        }, [])
    );

    const onRefresh = useCallback(() => {
        fetchComplaints(1, searchKey);
    }, [searchKey]);

    const handleLoadMore = () => {
        if (!isLoading && !refreshing && complaints.length < totalItems) {
            fetchComplaints(currentPage + 1, searchKey);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            "New": '#2196F3',
            "Under Investigation": '#FFC107',
            "Resolved": '#4CAF50',
            "Closed": '#9E9E9E',
            "Dismissed": '#F44336',
        };
        return colors[status] || '#757575';
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) { return dateStr; }
    };

    const renderComplaintItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => router.push(`/complaints/${item._id}`)}>
            <View style={styles.itemHeader}>
                <View style={styles.itemHeaderLeft}>
                    <MaterialCommunityIcons name="comment-alert-outline" size={22} color="#0F00D7" style={{ marginRight: 8 }} />
                    <Text style={styles.itemCategory} numberOfLines={1}>{item.category || 'General Complaint'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.itemContent}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ref #:</Text>
                    <Text style={styles.detailValue}>{item._id}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Against:</Text>
                    <Text style={styles.detailValue}>{item.person_complained_against_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date Filed:</Text>
                    <Text style={styles.detailValue}>{formatDate(item.date_of_complaint)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

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

                {isLoading && complaints.length === 0 ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#0F00D7" />
                        <Text style={styles.loadingText}>Loading complaints...</Text>
                    </View>
                ) : complaints.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <MaterialCommunityIcons name="comment-search-outline" size={80} color="#B0BEC5" />
                        <Text style={styles.emptyStateText}>No Complaints Found</Text>
                        <Text style={styles.emptyStateSubText}>{searchKey ? "Try adjusting your search term." : "You haven't filed any complaints yet."}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={complaints}
                        renderItem={renderComplaintItem}
                        keyExtractor={(item) => item._id.toString()}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={refreshing && complaints.length > 0 ? <ActivityIndicator style={{ marginVertical: 20 }} color="#0F00D7" /> : null}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
        paddingHorizontal: 15
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
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 45,
        fontSize: 16,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555'
    },
    list: {
        flex: 1
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
        paddingLeft: 5, // Small indent for content
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
        width: 100, // Fixed width for labels
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

export default AllComplaintsScreen;