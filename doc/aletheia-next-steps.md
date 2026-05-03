# Aletheia: Next Steps After Philipp Conversation

**Date**: Feb 10, 2026  
**Status**: Successfully implemented inquiry complex generation from documents

---

## What We Accomplished Today

### 1. Captured Design Discussion ✅

Created comprehensive documentation of Philipp conversation:
- **File**: `doc/aletheia-philipp-conversation-2026-02-10.md`
- Captured key concepts: proximal/distal telos, holistic navigation, stopping conditions
- Identified three main problems with current system

### 2. Implemented Document → Inquiry Complex Pipeline ✅

**New API Route**: `app/api/generate-inquiry-complex/route.ts`
- Takes document text as input
- Uses Gemini 2.5 Flash with structured output
- Generates:
  - Questions (with importance scores, optional camp affiliation)
  - Dependencies/tensions/relationships between questions
  - Philosophical camps/positions
  - Full InquiryComplex object matching existing types

**Test Script**: `test-generate-complex.ts`
- Loads paper from `doc/koralus-philosophic-turn-full.md`
- Calls API to generate complex
- Saves output as both JSON and TypeScript

### 3. Generated First Dynamic Inquiry Complex ✅

**Input**: Koralus (2025) "The Philosophic Turn for AI Agents" paper  
**Output**: `data/philosophic-turn-complex.ts`

**Generated 12 questions including**:
- "What constitutes 'human agency' and 'human autonomy' in the context of AI decision support?"
- "What distinguishes AI guidance that preserves autonomy from AI guidance that undermines it?"
- "How do 'nudge' interventions impact human autonomy when scaled by AI?"

**Identified 2 camps**:
- Nudge Liberal Paternalists
- Decentralized Autonomists

**Mapped 25 dependencies** between questions (dependency, tension, related)

---

## The Three Core Problems (Identified with Philipp)

### Problem 1: Hard-Coded Inquiry Complexes ✅ SOLVED

**Was**: Single hard-coded graph in `data/competence-ai.ts`  
**Now**: Can generate from any document via `/api/generate-inquiry-complex`

**Next steps**:
- Add UI for uploading documents
- Store multiple inquiry complexes (not just one)
- Allow switching between complexes

### Problem 2: Rigid Node-by-Node Navigation ⚠️ NEEDS WORK

**Issue**: Model proceeds linearly through graph, asks irrelevant questions, won't let go

**What we need**:
- Holistic view of user's trajectory (which camp are they aligning with?)
- Smart node selection (which questions will actually "upset the apple cart"?)
- Tools for marking nodes:
  - `mark_mastered(node_id, confidence)`
  - `mark_irrelevant(node_id, reason)` 
  - `suggest_deep_dive(node_id, reason)`

**Current**: `app/api/select-question/route.ts` - rigid criteria (dependencies, importance)  
**Needed**: Refactor prompt to be "holistic tutor" not "exhaustive coverage bot"

### Problem 3: Weak Stopping Conditions ⚠️ NEEDS WORK

**Current**: Just coverage % (7/10 questions)  
**Needed**: Multiple heuristics

**Proposed stopping criteria**:
1. **Weak (coloring book)**: Engaged with all high-importance nodes in relevant shard
2. **Strong (erotetic equilibrium)**: Can defend position against counterfactuals
3. **Pragmatic**: User feels satisfied, view is stable

**How to detect**:
- Probe with novel scenarios (not just graph questions)
- Check for tensions between stated positions
- "In light of all that, is this still your view?"

---

## Immediate Next Steps (Priority Order)

### Step 1: Improve Question Selection (Holistic Navigation)

**File to modify**: `app/api/select-question/route.ts`

**Current behavior**: Picks next question based on:
- Dependencies answered
- Importance score
- Conceptual flow

