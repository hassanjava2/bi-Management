/**
 * Bi Management Mobile - Home Screen
 * الشاشة الرئيسية
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, tasksAPI, notificationsAPI, goalsAPI } from '../services/api';
import * as Location from 'expo-location';

export default function HomeScreen({ navigation }) {
    const { user } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [attendance, setAttendance] = useState(null);
    const [todayTasks, setTodayTasks] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [points, setPoints] = useState(0);
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    // جلب البيانات
    const fetchData = async () => {
        try {
            const [attendanceRes, tasksRes, notifRes, pointsRes] = await Promise.all([
                attendanceAPI.getStatus().catch(() => ({ data: null })),
                tasksAPI.getTodayTasks().catch(() => ({ data: [] })),
                notificationsAPI.getUnreadCount().catch(() => ({ data: { count: 0 } })),
                goalsAPI.getMyPoints().catch(() => ({ data: { monthly_points: 0 } })),
            ]);

            setAttendance(attendanceRes.data);
            setTodayTasks(tasksRes.data?.slice(0, 3) || []);
            setUnreadCount(notifRes.data?.count || 0);
            setPoints(pointsRes.data?.monthly_points || 0);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    // تسجيل الدخول/الخروج
    const handleAttendance = async () => {
        try {
            setIsCheckingIn(true);

            // طلب إذن الموقع
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('خطأ', 'يجب السماح بالوصول للموقع');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            if (!attendance?.check_in) {
                // تسجيل دخول
                await attendanceAPI.checkIn(latitude, longitude);
                Alert.alert('نجاح', 'تم تسجيل الدخول بنجاح');
            } else if (!attendance?.check_out) {
                // تسجيل خروج
                await attendanceAPI.checkOut(latitude, longitude);
                Alert.alert('نجاح', 'تم تسجيل الخروج بنجاح');
            }

            await fetchData();
        } catch (err) {
            Alert.alert('خطأ', err.message || 'فشلت العملية');
        } finally {
            setIsCheckingIn(false);
        }
    };

    // تحية حسب الوقت
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'صباح الخير';
        if (hour < 17) return 'مساء الخير';
        return 'مساء الخير';
    };

    // حالة الحضور
    const getAttendanceStatus = () => {
        if (!attendance?.check_in) {
            return { text: 'لم تسجل دخولك بعد', color: '#ef4444', buttonText: 'تسجيل الدخول' };
        }
        if (!attendance?.check_out) {
            return { text: `دخلت الساعة ${attendance.check_in?.slice(11, 16)}`, color: '#22c55e', buttonText: 'تسجيل الخروج' };
        }
        return { text: 'أتممت يومك', color: '#3b82f6', buttonText: 'اكتمل' };
    };

    const attendanceStatus = getAttendanceStatus();

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{getGreeting()}</Text>
                    <Text style={styles.userName}>{user?.full_name || 'مستخدم'}</Text>
                </View>
                <TouchableOpacity
                    style={styles.notificationBadge}
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <Text style={styles.bellIcon}>🔔</Text>
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Attendance Card */}
            <View style={styles.attendanceCard}>
                <View style={styles.attendanceHeader}>
                    <Text style={styles.attendanceTitle}>حالة الحضور</Text>
                    <View style={[styles.statusDot, { backgroundColor: attendanceStatus.color }]} />
                </View>
                <Text style={styles.attendanceStatus}>{attendanceStatus.text}</Text>
                
                {attendanceStatus.buttonText !== 'اكتمل' && (
                    <TouchableOpacity
                        style={[styles.attendanceButton, { backgroundColor: attendanceStatus.color }]}
                        onPress={handleAttendance}
                        disabled={isCheckingIn}
                    >
                        <Text style={styles.attendanceButtonText}>
                            {isCheckingIn ? 'جاري...' : attendanceStatus.buttonText}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Points Card */}
            <TouchableOpacity
                style={styles.pointsCard}
                onPress={() => navigation.navigate('Goals')}
            >
                <Text style={styles.pointsIcon}>🏆</Text>
                <View style={styles.pointsInfo}>
                    <Text style={styles.pointsLabel}>نقاطي هذا الشهر</Text>
                    <Text style={styles.pointsValue}>{points}</Text>
                </View>
                <Text style={styles.arrow}>←</Text>
            </TouchableOpacity>

            {/* Today's Tasks */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>مهام اليوم</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                        <Text style={styles.seeAll}>عرض الكل</Text>
                    </TouchableOpacity>
                </View>

                {todayTasks.length === 0 ? (
                    <View style={styles.emptyTasks}>
                        <Text style={styles.emptyIcon}>✨</Text>
                        <Text style={styles.emptyText}>لا توجد مهام لليوم</Text>
                    </View>
                ) : (
                    todayTasks.map((task, index) => (
                        <TouchableOpacity
                            key={task.id || index}
                            style={styles.taskCard}
                            onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
                        >
                            <View style={[styles.taskPriority, {
                                backgroundColor: task.priority === 'high' ? '#ef4444' :
                                    task.priority === 'medium' ? '#f59e0b' : '#22c55e'
                            }]} />
                            <View style={styles.taskContent}>
                                <Text style={styles.taskTitle}>{task.title}</Text>
                                <Text style={styles.taskDue}>
                                    {task.due_date ? `ينتهي: ${task.due_date.slice(0, 10)}` : 'بدون موعد'}
                                </Text>
                            </View>
                            <Text style={styles.taskArrow}>←</Text>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => navigation.navigate('Chat')}
                >
                    <Text style={styles.quickActionIcon}>🤖</Text>
                    <Text style={styles.quickActionText}>AI مساعد</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => navigation.navigate('Attendance')}
                >
                    <Text style={styles.quickActionIcon}>📅</Text>
                    <Text style={styles.quickActionText}>سجل الحضور</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={styles.quickActionIcon}>👤</Text>
                    <Text style={styles.quickActionText}>ملفي</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
    },
    greeting: {
        fontSize: 16,
        color: '#a0a0a0',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    notificationBadge: {
        position: 'relative',
    },
    bellIcon: {
        fontSize: 28,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    attendanceCard: {
        backgroundColor: '#16213e',
        margin: 20,
        borderRadius: 16,
        padding: 20,
    },
    attendanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    attendanceTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    attendanceStatus: {
        fontSize: 16,
        color: '#a0a0a0',
        marginBottom: 16,
        textAlign: 'right',
    },
    attendanceButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    attendanceButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    pointsCard: {
        backgroundColor: '#4f46e5',
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pointsIcon: {
        fontSize: 32,
        marginLeft: 16,
    },
    pointsInfo: {
        flex: 1,
    },
    pointsLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    pointsValue: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    arrow: {
        color: '#fff',
        fontSize: 20,
    },
    section: {
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    seeAll: {
        color: '#4f46e5',
        fontSize: 14,
    },
    emptyTasks: {
        backgroundColor: '#16213e',
        borderRadius: 16,
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
    taskCard: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    taskPriority: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginLeft: 12,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 4,
        textAlign: 'right',
    },
    taskDue: {
        color: '#a0a0a0',
        fontSize: 12,
        textAlign: 'right',
    },
    taskArrow: {
        color: '#a0a0a0',
        fontSize: 16,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        paddingBottom: 40,
    },
    quickAction: {
        backgroundColor: '#16213e',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        width: 100,
    },
    quickActionIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    quickActionText: {
        color: '#fff',
        fontSize: 12,
    },
});
