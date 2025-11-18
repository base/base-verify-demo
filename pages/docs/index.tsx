import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { GetStaticProps } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';
import Head from 'next/head';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface DocsPageProps {
  content: string;
  headings: Array<{ id: string; text: string; level: number }>;
}

export default function DocsPage({ content, headings }: DocsPageProps) {
  return (
    <>
      <Head>
        <title>Base Verify Integration Guide</title>
        <meta name="description" content="Complete guide to integrating Base Verify into your mini app" />
      </Head>

      <style jsx global>{`
        html {
          scroll-padding-top: 100px;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          padding: '1rem 0',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <a href="/" style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a1a1a',
              textDecoration: 'none'
            }}>
              ← Back
            </a>
          </div>
        </div>

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'flex',
          gap: '2rem'
        }}>
          {/* Table of Contents */}
          <aside style={{
              width: '250px',
              flexShrink: 0,
              position: 'sticky',
              top: '80px',
              height: 'fit-content',
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto',
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
                marginBottom: '1rem'
              }}>
                Contents
              </h3>
              <nav>
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: heading.level === 2 ? '#1a1a1a' : '#666',
                      textDecoration: 'none',
                      marginBottom: '0.5rem',
                      paddingLeft: `${(heading.level - 2) * 1}rem`,
                      fontWeight: heading.level === 2 ? '600' : '400',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = heading.level === 2 ? '#1a1a1a' : '#666';
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </aside>

          {/* Main Content */}
          <main style={{
            flex: 1,
            background: 'white',
            borderRadius: '12px',
            padding: '2.5rem',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            minWidth: 0
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    id={props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      color: '#1a1a1a',
                      marginTop: '0',
                      marginBottom: '1.5rem',
                      lineHeight: '1.2'
                    }}
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    id={props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                    style={{
                      fontSize: '1.875rem',
                      fontWeight: '700',
                      color: '#1a1a1a',
                      marginTop: '2.5rem',
                      marginBottom: '1rem',
                      lineHeight: '1.3'
                    }}
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    id={props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      marginTop: '2rem',
                      marginBottom: '0.75rem',
                      lineHeight: '1.4'
                    }}
                    {...props}
                  />
                ),
                h4: ({ node, ...props }) => (
                  <h4
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      marginTop: '1.5rem',
                      marginBottom: '0.5rem'
                    }}
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    style={{
                      fontSize: '1rem',
                      lineHeight: '1.7',
                      color: '#374151',
                      marginBottom: '1.25rem'
                    }}
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    style={{
                      fontSize: '1rem',
                      lineHeight: '1.7',
                      color: '#374151',
                      marginBottom: '1.25rem',
                      paddingLeft: '1.5rem'
                    }}
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    style={{
                      fontSize: '1rem',
                      lineHeight: '1.7',
                      color: '#374151',
                      marginBottom: '1.25rem',
                      paddingLeft: '1.5rem'
                    }}
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    style={{
                      marginBottom: '0.5rem'
                    }}
                    {...props}
                  />
                ),
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !className;
                  
                  return !isInline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        padding: '1.25rem'
                      }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      style={{
                        background: '#f3f4f6',
                        padding: '0.2em 0.4em',
                        borderRadius: '4px',
                        fontSize: '0.875em',
                        fontFamily: 'monospace',
                        color: '#d97706'
                      }}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ node, ...props }) => (
                  <pre
                    style={{
                      marginBottom: '1.25rem',
                      background: '#1e293b',
                      borderRadius: '8px',
                      overflow: 'auto'
                    }}
                    {...props}
                  />
                ),
                a: ({ node, ...props }) => (
                  <a
                    style={{
                      color: '#0052FF',
                      textDecoration: 'underline',
                      fontWeight: '500'
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                table: ({ node, ...props }) => (
                  <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.875rem',
                        border: '1px solid #e5e7eb'
                      }}
                      {...props}
                    />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead
                    style={{
                      background: '#f9fafb'
                    }}
                    {...props}
                  />
                ),
                th: ({ node, ...props }) => (
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      borderBottom: '2px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb'
                    }}
                    {...props}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: '#374151'
                    }}
                    {...props}
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    style={{
                      borderLeft: '4px solid #0052FF',
                      paddingLeft: '1rem',
                      marginLeft: '0',
                      marginBottom: '1.25rem',
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}
                    {...props}
                  />
                ),
                hr: ({ node, ...props }) => (
                  <div
                    style={{
                      height: '1px',
                      background: '#e5e7eb',
                      margin: '2rem 0',
                      border: 'none',
                      padding: 0
                    }}
                  />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </main>
        </div>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<DocsPageProps> = async () => {
  // Read the markdown file
  const filePath = join(process.cwd(), 'docs.md');
  const content = readFileSync(filePath, 'utf-8');

  // Extract headings for table of contents
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ id: string; text: string; level: number }> = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/\{#.*?\}/g, '').trim(); // Remove anchor tags
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    headings.push({ id, text, level });
  }

  return {
    props: {
      content,
      headings,
    },
  };
};