**Desired behavior**: Picks question based on:
- User's emerging position (which camp are they in?)
- Potential for insight (exposes tensions?)
- Relevance to their trajectory (skip orthogonal nodes)
- Natural conversation flow (don't interrupt awkwardly)

**Implementation**:
```typescript
// Add to prompt context
const userTrajectory = analyzeUserCamp(userAnswers, inquiryComplex);
const tensions = detectTensions(userAnswers, inquiryComplex);
const masteredNodes = identifyMasteredNodes(userAnswers);

// New prompt emphasis:
// "You are a holistic Socratic tutor. Your goal is NOT exhaustive coverage.
// Select questions that will be INSIGHTFUL for this particular user's trajectory.
// Some nodes may not be worth exploring for this user - that's fine.
// Prioritize questions that might reveal tensions or deepen understanding."
```

### Step 2: Add Node State Tracking

**New fields in UserAnswer type** (`types/inquiry.ts`):
```typescript
interface UserAnswer {
  // ... existing fields
  mastery: 'exploring' | 'mastered' | 'irrelevant';
  lastProbed: Date; // for decay/re-checking
  counterfactuallyRobust: boolean; // tested with novel scenarios
}
```

**New tools for LLM** (function calling in chat route):
- `mark_node_state(nodeId, state, reasoning)`
- `suggest_counterfactual_probe(nodeId, scenario)`

### Step 3: Implement Better Stopping Heuristic

**New API route**: `app/api/check-equilibrium/route.ts`

**Input**: userAnswers, inquiryComplex  
**Output**: 
```typescript
{
  coverage: number; // % of high-importance nodes engaged
  stability: number; // consistency across answers
  tensions: string[]; // detected contradictions
  recommendation: 'continue' | 'probe_tensions' | 'equilibrium_reached';
  nextAction?: string; // suggestion for what to do
}
```

**Use in UI**: Replace simple "7/10" with richer dashboard

### Step 4: Add UI for Document Upload

**New page**: `app/generate/page.tsx`

**Workflow**:
1. User uploads PDF or pastes text
2. Click "Generate Inquiry Complex"
3. Shows loading state (LLM working)
4. Displays generated graph for review
5. Option to edit questions/dependencies
6. Save and start conversation

---

## Open Research Questions

### On Generation Quality
- How do LLM-generated complexes compare to human-curated?
- Can we validate quality automatically? (coherence, coverage, camps)
- Should we allow editing after generation?

### On Holistic Navigation  
- What's the right balance between coverage and relevance?
- How to detect when a node is "not worth it"?
- Can we learn which selection strategies work best?

### On Stopping Conditions
- Can we automatically detect erotetic equilibrium?
- What signals indicate genuine understanding vs. credo recitation?
- Should mastery decay over time (require re-checking)?

### On Paternalism vs. Delight
- How to guide without being paternalistic?
- "Delightful and directionally correct" - what does this mean in practice?
- How to keep conversation playful while making progress?

---

## File Structure (Current State)

```
/home/danenberg/prg/hailab/
├── types/
│   └── inquiry.ts                    # Core types (Question, Edge, InquiryComplex)
├── data/
│   ├── competence-ai.ts              # Hard-coded example (original)
│   └── philosophic-turn-complex.ts   # Generated from paper ✨ NEW
├── app/api/
│   ├── generate-inquiry-complex/     # ✨ NEW - generates from docs
│   ├── select-question/              # ⚠️  NEEDS REFACTOR - make holistic
│   ├── articulate/                   # Pattern analysis after 4+ questions
│   ├── articulate-chat/              # Discussion about patterns
│   └── chat/                         # Main conversation loop
├── doc/
│   ├── aletheia-philipp-conversation-2026-02-10.md  # ✨ NEW - design notes
│   ├── aletheia-next-steps.md                       # ✨ THIS FILE
│   └── koralus-philosophic-turn-full.md             # Source paper
└── test-generate-complex.ts          # ✨ NEW - test script
```

---

## Prompt Engineering Notes

### For Inquiry Complex Generation

**What works**:
- Asking for open-ended questions (not yes/no)
- Identifying multiple legitimate camps
- Mapping dependencies explicitly
- Using importance scores (0-1 scale)

**What to improve**:
- Could add reference answers for each camp
- Could extract quotes from paper as evidence
- Could identify which sections of paper relate to which questions

### For Question Selection

**Current problem**: Too rigid, doesn't adapt to user's trajectory

**Better prompt structure**:
```
You are a holistic Socratic tutor, not a checklist-driven bot.

User's trajectory so far:
- Answered: [list with stances]
- Emerging camp: [analysis]
- Detected tensions: [list]

Your goal: Select next question that is INSIGHTFUL for THIS user.
- Skip questions unlikely to matter for their trajectory
- Prioritize questions that reveal tensions
- Follow natural conversation flow
- Mark nodes as "mastered" when user shows robust understanding

Don't be autistically fixed on covering everything.
```

---

## Testing Plan

### Phase 1: Validate Generated Complexes
1. Generate complexes from 3-5 papers
2. Compare to hand-crafted `competence-ai.ts`
3. Identify patterns in quality (good/bad examples)

### Phase 2: Test Holistic Navigation
1. Run conversations with refactored selection
2. Measure: Do users feel less "stuck"?
3. Track: Which nodes get marked irrelevant?

### Phase 3: Validate Equilibrium Detection
1. Implement equilibrium checking
2. Test with volunteer users
3. Compare self-reported satisfaction vs. computed score

---

## Connection to Broader Project

### This Fits Into Aletheia Vision

**Current state**: Single-player inquiry exploration tool  
**Future state**: Infrastructure for autonomy-preserving AI agents

**The inquiry complex is the foundation**:
- Agents consult these complexes when helping with decisions
- "Should I take this job?" → agent asks questions from career complex
- User reaches equilibrium → agent supports, doesn't manipulate

**Next after this**:
- Multi-complex system (career, health, relationships)
- Agent marketplace (agents specialize in complexes)
- Privacy-preserving learning (agents learn what works)

### This Addresses Philipp's Vision

**From his paper** (Section 8 - Design aspects):
1. ✅ Individualized inquiry complexes (we generate them)
2. ⚠️  Mutual educability (agents learn - not yet)
3. ⚠️  Marketplace (multiple agents/complexes - not yet)
4. ⚠️  Decentralized control (user ownership - partial)

**We're building the foundation** (inquiry complex generation + holistic navigation) before scaling to full agent ecosystem.

---

## Questions for Philipp (Next Conversation)

1. **On holistic navigation**: What heuristics distinguish "insightful questions" from "box-checking"?
2. **On stopping conditions**: How to operationalize "erotetic equilibrium" in practice?
3. **On the credo problem**: How to probe for counterfactual robustness without being tedious?
4. **On multi-turn persistence**: Should mastery decay? Re-probe old nodes?
5. **On camps**: Should we try to nudge users between camps, or just help them articulate their camp?

---

## Summary

### ✅ Accomplished Today
- Documented Philipp conversation
- Built document → inquiry complex pipeline
- Generated first dynamic complex from paper

### ⚠️ Next Priority
- Refactor question selection (holistic not rigid)
- Add node state tracking (mastered/irrelevant)
- Implement equilibrium checking

### 🎯 North Star
Build the infrastructure for autonomy-preserving AI agents that help people reach erotetic equilibrium without manipulation.

---

## Quick Start for Next Session

```bash
# Start server
cd /home/danenberg/prg/hailab
npm run dev

# Test generation from new document
npx ts-node test-generate-complex.ts

# Key files to work on next:
# 1. app/api/select-question/route.ts (make holistic)
# 2. types/inquiry.ts (add mastery tracking)
# 3. app/api/check-equilibrium/route.ts (new - stopping heuristic)
```
