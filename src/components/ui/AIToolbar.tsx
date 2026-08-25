"use client";

import { useState } from "react";
import { Copy, FileText, ExternalLink, ChevronDown, Check } from "lucide-react";

export function AIToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getPageUrl = () => {
    return typeof window !== 'undefined' ? window.location.href : 'https://docs.proppr.io';
  };

  const getLlmsFile = () => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const base = 'https://raw.githubusercontent.com/Jayzinq/proppr-docs/master';
    if (path.includes('player-bot') || path.includes('playerbot')) {
      return `${base}/llms-player.txt`;
    } else if (path.includes('team-bot') || path.includes('teambot')) {
      return `${base}/llms-team.txt`;
    } else if (path.includes('arb-bot') || path.includes('arbbot')) {
      return `${base}/llms-arb.txt`;
    }
    return `${base}/llms-context.txt`;
  };

  const copyPageAsMarkdown = () => {
    const title = document.title;
    const url = getPageUrl();
    const content = document.querySelector('main')?.textContent?.trim() || '';
    const markdown = `# ${title}\n\n**URL:** ${url}\n\n${content}`;
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const viewAsMarkdown = () => {
    const path = window.location.pathname;
    const base = 'https://raw.githubusercontent.com/Jayzinq/proppr-docs/master';
    if (path.includes('player-bot') || path.includes('playerbot')) {
      window.open(`${base}/llms-player.txt`, '_blank');
    } else if (path.includes('team-bot') || path.includes('teambot')) {
      window.open(`${base}/llms-team.txt`, '_blank');
    } else if (path.includes('arb-bot') || path.includes('arbbot')) {
      window.open(`${base}/llms-arb.txt`, '_blank');
    } else {
      window.open(`${base}/llms-full.txt`, '_blank');
    }
    setIsOpen(false);
  };

  const openInChatGPT = () => {
    const prompt = `Read ${getPageUrl()} and ${getLlmsFile()} and answer questions about the content.`;
    window.open(`https://chat.openai.com/?q=${encodeURIComponent(prompt)}`, '_blank');
    setIsOpen(false);
  };

  const openInClaude = () => {
    const prompt = `Read ${getPageUrl()} and ${getLlmsFile()} and answer questions about the content.`;
    window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, '_blank');
    setIsOpen(false);
  };

  const openInGrok = () => {
    const prompt = `Read ${getPageUrl()} and ${getLlmsFile()} and answer questions about the content.`;
    window.open(`https://grok.com/?q=${encodeURIComponent(prompt)}`, '_blank');
    setIsOpen(false);
  };

  const openInGemini = () => {
    const prompt = `Read ${getPageUrl()} and ${getLlmsFile()} and answer questions about the content.`;
    window.open(`https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm"
      >
        <Copy className="w-4 h-4 text-zinc-400" />
        <span className="text-zinc-300">Copy</span>
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            {/* Copy Options */}
            <button
              onClick={copyPageAsMarkdown}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-400 mt-0.5" />
              ) : (
                <Copy className="w-5 h-5 text-zinc-400 mt-0.5" />
              )}
              <div>
                <span className="block text-sm text-zinc-200">{copied ? "Copied!" : "Copy page"}</span>
                <span className="block text-xs text-zinc-500">Copy page as Markdown for LLMs</span>
              </div>
            </button>

            <button
              onClick={viewAsMarkdown}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <FileText className="w-5 h-5 text-zinc-400 mt-0.5" />
              <div className="flex-1">
                <span className="flex items-center gap-1 text-sm text-zinc-200">
                  View as Markdown
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </span>
                <span className="block text-xs text-zinc-500">View this page as plain text</span>
              </div>
            </button>

            {/* AI Options */}
            <button
              onClick={openInChatGPT}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <span className="text-lg mt-0.5">🤖</span>
              <div className="flex-1">
                <span className="flex items-center gap-1 text-sm text-zinc-200">
                  Open in ChatGPT
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </span>
                <span className="block text-xs text-zinc-500">Ask ChatGPT about this page</span>
              </div>
            </button>

            <button
              onClick={openInClaude}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <span className="text-lg mt-0.5">🧠</span>
              <div className="flex-1">
                <span className="flex items-center gap-1 text-sm text-zinc-200">
                  Open in Claude
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </span>
                <span className="block text-xs text-zinc-500">Ask Claude about this page</span>
              </div>
            </button>

            <button
              onClick={openInGrok}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <span className="text-lg mt-0.5">🚀</span>
              <div className="flex-1">
                <span className="flex items-center gap-1 text-sm text-zinc-200">
                  Open in Grok
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </span>
                <span className="block text-xs text-zinc-500">Ask Grok about this page</span>
              </div>
            </button>

            <button
              onClick={openInGemini}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <span className="text-lg mt-0.5">✨</span>
              <div className="flex-1">
                <span className="flex items-center gap-1 text-sm text-zinc-200">
                  Open in Gemini
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </span>
                <span className="block text-xs text-zinc-500">Ask Gemini about this page</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
