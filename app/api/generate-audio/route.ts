import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { Language } from '@/lib/types';
import { getLanguageConfig, formatPrompt } from '@/lib/languageConfigs';

// Define interfaces for request and response
interface GenerateAudioRequest {
  word: string;
  language?: Language;
}

interface GenerateAudioResponse {
  filePath: string;
  explanation: string;
  success: boolean;
  error?: string;
  language?: Language;
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
  try {
    // Parse request body
    const body = await request.json() as GenerateAudioRequest;
    const { word, language = Language.CHINESE } = body;

    // Validate input
    if (!word) {
      return NextResponse.json(
        { success: false, error: 'Word is required' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    // Get language configuration
    const languageConfig = getLanguageConfig(language);

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
    
    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await ensureDirectoryExists(audioDir);
    
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
    
    // Return response with language information
    const response: GenerateAudioResponse = {
      success: true,
      filePath: `/audio/${fileName}`,
      explanation,
      language
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
