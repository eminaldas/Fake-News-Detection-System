import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useAnalysis } from '../hooks/useAnalysis';
import AnalysisForm from '../features/analysis/AnalysisForm';
import AnalysisResultCard from '../features/analysis/AnalysisResultCard';

const Home = () => {
    const { analyze, loading, result, error, isPolling } = useAnalysis();

    return (
        <div className="max-w-4xl mx-auto mt-6">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-app-charcoal mb-4 tracking-tight">Verify the Truth</h1>
                <p className="text-lg text-app-charcoal opacity-70 max-w-2xl mx-auto">
                    Paste any news article, claim, or text below. Our AI evaluates linguistic signals and compares them against the verified knowledge base to detect fabrication.
                </p>
            </div>

            <AnalysisForm
                onAnalyze={analyze}
                loading={loading}
                isPolling={isPolling}
                _error={error}
            />

            {error && (
                <div className="bg-app-burgundy bg-opacity-10 border-l-4 border-app-burgundy p-4 rounded-r-lg mb-8 flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-app-burgundy shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-app-burgundy font-bold">Analysis Error</h3>
                        <p className="text-app-burgundy opacity-90 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            <AnalysisResultCard result={result} />
        </div>
    );
};

export default Home;
