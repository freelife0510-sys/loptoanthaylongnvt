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

// Wait for KaTeX
const waitForKatex = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.katex) { resolve(); return; }
    let attempts = 0;
    const interval = setInterval(() => {
      if (window.katex || ++attempts > 50) { clearInterval(interval); resolve(); }
    }, 100);
  });
};

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ============================================================
// KaTeX Rendering
// ============================================================

const renderKatex = (latex: string, displayMode: boolean): string => {
  if (!window.katex) return `<code>${escapeHtml(latex)}</code>`;
  try {
    return window.katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return `<code>${escapeHtml(latex)}</code>`;
  }
};

// ============================================================
// STEP 1: Normalize raw LaTeX — wrap undelimited \commands in $...$
// This is the KEY fix. Uses simple, reliable line-by-line scanning.
// ============================================================

// All known LaTeX command names
const KNOWN_COMMANDS = new Set([
  'times', 'cdot', 'div', 'pm', 'mp', 'frac', 'dfrac', 'tfrac', 'sqrt', 'sum', 'prod',
  'int', 'iint', 'oint', 'lim', 'infty', 'partial', 'nabla',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta',
  'theta', 'vartheta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho',
  'sigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'le', 'ge', 'ne',
  'subset', 'supset', 'subseteq', 'supseteq', 'in', 'notin',
  'cup', 'cap', 'emptyset', 'forall', 'exists',
  'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow', 'implies', 'iff', 'to', 'mapsto',
  'dots', 'ldots', 'cdots', 'vdots', 'ddots',
  'overline', 'underline', 'hat', 'vec', 'bar', 'tilde',
  'log', 'ln', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'text', 'mathrm', 'mathbf', 'mathbb', 'mathcal',
  'binom', 'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
  'oplus', 'otimes', 'angle', 'triangle', 'perp', 'parallel',
  'nCr', 'nPr', 'displaystyle', 'quad', 'qquad',
]);

/**
 * Normalize text: find raw \command patterns and wrap them in $...$
 * Strategy: scan the line, when we find \commandname that isn't already inside $...$,
 * we expand left/right to capture the full math expression.
 */
const normalizeLatex = (text: string): string => {
  // Protect existing $...$ and $$...$$ delimited expressions
  const protected_: { placeholder: string; original: string }[] = [];
  let normalized = text;

  // Protect $$...$$
  normalized = normalized.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const ph = `\x01P${protected_.length}\x01`;
    protected_.push({ placeholder: ph, original: match });
    return ph;
  });

  // Protect $...$
  normalized = normalized.replace(/\$([^\$\n]+?)\$/g, (match) => {
    const ph = `\x01P${protected_.length}\x01`;
    protected_.push({ placeholder: ph, original: match });
    return ph;
  });

  // Now find all \commandname patterns that are NOT protected
  // For each, expand to capture the full math expression around it
  normalized = normalized.replace(
    /\\([a-zA-Z]+)/g,
    (match, cmdName, offset) => {
      // Check if it's inside a protected placeholder
      for (const p of protected_) {
        if (normalized.indexOf(p.placeholder) !== -1) {
          const phIdx = normalized.indexOf(p.placeholder);
          if (offset >= phIdx && offset < phIdx + p.placeholder.length) {
            return match; // inside protected, skip
          }
        }
      }

      // Check if it's a known LaTeX command
      if (!KNOWN_COMMANDS.has(cmdName)) return match;

      // It's a raw LaTeX command — we'll mark it for wrapping
      return `\x02${match}\x02`;
    }
  );

  // Now expand marked regions: find segments containing \x02...\x02 markers
  // and wrap the entire math-containing segment in $...$
  normalized = expandAndWrapMarkedSegments(normalized);

  // Restore protected expressions
  for (const p of protected_) {
    normalized = normalized.replace(p.placeholder, p.original);
  }

  return normalized;
};

/**
 * Find segments containing \x02 markers and expand to capture full math expressions,
 * then wrap in $...$
 */
const expandAndWrapMarkedSegments = (text: string): string => {
  if (!text.includes('\x02')) return text;

  let result = '';
  let i = 0;

  while (i < text.length) {
    if (text[i] === '\x02') {
      // Found a marked segment — expand left and right to capture full expression

      // Expand left: go back to find the start of the math expression
      let start = result.length;
      // Walk backwards through already-written result
      while (start > 0) {
        const ch = result[start - 1];
        if (/[0-9a-zA-Z_^{}()|[\]+\-*/=<>!,. ]/.test(ch)) {
          // Stop at sentence boundaries
          if (ch === ' ' && start >= 2 && (result[start - 2] === '.' || result[start - 2] === ':' || result[start - 2] === '。')) break;
          if (ch === ' ' && start >= 2 && result[start - 2] === ' ') break; // double space
          start--;
        } else if (ch === '\x01') {
          break; // don't cross protected placeholders
        } else {
          break;
        }
      }

      const leftPart = result.slice(start);
      result = result.slice(0, start);

      // Now collect the marked segment and expand right
      let rightPart = '';
      // Skip the opening marker
      i++;

      let braceDepth = 0;
      while (i < text.length) {
        if (text[i] === '\x02') {
          // End of a marked command, but continue to capture more math
          i++;
          continue;
        }

        if (text[i] === '\x01') break; // protected placeholder boundary

        if (text[i] === '{') { braceDepth++; rightPart += text[i]; i++; continue; }
        if (text[i] === '}') {
          if (braceDepth > 0) { braceDepth--; rightPart += text[i]; i++; continue; }
          break;
        }
        if (braceDepth > 0) { rightPart += text[i]; i++; continue; }

        // Accept math characters
        if (/[0-9a-zA-Z_^{}()|[\]\\+\-*/=<>!,.]/.test(text[i])) {
          // Check for another \command
          if (text[i] === '\\' && i + 1 < text.length && /[a-zA-Z]/.test(text[i + 1])) {
            rightPart += text[i];
            i++;
            continue;
          }
          rightPart += text[i];
          i++;
          continue;
        }

        // Accept spaces within math (but stop at double space or line end)
        if (text[i] === ' ') {
          let lookahead = i + 1;
          while (lookahead < text.length && text[lookahead] === ' ') lookahead++;
          if (lookahead > i + 1) break; // double space = boundary
          if (lookahead < text.length && /[0-9a-zA-Z_^{}()|[\]\\+\-*/=<>!]/.test(text[lookahead])) {
            rightPart += text[i];
            i++;
            continue;
          }
          break;
        }

        break;
      }

      // Combine and trim
      let mathExpr = (leftPart + rightPart).trim();
      // Remove trailing punctuation
      mathExpr = mathExpr.replace(/[.,;:!?\s]+$/, '');
      // Remove \x02 markers that might still be in the expression  
      mathExpr = mathExpr.replace(/\x02/g, '');

      if (mathExpr) {
        result += `$${mathExpr}$`;
      }

      // Add back any trailing punctuation/space that was removed
      const afterMath = (leftPart + rightPart).match(/([.,;:!?\s]+)$/);
      if (afterMath) {
        result += afterMath[1];
      }
    } else {
      result += text[i];
      i++;
    }
  }

  // Clean up any remaining markers
  result = result.replace(/\x02/g, '');

  return result;
};

