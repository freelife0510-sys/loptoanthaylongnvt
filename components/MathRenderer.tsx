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
  if (!window.katex) return escapeHtml(latex);
  try {
    return window.katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return escapeHtml(latex);
  }
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// ============================================================
// Auto-detect raw LaTeX patterns NOT wrapped in $...$
// and wrap them so KaTeX can render them
// ============================================================

const LATEX_COMMANDS = [
  '\\\\times', '\\\\cdot', '\\\\div', '\\\\pm', '\\\\mp',
  '\\\\frac', '\\\\sqrt', '\\\\sum', '\\\\prod', '\\\\int',
  '\\\\infty', '\\\\alpha', '\\\\beta', '\\\\gamma', '\\\\delta',
  '\\\\theta', '\\\\lambda', '\\\\mu', '\\\\pi', '\\\\sigma',
  '\\\\phi', '\\\\omega', '\\\\Omega', '\\\\epsilon', '\\\\varepsilon',
  '\\\\leq', '\\\\geq', '\\\\neq', '\\\\approx', '\\\\equiv',
  '\\\\subset', '\\\\supset', '\\\\in', '\\\\notin',
  '\\\\cup', '\\\\cap', '\\\\emptyset', '\\\\forall', '\\\\exists',
  '\\\\rightarrow', '\\\\leftarrow', '\\\\Rightarrow', '\\\\Leftarrow',
  '\\\\dots', '\\\\ldots', '\\\\cdots', '\\\\vdots',
  '\\\\overline', '\\\\underline', '\\\\hat', '\\\\vec', '\\\\bar',
  '\\\\lim', '\\\\log', '\\\\ln', '\\\\sin', '\\\\cos', '\\\\tan',
  '\\\\text', '\\\\mathbb', '\\\\mathcal', '\\\\mathrm',
  '\\\\binom', '\\\\choose',
  '\\\\left', '\\\\right', '\\\\big', '\\\\Big',
].join('|');

/**
 * Pre-process text to auto-wrap undelimited LaTeX expressions in $...$
 * This handles AI outputs that contain LaTeX commands without dollar signs.
 */
const autoWrapLatex = (text: string): string => {
  // Don't process text that already has proper delimiters
  // We need to protect already-delimited expressions first

  // Step 1: Extract already-delimited math to protect them
  const placeholders: string[] = [];
  let processed = text;

  // Protect $$...$$ blocks
  processed = processed.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    placeholders.push(match);
    return `%%MATH_PLACEHOLDER_${placeholders.length - 1}%%`;
  });

  // Protect $...$ inline
  processed = processed.replace(/\$[^\$\n]+?\$/g, (match) => {
    placeholders.push(match);
    return `%%MATH_PLACEHOLDER_${placeholders.length - 1}%%`;
  });

  // Step 2: Auto-detect and wrap standalone LaTeX expressions
  // Pattern: sequences containing LaTeX commands like \times, \cdot, \frac{}{}, etc.
  const latexCommandPattern = new RegExp(
    `([^\\$%]|^)((?:[A-Za-z0-9(){}\\[\\]\\s!,.:=+\\-*/^_|])*(?:${LATEX_COMMANDS})(?:[A-Za-z0-9(){}\\[\\]\\s!,.:=+\\-*/^_|])*)`,
    'g'
  );
  processed = processed.replace(latexCommandPattern, (match, prefix, latexExpr) => {
    return `${prefix}$${latexExpr.trim()}$`;
  });

  // Step 3: Detect patterns like C_n^k, C_{n}^{k}, A_n^k, P_n^k (combinatorics notation)
  processed = processed.replace(
    /(?<!\$)([CAP])_\{?(\d+)\}?\^?\{?(\d+)\}?(?!\$)/g,
    (match) => `$${match}$`
  );

  // Step 4: Detect patterns like n! (factorial) combined with operators
  // e.g. "= 16!" or "8! \cdot 8!"
  // Only wrap if it contains special math notation
  processed = processed.replace(
    /(?<!\$)((?:\d+!?\s*[=<>+\-*/]\s*)*\d+!)(?!\$)/g,
    (match) => {
      // Only wrap if it's a standalone factorial expression, not just a number with "!"
      if (match.includes('!') && (match.includes('=') || match.includes('*') || match.includes('+'))) {
        return `$${match}$`;
      }
      return match;
    }
  );

  // Step 5: Restore protected expressions
  processed = processed.replace(/%%MATH_PLACEHOLDER_(\d+)%%/g, (_match, idx) => {
    return placeholders[parseInt(idx)];
  });

  // Step 6: Clean up double-wrapped expressions (e.g. $$...$$ inside $...$)
  processed = processed.replace(/\$\$\$/g, '$$');

  return processed;
};

