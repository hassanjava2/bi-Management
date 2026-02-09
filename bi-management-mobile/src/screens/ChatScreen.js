/**
 * Bi Management Mobile - AI Chat Screen
 * شاشة المحادثة مع AI
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { aiAPI } from '../services/api';

export default function ChatScreen() {
    const [messages, setMessages] = useState([
        {
            id: '0',
            text: 'مرحباً! أنا مساعدك الذكي في Bi Management. كيف يمكنني مساعدتك اليوم؟',
            isBot: true,
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const flatListRef = useRef(null);

    // اقتراحات سريعة
    const quickSuggestions = [
        'ما هي مهامي اليوم؟',
        'أريد الإبلاغ عن مشكلة',
        'أريد طلب إجازة',
        'كيف أدائي هذا الشهر؟',
    ];

    const sendMessage = async (text = inputText) => {
        if (!text.trim() || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            text: text.trim(),
            isBot: false,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await aiAPI.sendMessage(text, conversationId);
            
            if (response.success) {
                const botMessage = {
                    id: (Date.now() + 1).toString(),
                    text: response.data.response || response.data.message,
                    isBot: true,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, botMessage]);
                
                if (response.data.conversation_id) {
                    setConversationId(response.data.conversation_id);
                }
            }
        } catch (err) {
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                text: 'عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.',
                isBot: true,
                isError: true,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }) => (
        <View style={[
            styles.messageContainer,
            item.isBot ? styles.botMessage : styles.userMessage
        ]}>
            {item.isBot && (
                <View style={styles.botAvatar}>
                    <Text style={styles.botAvatarText}>🤖</Text>
                </View>
            )}
            <View style={[
                styles.messageBubble,
                item.isBot ? styles.botBubble : styles.userBubble,
                item.isError && styles.errorBubble
            ]}>
                <Text style={[
                    styles.messageText,
                    item.isBot ? styles.botText : styles.userText
                ]}>
                    {item.text}
                </Text>
                <Text style={styles.timestamp}>
                    {item.timestamp.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                ListFooterComponent={
                    isLoading ? (
                        <View style={styles.loadingContainer}>
                            <View style={styles.botAvatar}>
                                <Text style={styles.botAvatarText}>🤖</Text>
                            </View>
                            <View style={styles.loadingBubble}>
                                <ActivityIndicator size="small" color="#4f46e5" />
                                <Text style={styles.loadingText}>يكتب...</Text>
                            </View>
                        </View>
                    ) : null
                }
            />

            {/* Quick Suggestions */}
            {messages.length <= 2 && (
                <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsTitle}>اقتراحات:</Text>
                    <View style={styles.suggestionsRow}>
                        {quickSuggestions.map((suggestion, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.suggestionButton}
                                onPress={() => sendMessage(suggestion)}
                            >
                                <Text style={styles.suggestionText}>{suggestion}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Input Area */}
            <View style={styles.inputContainer}>
                <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={() => sendMessage()}
                    disabled={!inputText.trim() || isLoading}
                >
                    <Text style={styles.sendButtonText}>↑</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="اكتب رسالتك هنا..."
                    placeholderTextColor="#666"
                    multiline
                    maxLength={500}
                    textAlign="right"
                    onSubmitEditing={() => sendMessage()}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    messagesList: {
        padding: 16,
        paddingBottom: 8,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    botMessage: {
        justifyContent: 'flex-start',
    },
    userMessage: {
        justifyContent: 'flex-end',
    },
    botAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#16213e',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    botAvatarText: {
        fontSize: 20,
    },
    messageBubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 16,
    },
    botBubble: {
        backgroundColor: '#16213e',
        borderBottomLeftRadius: 4,
    },
    userBubble: {
        backgroundColor: '#4f46e5',
        borderBottomRightRadius: 4,
    },
    errorBubble: {
        backgroundColor: '#7f1d1d',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    botText: {
        color: '#fff',
        textAlign: 'right',
    },
    userText: {
        color: '#fff',
        textAlign: 'right',
    },
    timestamp: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
        textAlign: 'left',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    loadingBubble: {
        backgroundColor: '#16213e',
        padding: 12,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        color: '#a0a0a0',
        marginLeft: 8,
    },
    suggestionsContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#16213e',
    },
    suggestionsTitle: {
        color: '#a0a0a0',
        fontSize: 12,
        marginBottom: 8,
        textAlign: 'right',
    },
    suggestionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestionButton: {
        backgroundColor: '#16213e',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#4f46e5',
    },
    suggestionText: {
        color: '#4f46e5',
        fontSize: 13,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#16213e',
        backgroundColor: '#1a1a2e',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#16213e',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 15,
        maxHeight: 100,
        marginLeft: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#16213e',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
});
