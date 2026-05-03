# Aletheia Design Discussion: Conversation with Philipp (Feb 10, 2026)

## Context
This document captures key insights from a rambling conversation with Philipp at Oxford about the Aletheia/erotetic tutoring project. It distills the main architectural decisions and open problems.

---

## Core Problem Statement

**Current Issue**: The inquiry complex is hard-coded (see `data/competence-ai.ts`). The model proceeds node-by-node through the graph, which creates two problems:

1. **Sticky conversation**: Model won't let you move on; asks irrelevant questions about nodes unlikely to be interesting
2. **Fixed graphs**: No way to generate inquiry complexes from arbitrary documents/topics

**Desired State**: 
- Generate inquiry complexes dynamically from source documents
- Navigate holistically rather than linearly (model has view of whole graph, guides toward important nodes)
- Track mastery while allowing free traversal

---

## Key Architectural Concepts

### 1. Telos (Conversational Aim)

**Two levels of telos**:
- **Proximal telos**: What's being said in the immediate conversation flow
- **Distal telos**: Why we're having this conversation at all (erotetic equilibrium)

**The challenge**: Balance following the natural conversation flow (proximal) while making progress toward understanding the full inquiry complex (distal).

**Current system**: Too focused on distal telos (checking boxes node-by-node), not enough proximal fluidity.

**Ideal**: "Meandering conversation" that naturally covers ground without being "autistically fixed" on the checklist.

### 2. Inquiry Complex Generation

**Current**: Hard-coded 10 questions in `data/competence-ai.ts`

**Proposed approach**:
```
Document → LLM extraction → Inquiry complex graph
```

**Key questions**:
- What structure should the LLM extract? (questions, dependencies, reference positions)
- How to identify "shards" (tractable subsets of the full complex)?
- How to determine which nodes are "foundational" vs. "derivative"?

**Example workflow**:
```
Input: Koralus 2025 "Philosophic Turn for AI Agents" paper
↓
Extract: 
- Core questions paper is "on the hook for"
- Dependencies between questions (can't answer X without Y)
- Camps/positions (autonomy-preserving vs. nudge-based AI)
- Argumentative structure
↓
Output: Inquiry complex JSON matching types/inquiry.ts schema
```

### 3. Holistic Graph Navigation

**Current problem** (from `app/api/select-question/route.ts`):
- Model selects "best next question" 
- But criteria are rigid: dependencies, importance, conceptual flow
- No sense of "is this question actually going to upset the apple cart?"

**Desired behavior**:
- Model has holistic view of user's current understanding
- Identifies which nodes are:
  - **Already mastered**: User has stable view, counterfactually robust
  - **Active frontier**: Engaging with now
  - **Unimportant given their trajectory**: Questions orthogonal to their camp
  - **Potentially destabilizing**: Questions that could reveal tensions

**New selection criteria**:
1. **Relevance to user's emerging view**: If they're "traditionalist" on q1-q3, maybe skip augmentationist-specific questions
2. **Potential for insight**: Questions that expose tensions between their stated positions
3. **Natural conversation flow**: Don't interrupt to ask something out of left field
4. **Diminishing returns**: Some nodes aren't worth deep exploration for this user

**Implementation approach**: 
- Give model richer context about user's answers so far
- Add tool for marking nodes as "mastered" or "not relevant for this user"
- Prompt for "holistic tutoring" not "exhaustive coverage"

### 4. Stopping Conditions

**Philosophy vs. Math problem**:
- Math: Proof exists, you understand it or you don't
- Philosophy: No definitive "done" state

**Proposed criteria**:

**Weak (coloring book)**: 
- Engaged with all nodes in the shard
- Like Peter Norvig's "fill in all the boxes"

**Strong (erotetic equilibrium)**:
- View survives counterfactual challenges
- Can defend position when probed
- Tension-free (or consciously holding tensions)

**Pragmatic (current system)**:
- Coverage metric (N/M questions answered)
- But need better heuristic for "good enough"

**Open question**: How to detect genuine understanding vs. performative mastery (the "credo" problem)?

---

## The Credo Problem

**Issue**: Distinguishing genuine understanding from memorized positions.

