import { Word, Playlist, Language } from './types';

interface ExportData {
  version: string;
  exportDate: string;
  language: Language;
  words: Word[];
  playlists?: Playlist[];
}

export function exportWords(
  words: Word[], 
  playlists: Playlist[] = [],
  language: Language
): string {
  const exportData: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    language,
    words,
    playlists
  };
  
  return JSON.stringify(exportData, null, 2);
}

export function downloadAsFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(words: Word[]): string {
  const headers = ['Word', 'Language', 'Status', 'Created Date', 'Explanation'];
  const rows = words.map(word => [
    word.word,
    word.languageCode,
    word.status,
    new Date(word.createdAt).toLocaleDateString(),
    word.explanation?.replace(/[\n\r,]/g, ' ') || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

export async function importWords(fileContent: string): Promise<{
  words: Word[];
  playlists: Playlist[];
  language: Language;
}> {
  try {
    const data = JSON.parse(fileContent) as ExportData;
    
    // Validate the data structure
    if (!data.version || !data.words || !Array.isArray(data.words)) {
      throw new Error('Invalid import file format');
    }
    
    // Ensure all words have required fields
    const validWords = data.words.filter(word => 
      word.word && 
      word.id && 
      word.status
    );
    
    return {
      words: validWords,
      playlists: data.playlists || [],
      language: data.language || Language.CHINESE
    };
  } catch (error) {
    throw new Error(`Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function mergeImportedWords(
  existingWords: Record<string, Word>,
  importedWords: Word[]
): { merged: Record<string, Word>; added: number; updated: number; skipped: number } {
  const merged = { ...existingWords };
  let added = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const word of importedWords) {
    if (!merged[word.id]) {
      // New word
      merged[word.id] = word;
      added++;
    } else if (new Date(word.createdAt) > new Date(merged[word.id].createdAt)) {
      // Update if imported word is newer
      merged[word.id] = word;
      updated++;
    } else {
      // Skip if existing word is newer
      skipped++;
    }
  }
  
  return { merged, added, updated, skipped };
}