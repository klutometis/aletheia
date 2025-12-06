import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { InquiryComplex, QuestionId, UserAnswer } from '@/types/inquiry';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    questionId: {
      type: SchemaType.STRING,
      description: 'The question ID to explore next (e.g., "q1", "q2")'
    },
    reasoning: {
      type: SchemaType.STRING,
      description: 'Internal reasoning for why this question (for logging/debugging)'
    },
    transitionMessage: {
      type: SchemaType.STRING,
      description: 'A warm, conversational message that naturally introduces the selected question. Should feel like a Socratic tutor continuing a dialogue, not announcing things robotically. Weave in your reasoning organically - don\'t use templates like "Why this question:" just explain naturally.'
    }
  },
  required: ['questionId', 'reasoning', 'transitionMessage']
};

export async function POST(req: Request) {
  try {
    const { inquiryComplex, userAnswers } = await req.json();
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });

    // Build context about answered questions
    const answeredSummary = Object.entries(userAnswers || {}).map(([qId, answer]: [string, any]) => {
      const question = inquiryComplex.questions.find((q: any) => q.id === qId);
      return `- ${qId}: "${question?.text}"\n  User's stance: ${answer.stance} (confidence: ${Math.round(answer.confidence * 100)}%)`;
    }).join('\n');

    const unansweredQuestions = inquiryComplex.questions
      .filter((q: any) => !userAnswers || !userAnswers[q.id])
      .map((q: any) => `- ${q.id} (importance: ${q.importance}): ${q.text}`)
      .join('\n');

    const prompt = `You are a Socratic philosophy tutor helping someone explore "Competence in the Age of AI."

ANSWERED QUESTIONS (${Object.keys(userAnswers || {}).length}/${inquiryComplex.questions.length}):
${answeredSummary || '(none yet)'}

UNANSWERED QUESTIONS:
${unansweredQuestions}

GRAPH STRUCTURE:
${inquiryComplex.edges.map((e: any) => `- ${e.from} → ${e.to} (${e.type})`).join('\n')}

Select the best next question to explore. Consider:
1. **Dependencies**: Questions whose prerequisites are answered
2. **Importance**: Higher importance scores indicate more foundational questions
3. **Conceptual flow**: Natural progression from what's been discussed
4. **Tensions**: Interesting contradictions to explore between answered questions
5. **If nothing answered yet**: Start with the most foundational question

Return your response as JSON with:
- questionId: The selected question ID
- reasoning: Your internal rationale (for debugging)
- transitionMessage: A natural, conversational message introducing this question

Your transitionMessage should:
${Object.keys(userAnswers || {}).length === 0 
  ? '- Welcome them to the inquiry naturally and explain why this starting question is foundational'
  : Object.keys(userAnswers || {}).length === inquiryComplex.questions.length
    ? '- Celebrate completion and invite them to deepen their thinking on any topic'
    : `- Reference what they've explored (${Object.keys(userAnswers || {}).length}/${inquiryComplex.questions.length} questions) and naturally explain why this next question makes sense`}
- Weave in your reasoning organically (don't use "Why this question:" templates)
- Be conversational like a Socratic tutor, not robotic
- End by posing the question in an inviting way`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });

    const response = JSON.parse(result.response.text());
    
    return NextResponse.json({
      questionId: response.questionId,
      reasoning: response.reasoning,
      transitionMessage: response.transitionMessage
    });

  } catch (error) {
    console.error('Error selecting question:', error);
    return NextResponse.json(
      { error: 'Failed to select question' },
      { status: 500 }
    );
  }
}
