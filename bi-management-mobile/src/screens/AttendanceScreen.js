/**
 * Bi Management Mobile - Attendance Screen
 * شاشة الحضور والانصراف
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { attendanceAPI } from '../services/api';

export default function AttendanceScreen() {
    const [attendance, setAttendance] = useState([]);
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [todayStatus, setTodayStatus] = useState(null);
    const [checkingIn, setCheckingIn] = useState(false);

    const fetchData = async () => {
        try {
            // Get attendance records
            const attendanceRes = await attendanceAPI.getMyAttendance(selectedMonth, selectedYear);
            setAttendance(attendanceRes.data || []);
            
            // Calculate stats from records
            const records = attendanceRes.data || [];
            const calculatedStats = {
                present_days: records.filter(r => r.status === 'present' || r.check_in).length,
                late_days: records.filter(r => r.status === 'late' || r.is_late).length,
                absent_days: records.filter(r => r.status === 'absent' || !r.check_in).length,
                total_hours: records.reduce((sum, r) => sum + (r.work_minutes || 0), 0) / 60
            };
            setStats(calculatedStats);
        } catch (err) {
            console.error('Fetch attendance error:', err);
            setAttendance([]);
            setStats({ present_days: 0, late_days: 0, absent_days: 0, total_hours: 0 });
        }
    };

    const fetchTodayStatus = async () => {
        try {
            const response = await attendanceAPI.getStatus();
            if (response.success) {
                setTodayStatus(response.data);
            }
        } catch (err) {
            console.error('Fetch today status error:', err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchTodayStatus();
    }, [selectedMonth, selectedYear]);

    // تسجيل الدخول/الخروج مع GPS
    const handleCheckInOut = async () => {
        try {
            setCheckingIn(true);
            
            // طلب إذن الموقع
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('خطأ', 'يجب السماح بالوصول للموقع لتسجيل الحضور');
                return;
            }

            // الحصول على الموقع
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const isCheckIn = !todayStatus?.checked_in;
            
            if (isCheckIn) {
                // تسجيل دخول
                const response = await attendanceAPI.checkIn(
                    location.coords.latitude,
                    location.coords.longitude
                );
                if (response.success) {
                    Alert.alert('نجاح', 'تم تسجيل الدخول بنجاح ✅');
                    fetchTodayStatus();
                    fetchData();
                }
            } else {
                // تسجيل خروج
                const response = await attendanceAPI.checkOut(
                    location.coords.latitude,
                    location.coords.longitude
                );
                if (response.success) {
                    Alert.alert('نجاح', 'تم تسجيل الخروج بنجاح ✅');
                    fetchTodayStatus();
                    fetchData();
                }
            }
        } catch (err) {
            console.error('Check in/out error:', err);
            Alert.alert('خطأ', err.message || 'فشل في تسجيل الحضور');
        } finally {
            setCheckingIn(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const getStatusIcon = (record) => {
        if (!record.check_in) return '❌';
        if (record.is_late) return '⚠️';
        return '✅';
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '--:--';
        return timeStr.slice(11, 16);
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Check In/Out Button */}
            <View style={styles.checkInSection}>
                <TouchableOpacity
                    style={[
                        styles.checkInButton,
                        todayStatus?.checked_in && !todayStatus?.checked_out && styles.checkOutButton,
                        todayStatus?.checked_out && styles.completedButton
                    ]}
                    onPress={handleCheckInOut}
                    disabled={checkingIn || todayStatus?.checked_out}
                >
                    {checkingIn ? (
                        <ActivityIndicator size="large" color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.checkInIcon}>
                                {todayStatus?.checked_out ? '✅' : todayStatus?.checked_in ? '🚪' : '📍'}
                            </Text>
                            <Text style={styles.checkInText}>
                                {todayStatus?.checked_out 
                                    ? 'تم إنهاء اليوم' 
                                    : todayStatus?.checked_in 
                                        ? 'تسجيل خروج' 
                                        : 'تسجيل دخول'}
                            </Text>
                            {todayStatus?.check_in_time && (
                                <Text style={styles.checkInTime}>
                                    دخول: {todayStatus.check_in_time?.slice(11, 16)}
                                    {todayStatus.check_out_time && ` | خروج: ${todayStatus.check_out_time?.slice(11, 16)}`}
                                </Text>
                            )}
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            {stats && (
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.present_days || 0}</Text>
                        <Text style={styles.statLabel}>أيام الحضور</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.late_days || 0}</Text>
                        <Text style={styles.statLabel}>تأخيرات</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.absent_days || 0}</Text>
                        <Text style={styles.statLabel}>غيابات</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.total_hours || 0}</Text>
                        <Text style={styles.statLabel}>ساعات العمل</Text>
                    </View>
                </View>
            )}

            {/* Month Selector */}
            <View style={styles.monthSelector}>
                <TouchableOpacity
                    style={styles.monthArrow}
                    onPress={() => {
                        if (selectedMonth === 1) {
                            setSelectedMonth(12);
                            setSelectedYear(selectedYear - 1);
                        } else {
                            setSelectedMonth(selectedMonth - 1);
                        }
                    }}
                >
                    <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>
                <Text style={styles.monthText}>
                    {months[selectedMonth - 1]} {selectedYear}
                </Text>
                <TouchableOpacity
                    style={styles.monthArrow}
                    onPress={() => {
                        if (selectedMonth === 12) {
                            setSelectedMonth(1);
                            setSelectedYear(selectedYear + 1);
                        } else {
                            setSelectedMonth(selectedMonth + 1);
                        }
                    }}
                >
                    <Text style={styles.arrowText}>←</Text>
                </TouchableOpacity>
            </View>

            {/* Attendance List */}
            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Text style={[styles.headerCell, { flex: 1 }]}>التاريخ</Text>
                    <Text style={[styles.headerCell, { width: 70 }]}>الدخول</Text>
                    <Text style={[styles.headerCell, { width: 70 }]}>الخروج</Text>
                    <Text style={[styles.headerCell, { width: 50 }]}>الحالة</Text>
                </View>

                {attendance.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📅</Text>
                        <Text style={styles.emptyText}>لا توجد سجلات</Text>
                    </View>
                ) : (
                    attendance.map((record, index) => (
                        <View
                            key={record.id || index}
                            style={[
                                styles.listRow,
                                index % 2 === 0 && styles.listRowEven
                            ]}
                        >
                            <Text style={[styles.cell, { flex: 1 }]}>
                                {record.date?.slice(0, 10) || '-'}
                            </Text>
                            <Text style={[styles.cell, { width: 70 }]}>
                                {formatTime(record.check_in)}
                            </Text>
                            <Text style={[styles.cell, { width: 70 }]}>
                                {formatTime(record.check_out)}
                            </Text>
                            <Text style={[styles.cell, { width: 50, textAlign: 'center' }]}>
                                {getStatusIcon(record)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <Text style={styles.legendIcon}>✅</Text>
                    <Text style={styles.legendText}>حضور</Text>
                </View>
                <View style={styles.legendItem}>
                    <Text style={styles.legendIcon}>⚠️</Text>
                    <Text style={styles.legendText}>تأخير</Text>
                </View>
                <View style={styles.legendItem}>
                    <Text style={styles.legendIcon}>❌</Text>
                    <Text style={styles.legendText}>غياب</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    checkInSection: {
        padding: 16,
        paddingBottom: 0,
    },
    checkInButton: {
        backgroundColor: '#22c55e',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    checkOutButton: {
        backgroundColor: '#f59e0b',
        shadowColor: '#f59e0b',
    },
    completedButton: {
        backgroundColor: '#6b7280',
        shadowColor: '#6b7280',
    },
    checkInIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    checkInText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    checkInTime: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    statLabel: {
        fontSize: 12,
        color: '#a0a0a0',
        marginTop: 4,
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#16213e',
        marginHorizontal: 16,
        borderRadius: 12,
    },
    monthArrow: {
        padding: 8,
    },
    arrowText: {
        color: '#4f46e5',
        fontSize: 20,
    },
    monthText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContainer: {
        margin: 16,
        backgroundColor: '#16213e',
        borderRadius: 12,
        overflow: 'hidden',
    },
    listHeader: {
        flexDirection: 'row',
        backgroundColor: '#0f3460',
        padding: 12,
    },
    headerCell: {
        color: '#a0a0a0',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    listRow: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#0f3460',
    },
    listRowEven: {
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
    },
    cell: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    emptyText: {
        color: '#a0a0a0',
        fontSize: 16,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 16,
        gap: 24,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendIcon: {
        fontSize: 16,
        marginRight: 4,
    },
    legendText: {
        color: '#a0a0a0',
        fontSize: 12,
    },
});
