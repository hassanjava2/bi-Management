/**
 * Bi Management Mobile - Auth Context
 * سياق المصادقة
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, storeToken, getToken, removeToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // فحص الـ Token عند بدء التطبيق
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await getToken();
            if (token) {
                const response = await authAPI.me();
                if (response.success) {
                    setUser(response.data);
                }
            }
        } catch (err) {
            console.log('Auth check failed:', err);
            await removeToken();
        } finally {
            setLoading(false);
        }
    };

    // تسجيل الدخول
    const login = async (email, password) => {
        try {
            setError(null);
            setLoading(true);
            
            const response = await authAPI.login(email, password);
            
            if (response.success) {
                await storeToken(response.data.token, response.data.refreshToken);
                setUser(response.data.user);
                return { success: true };
            } else {
                setError(response.message || 'فشل تسجيل الدخول');
                return { success: false, error: response.message };
            }
        } catch (err) {
            const message = err.message || 'حدث خطأ في تسجيل الدخول';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    // تسجيل الخروج
    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.log('Logout error:', err);
        } finally {
            await removeToken();
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        checkAuth,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
