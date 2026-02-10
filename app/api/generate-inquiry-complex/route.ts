import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Schema for the inquiry complex generation
const inquiryComplexSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    topic: {
      type: SchemaType.STRING,
      description: 'Short title for this inquiry complex (e.g., "Autonomy-Preserving AI Design")'
    },
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: {
            type: SchemaType.STRING,
            description: 'Unique identifier like q1, q2, etc.'
          },
          text: {
            type: SchemaType.STRING,
            description: 'The question itself - should be open-ended, not yes/no'
          },
          importance: {
            type: SchemaType.NUMBER,
            description: 'Importance score from 0-1, where 1 is most foundational'
          },
          camp: {
            type: SchemaType.STRING,
            description: 'Optional: which philosophical camp/position this question is most relevant to',
            nullable: true
          }
        },
        required: ['id', 'text', 'importance']
      }
    },
    edges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          from: {
            type: SchemaType.STRING,
            description: 'Source question ID'
          },
          to: {
            type: SchemaType.STRING,
            description: 'Target question ID'
          },
          type: {
            type: SchemaType.STRING,
            description: 'Relationship type: dependency (B requires A), tension (conflict to resolve), or related (mutually illuminating)'
          }
        },
        required: ['from', 'to', 'type']
      }
    },
    camps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: {
            type: SchemaType.STRING,
            description: 'Name of philosophical camp/position'
          },
          description: {
            type: SchemaType.STRING,
            description: 'Brief characterization of this position'
          }
        },
        required: ['name', 'description']
      }
    }
  },
  required: ['topic', 'questions', 'edges', 'camps']
};

export async function POST(req: Request) {
  try {
    const { documentText, maxQuestions = 15 } = await req.json();

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document text is required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview'
    });

    const prompt = `You are a philosophical inquiry architect. Your job is to extract an "inquiry complex" from academic texts.

An inquiry complex is a graph of questions that someone is "on the hook for" when engaging with a contested domain. The goal is to help people reach "erotetic equilibrium" - a stable, considered position that survives counterfactual challenges.

# Key Principles

1. **Not yes/no questions**: Generate open-ended questions that invite nuanced positions
   - Bad: "Should we use AI?"
   - Good: "What distinguishes AI guidance that preserves autonomy from AI guidance that undermines it?"

2. **Multiple legitimate camps**: Identify different philosophical positions/camps that take different stances
   - Example camps: "Liberal paternalists", "Anti-nudge autonomists", "Pragmatic designers"

3. **Dependencies matter**: Map which questions you can't answer without first considering others
   - dependency: Question B requires understanding question A first
   - tension: Questions create conflict that needs resolution
   - related: Questions illuminate each other but aren't strictly dependent

4. **Importance scores**: 
   - 0.9-1.0: Foundational questions (must engage with)
   - 0.7-0.8: Important questions (should engage with)
   - 0.5-0.6: Interesting questions (good to explore)

5. **Capture the contested terrain**: These aren't quiz questions with right answers, but genuine open questions where smart people disagree

# Task

Generate an inquiry complex from this document:

---
${documentText.slice(0, 50000)} 
---

Generate ${maxQuestions} questions that:
- Capture the core contested issues in the text
- Identify the main philosophical camps/positions
- Map dependencies between questions
- Range from foundational to more specific

Return your response as structured JSON matching the schema.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: inquiryComplexSchema,
        temperature: 0.7,
      }
    });

    const response = JSON.parse(result.response.text());
    
    // Add an id and convert camps to referenceAnswers format
    const inquiryComplex = {
      id: `generated-${Date.now()}`,
      topic: response.topic,
      questions: response.questions,
      edges: response.edges,
      referenceAnswers: new Map(), // Could populate from camps if needed
      metadata: {
        source: 'llm-generated',
        generatedAt: new Date().toISOString(),
        camps: response.camps
      }
    };
    
    return NextResponse.json({
      inquiryComplex,
      camps: response.camps
    });

  } catch (error) {
    console.error('Error generating inquiry complex:', error);
    return NextResponse.json(
      { error: 'Failed to generate inquiry complex', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
