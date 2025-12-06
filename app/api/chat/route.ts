import { GoogleGenerativeAI, FunctionDeclaration, Tool } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { InquiryComplex, QuestionId } from '@/types/inquiry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Define function declarations
const recordAnswerFunction: FunctionDeclaration = {
  name: 'record_answer',
  description: 'Record the user\'s answer for the CURRENT question only. Call this when the user has provided a clear position on the question being discussed.',
  parameters: {
    type: 'object',
    properties: {
      stance: {
        type: 'string',
        description: 'The user\'s position/stance in 1-2 clear sentences'
      },
      confidence: {
        type: 'number',
        description: 'Confidence level from 0 to 1 (0.5 = uncertain, 0.7 = moderate, 0.9 = very confident)',
        minimum: 0,
        maximum: 1
      }
    },
    required: ['stance', 'confidence']
  }
};

const moveToQuestionFunction: FunctionDeclaration = {
  name: 'move_to_question',
  description: 'Move the conversation to a different question. Call this when: (1) user explicitly requests ("go back to...", "let\'s talk about..."), (2) naturally transitioning after exploring current question, or (3) exploring tensions between questions.',
  parameters: {
    type: 'object',
    properties: {
      questionId: {
        type: 'string',
        description: 'The question ID to move to (e.g., "q1", "q2")'
      },
      reason: {
        type: 'string',
        description: 'Why moving (e.g., "user requested", "natural transition", "exploring tension with q3")'
      }
    },
    required: ['questionId', 'reason']
  }
};

const tools: Tool[] = [{
  functionDeclarations: [recordAnswerFunction, moveToQuestionFunction]
}];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body || !body.messages) {
      return NextResponse.json(
        { error: 'Invalid request: missing messages' },
        { status: 400 }
      );
    }
    
    const { messages, currentQuestionId, answeredQuestions, userAnswers, inquiryComplex } = body;
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      tools: tools
    });

    const currentQuestion = inquiryComplex.questions.find((q: any) => q.id === currentQuestionId);

    // Build previous answers context
    const previousAnswersContext = answeredQuestions.length > 0
      ? answeredQuestions.map((qId: string) => {
          const answer = userAnswers[qId];
          const question = inquiryComplex.questions.find((q: any) => q.id === qId);
          return `- ${qId}: "${question?.text}"\n  Their position: ${answer.stance} (${Math.round(answer.confidence * 100)}% confident)`;
        }).join('\n\n')
      : 'none yet';

    // Build system prompt with explicit current question
    const systemPrompt = `You are a Socratic philosophy tutor guiding someone through an inquiry complex about "Competence in the Age of AI."

CURRENT QUESTION: ${currentQuestionId} - "${currentQuestion?.text}"

Your role is to:
1. Focus the conversation on the CURRENT question
2. Extract positions using the record_answer function
3. Probe deeper, follow up on interesting points
4. Use move_to_question when ready to transition
5. Reference their previous answers when exploring tensions or connections

All questions in the complex:
${inquiryComplex.questions.map((q: any) => `- ${q.id}: ${q.text}`).join('\n')}

PREVIOUS ANSWERS:
${previousAnswersContext}

Guidelines:
- Focus on current question: ${currentQuestionId}
- When user provides a position, call record_answer function
- When naturally transitioning or user requests, call move_to_question function
- Be conversational and Socratic
- Point out tensions with other answered questions when relevant
- BE CONCISE: Get to the point quickly. Skip preambles like "that's interesting" and don't restate what the user just said
- BE DIRECT: Use natural, conversational language. Avoid formal academic phrases like "This brings up some fascinating points when we consider"
- TIGHTEN YOUR QUESTIONS: Ask sharp, focused questions without excessive setup

IMPORTANT: You can ONLY record answers for the current question (${currentQuestionId}). To record answers for other questions, you must first move_to_question.`;

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
    const response = result.response;

    // Check for function calls
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      // Handle function calls
      const actions = functionCalls.map(fc => {
        if (fc.name === 'record_answer') {
          return {
            type: 'record_answer',
            questionId: currentQuestionId,
            stance: fc.args.stance,
            confidence: fc.args.confidence
          };
        } else if (fc.name === 'move_to_question') {
          return {
            type: 'move_to_question',
            questionId: fc.args.questionId,
            reason: fc.args.reason
          };
        }
        return null;
      }).filter(Boolean);

      // Send function responses back and get continuation
      const functionResponses = functionCalls.map(fc => ({
        name: fc.name,
        response: { success: true }
      }));

      const result2 = await chat.sendMessage([{
        functionResponse: {
          name: functionCalls[0].name,
          response: functionResponses[0].response
        }
      }]);

      const continuationText = result2.response.text();

      return NextResponse.json({
        message: continuationText,
        actions: actions
      });
    }

    // No function calls, just regular response
    return NextResponse.json({
      message: response.text(),
      actions: []
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
