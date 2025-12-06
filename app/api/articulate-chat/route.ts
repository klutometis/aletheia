import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { messages, articulation, userAnswers, inquiryComplex } = await req.json();

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });

    // Build context from answered questions
    const answeredContext = Object.entries(userAnswers || {})
      .map(([qId, answer]: [string, any]) => {
        const question = inquiryComplex.questions.find((q: any) => q.id === qId);
        return `${qId}: "${question?.text}"\nTheir position: ${answer.stance}`;
      })
      .join('\n\n');

    const systemPrompt = `You are discussing a pattern analysis with someone who has been answering questions about "Competence in the Age of AI."

PATTERN ANALYSIS YOU GENERATED:
${articulation}

THEIR ANSWERS:
${answeredContext}

Your role is to:
- Be BRIEF and conversational - match their energy and length
- Reference specific questions they answered (e.g., "When you said [stance] for question X...")
- Don't restate the articulation - they just read it
- Follow up on THEIR specific words and points
- Explore tensions between their answers when relevant
- If they're short/casual, be short/casual back

Examples of good responses:
- User: "I don't know; we're wild west!" → You: "Ha, exactly! So in that wild west, does 'doing the reps' still matter, or are we redefining what counts as practice?"
- User: "I disagree with that" → You: "Fair - what doesn't fit? I'm genuinely curious."

Examples of BAD responses (avoid these):
- Long re-explanations of patterns they just read
- Academic/lecturing tone
- Ignoring their specific words and energy
- Not referencing specific questions they answered

If they disagree with a pattern, briefly explore why and adjust your interpretation.`;

    // Convert messages to Gemini format, excluding last message
    // Gemini requires history to start with 'user', so skip any leading assistant messages
    const conversationMessages = messages.slice(0, -1);
    const history = conversationMessages
      .filter((msg: any, idx: number) => {
        // Skip leading assistant messages - Gemini requires first message to be from user
        if (idx === 0 && msg.role === 'assistant') return false;
        return true;
      })
      .map((msg: any) => ({
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

    return NextResponse.json({
      message: response.text()
    });

  } catch (error) {
    console.error('Error in articulate-chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process discussion message' },
      { status: 500 }
    );
  }
}
