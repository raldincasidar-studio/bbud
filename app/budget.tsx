import apiRequest from '@/plugins/axios'; // Using your project's API helper
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; // Import Picker
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react'; // Import useRef
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
  date: string; // Assuming date is a string, but will be parsed to Date for filtering
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

    // --- Filter States ---
    const [selectedYearFilter, setSelectedYearFilter] = useState<string | null>(null);
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(null);
    const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);
    const [availableYears, setAvailableYears] = useState<number[]>([]);

    // Ref to prevent initial year filter from being set multiple times or overriding user clear
    const hasInitialYearBeenSet = useRef(false);

    // Generate month options (1-12) and their names
    const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    // Generate day options (1-31)
    const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1));


    // Function to fetch distinct years from the backend for the year filter dropdown
    const fetchDistinctYears = useCallback(async () => {
        try {
            const response = await apiRequest('GET', '/api/budgets/years');
            if (response && response.years) {
                const yearsSorted = response.years.sort((a: number, b: number) => b - a); // Sort descending
                setAvailableYears(yearsSorted);
            }
        } catch (e) {
            console.error("Error fetching distinct years:", e);
            Alert.alert("Error", "Could not load available years for filtering.");
        }
    }, []); 

    const fetchBudgetSummary = useCallback(async () => {
        if (!refreshing) {
            setIsLoading(true); 
        }
        setError(null);

        try {
            const queryParams: {
                itemsPerPage: number;
                filterYear?: string;
                start_date?: string;
                end_date?: string;
            } = {
                itemsPerPage: 9999, 
            };

            // Apply filters based on precedence: Day > Month > Year
            if (selectedYearFilter && selectedMonthFilter && selectedDayFilter) {
                const yearNum = parseInt(selectedYearFilter);
                const monthIndex = parseInt(selectedMonthFilter) - 1; // 0-indexed month
                const dayNum = parseInt(selectedDayFilter);

                const startDate = new Date(Date.UTC(yearNum, monthIndex, dayNum, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(yearNum, monthIndex, dayNum, 23, 59, 59, 999));
                
                queryParams.start_date = startDate.toISOString();
                queryParams.end_date = endDate.toISOString();
            } 
            else if (selectedYearFilter && selectedMonthFilter) {
                const yearNum = parseInt(selectedYearFilter);
                const monthIndex = parseInt(selectedMonthFilter) - 1; // 0-indexed month

                const startDate = new Date(Date.UTC(yearNum, monthIndex, 1, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(yearNum, monthIndex + 1, 0, 23, 59, 59, 999)); 

                queryParams.start_date = startDate.toISOString();
                queryParams.end_date = endDate.toISOString();
            } 
            else if (selectedYearFilter) {
                queryParams.filterYear = selectedYearFilter;
            }

            console.log("Fetching budgets with parameters:", queryParams);

            const url = '/api/budgets';
            const params = new URLSearchParams();
            for (const key in queryParams) {
                if (queryParams[key] !== undefined && queryParams[key] !== null) {
                    params.append(key, String(queryParams[key]));
                }
            }
            const queryString = params.toString();
            const fullUrl = queryString ? `${url}?${queryString}` : url;

            const response = await apiRequest('GET', fullUrl, null, null); 

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
    }, [refreshing, selectedYearFilter, selectedMonthFilter, selectedDayFilter]); 

    // Effect to fetch available years on component mount
    useEffect(() => {
        fetchDistinctYears(); 
    }, [fetchDistinctYears]); 

    // Effect to set the initial year filter to the latest year if available, only once on first load
    useEffect(() => {
        if (!hasInitialYearBeenSet.current && availableYears.length > 0 && selectedYearFilter === null) {
            setSelectedYearFilter(String(availableYears[0]));
            hasInitialYearBeenSet.current = true; 
        }
    }, [availableYears, selectedYearFilter]); 

    // This effect runs when filters or fetchBudgetSummary itself changes
    useEffect(() => {
        fetchBudgetSummary(); 
    }, [fetchBudgetSummary]); 

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBudgetSummary(); 
    }, [fetchBudgetSummary]);

    // Function to clear all applied filters
    const handleClearFilters = () => {
        setSelectedYearFilter(null);
        setSelectedMonthFilter(null); 
        setSelectedDayFilter(null);
    };

    // --- Render Functions ---
    const renderItem = ({ item }: { item: BudgetItem }) => (
        <View style={styles.itemContainer}> 
            <Text style={styles.itemName} numberOfLines={1}>{item.budgetName}</Text>
            <Text style={styles.itemAmount}>₱ {formatCurrency(item.amount)}</Text>
        </View>
    );

    const renderSectionHeader = ({ section }: { section: BudgetSection }) => (
        <View style={styles.sectionHeaderContainer}> 
            <Text style={styles.sectionHeaderText} ellipsizeMode="tail">
                {section.title}
            </Text>
            <Text style={styles.sectionHeaderTotal}>₱ {formatCurrency(section.subTotal)}</Text>
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
                    <View> 
                        <Text style={styles.mainTitle}>Budget Management</Text>
                        {/* Filter Controls */}
                        <View style={styles.filterContainer}>
                            <View style={styles.pickerWrapper}>
                                <Text style={styles.filterLabel}>Year</Text>
                                <Picker
                                    selectedValue={selectedYearFilter}
                                    style={styles.pickerStyle}
                                    onValueChange={(itemValue) => {
                                        setSelectedYearFilter(itemValue);
                                        setSelectedMonthFilter(null); 
                                        setSelectedDayFilter(null);
                                    }}
                                    itemStyle={styles.pickerItemStyle} 
                                >
                                    <Picker.Item label="All" value={null} />
                                    {availableYears.map((year) => (
                                        <Picker.Item key={year} label={String(year)} value={String(year)} />
                                    ))}
                                </Picker>
                            </View>

                            <View style={styles.pickerWrapper}>
                                <Text style={styles.filterLabel}>Month</Text>
                                <Picker
                                    selectedValue={selectedMonthFilter} 
                                    style={styles.pickerStyle}
                                    onValueChange={(itemValue) => {
                                        setSelectedMonthFilter(itemValue); 
                                        setSelectedDayFilter(null); 
                                    }}
                                    itemStyle={styles.pickerItemStyle}
                                    enabled={!!selectedYearFilter} 
                                >
                                    <Picker.Item label="All" value={null} />
                                    {monthOptions.map((monthNum, index) => (
                                        <Picker.Item key={monthNum} label={monthNames[index]} value={monthNum} />
                                    ))}
                                </Picker>
                            </View>

                            <View style={styles.pickerWrapper}>
                                <Text style={styles.filterLabel}>Day</Text>
                                <Picker
                                    selectedValue={selectedDayFilter}
                                    style={styles.pickerStyle}
                                    onValueChange={(itemValue) => setSelectedDayFilter(itemValue)}
                                    itemStyle={styles.pickerItemStyle}
                                    enabled={!!selectedYearFilter && !!selectedMonthFilter} 
                                >
                                    <Picker.Item label="All" value={null} />
                                    {dayOptions.map((dayNum) => (
                                        <Picker.Item key={dayNum} label={dayNum} value={dayNum} />
                                    ))}
                                </Picker>
                            </View>

                            {/* Show Clear Filters button if any filter is active */}
                            {(selectedYearFilter || selectedMonthFilter || selectedDayFilter) && (
                                <TouchableOpacity onPress={handleClearFilters} style={styles.clearFiltersButton}>
                                    <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                ListFooterComponent={() => (
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
        flexDirection: 'column', 
        paddingBottom: 20, 
    },
    totalLabel: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#0F00D7', 
        marginBottom: 8, 
        alignSelf: 'flex-start',
    },
    totalAmount: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: '#0F00D7', 
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
    },
    // Styles for filters (adjusted to align in column)
    filterContainer: {
        flexDirection: 'column', 
        alignItems: 'stretch', 
        paddingHorizontal: 15, 
        paddingVertical: 10,
        backgroundColor: '#FFFFFF', 
        borderBottomLeftRadius: 20, 
        borderBottomRightRadius: 20,
        marginBottom: 10, 
        ...Platform.select({ 
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    pickerWrapper: {
        width: '100%', 
        marginBottom: 15, 
    },
    filterLabel: {
        fontSize: 13, 
        color: '#666', 
        marginBottom: 6, 
        marginLeft: 0, 
        fontWeight: 'bold',
        textAlign: 'left', 
    },
    pickerStyle: {
        height: 55, // Increased height for better visibility
        backgroundColor: '#F0F0F0', 
        borderRadius: 8,
        borderWidth: 1, 
        borderColor: '#CCC',
        color: '#333', 
        overflow: 'hidden', 
        paddingHorizontal: Platform.OS === 'android' ? 10 : 0, 
    },
    pickerItemStyle: {
        fontSize: 14, 
        color: 'black', 
    },
    clearFiltersButton: {
        backgroundColor: '#E0E0E0',
        paddingVertical: 12, // Adjusted padding to match new picker height visually
        paddingHorizontal: 15, 
        borderRadius: 8,
        marginTop: 5, 
        width: '100%', 
        alignSelf: 'stretch', 
        justifyContent: 'center', 
        alignItems: 'center', 
    },
    clearFiltersButtonText: {
        color: '#333',
        fontSize: 14, 
        fontWeight: 'bold',
    },
});

export default BudgetScreen;