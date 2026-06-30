import { useState, useCallback, useEffect } from 'react';
import axiosInstance from '../../../api/axios';
import { useWebSocket } from '../../../contexts/WebSocketContext';

/**
 * Aktif konuşmanın mesaj listesini, gönder/sil işlemlerini ve partner bilgisini yönetir.
 * WS handler: yalnızca aktif konuşmadan (payload.sender_id === activeId) gelen mesajı ekler.
 *
 * @param {string|null}    activeId          - Seçili konuşmanın kullanıcı ID'si
 * @param {object|null}    me                - Oturum açmış kullanıcı ({ id, ... })
 * @param {function}       setConversations  - useConversations'dan gelen setter
 * @param {object|null}    replyTo           - Yanıt verilen mesaj ({ id, content, sender_id, ... })
 * @param {function}       setText           - Mesaj giriş alanını temizlemek için
 * @param {function}       setReplyTo        - Yanıt şeridini kapatmak için
 * @param {React.RefObject} inputRef         - Textarea ref (yükseklik sıfırlama + focus)
 * @param {function}       loadConversations - useConversations'dan gelen liste yenileme fn
 */
export function useChat({
    activeId,
    me,
    setConversations,
    replyTo,
    setText,
    setReplyTo,
    inputRef,
    loadConversations,
}) {
    const { subscribe } = useWebSocket();

    const [partner,  setPartner]  = useState(null);
    const [messages, setMessages] = useState([]);
    const [msgLoad,  setMsgLoad]  = useState(false);
    const [sending,  setSending]  = useState(false);

    const loadConversation = useCallback(async (uid) => {
        if (!uid) return;
        setMsgLoad(true);
        try {
            const { data } = await axiosInstance.get(`/messages/${uid}`);
            setMessages(data.messages ?? []);
            setPartner(data.partner);
            setConversations(prev => prev.map(c =>
                c.partner_id === uid ? { ...c, unread_count: 0 } : c
            ));
        } catch { /* sessiz */ }
        finally { setMsgLoad(false); }
    }, [setConversations]);

    useEffect(() => {
        if (activeId) loadConversation(activeId);
    }, [activeId, loadConversation]);

    /* WS — orijinal if branch: aktif konuşmadan gelen mesaj → mesaj listesine ekle */
    useEffect(() => {
        const unsub = subscribe('dm.new_message', (payload) => {
            if (payload.sender_id === activeId) {
                setMessages(prev => [...prev, {
                    id:          payload.id,
                    sender_id:   payload.sender_id,
                    receiver_id: me?.id,
                    content:     payload.content,
                    msg_type:    payload.msg_type,
                    is_read:     true,
                    reply_to_id: payload.reply_to_id ?? null,
                    reply_to:    payload.reply_to ?? null,
                    created_at:  payload.created_at,
                }]);
            }
        });
        return unsub;
    }, [subscribe, activeId, me?.id]);

    const handleSend = async (content, type = 'text') => {
        if (!content.trim() || !activeId || sending) return;
        setSending(true);
        try {
            const { data } = await axiosInstance.post(`/messages/${activeId}`, {
                content:     content.trim(),
                msg_type:    type,
                reply_to_id: replyTo?.id ?? null,
            });
            setMessages(prev => [...prev, data]);
            setConversations(prev => {
                const updated = prev.map(c =>
                    c.partner_id === activeId
                        ? { ...c, last_message: data.content, last_msg_type: data.msg_type, last_at: data.created_at }
                        : c
                );
                if (!updated.find(c => c.partner_id === activeId) && partner) {
                    return [{
                        partner_id:     activeId,
                        partner_name:   partner.username,
                        partner_avatar: partner.avatar_url,
                        last_message:   data.content,
                        last_msg_type:  data.msg_type,
                        last_at:        data.created_at,
                        unread_count:   0,
                    }, ...updated];
                }
                return updated;
            });
            setText('');
            setReplyTo(null);
            if (inputRef.current) inputRef.current.style.height = 'auto';
            inputRef.current?.focus();
            loadConversations(true);
        } catch { /* sessiz */ }
        finally { setSending(false); }
    };

    const handleDelete = useCallback(async (messageId) => {
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch { /* sessiz */ }
    }, []);

    const beginConversation = useCallback((p) => {
        // p: { id, username, avatar_url } — optimistik başlık verisi (liste verisinden)
        setPartner(prev => (prev && prev.id === p.id) ? prev : p);
        setMessages([]);
    }, []);

    return { partner, messages, setMessages, msgLoad, loadConversation, handleSend, handleDelete, sending, beginConversation };
}
