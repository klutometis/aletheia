import { InquiryComplex } from '../types/inquiry';

// Generated from Koralus (2025) "The Philosophic Turn for AI Agents"
export const PHILOSOPHIC_TURN_COMPLEX: InquiryComplex = {
  "id": "generated-1770704747313",
  "topic": "Autonomy-Preserving AI Design for Decentralized Truth-Seeking",
  "questions": [
    {
      "id": "q1",
      "text": "What constitutes 'human agency' and 'human autonomy' in the context of AI decision support, and how do they relate to each other?",
      "importance": 1,
      "camp": null
    },
    {
      "id": "q2",
      "text": "What distinguishes AI guidance that preserves autonomy from AI guidance that undermines it?",
      "importance": 0.9,
      "camp": null
    },
    {
      "id": "q3",
      "text": "How do 'nudge' interventions, particularly when scaled and personalized by AI, impact human autonomy and the capacity for decentralized adaptive learning?",
      "importance": 0.8,
      "camp": "Decentralized Autonomists"
    },
    {
      "id": "q4",
      "text": "Is the concept of 'choice architecture' truly inevitable in all human decision-making contexts, and what are the ethical implications for AI design if it is?",
      "importance": 0.9,
      "camp": "Nudge Liberal Paternalists"
    },
    {
      "id": "q5",
      "text": "What are the essential design principles for AI systems that actively facilitate decentralized truth-seeking and open-ended inquiry, rather than imposing predetermined outcomes?",
      "importance": 0.8,
      "camp": "Decentralized Autonomists"
    },
    {
      "id": "q6",
      "text": "How can AI systems be designed to augment human agency by managing complexity without leading to choice paralysis or making individuals passive instruments of digital architecture?",
      "importance": 0.8,
      "camp": null
    },
    {
      "id": "q7",
      "text": "To what extent does the personalization of AI-driven interventions conflict with transparency, public accountability, and the ability for collective deliberation on policy?",
      "importance": 0.7,
      "camp": "Decentralized Autonomists"
    },
    {
      "id": "q8",
      "text": "How can AI systems support the 'ownership of one's judgments' and prevent the undesirable shaping of individual values and reasons through pervasive mediation?",
      "importance": 0.7,
      "camp": "Decentralized Autonomists"
    },
    {
      "id": "q9",
      "text": "What are the risks of AI decision aids becoming self-reinforcing in shaping human decision criteria, potentially narrowing the scope of future choices and values?",
      "importance": 0.6,
      "camp": "Decentralized Autonomists"
    },
    {
      "id": "q10",
      "text": "How can the principles underlying spontaneous orders and decentralized adaptive learning (e.g., in science and market economies) be effectively translated into the design of autonomy-preserving AI systems?",
      "importance": 0.8,
      "camp": "Decentralized Autonomists"
    },
    {
      "id": "q11",
      "text": "What mechanisms are necessary to ensure that AI-mediated knowledge acquisition and learning remain robust, dynamic, and resistant to 'dead dogma' or manipulation?",
      "importance": 0.7,
      "camp": "Decentralized Autonomists"
    },
    {
      "id": "q12",
      "text": "What is the appropriate balance of control (individual, community, central authority) for AI decision-support systems to simultaneously foster welfare, agency, and autonomy?",
      "importance": 0.9,
      "camp": null
    }
  ],
  "edges": [
    {
      "from": "q1",
      "to": "q2",
      "type": "dependency"
    },
    {
      "from": "q1",
      "to": "q3",
      "type": "dependency"
    },
    {
      "from": "q1",
      "to": "q6",
      "type": "dependency"
    },
    {
      "from": "q1",
      "to": "q8",
      "type": "dependency"
    },
    {
      "from": "q2",
      "to": "q3",
      "type": "tension"
    },
    {
      "from": "q2",
      "to": "q5",
      "type": "related"
    },
    {
      "from": "q2",
      "to": "q6",
      "type": "related"
    },
    {
      "from": "q2",
      "to": "q8",
      "type": "related"
    },
    {
      "from": "q3",
      "to": "q7",
      "type": "related"
    },
    {
      "from": "q3",
      "to": "q9",
      "type": "related"
    },
    {
      "from": "q3",
      "to": "q10",
      "type": "tension"
    },
    {
      "from": "q4",
      "to": "q3",
      "type": "related"
    },
    {
      "from": "q4",
      "to": "q12",
      "type": "related"
    },
    {
      "from": "q5",
      "to": "q6",
      "type": "related"
    },
    {
      "from": "q5",
      "to": "q8",
      "type": "related"
    },
    {
      "from": "q5",
      "to": "q10",
      "type": "dependency"
    },
    {
      "from": "q5",
      "to": "q11",
      "type": "dependency"
    },
    {
      "from": "q7",
      "to": "q12",
      "type": "related"
    },
    {
      "from": "q8",
      "to": "q9",
      "type": "dependency"
    },
    {
      "from": "q10",
      "to": "q11",
      "type": "dependency"
    },
    {
      "from": "q1",
      "to": "q12",
      "type": "dependency"
    },
    {
      "from": "q2",
      "to": "q12",
      "type": "dependency"
    },
    {
      "from": "q3",
      "to": "q12",
      "type": "dependency"
    },
    {
      "from": "q5",
      "to": "q12",
      "type": "dependency"
    },
    {
      "from": "q10",
      "to": "q12",
      "type": "dependency"
    }
  ],
  "referenceAnswers": new Map(),
  "metadata": {
    "source": "llm-generated",
    "generatedAt": "2026-02-10T06:25:47.313Z",
    "camps": [
      {
        "name": "Nudge Liberal Paternalists",
        "description": "Believe in using choice architecture, including AI-powered personalization, to guide individuals towards beneficial outcomes, prioritizing aggregate welfare and efficiency, while aiming to preserve liberty (defined as non-interference with objectively available choices). They often see nudges as inevitable and sometimes obligatory."
      },
      {
        "name": "Decentralized Autonomists",
        "description": "Advocate for AI systems designed to foster open-ended inquiry and decentralized adaptive learning, mirroring philosophical dialogue, to augment human agency and preserve individual autonomy (defined as self-rule and ownership of judgments) against the risks of subtle manipulation and erosion of truth-seeking capacities."
      }
    ]
  }
};

export const CAMPS = [
  {
    "name": "Nudge Liberal Paternalists",
    "description": "Believe in using choice architecture, including AI-powered personalization, to guide individuals towards beneficial outcomes, prioritizing aggregate welfare and efficiency, while aiming to preserve liberty (defined as non-interference with objectively available choices). They often see nudges as inevitable and sometimes obligatory."
  },
  {
    "name": "Decentralized Autonomists",
    "description": "Advocate for AI systems designed to foster open-ended inquiry and decentralized adaptive learning, mirroring philosophical dialogue, to augment human agency and preserve individual autonomy (defined as self-rule and ownership of judgments) against the risks of subtle manipulation and erosion of truth-seeking capacities."
  }
];
