import axiosInstance from '../api/axios';

class AnalysisService {
    /**
     * Submit text to be analyzed by the vector DB and ML engine.
     * @param {string} text - The input text or URL to analyze.
     * @returns {Promise} Resolves to the initial analysis response containing either a direct match message or a task_id for polling.
     */
    static async analyzeText(text) {
        const response = await axiosInstance.post('/analysis/analyze', { text });
        return response.data;
    }

    /**
     * Check the status of an ongoing background Celery task.
     * @param {string} taskId - The ID of the queued task.
     * @returns {Promise} Resolves to the task status and potentially the result.
     */
    static async analyzeUrl(url) {
        const response = await axiosInstance.post('/analysis/analyze/url', { url });
        return response.data;
    }

    static async checkStatus(taskId) {
        const response = await axiosInstance.get(`/analysis/status/${taskId}`);
        return response.data;
    }
}

export default AnalysisService;
