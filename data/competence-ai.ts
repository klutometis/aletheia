import { InquiryComplex, Question, ReferenceAnswer } from '../types/inquiry';

const questions: Question[] = [
  {
    id: 'q1',
    text: 'Can you develop taste without doing the reps?',
    importance: 0.9,
    camp: 'traditionalist'
  },
  {
    id: 'q2',
    text: 'Is understanding separable from doing?',
    importance: 0.85,
  },
  {
    id: 'q3',
    text: "What's lost when the process becomes opaque?",
    importance: 0.8,
  },
  {
    id: 'q4',
    text: 'Does the 10,000-hour rule still apply when AI can compress learning curves?',
    importance: 0.75,
  },
  {
    id: 'q5',
    text: 'Is competence about knowing facts or knowing how to verify/synthesize with AI?',
    importance: 0.85,
  },
  {
    id: 'q6',
    text: 'Can you be genuinely competent in a domain if you rely on AI for most execution?',
    importance: 0.9,
    camp: 'traditionalist'
  },
  {
    id: 'q7',
    text: 'Is "prompt engineering" a real competence or just interface fluency?',
    importance: 0.6,
  },
  {
    id: 'q8',
    text: 'Does AI make experts more valuable (leverage) or less valuable (commoditized)?',
    importance: 0.7,
  },
  {
    id: 'q9',
    text: "What's the difference between surface fluency (AI-assisted) and deep understanding?",
    importance: 0.85,
  },
  {
    id: 'q10',
    text: 'Is competence now individual (you) or collective (you+AI as unit)?',
    importance: 0.8,
    camp: 'augmentationist'
  },
];

const referenceAnswersData: [string, ReferenceAnswer[]][] = [
  ['q1', [
    {
      camp: 'Traditionalist',
      position: 'No, taste emerges from practice. Pattern recognition requires embodied experience through repetition.',
      source: 'Dreyfus on skill acquisition'
    },
    {
      camp: 'Augmentationist', 
      position: 'Yes, but AI helps compress the timeline. You can learn patterns faster with AI assistance.',
      source: 'Silicon Valley optimism'
    },
    {
      camp: 'Post-expertise',
      position: 'Taste IS the competence now. AI handles execution, humans provide judgment.',
      source: 'Post-expertise camp'
    }
  ]],
  ['q2', [
    {
      camp: 'Traditionalist',
      position: 'No, understanding requires doing. Tacit knowledge comes through practice.',
      source: 'Polanyi on tacit knowledge'
    },
    {
      camp: 'Augmentationist',
      position: 'Partially separable. AI can help you understand faster, but some embodiment matters.',
    },
  ]],
  ['q6', [
    {
      camp: 'Traditionalist',
      position: 'No, reliance on AI creates fragility. True competence requires independence.',
    },
    {
      camp: 'Augmentationist',
      position: 'Yes, if you understand when/how to use AI. The human+AI unit is the competence.',
      source: 'Extended mind thesis (Clark & Chalmers)'
    },
  ]],
];

export const COMPETENCE_AI_COMPLEX: InquiryComplex = {
  id: 'competence-ai-v1',
  topic: 'Competence in the Age of AI',
  questions,
  edges: [
    { from: 'q1', to: 'q2', type: 'dependency' },
    { from: 'q2', to: 'q3', type: 'related' },
    { from: 'q1', to: 'q9', type: 'dependency' },
    { from: 'q4', to: 'q1', type: 'related' },
    { from: 'q5', to: 'q9', type: 'dependency' },
    { from: 'q6', to: 'q1', type: 'tension' },
    { from: 'q6', to: 'q10', type: 'dependency' },
    { from: 'q9', to: 'q3', type: 'related' },
    { from: 'q10', to: 'q5', type: 'related' },
  ],
  referenceAnswers: new Map(referenceAnswersData),
};
