import Summarization from '@/components/Summarization';

export default function SummarizationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Text Summarization
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Transform long documents into concise, meaningful summaries
            </p>
          </div>
          <Summarization />
        </div>
      </div>
    </div>
  );
}