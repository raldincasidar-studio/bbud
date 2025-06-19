import apiRequest from '@/plugins/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface TransactionData {
    _id: string;
    borrower_display_name: string;
    item_borrowed: string;
    quantity_borrowed: number;
    borrow_datetime: string;
    expected_return_date: string;
    date_returned?: string;
    status: 'Pending' | 'Processing' | 'Approved' | 'Overdue' | 'Returned' | 'Lost' | 'Damaged' | 'Resolved' | 'Rejected';
    notes?: string;
    return_proof_image_url?: string;
    return_condition_notes?: string;
    created_at: string;
    updated_at: string;
}

const STATUS_CONFIG: { [key: string]: { color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap } } = {
    Pending:    { color: '#78909C', icon: 'clock-outline' },
    Processing: { color: '#42A5F5', icon: 'cogs' },
    Approved:   { color: '#FF7043', icon: 'check-circle-outline' },
    Overdue:    { color: '#EF5350', icon: 'alert-octagon-outline' },
    Returned:   { color: '#66BB6A', icon: 'check-all' },
    Lost:       { color: '#212121', icon: 'help-rhombus-outline' },
    Damaged:    { color: '#FFB300', icon: 'alert-decagram-outline' },
    Resolved:   { color: '#26A69A', icon: 'handshake-outline' },
    Rejected:   { color: '#E57373', icon: 'cancel' },
};

