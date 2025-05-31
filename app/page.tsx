"use client";

import React from "react";
import WordManager from "@/components/WordManager";
import AudioPlayer from "@/components/AudioPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Volume2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold tracking-tight">Chinese Vocabulary Learning</h1>
          <p className="text-muted-foreground mt-1">
            Add words, generate audio explanations, and create study playlists
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6">
        <Tabs defaultValue="words" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="words" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Manage Words
            </TabsTrigger>
            <TabsTrigger value="player" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Audio Player
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="words" className="mt-0">
            <WordManager />
          </TabsContent>
          
          <TabsContent value="player" className="mt-0">
            <AudioPlayer />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto py-6 text-center text-sm text-muted-foreground">
          <p>Chinese Vocabulary Learning App — Built with Next.js and OpenAI</p>
        </div>
      </footer>
    </div>
  );
}
