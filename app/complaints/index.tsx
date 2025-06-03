// app/complaints/index.jsx
import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, RefreshControl, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const AllComplaintsScreen = () => {
    const router = useRouter();
    const [complaints, setComplaints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchKey, setSearchKey] = useState('');
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15; // Or make this configurable

    const fetchComplaints = async (page = 1, searchTerm = searchKey) => {
        if (page === 1) setIsLoading(true); // Show loader only on initial load or new search
        else setRefreshing(true);

        try {
            
            const storedUserData: any = await AsyncStorage.getItem('userData');
            const parsedUserData = JSON.parse(storedUserData);
            const response = await apiRequest('GET', '/api/complaints/by-resident/' +  parsedUserData._id || '' , null, {
                search: searchTerm,
                page: page,
                itemsPerPage: itemsPerPage,
            });
            if (response && response.complaints) {
                setComplaints(page === 1 ? response.complaints : [...complaints, ...response.complaints]);
                setTotalItems(response.total || 0);
                setCurrentPage(page);
            } else {
                if (page === 1) setComplaints([]);
                // Alert.alert("Info", "No complaints found or failed to fetch.");
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
    
    // Initial load and search trigger
    useEffect(() => {
        const debouncedFetch = debounce(() => fetchComplaints(1, searchKey), 500);
        debouncedFetch();
        return () => clearTimeout(debouncedFetch); // Cleanup debounce
    }, [searchKey]);

    useFocusEffect( // Refetch when screen is focused
        useCallback(() => {
            fetchComplaints(1, searchKey); // Reset to page 1 and use current search
        }, []) // Empty dependency array to run on focus, searchKey will trigger its own fetch
    );

    const onRefresh = useCallback(() => {
        fetchComplaints(1, searchKey); // Reset to page 1 and use current search
    }, [searchKey]);

    const handleLoadMore = () => {
        if (!isLoading && !refreshing && complaints.length < totalItems) {
            fetchComplaints(currentPage + 1, searchKey);
        }
    };

    const getStatusColor = (status) => { /* ... same as web version ... */
        const colors = {"New":'#2196F3',"Under Investigation":'#FF9800',"Resolved":'#4CAF50',"Closed":'#9E9E9E',"Dismissed":'#F44336'}; return colors[status]||'#757575';
    };
    const formatDate = (dateStr) => { /* ... same as web version ... */
        if(!dateStr)return'N/A';try{return new Date(dateStr).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}catch(e){return dateStr;}
    };

    const renderComplaintItem = ({ item }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => router.push(`/complaints/${item._id}`)}>
            <View style={styles.itemHeader}>
                 <MaterialCommunityIcons name="comment-alert-outline" size={22} color="#424242" style={{marginRight: 8}}/>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.complainant_display_name || 'N/A'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.itemSubtitle}>Against: {item.person_complained_against_name || 'N/A'}</Text>
            <Text style={styles.itemDetail}>Date: {formatDate(item.date_of_complaint)} at {item.time_of_complaint}</Text>
            <Text style={styles.itemDescription} numberOfLines={2}>
                Details: {item.notes_description || 'No description provided.'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/portal')}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>All Complaints</Text>
                <Link href="/complaints/new" asChild>
                    <TouchableOpacity>
                        <MaterialCommunityIcons name="plus-circle-outline" size={28} color="white" />
                    </TouchableOpacity>
                </Link>
            </View>

            <View style={styles.container}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Complainant, Against, Status..."
                    value={searchKey}
                    onChangeText={setSearchKey}
                    placeholderTextColor="#888"
                />
                {isLoading && complaints.length === 0 && !refreshing ? (
                    <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading complaints...</Text></View>
                ) : complaints.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <MaterialCommunityIcons name="comment-remove-outline" size={80} color="#B0BEC5" />
                        <Text style={styles.emptyStateText}>No complaints found.</Text>
                        <Text style={styles.emptyStateSubText}>{searchKey ? "Try adjusting your search term." : "Be the first to file one if needed."}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={complaints}
                        renderItem={renderComplaintItem}
                        keyExtractor={(item) => item._id.toString()}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={isLoading && complaints.length > 0 && !refreshing ? <ActivityIndicator style={{ marginVertical: 20 }} color="#0F00D7" /> : null}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

// Debounce utility (place outside component or import)
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

// Styles (similar to document-requests/index.jsx, adjust as needed)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' }, // Match navbar for seamless top
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    container: { flex: 1, backgroundColor: '#F4F7FC', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -1, paddingTop: 15, paddingHorizontal: 15 },
    searchInput: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    list: { flex: 1 },
    itemContainer: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    itemTitle: { fontSize: 17, fontWeight: '600', color: '#333', flex: 1, marginRight: 5 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
    statusText: { color: 'white', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    itemSubtitle: { fontSize: 14, color: '#555', marginBottom: 4 },
    itemDetail: { fontSize: 13, color: '#777', marginBottom: 2 },
    itemDescription: { fontSize: 14, color: '#444', marginTop: 5 },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyStateText: { fontSize: 18, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 8 },
    emptyStateSubText: { fontSize: 14, color: '#777', textAlign: 'center' },
});

export default AllComplaintsScreen;