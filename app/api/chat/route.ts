import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { InquiryComplex, QuestionId } from '@/types/inquiry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages, answeredQuestions, inquiryComplex } = await req.json();
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build system prompt
    const systemPrompt = `You are a Socratic philosophy tutor guiding someone through an inquiry complex about "Competence in the Age of AI."

Your role is to:
1. Ask questions from the inquiry complex in a principled sequence
2. Extract the user's position from their natural responses
3. Follow up on tensions or interesting points
4. Help them develop examined, stable views

The inquiry complex has these questions:
${inquiryComplex.questions.map((q: any) => `- Q${q.id}: ${q.text}`).join('\n')}

Already answered: ${answeredQuestions.length > 0 ? answeredQuestions.join(', ') : 'none'}

Guidelines:
- Start with foundational questions (lower numbers)
- When user answers, acknowledge and extract their position
- Follow up to clarify or probe deeper
- Point out tensions between answers when relevant
- Ask next question when current one is sufficiently explored
- Be conversational, not formal

When you've extracted a clear position, respond with JSON at the end:
EXTRACTED_ANSWER: {"questionId": "q1", "stance": "their position in 1-2 sentences", "confidence": 0.7}`;

    // Convert messages to Gemini format, excluding the last message and the initial assistant greeting
    // Gemini requires history to start with a user message, so skip the first assistant message
    const conversationMessages = messages.slice(0, -1);
    const history = conversationMessages
      .filter((msg, idx) => !(idx === 0 && msg.role === 'assistant')) // Skip initial assistant greeting
      .map((msg: Message) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const userMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(`${systemPrompt}\n\nUser: ${userMessage}`);
    const responseText = result.response.text();

    // Check if Gemini extracted an answer
    let extractedAnswer = null;
    const extractMatch = responseText.match(/EXTRACTED_ANSWER:\s*({.*})/);
    if (extractMatch) {
      try {
        extractedAnswer = JSON.parse(extractMatch[1]);
      } catch (e) {
        console.error('Failed to parse extracted answer:', e);
      }
    }

    // Remove the JSON from the visible message
    const cleanMessage = responseText.replace(/EXTRACTED_ANSWER:.*$/s, '').trim();

    return NextResponse.json({
      message: cleanMessage,
      extractedAnswer
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
