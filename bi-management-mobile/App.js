/**
 * Bi Management Mobile App
 * تطبيق إدارة الشركة للموبايل
 * 
 * @version 1.0.0
 * @author Bi Beyond Intelligence
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function App() {
    useEffect(() => {
        // Request notification permissions
        registerForPushNotificationsAsync();

        // Handle notification when app is in foreground
        const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
        });

        // Handle notification tap
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification tapped:', response);
        });

        return () => {
            foregroundSubscription.remove();
            responseSubscription.remove();
        };
    }, []);

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar style="light" />
                <AppNavigator />
            </AuthProvider>
        </SafeAreaProvider>
    );
}

// Register for push notifications
async function registerForPushNotificationsAsync() {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Push notification permission not granted');
            return;
        }

        console.log('Push notifications enabled');
    } catch (error) {
        console.error('Error registering for push notifications:', error);
    }
}
