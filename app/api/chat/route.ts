import { GoogleGenerativeAI, FunctionDeclaration, Tool, SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { InquiryComplex, QuestionId } from '@/types/inquiry';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Define function declarations
const recordAnswerFunction: FunctionDeclaration = {
  name: 'record_answer',
  description: 'Record the user\'s answer for ANY question in the inquiry complex. Call this when the user has provided a clear position on a question.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      questionId: {
        type: SchemaType.STRING,
        description: 'The question ID being answered (e.g., "q1", "q2")'
      },
      stance: {
        type: SchemaType.STRING,
        description: 'The user\'s position/stance in 1-2 clear sentences'
      },
      confidence: {
        type: SchemaType.NUMBER,
        description: 'Confidence level from 0 to 1 (0.5 = uncertain, 0.7 = moderate, 0.9 = very confident)'
      }
    },
    required: ['questionId', 'stance', 'confidence']
  }
};

const markMasteredFunction: FunctionDeclaration = {
  name: 'mark_mastered',
  description: 'Mark a question as mastered when the user has a stable, counterfactually robust view. Their position has survived challenges and remained consistent.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      questionId: {
        type: SchemaType.STRING,
        description: 'The question ID to mark as mastered'
      }
    },
    required: ['questionId']
  }
};

const markIrrelevantFunction: FunctionDeclaration = {
  name: 'mark_irrelevant',
  description: 'Mark a question as irrelevant to the user\'s emerging camp/position. This question doesn\'t need deep exploration given their trajectory.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      questionId: {
        type: SchemaType.STRING,
        description: 'The question ID to mark as irrelevant'
      }
    },
    required: ['questionId']
  }
};

