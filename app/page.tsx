'use client';

import { useState } from 'react';
import { InquiryGraph } from '@/components/InquiryGraph';
import { SidePanel } from '@/components/SidePanel';
import { COMPETENCE_AI_COMPLEX } from '@/data/competence-ai';
import { QuestionId, UserAnswer } from '@/types/inquiry';

export default function Home() {
  const [selectedQuestionId, setSelectedQuestionId] = useState<QuestionId | null>(null);
  const [userAnswers, setUserAnswers] = useState<Map<QuestionId, UserAnswer>>(new Map());

  const handleAnswerSubmit = (questionId: QuestionId, answer: UserAnswer) => {
    setUserAnswers(prev => new Map(prev).set(questionId, answer));
  };

  const answeredQuestions = new Set(userAnswers.keys());
  const coverage = (answeredQuestions.size / COMPETENCE_AI_COMPLEX.questions.length) * 100;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <h1 className="text-4xl font-bold text-gray-900">Aletheia</h1>
        <p className="text-lg text-gray-600 mt-2">Competence in the Age of AI</p>
        <p className="text-sm text-gray-500 mt-1">
          Explore the inquiry complex. Click any question to answer.
        </p>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Equilibrium Dashboard */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Progress</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(coverage)}%
              </div>
              <div className="text-sm text-gray-600">Coverage</div>
              <div className="text-xs text-gray-500">
                {answeredQuestions.size}/{COMPETENCE_AI_COMPLEX.questions.length} answered
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-400">—</div>
              <div className="text-sm text-gray-600">Stability</div>
              <div className="text-xs text-gray-500">Re-test to measure</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-400">—</div>
              <div className="text-sm text-gray-600">Consistency</div>
              <div className="text-xs text-gray-500">Coming soon</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-400">—</div>
              <div className="text-sm text-gray-600">Counterfactual</div>
              <div className="text-xs text-gray-500">Coming soon</div>
            </div>
          </div>
        </div>

        {/* Graph */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Inquiry Complex</h2>
          <InquiryGraph 
            complex={COMPETENCE_AI_COMPLEX}
            onNodeClick={setSelectedQuestionId}
            answeredQuestions={answeredQuestions}
          />
          <p className="text-sm text-gray-600 mt-4">
            <span className="inline-block w-4 h-4 bg-gray-400 rounded mr-2"></span>
            Unanswered
            <span className="inline-block w-4 h-4 bg-blue-500 rounded mr-2 ml-4"></span>
            Answered
          </p>
        </div>
      </div>

      {/* Side Panel */}
      <SidePanel
        complex={COMPETENCE_AI_COMPLEX}
        selectedQuestionId={selectedQuestionId}
        userAnswers={userAnswers}
        onAnswerSubmit={handleAnswerSubmit}
        onClose={() => setSelectedQuestionId(null)}
      />
    </main>
  );
}