// ============================================================
// Markdown to HTML converter
// ============================================================

/**
 * Process inline formatting: LaTeX, bold, italic, inline code
 */
const processInline = (text: string): string => {
  // Auto-wrap undelimited LaTeX first
  text = autoWrapLatex(text);

  // Process display math $$...$$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
    return `<div class="my-2 text-center">${renderLatex(latex, true)}</div>`;
  });

  // Process inline math $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, latex) => {
    return renderLatex(latex, false);
  });

  // Inline code `...`
  text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  // Bold **...**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic *...*
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  return text;
};

/**
 * Convert markdown text to formatted HTML
 */
const markdownToHtml = (text: string): string => {
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let codeContent = '';
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code blocks ```...```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre class="bg-slate-800 text-slate-100 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono"><code>${escapeHtml(codeContent.trim())}</code></pre>`;
        inCodeBlock = false;
        codeContent = '';
        codeLang = '';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
        inCodeBlock = true;
        codeLang = line.trim().slice(3);
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // Horizontal rule ---
    if (line.trim().match(/^[-*_]{3,}$/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += '<hr class="my-4 border-slate-200">';
      continue;
    }

    // Headings
    if (line.match(/^#{1,6}\s/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      const level = line.match(/^(#+)/)?.[1].length || 1;
      const content = line.replace(/^#+\s*/, '');
      const sizes: Record<number, string> = {
        1: 'text-xl font-bold mt-5 mb-2',
        2: 'text-lg font-bold mt-4 mb-2',
        3: 'text-base font-bold mt-3 mb-1',
        4: 'text-sm font-bold mt-2 mb-1',
        5: 'text-sm font-semibold mt-2 mb-1',
        6: 'text-xs font-semibold mt-1 mb-1',
      };
      html += `<div class="${sizes[level] || sizes[3]}">${processInline(content)}</div>`;
      continue;
    }

    // Unordered list items (- or *)
    if (line.match(/^\s*[-*]\s/)) {
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (!inList) { html += '<ul class="list-disc list-inside space-y-1 my-2 pl-2">'; inList = true; }
      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      const content = line.replace(/^\s*[-*]\s/, '');
      const ml = indent > 2 ? ' ml-4' : '';
      html += `<li class="${ml}">${processInline(content)}</li>`;
      continue;
    }

    // Ordered list items (1. 2. 3.)
    if (line.match(/^\s*\d+\.\s/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (!inOrderedList) { html += '<ol class="list-decimal list-inside space-y-1 my-2 pl-2">'; inOrderedList = true; }
      const content = line.replace(/^\s*\d+\.\s/, '');
      html += `<li>${processInline(content)}</li>`;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      const content = line.replace(/^>\s*/, '');
      html += `<blockquote class="border-l-4 border-blue-400 pl-4 py-1 my-2 text-slate-600 bg-blue-50 rounded-r">${processInline(content)}</blockquote>`;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += '<div class="h-2"></div>';
      continue;
    }

    // Regular paragraph
    if (inList) { html += '</ul>'; inList = false; }
    if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
    html += `<p class="my-1 leading-relaxed">${processInline(line)}</p>`;
  }

  // Close any open lists
  if (inList) html += '</ul>';
  if (inOrderedList) html += '</ol>';
  if (inCodeBlock) {
    html += `<pre class="bg-slate-800 text-slate-100 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono"><code>${escapeHtml(codeContent.trim())}</code></pre>`;
  }

  return html;
};

// ============================================================
// Component
// ============================================================

const MathRenderer: React.FC<MathRendererProps> = ({ content, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [katexReady, setKatexReady] = useState(!!window.katex);

  useEffect(() => {
    if (!window.katex) {
      waitForKatex().then(() => setKatexReady(true));
    }
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const html = markdownToHtml(content);
      containerRef.current.innerHTML = html;
    }
  }, [content, katexReady]);

  return (
    <div
      ref={containerRef}
      className={`${className || ''} math-content prose-sm`}
    />
  );
};

export default MathRenderer;