const tools: Tool[] = [{
  functionDeclarations: [recordAnswerFunction, markMasteredFunction, markIrrelevantFunction]
}];

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

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
      model: 'gemini-3-flash-preview',
      tools: tools
    });

    const currentQuestion = inquiryComplex.questions.find((q: any) => q.id === currentQuestionId);

    // Build previous answers context
    const previousAnswersContext = answeredQuestions.length > 0
      ? answeredQuestions.map((qId: string) => {
          const answer = userAnswers[qId];
          const question = inquiryComplex.questions.find((q: any) => q.id === qId);
          return `- ${qId}: "${question?.text}"\n  Their position: ${answer.stance} (${Math.round(answer.confidence * 100)}% confident)${answer.mastery ? ` [${answer.mastery}]` : ''}`;
        }).join('\n\n')
      : 'none yet';

    // Count turns on current question (heuristic: count messages / 2)
    const turnsOnCurrentQuestion = Math.floor(messages.length / 2);
    const shouldMoveOn = turnsOnCurrentQuestion >= 3;

    // Build system prompt for HOLISTIC navigation
    const systemPrompt = `You are a Socratic philosophy tutor guiding someone through an inquiry complex about "${inquiryComplex.topic}."

# HOLISTIC NAVIGATION MINDSET

You have a view of the ENTIRE graph. Your job is to help them reach "erotetic equilibrium" - a stable, considered position that survives counterfactual challenges.

**Proximal telos (immediate)**: Follow natural conversation flow, be responsive to their energy and interests
**Distal telos (ultimate)**: Guide them toward questions most likely to "upset the apple cart" - expose tensions, clarify fuzzy thinking, build robust views

## THE INQUIRY COMPLEX

${inquiryComplex.questions.map((q: any) => `${q.id} [importance: ${q.importance}]: ${q.text}${q.camp ? ` [camp: ${q.camp}]` : ''}`).join('\n')}

## THEIR JOURNEY SO FAR

${previousAnswersContext || '(just starting)'}

Recently exploring: ${currentQuestionId ? `${currentQuestionId} - "${currentQuestion?.text}"` : 'none yet'}
Turns on this topic: ${turnsOnCurrentQuestion} ${shouldMoveOn ? '⚠️ TOO MANY - MOVE TO A NEW QUESTION NOW!' : ''}

${answeredQuestions.length > 0 ? `
⚠️ ALREADY ANSWERED (${answeredQuestions.length} questions): ${answeredQuestions.join(', ')}
DO NOT spend more than 1 follow-up on these. Focus on UNANSWERED questions.
` : ''}

## YOUR NAVIGATION PHILOSOPHY

1. **Meander purposefully**: Let conversation flow naturally, but keep the topography in mind
2. **Detect their camp**: Are they aligning with a particular position? Which questions become irrelevant given their trajectory?
3. **Hunt for tensions**: When their answer creates conflict with previous views, probe it! This is goldmine territory.
4. **Skip the orthogonal**: If a question is tangential to their emerging view, mark it irrelevant and move on
5. **Test counterfactuals**: "What if X?" "How would that square with your earlier view on Y?"
6. **Mark mastery liberally**: Don't wait for perfection. If they've articulated a clear position (even with some uncertainty), that's enough. Record the answer and explore elsewhere.

## CRITICAL: RECORD ANSWERS IMMEDIATELY

**YOU MUST CALL record_answer() AS SOON AS THEY GIVE A POSITION.**

- When user gives ANY substantive answer to a question, IMMEDIATELY call record_answer()
- Don't wait to probe further before recording - record FIRST, then maybe probe once more
- If you've asked 2 follow-ups on the same question, STOP. Call record_answer() and move to a different question.
- **Default behavior: Record the answer, then explore somewhere else on the graph**

## ANTI-PATTERN: ENDLESS PROBING

❌ BAD: Asking 4-5 follow-ups on the same question
❌ BAD: Waiting for a "complete" or "perfect" answer before recording
❌ BAD: Staying on one node because it's "interesting"

✓ GOOD: Get position → Record → Move on
✓ GOOD: Maximum 2-3 exchanges per question, then switch
✓ GOOD: Trust their answer is "good enough"

**The goal is COVERAGE of the terrain, not DEPTH on every single node.**
Think: "coloring book" - touch all the important areas, don't paint a masterpiece on each one.

## TOOLS AT YOUR DISPOSAL

- **record_answer(questionId, stance, confidence)**: CALL THIS IMMEDIATELY when they give a position. Don't delay.
- **mark_mastered(questionId)**: Call this after recording if their view seems coherent
- **mark_irrelevant(questionId)**: Call this if a question doesn't fit their emerging camp

## WORKFLOW AFTER RECORDING AN ANSWER

1. Call record_answer() with their position
2. In your response, briefly acknowledge and then PIVOT to a different question
3. Don't ask more follow-ups on the same question you just recorded
4. Pick a new question from the graph - look for tensions, dependencies, or high-importance unaddressed nodes
5. Your response should feel like: "Got it. [brief ack]. Now what about [NEW QUESTION]?"

**Pattern**: Record → Acknowledge → Pivot to new terrain

## EXAMPLES OF GOOD BEHAVIOR

**GOOD** - Recording and moving on:
User: "Agency should emerge from interaction"
You: *calls record_answer(q1, "Agency emerges from interaction itself", 0.7)*
You: "Got it - agency as emergent property. That raises an interesting tension with choice architecture in q4..."

**GOOD** - One probe then move:
User: "I think autonomy means self-rule"
You: *calls record_answer(q1, "Autonomy as self-rule", 0.8)*
You: "Interesting. Does that mean AI guidance is always autonomy-reducing? Let me ask about a different angle: [moves to q7 about transparency]..."

**BAD** - Endless probing:
User: "Agency should emerge"  
You: "Can you say more?"
User: "It's about interaction"
You: "What do you mean by interaction?"
User: "The AI and user together"
You: "But how does that work exactly?"  ← STOP! This is bad behavior. Record and move on!

## STYLE

- BE CONCISE: No preambles. Get to the point.
- BE DIRECT: Natural language, not academic pontificating
- BE RESPONSIVE: Match their energy and follow their train of thought
- BE INSIGHTFUL: Hone in on what matters, skip what doesn't
- **BE EFFICIENT**: Don't belabor points. Get a position, maybe probe once, then move to something fresh.

## WHEN TO MOVE ON

Move on from a question if ANY of these are true:
1. They've stated a clear position (even if tentative)
2. You've probed 2-3 turns on this question
3. They seem bored or are giving short answers
4. A more interesting tension or question has emerged
5. They bring up a different topic

**Default assumption**: If they've answered, that's enough. Record it and explore elsewhere. Don't chase perfection.

Navigate the whole graph fluidly. You are NOT stuck on one question.`;

    // Convert messages to Gemini format, excluding the last message and the initial assistant greeting
    // Gemini requires history to start with a user message, so skip the first assistant message
    const conversationMessages = messages.slice(0, -1);
    const history = conversationMessages
      .filter((msg: Message, idx: number) => !(idx === 0 && msg.role === 'assistant')) // Skip initial assistant greeting
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
    
    // Retry API calls with exponential backoff (includes blank response detection)
    const result = await retryWithBackoff(async () => {
      const result = await chat.sendMessage(`${systemPrompt}\n\nUser: ${userMessage}`);
      const responseText = result.response.text();
      
      // Treat blank responses as retryable errors
      if (!responseText || responseText.trim() === '') {
        throw new Error('Blank response from model');
      }
      
      return result;
    }, 2); // 2 retries = 3 total attempts
    
    const response = result.response;
    const responseText = response.text();

    // Check for function calls
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      // Handle function calls
      const actions = functionCalls.map(fc => {
        if (fc.name === 'record_answer') {
          const args = fc.args as { questionId: string; stance: string; confidence: number };
          return {
            type: 'record_answer',
            questionId: args.questionId,
            stance: args.stance,
            confidence: args.confidence
          };
        } else if (fc.name === 'mark_mastered') {
          const args = fc.args as { questionId: string };
          return {
            type: 'mark_mastered',
            questionId: args.questionId
          };
        } else if (fc.name === 'mark_irrelevant') {
          const args = fc.args as { questionId: string };
          return {
            type: 'mark_irrelevant',
            questionId: args.questionId
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
      message: responseText,
      actions: []
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Determine if error is retryable
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError = errorMessage.includes('fetch failed') || 
                          errorMessage.includes('ECONNREFUSED') ||
                          errorMessage.includes('timeout');
    
    return NextResponse.json(
      { 
        error: isNetworkError 
          ? 'Connection issue. Please try again.'
          : 'Failed to process message. Please try again.',
        retryable: true 
      },
      { status: 500 }
    );
  }
}
