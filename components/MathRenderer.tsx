import React, { useEffect, useRef } from 'react';

// We assume KaTeX is loaded via CDN in index.html, giving us access to window.katex
declare global {
  interface Window {
    katex: any;
  }
}

interface MathRendererProps {
  content: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && window.katex) {
      // Simple parser: split by $...$ for inline and $$...$$ for block
      // Note: This is a basic implementation. Robust parsing usually requires a library like 'react-latex-next'
      // but strictly following the "no npm install" environment, we implement a manual DOM renderer.
      
      const element = containerRef.current;
      element.innerHTML = ''; // Clear previous

      // Split by delimiters
      // Regex looks for $$...$$ or $...$
      // Capturing groups allow us to keep the delimiters to know which is which, 
      // or we can just iterate.
      
      const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

      parts.forEach(part => {
        const span = document.createElement('span');
        
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Display Mode
          const math = part.slice(2, -2);
          try {
            window.katex.render(math, span, { displayMode: true, throwOnError: false });
          } catch (e) {
            span.textContent = part;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // Inline Mode
          const math = part.slice(1, -1);
          try {
            window.katex.render(math, span, { displayMode: false, throwOnError: false });
          } catch (e) {
            span.textContent = part;
          }
        } else {
          // Text
          // Handle newlines as <br>
          const textSpan = document.createElement('span');
          // Sanitize simple text to avoid HTML injection
          textSpan.innerText = part; 
          span.appendChild(textSpan);
        }
        element.appendChild(span);
      });
    } else if (containerRef.current) {
        // Fallback if katex not loaded yet
        containerRef.current.innerText = content;
    }
  }, [content]);

  return <div ref={containerRef} className={`${className} whitespace-pre-wrap leading-relaxed`} />;
};

export default MathRenderer;
