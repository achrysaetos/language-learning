import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { Language } from '@/lib/types';
import { getLanguageConfig, formatPrompt } from '@/lib/languageConfigs';

// Define interfaces for request and response
interface GenerateAudioBatchRequest {
  words: string[];
  language?: Language;
}

interface WordProcessingResult {
  word: string;
  success: boolean;
  filePath?: string;
  explanation?: string;
  error?: string;
  language?: Language;
}

interface ProgressUpdate {
  type: 'progress' | 'result' | 'complete' | 'error';
  processed: number;
  total: number;
  currentWord?: string;
  result?: WordProcessingResult;
  allResults?: WordProcessingResult[];
  error?: string;
}

// Ensure audio directory exists
async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Helper function to safely write to the stream
async function safeWrite(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  data: any
): Promise<boolean> {
  try {
    await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
    return true;
  } catch (error) {
    console.error('Error writing to stream:', error);
    return false;
  }
}

// Helper function to safely close the writer
async function safeClose(writer: WritableStreamDefaultWriter<Uint8Array>): Promise<void> {
  try {
    // Check if the writer is still writable (not closed)
    // We can't directly check if it's closed, but we can use a try/catch
    await writer.close();
  } catch (error) {
    // Writer might already be closed, which is fine
    console.log('Writer may already be closed:', error instanceof Error ? error.message : error);
  }
}

export async function POST(request: NextRequest) {
  // Create a streaming response
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process the request in the background
  processBatchRequest(request, writer, encoder).catch((error) => {
    console.error('Unhandled error in batch processing:', error);
    safeWrite(writer, encoder, {
      type: 'error',
      error: 'Internal server error occurred'
    }).finally(() => {
      safeClose(writer);
    });
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

async function processBatchRequest(
  request: NextRequest, 
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder
) {
  let writerClosed = false;
  
  try {
    // Parse request body
    const body = await request.json() as GenerateAudioBatchRequest;
    const { words, language = Language.CHINESE } = body;

    // Validate input
    if (!Array.isArray(words) || words.length === 0) {
      await safeWrite(writer, encoder, {
        type: 'error',
        error: 'Words array is required and must not be empty'
      });
      return; // Don't close the writer here, let the finally block handle it
    }

    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      await safeWrite(writer, encoder, {
        type: 'error',
        error: 'OpenAI API key is not configured'
      });
      return; // Don't close the writer here, let the finally block handle it
    }

    const client = new OpenAI({ apiKey });
    
    // Get language configuration
    const languageConfig = getLanguageConfig(language);
    
    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await ensureDirectoryExists(audioDir);

    // Process each word
    const results: WordProcessingResult[] = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Send progress update
      await safeWrite(writer, encoder, {
        type: 'progress',
        processed: i,
        total: words.length,
        currentWord: word
      } as ProgressUpdate);

      try {
        // Define prompts using language configuration
        const systemCommand = languageConfig.systemPrompt;
        const userCommand = formatPrompt(languageConfig.userPromptTemplate, word);

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
        
        // Generate speech using TTS API with language-specific voice
        const ttsModel = process.env.OPENAI_TTS_MODEL || 'tts-1';
        const ttsVoice = languageConfig.ttsVoice;
        
        const speechResponse = await client.audio.speech.create({
          model: ttsModel,
          voice: ttsVoice as any, // OpenAI SDK expects specific voice types
          input: explanation
        });

        // Get audio data as buffer
        const audioData = Buffer.from(await speechResponse.arrayBuffer());
        
        // Save audio file with language code in filename for organization
        const fileName = `${language}_${word}.mp3`;
        const filePath = path.join(audioDir, fileName);
        await fs.writeFile(filePath, audioData);
        
        // Add to results with language information
        const result: WordProcessingResult = {
          word,
          success: true,
          filePath: `/audio/${fileName}`,
          explanation,
          language
        };
        results.push(result);

        // Send individual result
        await safeWrite(writer, encoder, {
          type: 'result',
          processed: i + 1,
          total: words.length,
          result
        } as ProgressUpdate);

      } catch (error) {
        console.error(`Error processing word "${word}":`, error);
        
        // Add failed result with language information
        const result: WordProcessingResult = {
          word,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          language
        };
        results.push(result);

        // Send individual failure result
        await safeWrite(writer, encoder, {
          type: 'result',
          processed: i + 1,
          total: words.length,
          result
        } as ProgressUpdate);
      }
    }

    // Send complete update with all results
    await safeWrite(writer, encoder, {
      type: 'complete',
      processed: words.length,
      total: words.length,
      allResults: results
    } as ProgressUpdate);

  } catch (error) {
    console.error('Error in batch processing:', error);
    await safeWrite(writer, encoder, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  } finally {
    // Only close the writer once in the finally block
    if (!writerClosed) {
      writerClosed = true;
      await safeClose(writer);
    }
  }
}
