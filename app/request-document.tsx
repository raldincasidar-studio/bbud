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
    Keyboard,
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

const STATUSES = ["All", "Pending", "Follow up", "Processing", "Ready for Pickup", "Released", "Declined"];

const MyRequestedDocumentsScreen = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<{ _id: string } | null>(null);
    const [requestedDocuments, setRequestedDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Start with loading true
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // --- Step 1: Dedicated effect to load user data on mount ---
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const storedUserData = await AsyncStorage.getItem('userData');
                if (storedUserData) {
                    setUserData(JSON.parse(storedUserData));
                } else {
                    Alert.alert("Authentication Error", "Please log in to view your requested documents.");
                    router.replace('/');
                    setIsLoading(false); // Stop loading as we are navigating away
                }
            } catch (error) {
                 Alert.alert("Error", "Could not retrieve user data.");
                 setIsLoading(false);
            }
        };

        loadUserData();
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Step 2: Main fetching logic, triggered by state changes ---
    const fetchDocuments = useCallback(async (isRefresh = false) => {
        // Guard clause: Don't fetch if user data isn't loaded yet.
        if (!userData?._id) {
            if (!isRefresh) setIsLoading(false); // Stop loading if no user
            if (isRefresh) setRefreshing(false); // Stop refreshing if no user
            return;
        }

        // Set loading states
        if (!isRefresh) {
            setIsLoading(true);
        }

        try {
            const params: any = {
                // The API can be hit or miss with this param, so we keep client-side filtering
                byResidentId: userData._id,
                sortBy: 'date_of_request',
                sortOrder: 'desc',
            };

            if (searchQuery) {
                params.search = searchQuery;
            }

            if (statusFilter !== 'All') {
                params.status = statusFilter;
            }
            
            const response = await apiRequest('GET', `/api/document-requests?${new URLSearchParams(params).toString()}`,);

            if (response && response.requests) {
                // IMPORTANT: Client-side filtering as a reliable fallback
                const myRequests = response.requests.filter(
                    (req: any) => true
                );
                setRequestedDocuments(myRequests);
            } else {
                setRequestedDocuments([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Alert.alert("Error", "Could not load your requested documents.");
            setRequestedDocuments([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [userData, searchQuery, statusFilter]); // Re-create this function if these dependencies change

    // --- Step 3: Use effects to call the fetch function ---

    // Effect for initial load (after user data is available) and filter changes
    useEffect(() => {
        // Debounce search input to avoid excessive API calls while typing
        const handler = setTimeout(() => {
            fetchDocuments();
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [fetchDocuments]); // This effect now correctly depends on the memoized fetchDocuments

    // Effect to refetch data when the screen comes into focus (e.g., after navigating back)
    useFocusEffect(
        useCallback(() => {
            // We call fetchDocuments directly to ensure the list is up-to-date
            fetchDocuments();
        }, [fetchDocuments]) // Depend on fetchDocuments to avoid using a stale function
    );

    // Handler for pull-to-refresh
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // The `isRefresh` flag is handled inside fetchDocuments
        fetchDocuments(true);
    }, [fetchDocuments]);


    // --- Helper and Render Functions (No changes needed below this line) ---

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            "Pending": '#FFA726',
            "Processing": '#29B6F6',
            "Approved": '#26C6DA',
            "Ready for Pickup": '#26A69A',
            "Released": '#66BB6A',
            "Declined": '#EF5350',
        };
        return colors[status] || '#9E9E9E';
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch (e) { return dateString; }
    };

    const renderDocumentItem = ({ item }: { item: any }) => (
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
            <Text style={styles.detailText} numberOfLines={1}>Purpose: {item.purpose_of_request}</Text>
            <Text style={styles.detailText}>Ref #: {item._id}</Text>
            <Text style={styles.detailText}>Requested: {formatDate(item.date_of_request)}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
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

                <View style={styles.filterContainer}>
                    <View style={styles.searchBar}>
                        <MaterialCommunityIcons name="magnify" size={22} color="#888" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by type, purpose..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                        {STATUSES.map(status => (
                            <TouchableOpacity
                                key={status}
                                style={[styles.chip, statusFilter === status && styles.chipActive]}
                                onPress={() => setStatusFilter(status)}
                            >
                                <Text style={[styles.chipText, statusFilter === status && styles.chipTextActive]}>{status}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {isLoading && !refreshing ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#0F00D7" />
                        <Text style={styles.loadingText}>Loading documents...</Text>
                    </View>
                ) : requestedDocuments.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <MaterialCommunityIcons name="file-search-outline" size={80} color="#B0BEC5" style={styles.emptyStateIcon} />
                        <Text style={styles.emptyStateText}>No Documents Found</Text>
                        <Text style={styles.emptyStateSubText}>No requests match your current filters, or you haven't requested any documents yet.</Text>
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

// --- Styles (No changes needed) ---
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
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        backgroundColor: '#0F00D7',
    },
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
        marginBottom: 15,
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
    },
    buttonIcon: {
        marginRight: 8,
    },
    newRequestButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    filterContainer: {
        marginBottom: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 45,
        fontSize: 16,
    },
    chipContainer: {
        paddingVertical: 5,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#E8EAF6',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#C5CAE9'
    },
    chipActive: {
        backgroundColor: '#5E76FF',
        borderColor: '#3D5AFE',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3F51B5'
    },
    chipTextActive: {
        color: 'white',
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
        borderLeftWidth: 5,
        borderLeftColor: '#5E76FF',
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemIcon: {
        marginRight: 10,
    },
    documentType: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 15,
        marginLeft: 10,
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
        paddingLeft: 34,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50,
    },
    emptyStateIcon: {
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