const ViewBorrowAssetScreen = () => {
    const router = useRouter();
    const { id: transactionId } = useLocalSearchParams();

    const [transaction, setTransaction] = useState<TransactionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorLoading, setErrorLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // State for the return form
    const [returnForm, setReturnForm] = useState({
        proofImage: null as string | null,
        conditionNotes: '',
    });
    const [isReturning, setIsReturning] = useState(false);

    const fetchTransactionDetails = useCallback(async () => {
        if (!transactionId) {
            Alert.alert("Error", "Transaction ID is missing.");
            setIsLoading(false); setErrorLoading(true);
            return;
        }
        setIsLoading(true); setErrorLoading(false);
        try {
            const response = await apiRequest('GET', `/api/borrowed-assets/${transactionId}`);
            if (response && response.transaction) {
                setTransaction(response.transaction);
            } else {
                setTransaction(null); setErrorLoading(true);
                Alert.alert("Error", response?.message || "Could not fetch transaction details.");
            }
        } catch (error) {
            console.error("Error fetching transaction details:", error);
            setErrorLoading(true); setTransaction(null);
            Alert.alert("Error", "An error occurred while fetching details.");
        } finally {
            setIsLoading(false); setRefreshing(false);
        }
    }, [transactionId]);

    useEffect(() => { fetchTransactionDetails(); }, [fetchTransactionDetails]);
    useFocusEffect(useCallback(() => { fetchTransactionDetails(); }, [fetchTransactionDetails]));
    const onRefresh = useCallback(() => { setRefreshing(true); fetchTransactionDetails(); }, [fetchTransactionDetails]);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll access is required to upload proof.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setReturnForm(prev => ({ ...prev, proofImage: base64Image }));
        }
    };
    
    const processReturn = async () => {
        setIsReturning(true);
        try {
            const payload = {
                return_proof_image_base64: returnForm.proofImage,
                return_condition_notes: returnForm.conditionNotes || 'Item returned.',
            };

            const response = await apiRequest('PATCH', `/api/borrowed-assets/${transactionId}/return`, payload);
            if (response && response.transaction) {
                setTransaction(response.transaction);
                Alert.alert("Success", "Item successfully marked as Returned!");
            } else {
                 Alert.alert("Error", response?.error || "Failed to process return.");
            }
        } catch (error: any) {
             Alert.alert("Error", error.response?.data?.message || "An unexpected error occurred.");
        } finally {
            setIsReturning(false);
        }
    };

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    };

    const DetailItem = ({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap, label: string, value?: string }) => (
        <View style={styles.detailRow}>
            <MaterialCommunityIcons name={icon} style={styles.detailIcon} size={22} />
            <Text style={styles.detailLabel}>{label}:</Text>
            <Text style={styles.detailValue}>{value || 'N/A'}</Text>
        </View>
    );

    if (isLoading) return <View style={styles.loaderContainerFullPage}><ActivityIndicator size="large" color="#0F00D7" /><Text style={styles.loadingText}>Loading Transaction...</Text></View>;
    if (errorLoading || !transaction) return <View style={styles.loaderContainerFullPage}><MaterialCommunityIcons name="alert-circle-outline" size={50} color="red" /><Text style={styles.errorText}>Failed to load transaction details.</Text><TouchableOpacity onPress={fetchTransactionDetails} style={styles.retryButton}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity></View>;

    const statusConfig = STATUS_CONFIG[transaction.status] || { color: 'grey', icon: 'help-circle' };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.navbarTitle}>Transaction Details</Text>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F00D7"]} />}>
                
                <View style={[styles.statusHeader, { backgroundColor: statusConfig.color }]}>
                    <MaterialCommunityIcons name={statusConfig.icon} size={32} color="white" />
                    <Text style={styles.statusHeaderText}>{transaction.status}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Transaction Information</Text>
                    <DetailItem icon="cube-outline" label="Item" value={transaction.item_borrowed} />
                    <DetailItem icon="counter" label="Quantity" value={String(transaction.quantity_borrowed)} />
                    <DetailItem icon="account-outline" label="Borrower" value={transaction.borrower_display_name} />
                    <DetailItem icon="calendar-arrow-right" label="Date Borrowed" value={formatDateTime(transaction.borrow_datetime)} />
                    <DetailItem icon="calendar-arrow-left" label="Expected Return" value={formatDateTime(transaction.expected_return_date)} />
                    {transaction.notes && <DetailItem icon="note-text-outline" label="Notes" value={transaction.notes} />}
                </View>

                {/* --- RENDER DIFFERENT SECTIONS BASED ON STATUS --- */}

                {/* 1. If Returned, show return details */}
                {transaction.status === 'Returned' && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Return Details</Text>
                        <DetailItem icon="calendar-check" label="Date Returned" value={formatDateTime(transaction.date_returned)} />
                        <DetailItem icon="clipboard-text-outline" label="Condition Notes" value={transaction.return_condition_notes} />
                        {transaction.return_proof_image_url && (
                             <View style={styles.inputContainer}>
                                <Text style={styles.label}>Return Proof:</Text>
                                <Image source={{ uri: transaction.return_proof_image_url }} style={styles.proofImage} resizeMode="contain" />
                            </View>
                        )}
                    </View>
                )}

                {/* 2. If Approved or Overdue, show the return form */}
                {(transaction.status === 'Approved' || transaction.status === 'Overdue') && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Process Item Return</Text>
                        <Text style={styles.instructions}>Once you return the item, please upload proof and add notes on its condition.</Text>
                        
                        <View style={styles.inputContainer}>
                             <Text style={styles.label}>Notes on Return Condition</Text>
                             <TextInput
                                style={styles.textInput}
                                placeholder="e.g., 'Returned in good condition'"
                                value={returnForm.conditionNotes}
                                onChangeText={(val) => setReturnForm(prev => ({...prev, conditionNotes: val}))}
                                multiline
                                textAlignVertical="top"
                             />
                        </View>
                        
                        <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={20} color="#0F00D7" />
                            <Text style={styles.imagePickerButtonText}>{returnForm.proofImage ? 'Change Proof' : 'Upload Return Proof'}</Text>
                        </TouchableOpacity>
                        {returnForm.proofImage && <Image source={{ uri: returnForm.proofImage }} style={styles.proofImage} />}

                        <TouchableOpacity style={[styles.submitButton, isReturning && styles.buttonDisabled]} onPress={processReturn} disabled={isReturning}>
                            {isReturning ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Mark as Returned</Text>}
                        </TouchableOpacity>
                    </View>
                )}
                
                {/* 3. For other statuses, show a descriptive alert */}
                {['Pending', 'Processing', 'Rejected', 'Lost', 'Damaged', 'Resolved'].includes(transaction.status) && (
                     <View style={[styles.card, {padding: 0}]}>
                         <View style={[styles.alertBox, { backgroundColor: `${statusConfig.color}20`, borderColor: statusConfig.color }]}>
                            <MaterialCommunityIcons name={statusConfig.icon} size={24} color={statusConfig.color} style={{ marginRight: 10 }} />
                            <Text style={[styles.alertText, { color: statusConfig.color }]}>
                                {transaction.status === 'Pending' && 'Your request is awaiting review from a barangay official.'}
                                {transaction.status === 'Processing' && 'Your request is currently being processed.'}
                                {transaction.status === 'Rejected' && 'Your request has been rejected. Please contact the barangay for details.'}
                                {transaction.status === 'Lost' && 'This item has been marked as lost. Please coordinate with the barangay to resolve this.'}
                                {transaction.status === 'Damaged' && 'This item has been marked as damaged. Please coordinate with the barangay to resolve this.'}
                                {transaction.status === 'Resolved' && 'This transaction has been marked as resolved. Thank you!'}
                            </Text>
                         </View>
                     </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F7FC' },
    navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 40 : 50, backgroundColor: '#0F00D7' },
    navbarTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
    scrollView: { flex: 1, backgroundColor: '#F4F7FC' },
    scrollViewContent: { padding: 15, paddingBottom: 30 },
    loaderContainerFullPage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
    errorText: { marginTop: 10, fontSize: 16, color: 'red', textAlign: 'center' },
    retryButton: { backgroundColor: '#0F00D7', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5, marginTop: 15 },
    retryButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 3 },
    statusHeaderText: { fontSize: 24, fontWeight: 'bold', color: 'white', marginLeft: 12 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E8EAF6' },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0F00D7', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E8EAF6', paddingBottom: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, },
    detailIcon: { marginRight: 12, color: '#546E7A', marginTop: 2 },
    detailLabel: { fontSize: 16, color: '#616161', fontWeight: '500', width: 120 },
    detailValue: { fontSize: 16, color: '#212121', flex: 1, flexWrap: 'wrap' },
    inputContainer: { marginBottom: 15 },
    label: { color: '#444', fontSize: 15, marginBottom: 7, fontWeight: '500' },
    textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, fontSize: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F9F9F9', minHeight: 80 },
    imagePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8EAF6', padding: 12, borderRadius: 8, marginVertical: 10 },
    imagePickerButtonText: { color: '#0F00D7', fontWeight: 'bold', marginLeft: 8 },
    proofImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#E0E0E0' },
    instructions: { fontSize: 14, color: '#616161', marginBottom: 15, fontStyle: 'italic', },
    submitButton: { backgroundColor: '#4CAF50', paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    buttonDisabled: { backgroundColor: '#A5D6A7' },
    submitButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    alertBox: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, },
    alertText: { fontSize: 15, flex: 1, fontWeight: '500' },
});

export default ViewBorrowAssetScreen;