**Religious case analogy**: 
- Student can recite Karpathy's views perfectly (imitating)
- But can they respond to novel challenges? (understanding)

**Competence framework** (from Koralus Ch1):
- **Performance**: Correct outputs for given inputs
- **Competence**: View supports appropriate responses to counterfactual questions

**Test for true understanding**:
- Don't just ask "What's your view on X?"
- Ask: "Given your view on X, what would you say about Y (novel scenario)?"
- Check for **counterfactual robustness**

**Design implication**: 
- Model should probe with novel scenarios, not just the questions in the graph
- "In light of all that, is this still your view?"
- Look for **erotetic equilibrium**: view stable across range of questions

---

## The Coloring Book Analogy

**Peter Norvig reference**: Task is like filling in a coloring book.

**The question**: Does the coloring book persist across erotetic engagements?

**Translation**: If we have a conversation about inquiry complex X:
- Day 1: Answer 5 questions
- Day 5: Return, remember our progress
- Does "mastery state" carry over, or do we re-explore?

**"The heuristic"**: Persistence across n=5 turns (5 conversational sessions).

**Current system**: localStorage preserves answers (`userAnswers` in page.tsx), so yes, it persists.

**Open question**: Should mastery decay over time? Should we re-probe old nodes to check stability?

---

## Fractal Descent into Inquiry Complexes

**Idea**: Inquiry complexes can be decomposed recursively.

**Example**:
```
"What is epistemology?" (one-node graph, too broad)
↓
Decompose: "What is knowledge?", "What is justification?", etc.
↓  
Decompose further: "Gettier cases", "Reliabilism vs. foundationalism", etc.
↓
Decompose until: Average student can reconstruct from memory
```

**Stopping condition for decomposition**: 
- "Decompose until they can reconstruct"
- Like learning math: break down until you can prove it from first principles
- But avoid **cargo cult** understanding (memorized steps without insight)

**Tension**:
- **Proof-based learning**: Understand foundations, build up (deduction)
- **Alchemy-based learning**: Play with it, discover patterns (induction)

**Design question**: Should Aletheia support both modes?
- Deductive mode: Linear traversal, ensure foundations first
- Inductive mode: Let user explore freely, discover connections

---

## Maieutic Process vs. Credo Recitation

**Goal**: Not just reciting the "right answer" (credo), but genuine engagement with alternatives.

**Maieutic principle** (Socratic midwifery):
- Technical target concept has alternative answers
- Student genuinely grapples with tradeoffs
- Arrives at position they can defend (ownership)

**Contrasted with religious education**:
- Goal: Recite the credo understandingly
- Assumption: There's a right answer, we're teaching it

**Aletheia's stance**:
- No predetermined "right answer" (multiple camps legitimate)
- Goal: Erotetic equilibrium (stable position)
- Not: Equilibrium on THE answer, but on AN answer

**Opinionated tutor variant**:
- Some domains DO have right answers (e.g., Karpathy on ML)
- Tutor can "perform the credo" as one position among others
- But still probe: "Do you believe this, or just recite it?"

---

## Score-Keeping in the Language Game

**The UX challenge**: How to show progress without being mechanical?

**Proposed elements**:
1. **Progress bar** (current: "7/10 questions explored")
2. **Dopamine hits** when completing nodes
3. **Inquiry complex shard** visualization
4. **Meandering paths** through graph (not linear)

**Score-keeping modes**:
- **Deterministic**: Every node tracked, explicit checkboxes
- **Holistic**: Model "remembers" but doesn't announce ("you've explored X, now Y makes sense")

**Current system**: Deterministic (shows coverage %, marks nodes as answered in graph).

**Proposed enhancement**: 
- Add "holistic guidance" layer
- Model knows what's answered but doesn't force exhaustive coverage
- Tool calls for:
  - `mark_node_mastered(node_id, confidence)`
  - `mark_node_irrelevant(node_id, reason)`
  - `suggest_deep_dive(node_id, reason)`

---

## Notional Architecture: Text → Inquiry Complex → Conversation

**Workflow**:

