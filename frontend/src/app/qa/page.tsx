import QA from '../../components/QA';

export default function QAPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Document Q&A
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Upload a document or paste text, then ask questions about its content
          </p>
        </div>
        
        <QA />
      </div>
    </div>
  );
}