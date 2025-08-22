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
        <View style={[styles.itemContainer, { paddingRight: 20, paddingLeft: 30}]}>
            <Text style={styles.itemName} numberOfLines={1}>{item.budgetName}</Text>
            <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
        </View>
    );

    const renderSectionHeader = ({ section }: { section: BudgetSection }) => (
        <View style={[styles.sectionHeaderContainer, { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <Text style={[styles.sectionHeaderText, { color: 'black' }]} ellipsizeMode="tail">
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
                <View style={{width: 28}} />
            </View>


            
            <SectionList
                sections={sections}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListHeaderComponent={() => (
                    <Text style={styles.mainTitle}>Budget Management</Text>
                )}
                ListFooterComponent={() => (
                    <View style={[styles.footerContainer, { flex: 1, justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: 'row' }]}>
                        <Text style={[styles.totalLabel, { color: '#0F00D7'}]}>Total Expenditures</Text>
                        <Text style={[styles.totalAmount, { color: '#0F00D7'}]}>P {formatCurrency(totalExpenditures)}</Text>
                    </View>
                )}
                stickySectionHeadersEnabled={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]}/>}
            />
        </SafeAreaView>
    );
};

// ===================================================================
// === STYLESHEET WITH UPDATED FONT SIZES
// ===================================================================
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F00D7' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 30 : 45, backgroundColor: '#0F00D7'},
    navbarTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    container: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -1, },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'white',},
    mainTitle: { fontSize: 22, fontWeight: 'bold', marginVertical: 15, textAlign: 'center', paddingHorizontal: 20,},
    sectionHeaderContainer: { 
        marginTop: 25, 
        marginBottom: 8, 
        paddingHorizontal: 20, 
        maxWidth: '100%',
        boxSizing: 'border-box',
    },
    // --- FONT SIZE FIX ---
    sectionHeaderText: { 
        fontSize: 16, // Changed from 18
        fontWeight: 'bold', 
        color: '#000', 
        marginBottom: 4,
    },
    sectionHeaderTotal: { 
        fontSize: 16, // Changed from 18
        fontWeight: 'bold', 
        color: '#333', 
        textAlign: 'right', 
        paddingLeft: 10,
        boxSizing: 'border-box',
    },
    itemContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingVertical: 8, 
        paddingHorizontal: 35, 
    },
    itemName: { 
        fontSize: 14, // Changed from 15
        color: '#444', 
        flex: 1, 
        marginRight: 8,
    },
    itemAmount: { 
        fontSize: 14, // Changed from 15
        color: '#444', 
        fontWeight: '500', 
        paddingLeft: 10,
    },
    // --- END FONT SIZE FIX ---
    footerContainer: { 
        marginTop: 30, 
        marginHorizontal: 20, 
        paddingTop: 15, 
        borderTopWidth: 2, 
        borderColor: '#000', 
    },
    totalLabel: { 
        fontSize: 17, // Changed from 18
        fontWeight: 'bold', 
        color: '#000', 
        marginBottom: 5, 
    },
    totalAmount: { 
        fontSize: 17, // Changed from 18
        fontWeight: 'bold', 
        color: '#000', 
        textAlign: 'right', 
    },
    errorText: { 
        color: '#D32F2F', 
        fontSize: 18, 
        fontWeight: 'bold', 
        marginBottom: 5, 
        textAlign: 'center', 
    },
    retryButton: { 
        backgroundColor: '#0F00D7', 
        paddingVertical: 12, 
        paddingHorizontal: 25, 
        borderRadius: 8, 
    },
    retryButtonText: { 
        color: '#FFFFFF', 
        fontSize: 16, 
        fontWeight: 'bold', 
    }
});

export default BudgetScreen;