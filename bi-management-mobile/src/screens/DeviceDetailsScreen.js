/**
 * BI Management Mobile - Device Details Screen
 * شاشة تفاصيل الجهاز
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { devicesAPI, warrantyAPI } from '../services/api';

export default function DeviceDetailsScreen({ route, navigation }) {
    const { device: initialDevice } = route.params;
    const [device, setDevice] = useState(initialDevice);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDeviceDetails();
    }, []);

    const loadDeviceDetails = async () => {
        try {
            setLoading(true);
            const response = await devicesAPI.getBySerial(device.serial_number);
            if (response.success) {
                setDevice(response.data.device);
                setHistory(response.data.history || []);
            }
        } catch (error) {
            console.error('Error loading device:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleWarrantyClaim = () => {
        Alert.alert(
            'طلب ضمان',
            'هل تريد إنشاء طلب ضمان لهذا الجهاز؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'متابعة',
                    onPress: () => navigation.navigate('NewWarranty', { device })
                }
            ]
        );
    };

    const handleCustody = async () => {
        const isMyCustody = device.custody_user_id; // TODO: check if it's current user
        
        Alert.alert(
            isMyCustody ? 'إرجاع الجهاز' : 'استلام الجهاز',
            isMyCustody 
                ? 'هل تريد إرجاع الجهاز؟'
                : 'هل تريد تسجيل الجهاز بذمتك؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'تأكيد',
                    onPress: async () => {
                        try {
                            if (isMyCustody) {
                                await devicesAPI.returnCustody(device.id);
                            } else {
                                await devicesAPI.takeCustody(device.id, 'من تفاصيل الجهاز');
                            }
                            loadDeviceDetails();
                            Alert.alert('تم', 'تم تحديث الذمة بنجاح');
                        } catch (error) {
                            Alert.alert('خطأ', error.message);
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status) => {
        const colors = {
            new: '#f59e0b',
            inspection_passed: '#10b981',
            inspection_failed: '#ef4444',
            ready_to_sell: '#10b981',
            sold: '#6b7280',
            in_warranty: '#f59e0b',
            returned: '#ef4444',
        };
        return colors[status] || '#6b7280';
    };

    const getStatusText = (status) => {
        const texts = {
            new: 'جديد',
            inspection_passed: 'فحص ناجح',
            inspection_failed: 'فحص فاشل',
            ready_to_sell: 'جاهز للبيع',
            sold: 'مباع',
            in_warranty: 'بالضمان',
            returned: 'مرتجع',
        };
        return texts[status] || status;
    };

    if (loading && !device) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => {
                    setRefreshing(true);
                    loadDeviceDetails();
                }} />
            }
        >
            {/* Header Card */}
            <View style={styles.headerCard}>
                <View style={styles.serialContainer}>
                    <Text style={styles.serialLabel}>السيريال</Text>
                    <Text style={styles.serialNumber}>{device.serial_number}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(device.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(device.status)}</Text>
                </View>
            </View>

            {/* Product Info */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>معلومات المنتج</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>المنتج</Text>
                    <Text style={styles.infoValue}>{device.product_name || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>المخزن</Text>
                    <Text style={styles.infoValue}>{device.warehouse_name || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>الموقع</Text>
                    <Text style={styles.infoValue}>
                        {device.location_area || '-'} / {device.location_shelf || '-'} / {device.location_row || '-'}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>السعر</Text>
                    <Text style={styles.infoValue}>
                        {device.selling_price ? `${device.selling_price.toLocaleString()} IQD` : '-'}
                    </Text>
                </View>
            </View>

            {/* Specifications */}
            {device.actual_specs && Object.keys(device.actual_specs).length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>المواصفات</Text>
                    {Object.entries(device.actual_specs).map(([key, value]) => (
                        <View key={key} style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{key}</Text>
                            <Text style={styles.infoValue}>{value}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Custody Info */}
            {device.custody_user_id && (
                <View style={[styles.card, styles.cardWarning]}>
                    <Text style={styles.cardTitle}>الذمة</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>بذمة</Text>
                        <Text style={styles.infoValue}>{device.custody_user_name || 'موظف'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>منذ</Text>
                        <Text style={styles.infoValue}>
                            {device.custody_since ? new Date(device.custody_since).toLocaleString('ar-IQ') : '-'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Notes */}
            {device.notes && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>ملاحظات</Text>
                    <Text style={styles.notes}>{device.notes}</Text>
                </View>
            )}

            {/* History */}
            {history.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>سجل الأحداث</Text>
                    {history.slice(0, 10).map((event, index) => (
                        <View key={index} style={styles.historyItem}>
                            <View style={styles.historyDot} />
                            <View style={styles.historyContent}>
                                <Text style={styles.historyText}>{event.event_type}</Text>
                                <Text style={styles.historyDate}>
                                    {new Date(event.created_at).toLocaleString('ar-IQ')}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Actions */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={handleCustody}
                >
                    <Text style={styles.actionButtonIcon}>
                        {device.custody_user_id ? '↩️' : '📋'}
                    </Text>
                    <Text style={styles.actionButtonText}>
                        {device.custody_user_id ? 'إرجاع الذمة' : 'استلام بالذمة'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Transfer', { device })}
                >
                    <Text style={styles.actionButtonIcon}>🔄</Text>
                    <Text style={styles.actionButtonTextSecondary}>نقل</Text>
                </TouchableOpacity>

                {device.status === 'sold' && (
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.actionButtonWarning]}
                        onPress={handleWarrantyClaim}
                    >
                        <Text style={styles.actionButtonIcon}>🛡️</Text>
                        <Text style={styles.actionButtonText}>طلب ضمان</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCard: {
        backgroundColor: '#1f2937',
        padding: 20,
        margin: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    serialContainer: {
        flex: 1,
    },
    serialLabel: {
        color: '#9ca3af',
        fontSize: 12,
    },
    serialNumber: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'monospace',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#fff',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardWarning: {
        backgroundColor: '#fef3c7',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    infoLabel: {
        color: '#6b7280',
        fontSize: 14,
    },
    infoValue: {
        color: '#1f2937',
        fontSize: 14,
        fontWeight: '500',
    },
    notes: {
        color: '#374151',
        fontSize: 14,
        lineHeight: 22,
    },
    historyItem: {
        flexDirection: 'row',
        paddingVertical: 8,
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2563eb',
        marginTop: 5,
        marginLeft: 8,
    },
    historyContent: {
        flex: 1,
    },
    historyText: {
        color: '#374151',
        fontSize: 14,
    },
    historyDate: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 2,
    },
    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        minWidth: 100,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    actionButtonPrimary: {
        backgroundColor: '#2563eb',
    },
    actionButtonWarning: {
        backgroundColor: '#f59e0b',
    },
    actionButtonIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtonTextSecondary: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
    },
});
