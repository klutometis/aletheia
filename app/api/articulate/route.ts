import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { userAnswers, inquiryComplex } = await req.json();

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });

    // Build context from answered questions
    const answeredContext = Object.entries(userAnswers || {})
      .map(([qId, answer]: [string, any]) => {
        const question = inquiryComplex.questions.find((q: any) => q.id === qId);
        return `${qId}: "${question?.text}"\nTheir position: ${answer.stance} (${Math.round(answer.confidence * 100)}% confident)`;
      })
      .join('\n\n');

    const analysisPrompt = `You are analyzing someone's answers to philosophical questions about "Competence in the Age of AI."

Here are their answers:

${answeredContext}

Identify 2-3 coherent patterns in their values and thinking. Be concise (2-3 paragraphs total), tentative ("I'm noticing..." not "You are..."), and insightful.

You can draw on Charles Taylor's framework of moral sources when relevant:
- Theistic sources (appeal to divine order, religious frameworks)
- Naturalist sources (reason, nature, universal human dignity)  
- Expressivist/Romantic sources (authenticity, self-expression, inner nature)

Focus on what's most interesting or revealing. Give them space to reflect and respond.`;

    const analysisResult = await model.generateContent(analysisPrompt);
    const articulation = analysisResult.response.text();

    // Generate a contextual opening prompt
    const promptPrompt = `Based on this pattern analysis you just generated:

${articulation}

Generate ONE thoughtful, specific question or prompt to invite discussion. Make it:
- Directly tied to a pattern you identified (reference it specifically)
- Invite them to explore a tension, implication, or edge case
- Natural and conversational, not mechanical
- Brief (1-2 sentences)

Examples of good prompts:
- "I'm curious—does this emphasis on 'doing' mean you'd worry about someone who learns coding through AI pair programming?"
- "You mentioned authenticity mattering deeply. How does that square with using AI tools that might obscure the craft?"

Generate the prompt now:`;

    const promptResult = await model.generateContent(promptPrompt);
    const openingPrompt = promptResult.response.text();

    return NextResponse.json({
      articulation,
      openingPrompt
    });

  } catch (error) {
    console.error('Error in articulate API:', error);
    return NextResponse.json(
      { error: 'Failed to generate articulation' },
      { status: 500 }
    );
  }
}
