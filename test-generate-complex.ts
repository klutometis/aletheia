#!/usr/bin/env ts-node
/**
 * Test script to generate inquiry complex from Koralus paper
 * 
 * Usage: npx ts-node test-generate-complex.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGenerateComplex() {
  console.log('🔍 Loading Koralus paper...');
  
  const paperPath = path.join(__dirname, 'doc', 'koralus-philosophic-turn-full.md');
  const documentText = fs.readFileSync(paperPath, 'utf-8');
  
  console.log(`📄 Loaded ${documentText.length} characters`);
  console.log('🤖 Calling API to generate inquiry complex...\n');

  const response = await fetch('http://localhost:3000/api/generate-inquiry-complex', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentText,
      maxQuestions: 12
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Error:', error);
    process.exit(1);
  }

  const data = await response.json();
  
  console.log('✅ Generated inquiry complex!\n');
  console.log('Topic:', data.inquiryComplex.topic);
  console.log('\nCamps/Positions:');
  data.camps.forEach((camp: any) => {
    console.log(`  - ${camp.name}: ${camp.description}`);
  });
  
  console.log('\nQuestions:');
  data.inquiryComplex.questions.forEach((q: any) => {
    console.log(`  ${q.id} [${q.importance}]: ${q.text}`);
    if (q.camp) console.log(`       Camp: ${q.camp}`);
  });
  
  console.log('\nDependencies:');
  data.inquiryComplex.edges.forEach((e: any) => {
    console.log(`  ${e.from} → ${e.to} (${e.type})`);
  });

  // Save to file for inspection
  const outputPath = path.join(__dirname, 'data', 'philosophic-turn-complex.json');
  fs.writeFileSync(outputPath, JSON.stringify(data.inquiryComplex, null, 2));
  console.log(`\n💾 Saved to ${outputPath}`);

  // Also save as TypeScript for easy import
  const tsOutputPath = path.join(__dirname, 'data', 'philosophic-turn-complex.ts');
  const tsContent = `import { InquiryComplex } from '../types/inquiry';

// Generated from Koralus (2025) "The Philosophic Turn for AI Agents"
export const PHILOSOPHIC_TURN_COMPLEX: InquiryComplex = ${JSON.stringify(data.inquiryComplex, null, 2)};

export const CAMPS = ${JSON.stringify(data.camps, null, 2)};
`;
  fs.writeFileSync(tsOutputPath, tsContent);
  console.log(`💾 Saved TypeScript version to ${tsOutputPath}`);
}

testGenerateComplex().catch(console.error);
