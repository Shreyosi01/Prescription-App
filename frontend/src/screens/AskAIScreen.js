import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated, StatusBar, useWindowDimensions, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../config';

const SUGGESTIONS = [
    { icon: '💊', text: 'What are Paracetamol side effects?' },
    { icon: '🍽️', text: 'Can I take ibuprofen on empty stomach?' },
    { icon: '📋', text: 'What does "bd" mean on a prescription?' },
    { icon: '🔄', text: 'Generic vs brand medicines?' },
    { icon: '💉', text: 'Is it safe to split tablets?' },
    { icon: '🌡️', text: 'How to store medicines properly?' },
];

const WELCOME_MESSAGE = `Hey there! 👋 I'm your personal **Health AI**.\n\nAsk me anything about:\n• 💊 **Medicines** — dosage & side effects\n• 📋 **Prescriptions** — decode doctor shorthand\n\n⚠️ *I'm here to inform, not diagnose.*`;

export default function AskAIScreen({ goBack }) {
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth > 850;
    const chatContainerWidth = isDesktop ? 750 : '100%';

    const [messages, setMessages] = useState([{ id: '0', role: 'assistant', content: WELCOME_MESSAGE }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ type: 'info', title: '', message: '' });

    const flatRef = useRef(null);
    
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (loading) {
            const animate = (dot, delay) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(dot, { toValue: -5, duration: 400, useNativeDriver: true }),
                        Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ])
                ).start();
            };
            animate(dot1, 0);
            animate(dot2, 200);
            animate(dot3, 400);
        }
    }, [loading]);

    const sendMessage = async (text) => {
        const userText = (text || input).trim();
        if (!userText || loading) return;

        const userMsg = { id: Date.now().toString(), role: 'user', content: userText };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: userText }] }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.content,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }]);
            }
        } catch (e) {
            setModalConfig({ type: 'error', title: 'Connection Error', message: 'Please check your internet.' });
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const formatText = (text, isUser) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <Text key={index} style={[styles.boldText, isUser ? {color: '#fff'} : {color: '#14B8A6'}]}>{part.slice(2, -2)}</Text>;
            }
            return <Text key={index}>{part}</Text>;
        });
    };

    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperAI]}>
                <View style={[styles.avatarBox, isUser ? styles.avatarUser : styles.avatarAI]}>
                    <Feather name={isUser ? "user" : "cpu"} size={12} color="#FFF" />
                </View>

                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
                    <Text style={[styles.bubbleText, isUser && styles.textWhite]}>
                        {formatText(item.content, isUser)}
                    </Text>
                    {item.timestamp && !isUser && <Text style={styles.timeText}>{item.timestamp}</Text>}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerInner}>
                        <View style={styles.headerLeftSection}>
                            <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
                                <Feather name="arrow-left" size={22} color="#FFF" />
                            </TouchableOpacity>
                            
                            <View style={styles.headerTextGroup}>
                                <Text style={styles.headerTitle}>Health Assistant</Text>
                                <View style={styles.statusRow}>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.statusText}>Online</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.headerBtn} onPress={() => setMessages([{ id: '0', role: 'assistant', content: WELCOME_MESSAGE }])}>
                            <Feather name="refresh-cw" size={16} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={[styles.chatArea, { width: chatContainerWidth, alignSelf: 'center' }]}>
                <FlatList
                    ref={flatRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={m => m.id}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatRef.current?.scrollToEnd()}
                    ListFooterComponent={loading ? (
                        <View style={styles.thinkingWrapper}>
                            <View style={[styles.avatarBox, styles.avatarAI]}>
                                <Feather name="cpu" size={12} color="#FFF" />
                            </View>
                            <View style={styles.thinkingBubble}>
                                <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
                                <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
                                <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
                            </View>
                        </View>
                    ) : null}
                />

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
                    <View style={styles.suggestionRow}>
                        <FlatList 
                            horizontal
                            data={SUGGESTIONS}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.chip} onPress={() => sendMessage(item.text)}>
                                    <Text style={styles.chipText}>{item.icon} {item.text}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>

                    <View style={styles.disclaimer}>
                        <Ionicons name="information-circle-outline" size={12} color="#94A3B8" />
                        <Text style={styles.disclaimerText}>Not a substitute for professional medical advice.</Text>
                    </View>

                    <View style={styles.inputArea}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Ask about medicines..."
                                placeholderTextColor="#94A3B8"
                                value={input}
                                onChangeText={setInput}
                                multiline
                            />
                            <TouchableOpacity 
                                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
                                onPress={() => sendMessage()}
                                disabled={!input.trim() || loading}
                            >
                                <LinearGradient colors={['#14B8A6', '#0D9488']} style={styles.sendGradient}>
                                    <Feather name="send" size={18} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>{modalConfig.title}</Text>
                        <Text style={styles.modalMsg}>{modalConfig.message}</Text>
                        <TouchableOpacity style={styles.modalBtn} onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalBtnText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    headerLeftSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTextGroup: { justifyContent: 'center' },
    headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    statusText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },

    chatArea: { flex: 1 },
    listContent: { padding: 20, paddingBottom: 10 },
    
    msgWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 8, maxWidth: '85%', gap: 8 },
    msgWrapperAI: { alignSelf: 'flex-start' },
    msgWrapperUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    
    avatarBox: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarAI: { backgroundColor: '#14B8A6' },
    avatarUser: { backgroundColor: '#1E293B' },

    bubble: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 20, elevation: 1 },
    bubbleAI: { backgroundColor: '#FFF', borderBottomLeftRadius: 4 },
    bubbleUser: { backgroundColor: '#1E293B', borderBottomRightRadius: 4 },
    bubbleText: { fontSize: 15, color: '#334155', lineHeight: 22 },
    textWhite: { color: '#FFF' },
    timeText: { fontSize: 9, color: '#94A3B8', marginTop: 4, alignSelf: 'flex-start' },
    boldText: { fontWeight: '800' },

    thinkingWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8, alignSelf: 'flex-start' },
    thinkingBubble: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderBottomLeftRadius: 4, flexDirection: 'row', gap: 5, elevation: 1 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#14B8A6' },

    suggestionRow: { marginBottom: 10 },
    chip: { backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
    disclaimer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
    disclaimerText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

    inputArea: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 35 : 20 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 30, padding: 6, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4 },
    input: { flex: 1, paddingHorizontal: 16, fontSize: 15, color: '#1E293B', maxHeight: 100 },
    sendBtn: { borderRadius: 25, overflow: 'hidden' },
    sendGradient: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
    sendDisabled: { opacity: 0.5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 25, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    modalMsg: { textAlign: 'center', color: '#64748B', lineHeight: 20, marginBottom: 20 },
    modalBtn: { backgroundColor: '#14B8A6', paddingVertical: 14, paddingHorizontal: 50, borderRadius: 16 },
    modalBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 }
});