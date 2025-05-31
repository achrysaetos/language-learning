import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';

// Define interfaces for request and response
interface GenerateAudioBatchRequest {
  words: string[];
}

interface WordProcessingResult {
  word: string;
  success: boolean;
  filePath?: string;
  explanation?: string;
  error?: string;
}

interface ProgressUpdate {
  type: 'progress' | 'result' | 'complete';
  processed: number;
  total: number;
  currentWord?: string;
  result?: WordProcessingResult;
  allResults?: WordProcessingResult[];
}

// Ensure audio directory exists
async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  // Create a streaming response
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process the request in the background
  processBatchRequest(request, writer).catch((error) => {
    console.error('Unhandled error in batch processing:', error);
    writer.write(encoder.encode(JSON.stringify({
      type: 'error',
      error: 'Internal server error occurred'
    })));
    writer.close();
  });

  // Return the stream as the response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function processBatchRequest(request: NextRequest, writer: WritableStreamDefaultWriter<Uint8Array>) {
  const encoder = new TextEncoder();
  
  try {
    // Parse request body
    const body = await request.json() as GenerateAudioBatchRequest;
    const { words } = body;

    // Validate input
    if (!Array.isArray(words) || words.length === 0) {
      writer.write(encoder.encode(JSON.stringify({
        type: 'error',
        error: 'Words array is required and must not be empty'
      })));
      return writer.close();
    }

    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      writer.write(encoder.encode(JSON.stringify({
        type: 'error',
        error: 'OpenAI API key is not configured'
      })));
      return writer.close();
    }

    const client = new OpenAI({ apiKey });
    
    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await ensureDirectoryExists(audioDir);

    // Process each word
    const results: WordProcessingResult[] = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Send progress update
      writer.write(encoder.encode(JSON.stringify({
        type: 'progress',
        processed: i,
        total: words.length,
        currentWord: word
      } as ProgressUpdate) + '\n'));

      try {
        // Define prompts (same as single word endpoint)
        const systemCommand = `You are a helpful Chinese language tutor, skilled in explaining new vocabulary in an easy to understand way for users who already know only a few elementary Chinese words. You will be given a Chinese word, and you will need to explain its meaning.`;
        
        const userCommand = `Create an easy to understand chinese sentence for this word that will let me easily infer the meaning of this word: "${word}", then explain the meaning using very simple chinese words. Use this format: 这个词是"${word}"。"${word}"的意思是。。。，英文翻译是。。。比如，。。。"`;

        // Generate explanation using Chat API
        const chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo-preview';
        const completion = await client.chat.completions.create({
          model: chatModel,
          messages: [
            { role: 'system', content: systemCommand },
            { role: 'user', content: userCommand }
          ]
        });

        const explanation = completion.choices[0].message.content || '';
        
        // Generate speech using TTS API
        const ttsModel = process.env.OPENAI_TTS_MODEL || 'tts-1';
        const ttsVoice = process.env.OPENAI_TTS_VOICE || 'echo';
        
        const speechResponse = await client.audio.speech.create({
          model: ttsModel,
          voice: ttsVoice,
          input: explanation
        });

        // Get audio data as buffer
        const audioData = Buffer.from(await speechResponse.arrayBuffer());
        
        // Save audio file
        const fileName = `${word}.mp3`;
        const filePath = path.join(audioDir, fileName);
        await fs.writeFile(filePath, audioData);
        
        // Add to results
        const result: WordProcessingResult = {
          word,
          success: true,
          filePath: `/audio/${fileName}`,
          explanation
        };
        results.push(result);

        // Send individual result
        writer.write(encoder.encode(JSON.stringify({
          type: 'result',
          processed: i + 1,
          total: words.length,
          result
        } as ProgressUpdate) + '\n'));

      } catch (error) {
        console.error(`Error processing word "${word}":`, error);
        
        // Add failed result
        const result: WordProcessingResult = {
          word,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
        results.push(result);

        // Send individual failure result
        writer.write(encoder.encode(JSON.stringify({
          type: 'result',
          processed: i + 1,
          total: words.length,
          result
        } as ProgressUpdate) + '\n'));
      }
    }

    // Send complete update with all results
    writer.write(encoder.encode(JSON.stringify({
      type: 'complete',
      processed: words.length,
      total: words.length,
      allResults: results
    } as ProgressUpdate) + '\n'));

  } catch (error) {
    console.error('Error in batch processing:', error);
    writer.write(encoder.encode(JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }) + '\n'));
  } finally {
    writer.close();
  }
}
