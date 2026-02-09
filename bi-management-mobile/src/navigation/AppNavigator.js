/**
 * Bi Management Mobile - App Navigator
 * التنقل الرئيسي
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TasksScreen from '../screens/TasksScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ScanScreen from '../screens/ScanScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Bar Icon Component
function TabIcon({ name, focused }) {
    const icons = {
        Home: '🏠',
        Scan: '📷',
        Tasks: '📋',
        Attendance: '⏰',
        Chat: '🤖',
        Notifications: '🔔',
    };

    return (
        <View style={styles.tabIconContainer}>
            <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                {icons[name]}
            </Text>
        </View>
    );
}

// Main Tab Navigator
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => (
                    <TabIcon name={route.name} focused={focused} />
                ),
                tabBarActiveTintColor: '#4f46e5',
                tabBarInactiveTintColor: '#666',
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
                headerStyle: styles.header,
                headerTintColor: '#fff',
                headerTitleAlign: 'center',
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: 'الرئيسية',
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="Scan"
                component={ScanScreen}
                options={{
                    title: 'مسح',
                    headerTitle: 'مسح الباركود',
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="Tasks"
                component={TasksScreen}
                options={{
                    title: 'المهام',
                    headerTitle: 'مهامي',
                }}
            />
            <Tab.Screen
                name="Attendance"
                component={AttendanceScreen}
                options={{
                    title: 'الحضور',
                    headerTitle: 'سجل الحضور',
                }}
            />
            <Tab.Screen
                name="Chat"
                component={ChatScreen}
                options={{
                    title: 'المساعد',
                    headerTitle: 'المساعد الذكي',
                }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                    title: 'الإشعارات',
                    headerTitle: 'الإشعارات',
                }}
            />
        </Tab.Navigator>
    );
}

// Main App Navigator
export default function AppNavigator() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>جاري التحميل...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: styles.header,
                    headerTintColor: '#fff',
                    headerTitleAlign: 'center',
                    headerBackTitle: 'رجوع',
                }}
            >
                {isAuthenticated ? (
                    <>
                        <Stack.Screen
                            name="Main"
                            component={MainTabs}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="TaskDetails"
                            component={TaskDetailsScreen}
                            options={{ title: 'تفاصيل المهمة' }}
                        />
                        <Stack.Screen
                            name="DeviceDetails"
                            component={DeviceDetailsScreen}
                            options={{ title: 'تفاصيل الجهاز' }}
                        />
                        <Stack.Screen
                            name="Transfer"
                            component={TransferPlaceholder}
                            options={{ title: 'نقل جهاز' }}
                        />
                        <Stack.Screen
                            name="NewWarranty"
                            component={NewWarrantyPlaceholder}
                            options={{ title: 'طلب ضمان جديد' }}
                        />
                        <Stack.Screen
                            name="Profile"
                            component={ProfilePlaceholder}
                            options={{ title: 'ملفي الشخصي' }}
                        />
                        <Stack.Screen
                            name="Goals"
                            component={GoalsPlaceholder}
                            options={{ title: 'Bi Goals' }}
                        />
                    </>
                ) : (
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

// Placeholder screens (to be implemented)
function TaskDetailsPlaceholder({ route }) {
    return (
        <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>تفاصيل المهمة</Text>
            <Text style={styles.placeholderSubtext}>ID: {route.params?.taskId}</Text>
        </View>
    );
}

function ProfilePlaceholder() {
    const { user, logout } = useAuth();
    return (
        <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>👤</Text>
            <Text style={styles.placeholderText}>{user?.full_name}</Text>
            <Text style={styles.placeholderSubtext}>{user?.email}</Text>
            <View style={{ marginTop: 20 }}>
                <Text
                    style={styles.logoutButton}
                    onPress={logout}
                >
                    تسجيل الخروج
                </Text>
            </View>
        </View>
    );
}

function GoalsPlaceholder() {
    return (
        <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🏆</Text>
            <Text style={styles.placeholderText}>Bi Goals</Text>
            <Text style={styles.placeholderSubtext}>نظام النقاط والمكافآت</Text>
        </View>
    );
}

function TransferPlaceholder({ route }) {
    const device = route.params?.device;
    return (
        <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🔄</Text>
            <Text style={styles.placeholderText}>نقل جهاز</Text>
            <Text style={styles.placeholderSubtext}>{device?.serial_number}</Text>
            <Text style={[styles.placeholderSubtext, { marginTop: 20 }]}>
                اختر المخزن الهدف للنقل
            </Text>
        </View>
    );
}

function NewWarrantyPlaceholder({ route }) {
    const device = route.params?.device;
    return (
        <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🛡️</Text>
            <Text style={styles.placeholderText}>طلب ضمان جديد</Text>
            <Text style={styles.placeholderSubtext}>{device?.serial_number}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
    },
    tabBar: {
        backgroundColor: '#16213e',
        borderTopColor: '#0f3460',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
    },
    tabLabel: {
        fontSize: 11,
    },
    tabIconContainer: {
        alignItems: 'center',
    },
    tabIcon: {
        fontSize: 22,
        opacity: 0.6,
    },
    tabIconFocused: {
        opacity: 1,
    },
    header: {
        backgroundColor: '#16213e',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
    },
    placeholderIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    placeholderText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    placeholderSubtext: {
        color: '#a0a0a0',
        fontSize: 16,
        marginTop: 8,
    },
    logoutButton: {
        color: '#ef4444',
        fontSize: 16,
        textAlign: 'center',
        padding: 12,
    },
});
