'use client';

import { InquiryComplex, QuestionId, UserAnswer } from '@/types/inquiry';
import { useState } from 'react';

interface SidePanelProps {
  complex: InquiryComplex;
  selectedQuestionId: QuestionId | null;
  userAnswers: Map<QuestionId, UserAnswer>;
  onAnswerSubmit: (questionId: QuestionId, answer: UserAnswer) => void;
  onClose: () => void;
}

export function SidePanel({
  complex,
  selectedQuestionId,
  userAnswers,
  onAnswerSubmit,
  onClose
}: SidePanelProps) {
  const [stance, setStance] = useState('');
  const [confidence, setConfidence] = useState(50);

  if (!selectedQuestionId) return null;

  const question = complex.questions.find(q => q.id === selectedQuestionId);
  if (!question) return null;

  const referenceAnswers = complex.referenceAnswers.get(selectedQuestionId) || [];
  const userAnswer = userAnswers.get(selectedQuestionId);

  const handleSubmit = () => {
    if (!stance.trim()) return;

    onAnswerSubmit(selectedQuestionId, {
      questionId: selectedQuestionId,
      stance,
      confidence: confidence / 100,
      timestamp: new Date(),
      considerations: []
    });

    setStance('');
    setConfidence(50);
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-gray-300 shadow-lg overflow-y-auto z-50">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 border-b border-gray-300 p-4 flex justify-between items-start">
        <h2 className="text-lg font-bold pr-4">Question Details</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Question */}
        <div>
          <h3 className="font-semibold text-base mb-2">{question.text}</h3>
          <div className="text-sm text-gray-600">
            Importance: {Math.round(question.importance * 100)}%
          </div>
        </div>

        {/* Reference Answers */}
        {referenceAnswers.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-700">Reference Positions</h4>
            <div className="space-y-3">
              {referenceAnswers.map((ref, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="font-semibold text-sm text-gray-800">{ref.camp}</div>
                  <p className="text-sm text-gray-700 mt-1">{ref.position}</p>
                  {ref.source && (
                    <div className="text-xs text-gray-500 mt-2 italic">— {ref.source}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Answer */}
        <div>
          <h4 className="font-semibold text-sm mb-3 text-gray-700">Your Answer</h4>
          
          {userAnswer ? (
            <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
              <p className="text-sm text-gray-800">{userAnswer.stance}</p>
              <div className="text-xs text-gray-600 mt-2">
                Confidence: {Math.round(userAnswer.confidence * 100)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(userAnswer.timestamp).toLocaleDateString()}
              </div>
            </div>
          ) : null}

          <textarea
            value={stance}
            onChange={(e) => setStance(e.target.value)}
            placeholder="What's your position on this question?"
            className="w-full p-2 border border-gray-300 rounded text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />

          <div className="mb-4">
            <label className="text-sm text-gray-700 block mb-2">
              Confidence: {confidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!stance.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 rounded transition"
          >
            {userAnswer ? 'Update Answer' : 'Submit Answer'}
          </button>
        </div>
      </div>
    </div>
  );
}