// ============================================================
// STEP 2: Markdown to HTML with LaTeX rendering
// ============================================================

/**
 * Process inline: LaTeX + bold + italic + code
 */
const processInline = (text: string): string => {
  // First normalize raw LaTeX
  text = normalizeLatex(text);

  // Render display math $$...$$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) =>
    `<div class="my-2 text-center">${renderKatex(latex, true)}</div>`
  );

  // Render inline math $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, latex) =>
    renderKatex(latex, false)
  );

  // Inline code
  text = text.replace(/`([^`]+)`/g,
    '<code class="bg-slate-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
  );

  // Bold **...**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic *...*
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  return text;
};

/**
 * Convert full markdown text to HTML
 */
const markdownToHtml = (text: string): string => {
  const lines = text.split('\n');
  let html = '';
  let inUL = false, inOL = false, inCode = false, codeContent = '';

  for (const line of lines) {
    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html += `<pre class="bg-slate-800 text-slate-100 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono"><code>${escapeHtml(codeContent.trim())}</code></pre>`;
        inCode = false; codeContent = '';
      } else {
        closeLists();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeContent += line + '\n'; continue; }

    // HR
    if (line.trim().match(/^[-*_]{3,}$/)) { closeLists(); html += '<hr class="my-4 border-slate-200">'; continue; }

    // Headings
    const hm = line.match(/^(#{1,6})\s+(.*)/);
    if (hm) {
      closeLists();
      const lvl = hm[1].length;
      const cls = ['', 'text-xl font-bold mt-5 mb-2', 'text-lg font-bold mt-4 mb-2', 'text-base font-bold mt-3 mb-1.5', 'text-sm font-bold mt-2 mb-1', 'text-sm font-semibold mt-2 mb-1', 'text-xs font-semibold mt-1'][lvl] || 'font-bold';
      html += `<div class="${cls}">${processInline(hm[2])}</div>`;
      continue;
    }

    // Unordered list
    if (line.match(/^\s*[-*+]\s/)) {
      if (inOL) { html += '</ol>'; inOL = false; }
      if (!inUL) { html += '<ul class="list-disc list-inside space-y-1 my-2 pl-2">'; inUL = true; }
      const c = line.replace(/^\s*[-*+]\s/, '');
      const ml = (line.match(/^(\s*)/)?.[1].length || 0) > 2 ? ' ml-4' : '';
      html += `<li class="${ml}">${processInline(c)}</li>`;
      continue;
    }

    // Ordered list
    if (line.match(/^\s*\d+[.)]\s/)) {
      if (inUL) { html += '</ul>'; inUL = false; }
      if (!inOL) { html += '<ol class="list-decimal list-inside space-y-1 my-2 pl-2">'; inOL = true; }
      const c = line.replace(/^\s*\d+[.)]\s/, '');
      html += `<li>${processInline(c)}</li>`;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      closeLists();
      const c = line.replace(/^>\s*/, '');
      html += `<blockquote class="border-l-4 border-blue-300 pl-4 py-1 my-2 text-slate-600 bg-blue-50/50 rounded-r">${processInline(c)}</blockquote>`;
      continue;
    }

    // Empty
    if (line.trim() === '') { closeLists(); html += '<div class="h-2"></div>'; continue; }

    // Paragraph
    closeLists();
    html += `<p class="my-1 leading-relaxed">${processInline(line)}</p>`;
  }

  closeLists();
  if (inCode) html += `<pre class="bg-slate-800 text-slate-100 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono"><code>${escapeHtml(codeContent.trim())}</code></pre>`;
  return html;

  function closeLists() {
    if (inUL) { html += '</ul>'; inUL = false; }
    if (inOL) { html += '</ol>'; inOL = false; }
  }
};

// ============================================================
// Component
// ============================================================

const MathRenderer: React.FC<MathRendererProps> = ({ content, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(!!window.katex);

  useEffect(() => {
    if (!window.katex) waitForKatex().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = markdownToHtml(content);
    }
  }, [content, ready]);

  return <div ref={ref} className={`${className || ''} math-content`} />;
};

export default MathRenderer;
