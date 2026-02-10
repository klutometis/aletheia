'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InquiryComplex } from '@/types/inquiry';

export default function GeneratePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedComplex, setGeneratedComplex] = useState<InquiryComplex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const extractTextFromFile = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);

    try {
      if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md')) {
        const text = await file.text();
        setDocumentText(text);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Dynamically import pdf.js only on client side when needed
        const pdfjs = await import('pdfjs-dist');
        
        const arrayBuffer = await file.arrayBuffer();
        
        // Set worker source - use local file from public directory
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
        }
        
        setDocumentText(fullText);
      } else {
        setError('Unsupported file type. Please use .txt, .md, .pdf, or paste text directly.');
      }
    } catch (err) {
      console.error('Error extracting text:', err);
      setError('Failed to extract text from file. Please try pasting text directly.');
    } finally {
      setIsExtracting(false);
    }
  };

  const generateInquiryComplex = async () => {
    if (!documentText.trim()) {
      setError('Please provide document text first.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-inquiry-complex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: documentText.trim(),
          maxQuestions: 12
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate inquiry complex');
      }

      const data = await response.json();
      setGeneratedComplex(data.inquiryComplex);
    } catch (err) {
      console.error('Error generating complex:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate inquiry complex');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAndUseComplex = () => {
    if (!generatedComplex) return;

    // Save to localStorage
    localStorage.setItem('aletheia-current-complex', JSON.stringify(generatedComplex));
    
    // Clear previous session answers
    localStorage.removeItem('aletheia-answers');

    // Navigate to main page
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Generate Inquiry Complex</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload a document to automatically generate an inquiry complex for exploration
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {!generatedComplex ? (
          /* Step 1 & 2: Upload and Generate */
          <div className="space-y-6">
            {/* Upload Mode Toggle */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Provide Document</h2>
              
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setUploadMode('file')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    uploadMode === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setUploadMode('text')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    uploadMode === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {uploadMode === 'file' ? (
                <div>
                  <input
                    type="file"
                    accept=".txt,.md,.pdf"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      cursor-pointer"
                  />
                  {file && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">
                        Selected: <span className="font-medium">{file.name}</span> ({Math.round(file.size / 1024)} KB)
                      </p>
                      <button
                        onClick={extractTextFromFile}
                        disabled={isExtracting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                      >
                        {isExtracting ? 'Extracting...' : 'Extract Text'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                    placeholder="Paste your document text here..."
                    className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {documentText.length.toLocaleString()} characters
                  </p>
                </div>
              )}

              {documentText && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Document text loaded ({documentText.length.toLocaleString()} characters)
                  </p>
                </div>
              )}
            </div>

            {/* Generate Button */}
            {documentText && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Generate Inquiry Complex</h2>
                <p className="text-sm text-gray-600 mb-4">
                  This will analyze your document and extract key contested questions, philosophical camps, and relationships between ideas.
                </p>
                <button
                  onClick={generateInquiryComplex}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  {isGenerating ? 'Generating...' : '✨ Generate Inquiry Complex'}
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        ) : (
          /* Step 3: Preview and Save */
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Generated Inquiry Complex</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Review the generated complex and save to start exploring
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedComplex(null);
                    setDocumentText('');
                    setFile(null);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Start Over
                </button>
              </div>

              {/* Topic */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  {generatedComplex.topic}
                </h3>
                <p className="text-sm text-gray-600">
                  {generatedComplex.questions.length} questions • {generatedComplex.edges.length} relationships
                </p>
              </div>

              {/* Camps */}
              {generatedComplex.metadata?.camps && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Philosophical Camps</h4>
                  <div className="space-y-2">
                    {generatedComplex.metadata.camps.map((camp: any, idx: number) => (
                      <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="font-medium text-purple-900 text-sm">{camp.name}</div>
                        <div className="text-xs text-gray-700 mt-1">{camp.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Questions</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {generatedComplex.questions.map((q) => (
                    <div key={q.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="text-xs font-mono text-gray-500 mr-2">{q.id}</span>
                          <span className="text-sm text-gray-900">{q.text}</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {Math.round(q.importance * 100)}%
                          </span>
                          {q.camp && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              {q.camp}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edges Summary */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Relationships</h4>
                <div className="flex space-x-4 text-sm">
                  <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                    <span className="font-medium text-yellow-900">
                      {generatedComplex.edges.filter(e => e.type === 'dependency').length}
                    </span>
                    <span className="text-yellow-700 ml-1">dependencies</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded px-3 py-2">
                    <span className="font-medium text-red-900">
                      {generatedComplex.edges.filter(e => e.type === 'tension').length}
                    </span>
                    <span className="text-red-700 ml-1">tensions</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                    <span className="font-medium text-blue-900">
                      {generatedComplex.edges.filter(e => e.type === 'related').length}
                    </span>
                    <span className="text-blue-700 ml-1">related</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={saveAndUseComplex}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  ✓ Save & Start Exploring
                </button>
                <button
                  onClick={() => {
                    const json = JSON.stringify(generatedComplex, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `inquiry-complex-${Date.now()}.json`;
                    a.click();
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  ↓ Export JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
