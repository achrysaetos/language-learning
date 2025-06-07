'use client';

import React, { useMemo } from 'react';
import { Word, WordStatus, Language } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  Zap, 
  Award,
  Languages,
  BarChart3,
  Calendar,
  Target
} from 'lucide-react';
import { getLanguageDisplayNames } from '@/lib/languageConfigs';

interface StatsProps {
  words: Word[];
  currentLanguage: Language;
}

export function StatsDashboard({ words, currentLanguage }: StatsProps) {
  const languageDisplayNames = getLanguageDisplayNames();
  
  const stats = useMemo(() => {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Current language stats
    const currentLangWords = words.filter(w => w.languageCode === currentLanguage);
    const currentLangComplete = currentLangWords.filter(w => w.status === WordStatus.COMPLETE);
    
    // Overall stats
    const totalWords = words.length;
    const totalComplete = words.filter(w => w.status === WordStatus.COMPLETE).length;
    const totalError = words.filter(w => w.status === WordStatus.ERROR).length;
    const totalPending = words.filter(w => 
      w.status === WordStatus.IDLE || w.status === WordStatus.PENDING
    ).length;
    
    // Recent activity
    const wordsLast7Days = words.filter(w => 
      new Date(w.createdAt) >= last7Days
    ).length;
    const wordsLast30Days = words.filter(w => 
      new Date(w.createdAt) >= last30Days
    ).length;
    
    // Language breakdown
    const languageBreakdown = Object.values(Language).map(lang => {
      const langWords = words.filter(w => w.languageCode === lang);
      return {
        language: lang,
        total: langWords.length,
        complete: langWords.filter(w => w.status === WordStatus.COMPLETE).length,
        percentage: langWords.length > 0 
          ? (langWords.filter(w => w.status === WordStatus.COMPLETE).length / langWords.length) * 100
          : 0
      };
    }).filter(stat => stat.total > 0);
    
    // Average words per day (last 30 days)
    const avgWordsPerDay = wordsLast30Days / 30;
    
    // Completion rate
    const completionRate = totalWords > 0 ? (totalComplete / totalWords) * 100 : 0;
    
    return {
      currentLang: {
        total: currentLangWords.length,
        complete: currentLangComplete.length,
        percentage: currentLangWords.length > 0 
          ? (currentLangComplete.length / currentLangWords.length) * 100 
          : 0
      },
      overall: {
        total: totalWords,
        complete: totalComplete,
        error: totalError,
        pending: totalPending,
        completionRate
      },
      activity: {
        last7Days: wordsLast7Days,
        last30Days: wordsLast30Days,
        avgPerDay: avgWordsPerDay
      },
      languages: languageBreakdown
    };
  }, [words, currentLanguage]);

  return (
    <div className="space-y-6">
      {/* Current Language Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Languages className="h-5 w-5 mr-2" />
            {languageDisplayNames[currentLanguage]} Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">
                {stats.currentLang.complete} / {stats.currentLang.total}
              </span>
              <span className="text-sm text-muted-foreground">
                {stats.currentLang.percentage.toFixed(1)}% complete
              </span>
            </div>
            <Progress value={stats.currentLang.percentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Words</p>
                <p className="text-2xl font-bold">{stats.overall.total}</p>
              </div>
              <Award className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Audio</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.overall.complete}
                </p>
              </div>
              <Zap className="h-8 w-8 text-emerald-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{stats.activity.last7Days}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg/Day</p>
                <p className="text-2xl font-bold">
                  {stats.activity.avgPerDay.toFixed(1)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Language Breakdown */}
      {stats.languages.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Language Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.languages.map(lang => (
                <div key={lang.language} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{languageDisplayNames[lang.language]}</span>
                    <span className="text-muted-foreground">
                      {lang.complete}/{lang.total} ({lang.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={lang.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Overall Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                Complete with audio
              </span>
              <span className="font-medium">{stats.overall.complete}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                Pending generation
              </span>
              <span className="font-medium">{stats.overall.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-rose-500 mr-2" />
                Generation errors
              </span>
              <span className="font-medium">{stats.overall.error}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <span className="text-lg font-bold text-primary">
                {stats.overall.completionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}