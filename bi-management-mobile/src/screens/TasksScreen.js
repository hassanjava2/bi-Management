/**
 * Bi Management Mobile - Tasks Screen
 * شاشة المهام
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
import { tasksAPI } from '../services/api';

export default function TasksScreen({ navigation }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    const filters = [
        { id: 'all', label: 'الكل' },
        { id: 'pending', label: 'قيد الانتظار' },
        { id: 'in_progress', label: 'جارية' },
        { id: 'completed', label: 'مكتملة' },
    ];

    const fetchTasks = async () => {
        try {
            const status = filter === 'all' ? null : filter;
            const response = await tasksAPI.getMyTasks(status);
            setTasks(response.data || []);
        } catch (err) {
            console.error('Fetch tasks error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [filter]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTasks();
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return '#dc2626';
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            default: return '#6b7280';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#22c55e';
            case 'in_progress': return '#3b82f6';
            case 'pending': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'completed': return 'مكتملة';
            case 'in_progress': return 'جارية';
            case 'pending': return 'قيد الانتظار';
            default: return status;
        }
    };

    const renderTask = ({ item }) => (
        <TouchableOpacity
            style={styles.taskCard}
            onPress={() => navigation.navigate('TaskDetails', { taskId: item.id })}
        >
            <View style={[styles.priorityBar, { backgroundColor: getPriorityColor(item.priority) }]} />
            <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                {item.description && (
                    <Text style={styles.taskDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
                <View style={styles.taskMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusLabel(item.status)}
                        </Text>
                    </View>
                    {item.due_date && (
                        <Text style={styles.dueDate}>
                            📅 {item.due_date.slice(0, 10)}
                        </Text>
                    )}
                </View>
            </View>
            <Text style={styles.arrow}>←</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Filters */}
            <View style={styles.filtersContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={filters}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.filtersList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                filter === item.id && styles.filterButtonActive
                            ]}
                            onPress={() => setFilter(item.id)}
                        >
                            <Text style={[
                                styles.filterText,
                                filter === item.id && styles.filterTextActive
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Tasks List */}
            <FlatList
                data={tasks}
                renderItem={renderTask}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>لا توجد مهام</Text>
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
    filtersContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#16213e',
    },
    filtersList: {
        padding: 16,
    },
    filterButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#16213e',
        marginRight: 8,
    },
    filterButtonActive: {
        backgroundColor: '#4f46e5',
    },
    filterText: {
        color: '#a0a0a0',
        fontSize: 14,
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContainer: {
        padding: 16,
    },
    taskCard: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    priorityBar: {
        width: 4,
        height: '100%',
        minHeight: 80,
    },
    taskContent: {
        flex: 1,
        padding: 16,
    },
    taskTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'right',
    },
    taskDescription: {
        color: '#a0a0a0',
        fontSize: 13,
        marginBottom: 8,
        textAlign: 'right',
    },
    taskMeta: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    dueDate: {
        color: '#a0a0a0',
        fontSize: 12,
    },
    arrow: {
        color: '#a0a0a0',
        fontSize: 16,
        paddingRight: 16,
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
