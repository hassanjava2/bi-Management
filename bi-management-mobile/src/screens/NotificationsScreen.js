/**
 * Bi Management Mobile - Notifications Screen
 * شاشة الإشعارات
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { notificationsAPI } from '../services/api';

export default function NotificationsScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        try {
            const response = await notificationsAPI.getAll();
            setNotifications(response.data || []);
        } catch (err) {
            console.error('Fetch notifications error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id) => {
        try {
            await notificationsAPI.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            console.error('Mark as read error:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Mark all as read error:', err);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'task': return '📋';
            case 'attendance': return '⏰';
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'urgent': return '🚨';
            case 'info': return 'ℹ️';
            default: return '🔔';
        }
    };

    const handlePress = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        
        // Navigate based on notification type
        if (notification.data?.task_id) {
            navigation.navigate('TaskDetails', { taskId: notification.data.task_id });
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'الآن';
        if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
        if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
        return date.toLocaleDateString('ar-IQ');
    };

    const renderNotification = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.notificationCard,
                !item.is_read && styles.unreadCard
            ]}
            onPress={() => handlePress(item)}
        >
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{getIcon(item.type)}</Text>
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.time}>{formatTime(item.created_at)}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <View style={styles.container}>
            {/* Header */}
            {unreadCount > 0 && (
                <View style={styles.header}>
                    <Text style={styles.unreadText}>{unreadCount} غير مقروءة</Text>
                    <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={styles.markAllText}>تحديد الكل كمقروء</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Notifications List */}
            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={styles.emptyText}>لا توجد إشعارات</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#16213e',
    },
    unreadText: {
        color: '#a0a0a0',
        fontSize: 14,
    },
    markAllText: {
        color: '#4f46e5',
        fontSize: 14,
    },
    listContainer: {
        padding: 16,
    },
    notificationCard: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        marginBottom: 12,
    },
    unreadCard: {
        backgroundColor: '#1e2a4a',
        borderLeftWidth: 3,
        borderLeftColor: '#4f46e5',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0f3460',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    icon: {
        fontSize: 20,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'right',
    },
    body: {
        color: '#a0a0a0',
        fontSize: 14,
        marginBottom: 8,
        textAlign: 'right',
        lineHeight: 20,
    },
    time: {
        color: '#666',
        fontSize: 12,
        textAlign: 'right',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4f46e5',
        position: 'absolute',
        top: 16,
        left: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        color: '#a0a0a0',
        fontSize: 16,
    },
});
