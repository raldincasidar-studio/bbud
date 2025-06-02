// app/notifications/[id].tsx
import apiRequest from '@/plugins/axios'; // Ensure this path is correct
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Notification {
  _id: string;
  name: string;
  content: string;
  date: string; // ISO Date string from API
  by: string; // Admin name
  created_at?: string;
  updated_at?: string;
}

const ViewNotificationScreen = () => {
    const router = useRouter();
    const { id: notificationId } = useLocalSearchParams<{ id: string }>(); // Get the [id] with type

    const [notification, setNotification] = useState<Notification | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorLoading, setErrorLoading] = useState<string | null>(null);

    const fetchNotificationDetails = useCallback(async () => {
        if (!notificationId) {
            Alert.alert("Error", "Notification ID is missing.");
            setIsLoading(false); setRefreshing(false); setErrorLoading("Notification ID missing.");
            return;
        }
        setIsLoading(true); setErrorLoading(null);
        try {
            const response = await apiRequest('GET', `/api/notifications/${notificationId}`);
            if (response && response.notification) {
                setNotification(response.notification);
            } else {
                setNotification(null);
                setErrorLoading(response?.message || response?.error || "Could not fetch notification details.");
                // Alert.alert("Error", response?.message || response?.error || "Could not fetch notification details.");
            }
        } catch (error: any) {
            console.error("Error fetching notification details:", error);
            setErrorLoading(error.response?.data?.message || error.message || "An error occurred.");
            // Alert.alert("Error", "An error occurred while fetching details.");
            setNotification(null);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [notificationId]);

    useEffect(() => {
        fetchNotificationDetails();
    }, [fetchNotificationDetails]); // fetchNotificationDetails is memoized and depends on notificationId

    useFocusEffect(fetchNotificationDetails); // Refetch on focus

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotificationDetails();
    }, [fetchNotificationDetails]);

    const formatDate = (dateString: string | undefined, includeTime = true): string => {
        if (!dateString) return 'N/A';
        try {
            const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return new Date(dateString).toLocaleDateString('en-US', options);
        } catch (e) { return dateString; }
    };

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.navbarTitle}>Notification Details</Text>
                    <View style={{width: 28}} /> {/* Placeholder */}
                </View>
                <View style={styles.loaderContainerFullPage}>
                    <ActivityIndicator size="large" color="#0F00D7" />
                    <Text style={styles.loadingText}>Loading notification...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (errorLoading || !notification) {
        return (
            <SafeAreaView style={styles.safeArea}>
                 <View style={styles.navbar}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.navbarTitle}>Error</Text>
                     <View style={{ width: 28 }} />
                </View>
                <View style={styles.emptyStateContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#EF5350" />
                    <Text style={styles.emptyStateText}>{errorLoading || "Notification not found."}</Text>
                    <TouchableOpacity onPress={fetchNotificationDetails} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle} numberOfLines={1} ellipsizeMode="tail">
                    {notification.name}
                </Text>
                {/* Placeholder for Edit/Delete buttons if admin */}
                <View style={{ width: 28 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />
                }
            >
                <View style={styles.headerContent}>
                    <MaterialCommunityIcons name="bell-ring-outline" size={40} color="#0F00D7" style={styles.headerIcon} />
                    <Text style={styles.notificationTitle}>{notification.name}</Text>
                </View>

                <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="calendar-month-outline" size={22} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>{formatDate(notification.date, true)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="account-tie-outline" size={22} color="#555" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>By:</Text>
                        <Text style={styles.detailValue}>{notification.by || 'System Admin'}</Text>
                    </View>
                </View>

                <View style={styles.contentCard}>
                    <Text style={styles.contentLabel}>Content:</Text>
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


                {/* Optional: Add Edit/Delete buttons here if the user is an admin */}
                {/* This would require checking user role from AsyncStorage */}
                {/* 
                <View style={styles.adminActionsContainer}>
                    <TouchableOpacity style={styles.adminButton} onPress={() => router.push(`/notifications/edit/${notificationId}`)}> // Assuming an edit route
                        <MaterialCommunityIcons name="pencil-outline" size={20} color="white" />
                        <Text style={styles.adminButtonText}>Edit</Text>
                    </TouchableOpacity>
                     <TouchableOpacity style={[styles.adminButton, styles.deleteButton]} onPress={() => handleDeleteConfirmation()}>
                        <MaterialCommunityIcons name="delete-outline" size={20} color="white" />
                        <Text style={styles.adminButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
                */}


            </ScrollView>
        </SafeAreaView>
    );
};

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
        paddingTop: Platform.OS === 'android' ? 30 : 45,
        backgroundColor: '#0F00D7', // Or a color suitable for notifications
    },
    navbarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        flex: 1, // Allow text to take space and truncate
        textAlign: 'center',
        marginHorizontal: 10,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 20, // Overall padding for content
        paddingBottom: 40,
    },
    loaderContainerFullPage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F7FC',
    },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyStateText: { fontSize: 18, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 15 },
    retryButton: { backgroundColor: '#0F00D7', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, marginTop:10 },
    retryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold'},
    headerContent: {
        alignItems: 'center',
        marginBottom: 25,
        paddingVertical: 15,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
    },
    headerIcon: {
        marginBottom: 10,
    },
    notificationTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 5,
    },
    detailCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2.5,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    detailIcon: {
        marginRight: 12,
        marginTop: 2, // Align with text
        color: '#607D8B', // Softer icon color
    },
    detailLabel: {
        fontSize: 15,
        color: '#555',
        fontWeight: '500',
        width: 80, // Fixed width for labels
    },
    detailValue: {
        fontSize: 15,
        color: '#333',
        flex: 1, // Allow value to wrap
    },
    contentCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2.5,
    },
    contentLabel: {
        fontSize: 17,
        fontWeight: '600',
        color: '#0F00D7',
        marginBottom: 10,
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24, // Improved readability
        color: '#333',
    },
    timestampText: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
        marginTop: 15,
    },
    adminActionsContainer: { // For optional Edit/Delete buttons
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 30,
    },
    adminButton: {
        flexDirection: 'row',
        backgroundColor: '#5E76FF',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#D32F2F',
    },
    adminButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    }
});

export default ViewNotificationScreen;