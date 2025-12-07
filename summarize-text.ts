import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import fs from "fs/promises";

// The client gets the API key from the environment variable GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CHUNK_SIZE = 30000; // characters per chunk (~7500 tokens)

interface Config {
  inputFile: string;
  outputFile: string;
  topic: string;
}

const CONFIGS: Record<string, Config> = {
  taylor: {
    inputFile: "taylor-ocr.txt",
    outputFile: "doc/taylor-sources-of-self-summary.md",
    topic: "Charles Taylor's 'Sources of the Self'"
  },
  koralus: {
    inputFile: "doc/koralus-reason-and-inquiry.md",
    outputFile: "doc/koralus-reason-and-inquiry-summary.md",
    topic: "Philipp Koralus's 'Reason and Inquiry'"
  }
};

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
  previousSummaries: string[],
  topic: string
): Promise<string> {
  let contextSection = "";
  if (previousSummaries.length > 0) {
    // Include last 2 summaries for context
    const recentSummaries = previousSummaries.slice(-2);
    contextSection = `\n\nContext from previous sections:\n${recentSummaries.map((s, i) => `Previous section ${previousSummaries.length - recentSummaries.length + i + 1}: ${s}`).join("\n\n")}\n`;
  }
  
  const prompt = `This is part ${chunkNum} of ${totalChunks} from ${topic}.${contextSection}

Please provide a concise summary of the key points, themes, and important details in this section:

${chunk}

Summary:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function createFinalSummary(
  model: GenerativeModel,
  chunkSummaries: string[],
  topic: string
): Promise<string> {
  const combined = chunkSummaries.join("\n\n---\n\n");
  
  const prompt = `Below are summaries of different sections from ${topic}. Please create a comprehensive final summary that:

1. Identifies the main themes and arguments
2. Highlights key concepts and principles
3. Notes important examples or case studies
4. Provides an overview of the work's structure and contribution

Section summaries:

${combined}

Final comprehensive summary:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function summarize(config: Config): Promise<void> {
  console.log(`\n=== Summarizing ${config.topic} ===\n`);
  console.log(`Input: ${config.inputFile}`);
  console.log(`Output: ${config.outputFile}\n`);
  
  try {
    console.log("Reading file...");
    const text = await fs.readFile(config.inputFile, "utf-8");
    console.log(`File size: ${text.length} characters`);
    
    console.log("Chunking text...");
    const chunks = await chunkText(text);
    console.log(`Created ${chunks.length} chunks`);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const chunkSummaries: string[] = [];
    let output = `# ${config.topic} - Summary\n\n`;
    output += `Generated: ${new Date().toISOString()}\n\n`;
    output += `## Individual Section Summaries\n\n`;
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Summarizing chunk ${i + 1}/${chunks.length}...`);
      const summary = await summarizeChunk(
        model,
        chunks[i],
        i + 1,
        chunks.length,
        chunkSummaries,
        config.topic
      );
      chunkSummaries.push(summary);
      
      output += `### Section ${i + 1}\n\n${summary}\n\n`;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("Creating final summary...");
    const finalSummary = await createFinalSummary(model, chunkSummaries, config.topic);
    
    output = `# ${config.topic} - Summary\n\n` +
             `Generated: ${new Date().toISOString()}\n\n` +
             `## Executive Summary\n\n${finalSummary}\n\n` +
             `---\n\n` + output;
    
    await fs.writeFile(config.outputFile, output);
    console.log(`\nDone! Summary written to ${config.outputFile}`);
    
  } catch (error) {
    console.error(`Error summarizing ${config.topic}:`, error);
    throw error;
  }
}

async function main(): Promise<void> {
  const target = process.argv[2];
  
  if (!target || !CONFIGS[target]) {
    console.error("Usage: tsx summarize-text.ts [taylor|koralus|all]");
    console.error("\nAvailable targets:");
    Object.keys(CONFIGS).forEach(key => {
      console.error(`  ${key}: ${CONFIGS[key].topic}`);
    });
    console.error("  all: Summarize all texts");
    process.exit(1);
  }
  
  try {
    if (target === "all") {
      for (const key of Object.keys(CONFIGS)) {
        await summarize(CONFIGS[key]);
      }
    } else {
      await summarize(CONFIGS[target]);
    }
    
    console.log("\n✅ All summaries complete!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