```
1. User: "I want to discuss this paper [uploads PDF]"

2. System: Generate inquiry complex
   - Extract key questions from paper
   - Identify dependencies
   - Map to camps/positions
   - Create graph structure

3. System: Start conversation
   - Select foundational node
   - Begin Socratic dialogue
   - Guide through graph holistically

4. System: Track state
   - Mark nodes as explored/mastered
   - Identify tensions in user's view
   - Suggest next nodes dynamically

5. Stopping condition
   - Coverage threshold (weak)
   - Erotetic equilibrium (strong)
   - User satisfaction (pragmatic)
```

**Key difference from NotebookLM**:
- NotebookLM: Q&A over document
- Aletheia: Guided exploration of inquiry complex derived from document

---

## Open Research Questions

### 1. Inquiry Complex Generation
- What LLM prompt extracts good inquiry complexes?
- How to validate quality of generated graph?
- Can we compare LLM-generated vs. human-curated?

### 2. Holistic Navigation
- What's the right balance between coverage and relevance?
- How to detect when a node is "not worth it" for this user?
- Prompt design for "delightful and directionally correct" tutoring

### 3. Stopping Conditions
- When is "good enough" actually good enough?
- Can we automatically detect erotetic equilibrium?
- What signals indicate genuine understanding vs. credo?

### 4. Paternalism and Delight
- How to guide without being paternalistic?
- "Why so serious?" - how to keep it playful?
- Dual telos: moving toward equilibrium AND delighting

### 5. State Tracking
- Deterministic (explicit checkboxes) vs. holistic (implicit memory)?
- Should mastery decay over time?
- Conversation stack: multiple nodes "open" simultaneously?

---

## Immediate Next Steps

1. **Fetch the Philosophic Turn paper** (https://arxiv.org/html/2504.18601v1)
2. **Design prompt for inquiry complex extraction**
3. **Implement LLM-based graph generation** (new API route)
4. **Test with the paper as input**
5. **Compare to hard-coded `competence-ai.ts` graph**

---

## Current System vs. Desired State

| Aspect | Current | Desired |
|--------|---------|---------|
| **Graph source** | Hard-coded (competence-ai.ts) | Generated from documents |
| **Navigation** | Node-by-node selection | Holistic guidance |
| **Stopping** | Coverage % (7/10) | Erotetic equilibrium |
| **Relevance** | All nodes equal | Adaptive to user's trajectory |
| **Conversation** | Sticky (won't let go) | Meandering but directed |
| **Mastery tracking** | Binary (answered/not) | Graded (mastered/exploring/irrelevant) |

---

## Notes for Implementation

### Current Code Structure
- `types/inquiry.ts`: Core data types (Question, Edge, InquiryComplex, UserAnswer)
- `data/competence-ai.ts`: Hard-coded graph (10 questions, edges, reference answers)
- `app/api/select-question/route.ts`: Picks next question (rigid criteria)
- `app/api/articulate/route.ts`: Generates pattern analysis after 4+ questions
- `app/page.tsx`: Main UI (chat + graph visualization)

### What Needs to Change

**Phase 1: Dynamic graph generation**
- New route: `app/api/generate-inquiry-complex/route.ts`
- Input: Document text or URL
- Output: InquiryComplex JSON

**Phase 2: Holistic navigation**
- Refactor `select-question/route.ts` prompt
- Add tools for marking nodes (mastered/irrelevant/deep-dive)
- Give model richer context about user's trajectory

**Phase 3: Better stopping heuristics**
- Not just coverage %
- Detect tensions in user's view
- Offer "equilibrium check" dialogue

---

## Related Documentation
- See NOTES.md lines 514-668 for Mullins critique and Aletheia prototype vision
- See NOTES.md lines 670-983 for agent architecture (inquiry complex as infrastructure)
- See PROJECT.md for research program framing

---

## Key Quotes from Conversation

> "Does the coloring book persist across erotetic engagements with the inquiry complex (the agonistics); specifically across _n_ turns; where _n_ = 5; this is 'the heuristic.'"

> "Hone in on the questions that are most likely to upset the apple cart; clear understanding of topography; sense for what's not really worth it."

> "Meandering conversation, checking off; without being autistically fixed."

> "Delightful and directionally correct."

> "While delighting, without being paternalistic, move towards equilibrium."

> "Guiding prompt: has the user understood the question. Rather than 'justify yourself, bitch!'"
