'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { InquiryGraph } from '@/components/InquiryGraph';
import { COMPETENCE_AI_COMPLEX } from '@/data/competence-ai';
import { QuestionId, UserAnswer } from '@/types/inquiry';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  questionId?: QuestionId; // Track which question this relates to
}

export default function Home() {
  const [input, setInput] = useState('');
  const [userAnswers, setUserAnswers] = useState<Map<QuestionId, UserAnswer>>(new Map());
  const [currentQuestionId, setCurrentQuestionId] = useState<QuestionId>('q1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [articulation, setArticulation] = useState<string | null>(null);
  const [isArticulating, setIsArticulating] = useState(false);
  const [viewMode, setViewMode] = useState<'inquiry' | 'patterns'>('inquiry');
  const [discussionMessages, setDiscussionMessages] = useState<Message[]>([]);
  const [discussionInput, setDiscussionInput] = useState('');
  const [isDiscussionLoading, setIsDiscussionLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const discussionEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const discussionInputRef = useRef<HTMLInputElement>(null);

  // Load answers from localStorage on mount and ask model to select starting question
  useEffect(() => {
    async function initializeSession() {
      setIsLoading(true);
      
      const stored = localStorage.getItem('aletheia-answers');
      let answersMap = new Map();
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          answersMap = new Map(Object.entries(parsed));
          setUserAnswers(answersMap);
        } catch (error) {
          console.error('Error loading answers from localStorage:', error);
        }
      }

      const answeredIds = new Set(answersMap.keys());

      // Ask model to select best starting question
      try {
        const response = await fetch('/api/select-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiryComplex: COMPETENCE_AI_COMPLEX,
            userAnswers: Object.fromEntries(answersMap)
          })
        });

        const data = await response.json();
        const startQuestionId = data.questionId || 'q1';
        
        setCurrentQuestionId(startQuestionId);

        // Use model's natural transition message for all cases
        setMessages([{
          role: 'assistant',
          content: data.transitionMessage
        }]);
      } catch (error) {
        console.error('Error selecting starting question:', error);
        // Fallback to first unanswered
        const firstUnanswered = COMPETENCE_AI_COMPLEX.questions.find(q => !answeredIds.has(q.id));
        const startQuestionId = firstUnanswered?.id || 'q1';
        const currentQuestion = COMPETENCE_AI_COMPLEX.questions.find(q => q.id === startQuestionId);
        
        setCurrentQuestionId(startQuestionId);
        setMessages([{
          role: 'assistant',
          content: `Let's explore: ${currentQuestion?.text}`
        }]);
      } finally {
        setIsLoading(false);
      }
    }

    initializeSession();
  }, []);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (userAnswers.size > 0) {
      const answersObj = Object.fromEntries(userAnswers);
      localStorage.setItem('aletheia-answers', JSON.stringify(answersObj));
    }
  }, [userAnswers]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    discussionEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [discussionMessages]);

  // Auto-focus input after messages change (and when loading ends)
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          currentQuestionId: currentQuestionId,
          answeredQuestions: Array.from(userAnswers.keys()),
          userAnswers: Object.fromEntries(userAnswers),
          inquiryComplex: COMPETENCE_AI_COMPLEX
        })
      });

      const data = await response.json();
      
      // Handle actions from function calls
      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          if (action.type === 'record_answer') {
            const updatedAnswers = new Map(userAnswers).set(
              action.questionId,
              {
                stance: action.stance,
                confidence: action.confidence,
                timestamp: new Date().toISOString()
              }
            );
            setUserAnswers(updatedAnswers);
          } else if (action.type === 'move_to_question') {
            setCurrentQuestionId(action.questionId);
          }
        }
      }

      // Always add the model's message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArticulate = async () => {
    setIsArticulating(true);
    try {
      const response = await fetch('/api/articulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswers: Object.fromEntries(userAnswers),
          inquiryComplex: COMPETENCE_AI_COMPLEX
        })
      });

      const data = await response.json();
      setArticulation(data.articulation);
      setViewMode('patterns');
      
      // Add the model's opening prompt to start the discussion
      if (data.openingPrompt) {
        setDiscussionMessages([{
          role: 'assistant',
          content: data.openingPrompt
        }]);
      } else {
        setDiscussionMessages([]);
      }
    } catch (error) {
      console.error('Error generating articulation:', error);
      setArticulation('Sorry, I encountered an error generating patterns. Please try again.');
    } finally {
      setIsArticulating(false);
    }
  };


  const handleSendDiscussionMessage = async () => {
    if (!discussionInput.trim() || isDiscussionLoading) return;

    const userMessage = discussionInput.trim();
    setDiscussionInput('');
    setDiscussionMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsDiscussionLoading(true);

    try {
      const response = await fetch('/api/articulate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...discussionMessages, { role: 'user', content: userMessage }],
          articulation,
          userAnswers: Object.fromEntries(userAnswers),
          inquiryComplex: COMPETENCE_AI_COMPLEX
        })
      });

      const data = await response.json();
      setDiscussionMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);
    } catch (error) {
      console.error('Error in discussion:', error);
      setDiscussionMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsDiscussionLoading(false);
    }
  };

  const handleBackToInquiry = () => {
    setViewMode('inquiry');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const [selectedNodeId, setSelectedNodeId] = useState<QuestionId | null>(null);
  
  const answeredQuestions = useMemo(() => new Set(userAnswers.keys()), [userAnswers]);
  const coverage = (answeredQuestions.size / COMPETENCE_AI_COMPLEX.questions.length) * 100;
  
  const selectedQuestion = useMemo(() => 
    selectedNodeId ? COMPETENCE_AI_COMPLEX.questions.find(q => q.id === selectedNodeId) : null,
    [selectedNodeId]
  );
  
  const selectedAnswer = selectedNodeId ? userAnswers.get(selectedNodeId) : null;

  return (
    <main className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aletheia</h1>
          <p className="text-sm text-gray-600 mt-1">
            Competence in the Age of AI • {answeredQuestions.size}/{COMPETENCE_AI_COMPLEX.questions.length} questions explored
          </p>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Loading overlay on initial load */}
        {isLoading && messages.length === 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="flex space-x-2 justify-center mb-4">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-gray-600">Selecting best starting question...</p>
            </div>
          </div>
        )}
        {/* Main Content Area - Primary */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200 min-h-0">
          
          {viewMode === 'inquiry' ? (
            /* Inquiry Mode - Chat */
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className={`prose prose-sm max-w-none ${
                    msg.role === 'user' 
                      ? 'prose-invert' 
                      : ''
                  }`}>
                    <ReactMarkdown 
                      components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        em: ({node, ...props}) => <em className="italic" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your response..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                    autoFocus
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Pattern Mode - Discussion */
            <>
              <div className="flex-1 overflow-y-auto px-8 py-8">
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* Pattern Analysis */}
                  <div>
                    <h2 className="text-2xl font-bold text-purple-900 mb-4">Pattern Analysis</h2>
                    <div className="prose prose-lg max-w-none prose-purple text-gray-800">
                      <ReactMarkdown 
                        components={{
                          p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-purple-900" {...props} />,
                          em: ({node, ...props}) => <em className="italic" {...props} />,
                        }}
                      >
                        {articulation || ''}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Discussion Messages */}
                  {discussionMessages.length > 0 && (
                    <div className="mt-8 space-y-4 mb-6">
                      {discussionMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-lg px-4 py-3 ${
                            msg.role === 'user' 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-purple-50 text-gray-900 border border-purple-200'
                          }`}>
                            <div className={`prose prose-sm max-w-none ${
                              msg.role === 'user' 
                                ? 'prose-invert' 
                                : 'prose-purple'
                            }`}>
                              <ReactMarkdown 
                                components={{
                                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                  em: ({node, ...props}) => <em className="italic" {...props} />,
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isDiscussionLoading && (
                        <div className="flex justify-start">
                          <div className="bg-purple-50 rounded-lg px-4 py-3 border border-purple-200">
                            <div className="flex space-x-2">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={discussionEndRef} />
                    </div>
                  )}
                </div>
              </div>

              {/* Discussion Input */}
              <div className="border-t border-purple-200 p-4 bg-purple-50">
                <div className="max-w-3xl mx-auto flex space-x-2">
                  <input
                    ref={discussionInputRef}
                    type="text"
                    value={discussionInput}
                    onChange={(e) => setDiscussionInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendDiscussionMessage()}
                    placeholder="Your thoughts..."
                    className="flex-1 px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    disabled={isDiscussionLoading}
                    autoFocus
                  />
                  <button
                    onClick={handleSendDiscussionMessage}
                    disabled={isDiscussionLoading || !discussionInput.trim()}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Graph Sidebar - Secondary */}
        <div className="w-96 bg-gray-50 p-4 flex flex-col min-h-0 overflow-y-auto">
          {/* Progress */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex-shrink-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">Progress</h3>
              {userAnswers.size > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear all answers? This cannot be undone.')) {
                      setUserAnswers(new Map());
                      localStorage.removeItem('aletheia-answers');
                      setArticulation(null);
                      setViewMode('inquiry');
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-2xl font-bold text-blue-600">{Math.round(coverage)}%</div>
                <div className="text-xs text-gray-600">Coverage</div>
              </div>
              
              {/* Toggle Button */}
              {userAnswers.size >= 4 && (
                <button
                  onClick={() => {
                    if (viewMode === 'inquiry') {
                      if (articulation) {
                        setViewMode('patterns');
                      } else {
                        handleArticulate();
                      }
                    } else {
                      handleBackToInquiry();
                    }
                  }}
                  disabled={isArticulating}
                  className={`w-full mt-3 px-3 py-2 text-white text-sm rounded disabled:bg-gray-300 disabled:cursor-not-allowed ${
                    viewMode === 'patterns' 
                      ? 'bg-gray-600 hover:bg-gray-700' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isArticulating 
                    ? 'Analyzing...' 
                    : viewMode === 'patterns' 
                      ? '← Back to inquiry' 
                      : '✨ Review my patterns'
                  }
                </button>
              )}
            </div>
          </div>

          {/* Graph */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex-1 flex flex-col min-h-0">
            <h3 className="font-semibold text-gray-900 mb-2">Inquiry Map</h3>
            
            {/* Current question indicator */}
            {currentQuestionId && (
              <div className="text-xs text-gray-600 mb-2 flex items-center bg-amber-50 p-2 rounded border border-amber-200">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                <span className="font-medium">Currently exploring:</span>
                <span className="ml-1">{COMPETENCE_AI_COMPLEX.questions.find(q => q.id === currentQuestionId)?.text.substring(0, 50)}...</span>
              </div>
            )}
            
            <div className="flex-1 min-h-0">
              <InquiryGraph 
                complex={COMPETENCE_AI_COMPLEX}
                answeredQuestions={answeredQuestions}
                userAnswers={userAnswers}
                onNodeClick={setSelectedNodeId}
                selectedNodeId={selectedNodeId}
                currentQuestionId={currentQuestionId}
              />
            </div>
            <div className="text-xs text-gray-600 mt-2 flex items-center space-x-4">
              <span className="flex items-center">
                <span className="inline-block w-3 h-3 bg-gray-400 rounded mr-1"></span>
                Unanswered
              </span>
              <span className="flex items-center">
                <span className="inline-block w-3 h-3 bg-amber-500 rounded mr-1"></span>
                Current
              </span>
              <span className="flex items-center">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span>
                Answered
              </span>
            </div>
          </div>
          
          {/* Selected Node Details */}
          {selectedQuestion && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4 flex-shrink-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">Node Details</h3>
                <button 
                  onClick={() => setSelectedNodeId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Question</div>
                  <div className="text-sm font-medium">{selectedQuestion.text}</div>
                </div>
                
                {selectedAnswer ? (
                  <>
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Your Position</div>
                      <div className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
                        {selectedAnswer.stance}
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Confidence</div>
                        <div className="text-sm font-semibold text-blue-600">
                          {Math.round(selectedAnswer.confidence * 100)}%
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Recorded</div>
                        <div className="text-sm text-gray-700">
                          {new Date(selectedAnswer.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Not yet answered - continue the conversation to explore this question.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
