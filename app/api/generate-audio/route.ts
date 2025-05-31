import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';

// Define interfaces for request and response
interface GenerateAudioRequest {
  word: string;
}

interface GenerateAudioResponse {
  filePath: string;
  explanation: string;
  success: boolean;
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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json() as GenerateAudioRequest;
    const { word } = body;

    // Validate input
    if (!word) {
      return NextResponse.json(
        { success: false, error: 'Chinese word is required' },
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

    // Define prompts (same as Python script)
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
    
    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await ensureDirectoryExists(audioDir);
    
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
    
    // Return response
    const response: GenerateAudioResponse = {
      success: true,
      filePath: `/audio/${fileName}`,
      explanation
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
