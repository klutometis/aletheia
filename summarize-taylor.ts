import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import fs from "fs/promises";

// The client gets the API key from the environment variable GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CHUNK_SIZE = 30000; // characters per chunk (~7500 tokens)
const INPUT_FILE = "taylor-ocr.txt";
const OUTPUT_FILE = "taylor-summary.md";

async function chunkText(text: string): Promise<string[]> {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    
    // Try to break at paragraph boundaries
    if (end < text.length) {
      const nextNewline = text.indexOf('\n\n', end);
      if (nextNewline !== -1 && nextNewline - end < 1000) {
        end = nextNewline;
      }
    } else {
      end = text.length;
    }
    
    chunks.push(text.slice(start, end));
    start = end;
  }
  
  return chunks;
}

async function summarizeChunk(
  model: GenerativeModel,
  chunk: string,
  chunkNum: number,
  totalChunks: number,
  previousSummaries: string[]
): Promise<string> {
  let contextSection = "";
  if (previousSummaries.length > 0) {
    // Include last 2 summaries for context
    const recentSummaries = previousSummaries.slice(-2);
    contextSection = `\n\nContext from previous sections:\n${recentSummaries.map((s, i) => `Previous section ${previousSummaries.length - recentSummaries.length + i + 1}: ${s}`).join("\n\n")}\n`;
  }
  
  const prompt = `This is part ${chunkNum} of ${totalChunks} from a larger document (likely about Frederick Winslow Taylor and scientific management based on OCR text).${contextSection}

Please provide a concise summary of the key points, themes, and important details in this section:

${chunk}

Summary:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function createFinalSummary(
  model: GenerativeModel,
  chunkSummaries: string[]
): Promise<string> {
  const combined = chunkSummaries.join("\n\n---\n\n");
  
  const prompt = `Below are summaries of different sections from a document about Frederick Winslow Taylor and scientific management. Please create a comprehensive final summary that:

1. Identifies the main themes and arguments
2. Highlights key concepts and principles
3. Notes important examples or case studies
4. Provides an overview of the document's structure

Section summaries:

${combined}

Final comprehensive summary:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function main(): Promise<void> {
  try {
    console.log("Reading file...");
    const text = await fs.readFile(INPUT_FILE, "utf-8");
    console.log(`File size: ${text.length} characters`);
    
    console.log("Chunking text...");
    const chunks = await chunkText(text);
    console.log(`Created ${chunks.length} chunks`);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const chunkSummaries: string[] = [];
    let output = "# Taylor OCR Text - Summary\n\n";
    output += `Generated: ${new Date().toISOString()}\n\n`;
    output += `## Individual Section Summaries\n\n`;
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Summarizing chunk ${i + 1}/${chunks.length}...`);
      const summary = await summarizeChunk(
        model,
        chunks[i],
        i + 1,
        chunks.length,
        chunkSummaries  // Pass previously generated summaries as context
      );
      chunkSummaries.push(summary);
      
      output += `### Section ${i + 1}\n\n${summary}\n\n`;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("Creating final summary...");
    const finalSummary = await createFinalSummary(model, chunkSummaries);
    
    output = `# Taylor OCR Text - Summary\n\n` +
             `Generated: ${new Date().toISOString()}\n\n` +
             `## Executive Summary\n\n${finalSummary}\n\n` +
             `---\n\n` + output;
    
    await fs.writeFile(OUTPUT_FILE, output);
    console.log(`\nDone! Summary written to ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
