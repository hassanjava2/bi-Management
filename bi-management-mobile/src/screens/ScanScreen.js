/**
 * BI Management Mobile - Barcode Scanner Screen
 * شاشة مسح الباركود
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Vibration,
    ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { devicesAPI } from '../services/api';

export default function ScanScreen({ navigation }) {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [scanMode, setScanMode] = useState('view'); // view, custody, transfer

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned || loading) return;
        
        setScanned(true);
        setLoading(true);
        Vibration.vibrate(100);

        try {
            // البحث عن الجهاز
            const response = await devicesAPI.scan(data);
            
            if (response.success && response.data) {
                const device = response.data.device;
                
                switch (scanMode) {
                    case 'custody':
                        // تسجيل بالذمة
                        await handleCustody(device);
                        break;
                    case 'transfer':
                        // نقل لمخزن آخر
                        navigation.navigate('Transfer', { device });
                        break;
                    default:
                        // عرض التفاصيل
                        navigation.navigate('DeviceDetails', { device });
                }
            } else {
                Alert.alert(
                    'غير موجود',
                    `الجهاز ${data} غير موجود في النظام`,
                    [{ text: 'حسناً', onPress: () => setScanned(false) }]
                );
            }
        } catch (error) {
            Alert.alert(
                'خطأ',
                error.message || 'حدث خطأ أثناء البحث',
                [{ text: 'حسناً', onPress: () => setScanned(false) }]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCustody = async (device) => {
        const isMyCustody = device.custody_user_id === 'current_user_id'; // TODO: get from auth
        
        Alert.alert(
            isMyCustody ? 'إرجاع الجهاز' : 'استلام الجهاز',
            isMyCustody 
                ? `هل تريد إرجاع الجهاز ${device.serial_number}؟`
                : `هل تريد استلام الجهاز ${device.serial_number} بذمتك؟`,
            [
                { text: 'إلغاء', onPress: () => setScanned(false), style: 'cancel' },
                {
                    text: 'تأكيد',
                    onPress: async () => {
                        try {
                            if (isMyCustody) {
                                await devicesAPI.returnCustody(device.id);
                                Alert.alert('تم', 'تم إرجاع الجهاز بنجاح');
                            } else {
                                await devicesAPI.takeCustody(device.id, 'مسح بالتطبيق');
                                Alert.alert('تم', 'تم تسجيل الجهاز بذمتك');
                            }
                        } catch (error) {
                            Alert.alert('خطأ', error.message);
                        } finally {
                            setScanned(false);
                        }
                    }
                }
            ]
        );
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.text}>جاري طلب صلاحية الكاميرا...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>لا يوجد صلاحية للوصول للكاميرا</Text>
                <TouchableOpacity 
                    style={styles.button}
                    onPress={() => Camera.requestCameraPermissionsAsync()}
                >
                    <Text style={styles.buttonText}>طلب الصلاحية</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                style={styles.camera}
                type={Camera.Constants.Type.back}
                flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
                barCodeScannerSettings={{
                    barCodeTypes: [BarCodeScanner.Constants.BarCodeType.code128, BarCodeScanner.Constants.BarCodeType.qr],
                }}
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
                {/* Overlay */}
                <View style={styles.overlay}>
                    {/* Top */}
                    <View style={styles.overlayTop}>
                        <Text style={styles.title}>
                            {scanMode === 'custody' ? 'مسح للذمة' : 
                             scanMode === 'transfer' ? 'مسح للنقل' : 'مسح الباركود'}
                        </Text>
                    </View>
                    
                    {/* Middle with cutout */}
                    <View style={styles.overlayMiddle}>
                        <View style={styles.overlaySide} />
                        <View style={styles.scanArea}>
                            {/* Corner markers */}
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                            
                            {/* Scanning line animation */}
                            {!scanned && <View style={styles.scanLine} />}
                            
                            {loading && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                </View>
                            )}
                        </View>
                        <View style={styles.overlaySide} />
                    </View>
                    
                    {/* Bottom */}
                    <View style={styles.overlayBottom}>
                        <Text style={styles.hint}>وجّه الكاميرا نحو الباركود</Text>
                        
                        {/* Mode selector */}
                        <View style={styles.modeSelector}>
                            <TouchableOpacity 
                                style={[styles.modeButton, scanMode === 'view' && styles.modeButtonActive]}
                                onPress={() => setScanMode('view')}
                            >
                                <Text style={[styles.modeButtonText, scanMode === 'view' && styles.modeButtonTextActive]}>
                                    👁️ عرض
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modeButton, scanMode === 'custody' && styles.modeButtonActive]}
                                onPress={() => setScanMode('custody')}
                            >
                                <Text style={[styles.modeButtonText, scanMode === 'custody' && styles.modeButtonTextActive]}>
                                    📋 ذمة
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modeButton, scanMode === 'transfer' && styles.modeButtonActive]}
                                onPress={() => setScanMode('transfer')}
                            >
                                <Text style={[styles.modeButtonText, scanMode === 'transfer' && styles.modeButtonTextActive]}>
                                    🔄 نقل
                                </Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity 
                                style={styles.actionButton}
                                onPress={() => setFlashOn(!flashOn)}
                            >
                                <Text style={styles.actionIcon}>{flashOn ? '🔦' : '💡'}</Text>
                                <Text style={styles.actionText}>فلاش</Text>
                            </TouchableOpacity>
                            
                            {scanned && (
                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.actionButtonPrimary]}
                                    onPress={() => setScanned(false)}
                                >
                                    <Text style={styles.actionIcon}>🔄</Text>
                                    <Text style={styles.actionText}>مسح آخر</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Camera>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    camera: {
        flex: 1,
        width: '100%',
    },
    overlay: {
        flex: 1,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 20,
    },
    overlayMiddle: {
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayBottom: {
        flex: 1.5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        paddingTop: 20,
    },
    scanArea: {
        width: 280,
        height: 280,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#2563eb',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    scanLine: {
        position: 'absolute',
        top: '50%',
        left: 10,
        right: 10,
        height: 2,
        backgroundColor: '#2563eb',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    hint: {
        color: '#ccc',
        fontSize: 14,
    },
    modeSelector: {
        flexDirection: 'row',
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 25,
        padding: 4,
    },
    modeButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    modeButtonActive: {
        backgroundColor: '#2563eb',
    },
    modeButtonText: {
        color: '#ccc',
        fontSize: 14,
    },
    modeButtonTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 20,
    },
    actionButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 15,
    },
    actionButtonPrimary: {
        backgroundColor: '#2563eb',
    },
    actionIcon: {
        fontSize: 24,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 5,
    },
    text: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
    button: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
