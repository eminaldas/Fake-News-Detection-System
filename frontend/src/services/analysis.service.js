import axiosInstance from '../api/axios';

class AnalysisService {
    static async analyzeText(text) {
        const response = await axiosInstance.post('/analysis/analyze', { text });
        return response.data;
    }

    static async analyzeUrl(url) {
        const response = await axiosInstance.post('/analysis/analyze/url', { url });
        return response.data;
    }

    static async checkStatus(taskId) {
        const response = await axiosInstance.get(`/analysis/status/${taskId}`);
        return response.data;
    }

    static async requestFullReport(taskId, userNote = '') {
        const response = await axiosInstance.post(
            `/analysis/analyze/full-report/${taskId}`,
            { user_note: userNote || undefined },
        );
        return response.data;
    }

    static async getFullReport(taskId) {
        const response = await axiosInstance.get(`/analysis/analyze/full-report/${taskId}`);
        return response.data;
    }

    static async checkSimilar(taskId) {
        const response = await axiosInstance.get(`/analysis/analyze/check-similar/${taskId}`);
        return response.data;
    }

    static async submitFeedback(taskId, label) {
        const response = await axiosInstance.post('/analysis/feedback', {
            task_id: taskId,
            submitted_label: label,
        });
        return response.data;
    }

    static async voteThread(threadId, voteType) {
        const response = await axiosInstance.post(
            `/forum/threads/${threadId}/vote`,
            { vote_type: voteType },
        );
        return response.data;
    }

    static async getSimilarNews(taskId) {
        const response = await axiosInstance.get(`/analysis/similar-news/${taskId}?limit=4`);
        return response.data;
    }
}

export default AnalysisService;
