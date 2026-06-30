import { useState, useRef, useCallback, useEffect } from 'react';
import axiosInstance from '../../../api/axios';
import { useWebSocket } from '../../../contexts/WebSocketContext';

/**
 * Konuşma listesini yönetir.
 * WS handler: yalnızca aktif konuşma DIŞINDAN gelen mesajlarda (else branch) listeyi günceller.
 */
export function useConversations({ activeId }) {
    const { subscribe } = useWebSocket();

    const [conversations, setConversations] = useState([]);
    const [convLoad,      setConvLoad]      = useState(true);
    const convReqIdRef = useRef(0);

    const loadConversations = useCallback(async (silent = false) => {
        const reqId = ++convReqIdRef.current;
        if (!silent) setConvLoad(true);
        try {
            const { data } = await axiosInstance.get('/messages/conversations');
            if (reqId !== convReqIdRef.current) return;
            setConversations(data.conversations ?? []);
        } catch { /* sessiz */ }
        finally { if (reqId === convReqIdRef.current) setConvLoad(false); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    /* WS — orijinal else branch: aktif konuşma DIŞINDAN gelen mesaj → listeyi güncelle */
    useEffect(() => {
        const unsub = subscribe('dm.new_message', (payload) => {
            if (payload.sender_id !== activeId) {
                setConversations(prev => {
                    const exists = prev.find(c => c.partner_id === payload.sender_id);
                    if (exists) {
                        return prev.map(c => c.partner_id === payload.sender_id
                            ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: payload.content, last_at: payload.created_at }
                            : c
                        );
                    }
                    return [{
                        partner_id:     payload.sender_id,
                        partner_name:   payload.sender_name,
                        partner_avatar: payload.sender_avatar,
                        last_message:   payload.content,
                        last_msg_type:  payload.msg_type,
                        last_at:        payload.created_at,
                        unread_count:   1,
                    }, ...prev];
                });
            }
        });
        return unsub;
    }, [subscribe, activeId]);

    return { conversations, setConversations, convLoad, loadConversations };
}
