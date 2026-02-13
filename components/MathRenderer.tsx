import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    katex: any;
  }
}

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Wait for KaTeX to be available (loaded via CDN with defer)
 */
const waitForKatex = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.katex) {
      resolve();
      return;
    }
    // Poll every 100ms for up to 5 seconds
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.katex || attempts > 50) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
};

/**
 * Render a LaTeX string to HTML using KaTeX
 */
const renderLatex = (latex: string, displayMode: boolean): string => {
  if (!window.katex) return `<code>${escapeHtml(latex)}</code>`;
  try {
    return window.katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return `<code>${escapeHtml(latex)}</code>`;
  }
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Convert simple markdown to HTML:
 * - ### heading → <h3>
 * - **bold** → <strong>
 * - *italic* → <em>
 * - - list item → <li>
 * - newlines → <br>
 */
const markdownToHtml = (text: string): string => {
  // Process line by line
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headings
    if (line.startsWith('#### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h4 class="text-sm font-bold mt-3 mb-1">${processInline(line.slice(5))}</h4>`;
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3 class="text-base font-bold mt-3 mb-1">${processInline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2 class="text-lg font-bold mt-4 mb-1">${processInline(line.slice(3))}</h2>`;
      continue;
    }

    // List items
    if (line.match(/^\s*[-*]\s/)) {
      if (!inList) { html += '<ul class="list-disc list-inside space-y-1 my-1">'; inList = true; }
      const content = line.replace(/^\s*[-*]\s/, '');
      html += `<li>${processInline(content)}</li>`;
      continue;
    }

    // Numbered list
    if (line.match(/^\s*\d+\.\s/)) {
      if (inList) { html += '</ul>'; inList = false; }
      const content = line.replace(/^\s*\d+\.\s/, '');
      html += `<div class="ml-4 my-0.5">${line.match(/^\s*(\d+\.)/)?.[1]} ${processInline(content)}</div>`;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<br>';
      continue;
    }

    // Regular paragraph
    if (inList) { html += '</ul>'; inList = false; }
    html += `<p class="my-0.5">${processInline(line)}</p>`;
  }

  if (inList) html += '</ul>';
  return html;
};

/**
 * Process inline formatting: bold, italic, inline code, LaTeX
 */
const processInline = (text: string): string => {
  // Process LaTeX FIRST (before markdown bold/italic interfere with $ signs)
  // Handle display math $$...$$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
    return renderLatex(latex, true);
  });

  // Handle inline math $...$  (careful not to match $$ or currency)
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, latex) => {
    return renderLatex(latex, false);
  });

  // Handle inline code `...`
  text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-sm">$1</code>');

  // Handle bold **...**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Handle italic *...*
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return text;
};

const MathRenderer: React.FC<MathRendererProps> = ({ content, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [katexReady, setKatexReady] = useState(!!window.katex);

  useEffect(() => {
    if (!window.katex) {
      waitForKatex().then(() => setKatexReady(true));
    }
  }, []);

  useEffect(() => {
    if (containerRef.current && katexReady) {
      const html = markdownToHtml(content);
      containerRef.current.innerHTML = html;
    } else if (containerRef.current) {
      // Fallback: at least show text without LaTeX rendering
      const html = markdownToHtml(content);
      containerRef.current.innerHTML = html;
    }
  }, [content, katexReady]);

  return <div ref={containerRef} className={`${className || ''} whitespace-pre-wrap leading-relaxed math-content`} />;
};

export default MathRenderer;
