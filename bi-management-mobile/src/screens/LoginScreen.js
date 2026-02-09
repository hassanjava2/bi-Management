/**
 * Bi Management Mobile - Login Screen
 * شاشة تسجيل الدخول
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, error } = useAuth();

    // تسجيل الدخول
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('خطأ', 'يرجى إدخال البريد وكلمة المرور');
            return;
        }

        setIsLoading(true);
        
        const result = await login(email, password);
        
        if (result.success && rememberMe) {
            // حفظ بيانات الدخول للبصمة
            await SecureStore.setItemAsync('saved_email', email);
            await SecureStore.setItemAsync('saved_password', password);
        }
        
        setIsLoading(false);
        
        if (!result.success) {
            Alert.alert('خطأ', result.error || 'فشل تسجيل الدخول');
        }
    };

    // تسجيل الدخول بالبصمة
    const handleBiometricLogin = async () => {
        try {
            // فحص دعم البصمة
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                Alert.alert('غير متاح', 'البصمة غير متاحة على هذا الجهاز');
                return;
            }

            // فحص وجود بيانات محفوظة
            const savedEmail = await SecureStore.getItemAsync('saved_email');
            const savedPassword = await SecureStore.getItemAsync('saved_password');

            if (!savedEmail || !savedPassword) {
                Alert.alert('تنبيه', 'يجب تسجيل الدخول أولاً وتفعيل "تذكرني"');
                return;
            }

            // مصادقة البصمة
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'تسجيل الدخول بالبصمة',
                cancelLabel: 'إلغاء',
            });

            if (result.success) {
                setIsLoading(true);
                await login(savedEmail, savedPassword);
                setIsLoading(false);
            }
        } catch (err) {
            console.error('Biometric error:', err);
            Alert.alert('خطأ', 'فشلت المصادقة بالبصمة');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoText}>Bi</Text>
                    </View>
                    <Text style={styles.title}>Bi Management</Text>
                    <Text style={styles.subtitle}>نظام إدارة الشركة</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>البريد الإلكتروني</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="admin@bi-company.com"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            textAlign="right"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>كلمة المرور</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor="#999"
                            secureTextEntry
                            textAlign="right"
                        />
                    </View>

                    {/* Remember Me */}
                    <TouchableOpacity
                        style={styles.rememberContainer}
                        onPress={() => setRememberMe(!rememberMe)}
                    >
                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                            {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.rememberText}>تذكرني (للبصمة)</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
                        )}
                    </TouchableOpacity>

                    {/* Biometric Login */}
                    <TouchableOpacity
                        style={styles.biometricButton}
                        onPress={handleBiometricLogin}
                    >
                        <Text style={styles.biometricIcon}>👆</Text>
                        <Text style={styles.biometricText}>الدخول بالبصمة</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Bi Management v2.0 © 2026
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#a0a0a0',
    },
    form: {
        backgroundColor: '#16213e',
        borderRadius: 16,
        padding: 24,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        color: '#a0a0a0',
        marginBottom: 8,
        textAlign: 'right',
    },
    input: {
        backgroundColor: '#0f3460',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
    },
    rememberContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 24,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    checkboxChecked: {
        backgroundColor: '#4f46e5',
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
    },
    rememberText: {
        color: '#a0a0a0',
    },
    loginButton: {
        backgroundColor: '#4f46e5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    biometricButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    biometricIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    biometricText: {
        color: '#4f46e5',
        fontSize: 16,
    },
    footer: {
        textAlign: 'center',
        color: '#666',
        marginTop: 40,
    },
});
