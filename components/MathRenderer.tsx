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

// Wait for KaTeX to be available
const waitForKatex = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.katex) { resolve(); return; }
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

// Render LaTeX to HTML via KaTeX
const renderLatex = (latex: string, displayMode: boolean): string => {
  if (!window.katex) return `<span class="font-mono text-sm bg-slate-100 px-1 rounded">${escapeHtml(latex)}</span>`;
  try {
    return window.katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return `<span class="font-mono text-sm bg-slate-100 px-1 rounded">${escapeHtml(latex)}</span>`;
  }
};

const escapeHtml = (text: string): string => {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// ============================================================
// COMPREHENSIVE LaTeX auto-wrapping
// Strategy: Find any segment that contains LaTeX commands
// and wrap the ENTIRE math expression in $...$
// ============================================================

/**
 * Pre-process text to find and wrap ALL undelimited LaTeX expressions.
 * Uses a character-by-character scanner for reliability.
 */
const autoWrapLatex = (text: string): string => {
  // Step 1: Protect already-delimited math
  const placeholders: string[] = [];
  let processed = text;

  // Protect $$...$$ blocks
  processed = processed.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    placeholders.push(match);
    return `\x00MATH${placeholders.length - 1}\x00`;
  });

  // Protect $...$ inline (but not empty $$ or escaped \$)
  processed = processed.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (match) => {
    placeholders.push(match);
    return `\x00MATH${placeholders.length - 1}\x00`;
  });

  // Step 2: Find and wrap raw LaTeX expressions
  // Look for patterns that contain backslash commands
  processed = wrapBackslashExpressions(processed);

  // Step 3: Find C/A/P combinatorics notation: C_n^k, C_{n}^{k}
  processed = processed.replace(
    /(?<!\x00)(?<![a-zA-Z])([CAP])_(\{[^}]+\}|\d+)\^(\{[^}]+\}|\d+)/g,
    (_m, letter, sub, sup) => `$${letter}_${sub}^${sup}$`
  );

  // Also: C_n^k without braces
  processed = processed.replace(
    /(?<!\x00)(?<![a-zA-Z$])([CAP])_(\d+)\^(\d+)(?![a-zA-Z])/g,
    (_m, letter, sub, sup) => `$${letter}_{${sub}}^{${sup}}$`
  );

  // Step 4: Restore protected expressions
  processed = processed.replace(/\x00MATH(\d+)\x00/g, (_match, idx) => {
    return placeholders[parseInt(idx)];
  });

  return processed;
};

/**
 * Find segments containing \command patterns and wrap them in $...$
 */
const wrapBackslashExpressions = (text: string): string => {
  // Split by lines to process each line
  return text.split('\n').map(line => wrapBackslashInLine(line)).join('\n');
};

/**
 * Process a single line to find and wrap LaTeX expressions containing \commands
 */
const wrapBackslashInLine = (line: string): string => {
  // Known LaTeX commands to detect
  const latexCommands = new Set([
    'times', 'cdot', 'div', 'pm', 'mp', 'ast', 'star', 'circ',
    'frac', 'dfrac', 'tfrac', 'sqrt', 'cbrt', 'root',
    'sum', 'prod', 'int', 'iint', 'iiint', 'oint', 'lim',
    'infty', 'partial', 'nabla', 'hbar',
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
    'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa',
    'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau',
    'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi',
    'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
    'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'simeq',
    'le', 'ge', 'ne', 'lt', 'gt', 'not',
    'subset', 'supset', 'subseteq', 'supseteq', 'in', 'notin', 'ni',
    'cup', 'cap', 'setminus', 'emptyset', 'varnothing',
    'forall', 'exists', 'nexists',
    'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
    'leftrightarrow', 'Leftrightarrow', 'to', 'gets',
    'implies', 'iff', 'mapsto',
    'dots', 'ldots', 'cdots', 'vdots', 'ddots',
    'overline', 'underline', 'hat', 'vec', 'bar', 'tilde', 'dot', 'ddot',
    'log', 'ln', 'exp', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
    'text', 'textbf', 'textit', 'mathrm', 'mathbf', 'mathit',
    'mathbb', 'mathcal', 'mathfrak', 'mathsf',
    'binom', 'choose', 'pmatrix', 'bmatrix', 'vmatrix',
    'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
    'quad', 'qquad', 'space', 'negspace',
    'oplus', 'otimes', 'odot', 'wedge', 'vee',
    'angle', 'triangle', 'perp', 'parallel',
    'nCr', 'nPr',
  ]);

  let result = '';
  let i = 0;

  while (i < line.length) {
    // Skip protected placeholders
    if (line[i] === '\x00') {
      const end = line.indexOf('\x00', i + 1);
      if (end !== -1) {
        result += line.slice(i, end + 1);
        i = end + 1;
        continue;
      }
    }

    // Check for backslash followed by a letter
    if (line[i] === '\\') {
      // Extract the command name
      let cmdEnd = i + 1;
      while (cmdEnd < line.length && /[a-zA-Z]/.test(line[cmdEnd])) {
        cmdEnd++;
      }
      const cmdName = line.slice(i + 1, cmdEnd);

      if (cmdName && latexCommands.has(cmdName)) {
        // Found a LaTeX command! Now expand to find the full math expression.
        const { expr, endIdx } = extractMathExpression(line, i);
        result += `$${expr}$`;
        i = endIdx;
        continue;
      }
    }

    result += line[i];
    i++;
  }

  return result;
};

/**
 * Starting from a \command position, expand backwards and forwards
 * to capture the full math expression.
 */
