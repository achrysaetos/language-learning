import { Language, LanguageConfig } from './types';

/**
 * Language configurations for the vocabulary learning app
 * Each configuration includes prompts and settings specific to that language
 */

// Define the language configurations
const languageConfigs: Record<Language, LanguageConfig> = {
  [Language.CHINESE]: {
    code: Language.CHINESE,
    displayName: 'Chinese (中文)',
    ttsVoice: 'echo',
    systemPrompt: 'You are a helpful Chinese language tutor, skilled in explaining new vocabulary in an easy to understand way for users who already know only a few elementary Chinese words. You will be given a Chinese word, and you will need to explain its meaning.',
    userPromptTemplate: 'Create an easy to understand chinese sentence for this word that will let me easily infer the meaning of this word: "{word}", then explain the meaning using very simple chinese words. Use this format: 这个词是"{word}"。"{word}"的意思是。。。，英文翻译是。。。比如，。。。',
    exampleFormat: '这个词是"{word}"。"{word}"的意思是。。。，英文翻译是。。。比如，。。。'
  },
  
  [Language.SPANISH]: {
    code: Language.SPANISH,
    displayName: 'Spanish (Español)',
    ttsVoice: 'alloy',
    systemPrompt: 'You are a helpful Spanish language tutor, skilled in explaining new vocabulary in an easy to understand way for users who are beginners in Spanish. You will be given a Spanish word, and you will need to explain its meaning and usage.',
    userPromptTemplate: 'Create an easy to understand Spanish sentence for this word that will help me understand its meaning: "{word}". Then explain the meaning using simple Spanish. Use this format: La palabra es "{word}". "{word}" significa... En inglés es... Por ejemplo...',
    exampleFormat: 'La palabra es "{word}". "{word}" significa... En inglés es... Por ejemplo...'
  },
  
  [Language.FRENCH]: {
    code: Language.FRENCH,
    displayName: 'French (Français)',
    ttsVoice: 'alloy',
    systemPrompt: 'You are a helpful French language tutor, skilled in explaining new vocabulary in an easy to understand way for users who are beginners in French. You will be given a French word, and you will need to explain its meaning and usage.',
    userPromptTemplate: 'Create an easy to understand French sentence for this word that will help me understand its meaning: "{word}". Then explain the meaning using simple French. Use this format: Le mot est "{word}". "{word}" signifie... En anglais c\'est... Par exemple...',
    exampleFormat: 'Le mot est "{word}". "{word}" signifie... En anglais c\'est... Par exemple...'
  },
  
  [Language.GERMAN]: {
    code: Language.GERMAN,
    displayName: 'German (Deutsch)',
    ttsVoice: 'alloy',
    systemPrompt: 'You are a helpful German language tutor, skilled in explaining new vocabulary in an easy to understand way for users who are beginners in German. You will be given a German word, and you will need to explain its meaning and usage.',
    userPromptTemplate: 'Create an easy to understand German sentence for this word that will help me understand its meaning: "{word}". Then explain the meaning using simple German. Use this format: Das Wort ist "{word}". "{word}" bedeutet... Auf Englisch ist es... Zum Beispiel...',
    exampleFormat: 'Das Wort ist "{word}". "{word}" bedeutet... Auf Englisch ist es... Zum Beispiel...'
  },
  
  [Language.ITALIAN]: {
    code: Language.ITALIAN,
    displayName: 'Italian (Italiano)',
    ttsVoice: 'alloy',
    systemPrompt: 'You are a helpful Italian language tutor, skilled in explaining new vocabulary in an easy to understand way for users who are beginners in Italian. You will be given an Italian word, and you will need to explain its meaning and usage.',
    userPromptTemplate: 'Create an easy to understand Italian sentence for this word that will help me understand its meaning: "{word}". Then explain the meaning using simple Italian. Use this format: La parola è "{word}". "{word}" significa... In inglese è... Per esempio...',
    exampleFormat: 'La parola è "{word}". "{word}" significa... In inglese è... Per esempio...'
  },
  
  [Language.JAPANESE]: {
    code: Language.JAPANESE,
    displayName: 'Japanese (日本語)',
    ttsVoice: 'nova',
    systemPrompt: 'You are a helpful Japanese language tutor, skilled in explaining new vocabulary in an easy to understand way for users who are beginners in Japanese. You will be given a Japanese word, and you will need to explain its meaning and usage.',
    userPromptTemplate: 'Create an easy to understand Japanese sentence for this word that will help me understand its meaning: "{word}". Then explain the meaning using simple Japanese with furigana for kanji. Use this format: この言葉は「{word}」です。「{word}」の意味は...、英語で...、例えば...',
    exampleFormat: 'この言葉は「{word}」です。「{word}」の意味は...、英語で...、例えば...'
  },
  
  [Language.KOREAN]: {
    code: Language.KOREAN,
    displayName: 'Korean (한국어)',
    ttsVoice: 'nova',
    systemPrompt: 'You are a helpful Korean language tutor, skilled in explaining new vocabulary in an easy to understand way for users who are beginners in Korean. You will be given a Korean word, and you will need to explain its meaning and usage.',
    userPromptTemplate: 'Create an easy to understand Korean sentence for this word that will help me understand its meaning: "{word}". Then explain the meaning using simple Korean. Use this format: 이 단어는 "{word}"입니다. "{word}"의 뜻은 ...이고, 영어로는 ...입니다. 예를 들면 ...',
    exampleFormat: '이 단어는 "{word}"입니다. "{word}"의 뜻은 ...이고, 영어로는 ...입니다. 예를 들면 ...'
  }
};

/**
 * Get language configuration by language code
 * @param languageCode The language code to get configuration for
 * @returns The language configuration or Chinese as default
 */
export function getLanguageConfig(languageCode: Language): LanguageConfig {
  return languageConfigs[languageCode] || languageConfigs[Language.CHINESE];
}

/**
 * Format a prompt template by replacing {word} with the actual word
 * @param template The prompt template with {word} placeholder
 * @param word The word to insert into the template
 * @returns Formatted prompt string
 */
export function formatPrompt(template: string, word: string): string {
  return template.replace(/\{word\}/g, word);
}

/**
 * Get all available language configurations
 * @returns Array of all language configurations
 */
export function getAllLanguageConfigs(): LanguageConfig[] {
  return Object.values(languageConfigs);
}

/**
 * Get display names for all supported languages
 * @returns Object mapping language codes to display names
 */
export function getLanguageDisplayNames(): Record<Language, string> {
  const displayNames: Record<Language, string> = {} as Record<Language, string>;
  
  Object.values(languageConfigs).forEach(config => {
    displayNames[config.code] = config.displayName;
  });
  
  return displayNames;
}

export default languageConfigs;
