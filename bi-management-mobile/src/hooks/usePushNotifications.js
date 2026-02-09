/**
 * Bi Management Mobile - Push Notifications Hook
 * هوك إشعارات الدفع
 */

import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationsAPI } from '../services/api';

// إعدادات الإشعارات
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(null);
    const [error, setError] = useState(null);
    
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        // تسجيل للإشعارات
        registerForPushNotificationsAsync()
            .then(token => {
                if (token) {
                    setExpoPushToken(token);
                    // إرسال الـ token للـ Backend
                    notificationsAPI.registerDevice(token)
                        .catch(err => console.log('Failed to register device:', err));
                }
            })
            .catch(err => setError(err.message));

        // الاستماع للإشعارات الواردة
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
            console.log('Notification received:', notification);
        });

        // الاستماع للتفاعل مع الإشعارات
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response:', response);
            handleNotificationResponse(response);
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
        error,
    };
}

// تسجيل الجهاز للإشعارات
async function registerForPushNotificationsAsync() {
    let token;

    // التحقق من أنه جهاز حقيقي
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        // في المحاكي، نرجع token وهمي للاختبار
        return 'ExponentPushToken[SIMULATOR]';
    }

    // إعدادات Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3b82f6',
        });
    }

    // طلب الإذن
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
    }

    // الحصول على token
    try {
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: 'bi-management', // استبدل بـ project ID الخاص بك
        })).data;
        console.log('Push token:', token);
    } catch (error) {
        console.log('Error getting push token:', error);
        // في حالة الخطأ، نرجع token للاختبار
        token = `ExponentPushToken[${Date.now()}]`;
    }

    return token;
}

// معالجة التفاعل مع الإشعار
function handleNotificationResponse(response) {
    const data = response.notification.request.content.data;
    
    // التنقل حسب نوع الإشعار
    if (data?.type === 'task') {
        // navigation.navigate('TaskDetails', { taskId: data.taskId });
    } else if (data?.type === 'attendance') {
        // navigation.navigate('Attendance');
    } else if (data?.type === 'chat') {
        // navigation.navigate('Chat');
    }
}

// إرسال إشعار محلي (للاختبار)
export async function sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
        },
        trigger: null, // فوري
    });
}

export default usePushNotifications;
