"use client";

import React from "react";
import SimplifiedVocabularyAppV2 from "@/components/SimplifiedVocabularyAppV2";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="border-b">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold tracking-tight">Multi-Language Vocabulary Learning</h1>
          <p className="text-muted-foreground text-sm">
            Add words, generate audio, and learn vocabulary in multiple languages
          </p>
        </div>
      </header>

      {/* Main Content - Simplified All-in-One Interface */}
      <main className="container mx-auto">
        <SimplifiedVocabularyAppV2 />
      </main>

      {/* Simple Footer */}
      <footer className="border-t mt-6">
        <div className="container mx-auto py-4 text-center text-xs text-muted-foreground">
          <p>Multi-Language Vocabulary Learning App — Built with Next.js and OpenAI</p>
        </div>
      </footer>
    </div>
  );
}
