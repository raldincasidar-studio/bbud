import apiRequest from '@/plugins/axios'; // Using your project's API helper
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    SafeAreaView,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// --- Type Definitions for TypeScript/JSDoc ---
interface BudgetItem {
  _id: string;
  budgetName: string;
  category: string;
  amount: number;
  date: string;
}

interface BudgetSection {
  title: string;
  subTotal: number;
  data: BudgetItem[];
}

// Helper to format numbers with commas and decimal places
const formatCurrency = (value: number) => {
  if (typeof value !== 'number') {
    return '0.00';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const BudgetScreen = () => {
    const router = useRouter();
    const [sections, setSections] = useState<BudgetSection[]>([]);
    const [totalExpenditures, setTotalExpenditures] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBudgetSummary = useCallback(async () => {
        if (!refreshing) setIsLoading(true);
        setError(null);

        try {
            const response = await apiRequest('GET', '/api/budgets', null, {
                itemsPerPage: 9999,
            });

            if (response && response.budgets) {
                const budgets: BudgetItem[] = response.budgets;

                const grouped: { [key: string]: { items: BudgetItem[]; subTotal: number } } = {};
                let grandTotal = 0;

                for (const item of budgets) {
                    if (!grouped[item.category]) {
                        grouped[item.category] = { items: [], subTotal: 0 };
                    }
                    grouped[item.category].items.push(item);
                    grouped[item.category].subTotal += item.amount;
                    grandTotal += item.amount;
                }

                const formattedSections: BudgetSection[] = Object.keys(grouped).map(categoryName => ({
                    title: categoryName,
                    data: grouped[categoryName].items,
                    subTotal: grouped[categoryName].subTotal,
                }));
                
                setSections(formattedSections);
                setTotalExpenditures(grandTotal);
            } else {
                console.log('Received unexpected response structure:', response);
                throw new Error("Invalid data structure received from server.");
            }
        } catch (e: any) {
            console.error("Error fetching budget summary:", e);
            setError(e.message || 'An unexpected error occurred.');
            Alert.alert("Error", "Could not load the budget summary. Please check your network connection.");
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useEffect(() => {
        fetchBudgetSummary();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBudgetSummary();
    }, [fetchBudgetSummary]);

    // --- Render Functions ---
    const renderItem = ({ item }: { item: BudgetItem }) => (
        <View style={styles.itemContainer}> 
            <Text style={styles.itemName} numberOfLines={1}>{item.budgetName}</Text>
            <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
        </View>
    );

    const renderSectionHeader = ({ section }: { section: BudgetSection }) => (
        <View style={styles.sectionHeaderContainer}> 
            <Text style={styles.sectionHeaderText} ellipsizeMode="tail">
                {section.title}
            </Text>
            <Text style={styles.sectionHeaderTotal}>{formatCurrency(section.subTotal)}</Text>
        </View>
    );
  
    // --- Render States (Loading, Error, Success) ---
    if (isLoading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0F00D7" />
                <Text style={{ marginTop: 10 }}>Loading Budget Summary...</Text>
            </View>
        );
    }

    if (error && sections.length === 0) {
        return (
            <View style={styles.centered}>
                <MaterialCommunityIcons name="network-off-outline" size={60} color="#D32F2F" />
                <Text style={styles.errorText}>Data Fetching Failed</Text>
                <Text style={{color: '#666', marginBottom: 20, textAlign: 'center', paddingHorizontal: 20}}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchBudgetSummary}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Budget</Text>
                {/* Placeholder for consistent spacing */}
                <View style={{width: 28}} /> 
            </View>

            <SectionList
                sections={sections}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 60 }} 
                ListHeaderComponent={() => (
                    <Text style={styles.mainTitle}>Budget Management</Text>
                )}
                ListFooterComponent={() => (
                    // The footerContainer is now set to a column layout
                    <View style={styles.footerContainer}>
                        <Text style={styles.totalLabel}>Total Expenditures</Text>
                        <Text style={styles.totalAmount}>₱ {formatCurrency(totalExpenditures)}</Text>
                    </View>
                )}
                stickySectionHeadersEnabled={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}
            />
        </SafeAreaView>
    );
};

// ===================================================================
// === UPDATED STYLESHEET FOR BETTER DESIGN
// ===================================================================
const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#0F00D7' 
    },
    navbar: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 15, 
        paddingVertical: 10, 
        paddingTop: Platform.OS === 'android' ? 30 : 45, 
        backgroundColor: '#0F00D7'
    },
    navbarTitle: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: 'white' 
    },
    container: { 
        flex: 1, 
        backgroundColor: '#FFFFFF', 
        borderTopLeftRadius: 20, 
        borderTopRightRadius: 20, 
        marginTop: -1, 
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
        backgroundColor: 'white',
    },
    mainTitle: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginVertical: 25, 
        textAlign: 'center', 
        paddingHorizontal: 20,
        color: '#333', 
    },
    sectionHeaderContainer: { 
        marginTop: 25, 
        marginBottom: 12, 
        paddingHorizontal: 24, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
    },
    sectionHeaderText: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#222', 
        flex: 1, 
        marginRight: 10, 
    },
    sectionHeaderTotal: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#555', 
        textAlign: 'right', 
    },
    itemContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 12, 
        paddingHorizontal: 24, 
        borderBottomWidth: StyleSheet.hairlineWidth, 
        borderColor: '#eee', 
    },
    itemName: { 
        fontSize: 15, 
        color: '#444', 
        flex: 1, 
        marginRight: 16, 
    },
    itemAmount: { 
        fontSize: 15, 
        color: '#444', 
        fontWeight: '600', 
    },
    footerContainer: { 
        marginTop: 35, 
        marginHorizontal: 24, 
        paddingTop: 18, 
        borderTopWidth: 2, 
        borderColor: '#0F00D7', 
        flexDirection: 'column', // <--- CHANGED: Layout children in a column
        // alignItems: 'flex-start', // <--- CHANGED: Align children to the start (left)
        paddingBottom: 20, // Added some padding at the bottom of the footer
    },
    totalLabel: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#0F00D7', 
        marginBottom: 8, // <--- ADDED: Space between label and amount
        alignSelf: 'flex-start',
    },
    totalAmount: { 
        fontSize: 22, // <--- CHANGED: Slightly larger for emphasis
        fontWeight: 'bold', 
        color: '#0F00D7', 
        // Removed textAlign: 'right' as it's not needed with column layout and flex-start alignment
        alignSelf: 'flex-end',
    },
    errorText: { 
        color: '#D32F2F', 
        fontSize: 18, 
        fontWeight: 'bold', 
        marginBottom: 8, 
        textAlign: 'center', 
    },
    retryButton: { 
        backgroundColor: '#0F00D7', 
        paddingVertical: 14, 
        paddingHorizontal: 30, 
        borderRadius: 10, 
    },
    retryButtonText: { 
        color: '#FFFFFF', 
        fontSize: 17, 
        fontWeight: 'bold', 
    }
});

export default BudgetScreen;