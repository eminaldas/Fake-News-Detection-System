import axiosInstance from '../api/axios';

/**
 * Kullanıcı etkileşimini sessizce kaydeder.
 * Fire-and-forget: hata fırlatsın ya da fırlatmasın UX etkilenmez.
 */
export async function trackInteraction({
    content_id,
    interaction_type,
    category = null,
    source_domain = null,
    nlp_score_at_time = null,
    visibility_weight = 1.0,
}) {
    if (!content_id && interaction_type !== 'filter_used') return;
    try {
        await axiosInstance.post('/interactions/track', {
            content_id: content_id ? String(content_id) : null,
            interaction_type,
            category,
            source_domain,
            nlp_score_at_time: nlp_score_at_time ?? null,
            visibility_weight,
        });
    } catch {
        // Sessizce geç — tracking hatası kullanıcıyı etkilemez
    }
}