const extractMathExpression = (line: string, backslashPos: number): { expr: string; endIdx: number } => {
  // Characters that can be part of a math expression
  const mathChars = /[0-9a-zA-Z_^{}()|[\]\\+\-*/=<>!.,;:' ]/;

  // Expand backwards from backslash to find start of math expression
  let start = backslashPos;
  while (start > 0) {
    const prev = line[start - 1];
    // Include digits, letters (for variable names), operators, braces, spaces
    if (/[0-9a-zA-Z_^{}()|[\]+\-*/=<>!,. ]/.test(prev)) {
      // But stop at double space or sentence boundaries
      if (prev === ' ' && start >= 2 && line[start - 2] === ' ') break;
      if (prev === '.' && start >= 2 && line[start - 2] === ' ') break; // end of prev sentence
      if (prev === ':' && start >= 2) break;
      start--;
    } else {
      break;
    }
  }

  // Expand forwards from backslash to find end of math expression
  let end = backslashPos;

  // First, skip past the current \command
  end++; // skip backslash
  while (end < line.length && /[a-zA-Z]/.test(line[end])) end++; // skip command name

  // Then continue to capture arguments and more math content
  let braceDepth = 0;
  while (end < line.length) {
    const ch = line[end];

    if (ch === '{') { braceDepth++; end++; continue; }
    if (ch === '}') {
      if (braceDepth > 0) { braceDepth--; end++; continue; }
      else break;
    }
    if (braceDepth > 0) { end++; continue; } // inside braces, accept anything

    // Accept math-related characters
    if (/[0-9a-zA-Z_^()|[\]+\-*/=<>!,.]/.test(ch)) {
      end++;
      continue;
    }

    // Accept another \command
    if (ch === '\\' && end + 1 < line.length && /[a-zA-Z]/.test(line[end + 1])) {
      end++;
      while (end < line.length && /[a-zA-Z]/.test(line[end])) end++;
      continue;
    }

    // Accept spaces between math tokens (but not double spaces)
    if (ch === ' ') {
      // Check if the next non-space char is still math-like
      let lookahead = end + 1;
      while (lookahead < line.length && line[lookahead] === ' ') lookahead++;
      if (lookahead < line.length && /[0-9a-zA-Z_^{}()|[\]\\+\-*/=<>!]/.test(line[lookahead])) {
        end++;
        continue;
      }
      break; // end of math expression
    }

    break;
  }

  // Trim the expression
  let expr = line.slice(start, end).trim();

  // Remove trailing punctuation that shouldn't be in math
  expr = expr.replace(/[.,;:!?]+$/, '');

  // Recalculate end position after trimming
  const actualEnd = start + line.slice(start).indexOf(expr) + expr.length;

  return { expr, endIdx: Math.max(end, actualEnd) };
};


// ============================================================
// Markdown to HTML
// ============================================================

const processInline = (text: string): string => {
  text = autoWrapLatex(text);

  // Display math $$...$$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_m, latex) =>
    `<div class="my-2 text-center">${renderLatex(latex, true)}</div>`
  );

  // Inline math $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (_m, latex) =>
    renderLatex(latex, false)
  );

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  return text;
};

const markdownToHtml = (text: string): string => {
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let codeContent = '';

  for (const line of lines) {
    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre class="bg-slate-800 text-slate-100 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono"><code>${escapeHtml(codeContent.trim())}</code></pre>`;
        inCodeBlock = false; codeContent = '';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeContent += line + '\n'; continue; }

    // Horizontal rule
    if (line.trim().match(/^[-*_]{3,}$/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      html += '<hr class="my-4 border-slate-200">';
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      const level = headingMatch[1].length;
      const sizes: Record<number, string> = {
        1: 'text-xl font-bold mt-5 mb-2',
        2: 'text-lg font-bold mt-4 mb-2',
        3: 'text-base font-bold mt-3 mb-1.5',
        4: 'text-sm font-bold mt-2 mb-1',
        5: 'text-sm font-semibold mt-2 mb-1',
        6: 'text-xs font-semibold mt-1 mb-1',
      };
      html += `<div class="${sizes[level] || sizes[3]}">${processInline(headingMatch[2])}</div>`;
      continue;
    }

    // Unordered list
    if (line.match(/^\s*[-*+]\s/)) {
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (!inList) { html += '<ul class="list-disc list-inside space-y-1 my-2 pl-2">'; inList = true; }
      const indent = (line.match(/^(\s*)/)?.[1].length || 0);
      const content = line.replace(/^\s*[-*+]\s/, '');
      const ml = indent > 2 ? ' ml-4' : '';
      html += `<li class="${ml}">${processInline(content)}</li>`;
      continue;
    }

    // Ordered list
    if (line.match(/^\s*\d+[.)]\s/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (!inOrderedList) { html += '<ol class="list-decimal list-inside space-y-1 my-2 pl-2">'; inOrderedList = true; }
      const content = line.replace(/^\s*\d+[.)]\s/, '');
      html += `<li>${processInline(content)}</li>`;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      const content = line.replace(/^>\s*/, '');
      html += `<blockquote class="border-l-4 border-blue-300 pl-4 py-1 my-2 text-slate-600 bg-blue-50/50 rounded-r">${processInline(content)}</blockquote>`;
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
      containerRef.current.innerHTML = markdownToHtml(content);
    }
  }, [content, katexReady]);

  return (
    <div
      ref={containerRef}
      className={`${className || ''} math-content`}
    />
  );
};

export default MathRenderer;
