/**
 * Bi Management Mobile - Task Details Screen
 * شاشة تفاصيل المهمة
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { tasksAPI } from '../services/api';

const STATUS_OPTIONS = [
    { value: 'pending', label: 'قيد الانتظار', color: '#f59e0b' },
    { value: 'in_progress', label: 'قيد التنفيذ', color: '#3b82f6' },
    { value: 'completed', label: 'مكتملة', color: '#10b981' },
    { value: 'cancelled', label: 'ملغاة', color: '#ef4444' },
];

const PRIORITY_COLORS = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
};

export default function TaskDetailsScreen({ route, navigation }) {
    const { taskId } = route.params;
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTask();
    }, [taskId]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            const response = await tasksAPI.getTask(taskId);
            if (response.success) {
                setTask(response.data);
            }
        } catch (error) {
            console.error('Error fetching task:', error);
            Alert.alert('خطأ', 'فشل في جلب تفاصيل المهمة');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            setSubmitting(true);
            const response = await tasksAPI.updateTask(taskId, { status: newStatus });
            if (response.success) {
                setTask(prev => ({ ...prev, status: newStatus }));
                Alert.alert('نجاح', 'تم تحديث حالة المهمة');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('خطأ', 'فشل في تحديث الحالة');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim()) return;

        try {
            setSubmitting(true);
            const response = await tasksAPI.addComment(taskId, comment);
            if (response.success) {
                setComment('');
                fetchTask(); // Refresh to get new comments
                Alert.alert('نجاح', 'تمت إضافة التعليق');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            Alert.alert('خطأ', 'فشل في إضافة التعليق');
        } finally {
            setSubmitting(false);
        }
    };

    const getRemainingTime = () => {
        if (!task?.due_date) return null;
        const now = new Date();
        const due = new Date(task.due_date);
        const diff = due - now;

        if (diff < 0) {
            return { text: 'متأخرة', color: '#ef4444' };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
            return { text: `${days} يوم و ${hours} ساعة`, color: days < 2 ? '#f59e0b' : '#10b981' };
        }
        return { text: `${hours} ساعة`, color: '#f59e0b' };
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>جارِ التحميل...</Text>
            </View>
        );
    }

    if (!task) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>لم يتم العثور على المهمة</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchTask}>
                    <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const remainingTime = getRemainingTime();
    const currentStatus = STATUS_OPTIONS.find(s => s.value === task.status);

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{task.title}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[task.priority] || '#6b7280' }]}>
                    <Text style={styles.priorityText}>
                        {task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                    </Text>
                </View>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: currentStatus?.color || '#6b7280' }]}>
                <Text style={styles.statusText}>{currentStatus?.label || task.status}</Text>
            </View>

            {/* Remaining Time */}
            {remainingTime && (
                <View style={styles.timeSection}>
                    <Text style={styles.sectionTitle}>الوقت المتبقي</Text>
                    <Text style={[styles.timeText, { color: remainingTime.color }]}>
                        {remainingTime.text}
                    </Text>
                </View>
            )}

            {/* Description */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>الوصف</Text>
                <Text style={styles.description}>
                    {task.description || 'لا يوجد وصف'}
                </Text>
            </View>

            {/* Details */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>التفاصيل</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>تاريخ الإنشاء:</Text>
                    <Text style={styles.detailValue}>
                        {new Date(task.created_at).toLocaleDateString('ar-IQ')}
                    </Text>
                </View>
                {task.due_date && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>تاريخ الاستحقاق:</Text>
                        <Text style={styles.detailValue}>
                            {new Date(task.due_date).toLocaleDateString('ar-IQ')}
                        </Text>
                    </View>
                )}
                {task.assigned_by_name && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>من:</Text>
                        <Text style={styles.detailValue}>{task.assigned_by_name}</Text>
                    </View>
                )}
            </View>

            {/* Change Status */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>تغيير الحالة</Text>
                <View style={styles.statusButtons}>
                    {STATUS_OPTIONS.map(status => (
                        <TouchableOpacity
                            key={status.value}
                            style={[
                                styles.statusButton,
                                { borderColor: status.color },
                                task.status === status.value && { backgroundColor: status.color }
                            ]}
                            onPress={() => handleStatusChange(status.value)}
                            disabled={submitting || task.status === status.value}
                        >
                            <Text style={[
                                styles.statusButtonText,
                                { color: task.status === status.value ? '#fff' : status.color }
                            ]}>
                                {status.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Add Comment */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>إضافة تعليق</Text>
                <TextInput
                    style={styles.commentInput}
                    placeholder="اكتب تعليقك هنا..."
                    placeholderTextColor="#9ca3af"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                />
                <TouchableOpacity
                    style={[styles.addCommentButton, !comment.trim() && styles.disabledButton]}
                    onPress={handleAddComment}
                    disabled={!comment.trim() || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.addCommentButtonText}>إضافة تعليق</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Comments List */}
            {task.comments && task.comments.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>التعليقات ({task.comments.length})</Text>
                    {task.comments.map((c, index) => (
                        <View key={index} style={styles.commentItem}>
                            <Text style={styles.commentAuthor}>{c.author_name || 'مستخدم'}</Text>
                            <Text style={styles.commentText}>{c.content}</Text>
                            <Text style={styles.commentDate}>
                                {new Date(c.created_at).toLocaleDateString('ar-IQ')}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

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
        backgroundColor: '#f3f4f6',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    errorText: {
        fontSize: 18,
        color: '#ef4444',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'right',
        marginLeft: 12,
    },
    priorityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    priorityText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadge: {
        marginHorizontal: 20,
        marginTop: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    timeSection: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    timeText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#fff',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        textAlign: 'right',
    },
    description: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 24,
        textAlign: 'right',
    },
    detailRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    detailValue: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
    },
    statusButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 2,
    },
    statusButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    commentInput: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1f2937',
        textAlign: 'right',
        textAlignVertical: 'top',
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    addCommentButton: {
        backgroundColor: '#3b82f6',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    addCommentButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    commentItem: {
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'right',
    },
    commentText: {
        fontSize: 14,
        color: '#4b5563',
        marginTop: 4,
        textAlign: 'right',
    },
    commentDate: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
        textAlign: 'left',
    },
});
