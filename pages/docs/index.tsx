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
import { Layout } from '../../components/Layout';
import { useRouter } from 'next/router';

interface DocsPageProps {
  content: string;
  headings: Array<{ id: string; text: string; level: number }>;
}

const NAV_ITEMS = [
  { path: '/docs', label: 'Overview' },
  { path: '/docs/integration', label: 'Integration' },
  { path: '/docs/api', label: 'API' },
  { path: '/docs/traits', label: 'Traits' },
  { path: '/docs/security', label: 'Security' },
]

export default function DocsIndexPage({ content, headings }: DocsPageProps) {
  const router = useRouter();
  const currentPath = (router.asPath ?? router.pathname ?? '').split('?')[0];
  const linkBaseStyle = {
    color: '#0052FF',
    textDecoration: 'underline',
    fontWeight: 500,
  } as const;

  return (
    <Layout title="Base Verify Documentation">
      <Head>
        <title>Base Verify Integration Guide</title>
        <meta name="description" content="Complete guide to integrating Base Verify into your mini app" />
      </Head>

      <style jsx global>{`
        html {
          scroll-padding-top: 100px;
        }
        
        @media (max-width: 1023px) {
          .docs-sidebar {
            display: none !important;
          }
          .docs-container {
            flex-direction: column !important;
          }
        }
      `}</style>

      <div className="docs-container" style={{
        display: 'flex',
        gap: '2rem',
        margin: '-1.5rem -1rem',
        padding: '1.5rem 1rem'
      }}>
        {/* Navigation Sidebar */}
        <aside className="docs-sidebar" style={{
            width: '200px',
            flexShrink: 0,
            position: 'sticky',
            top: '1rem',
            height: 'fit-content',
            maxHeight: 'calc(100vh - 8rem)',
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
              Docs
            </h3>
            <nav>
              {NAV_ITEMS.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => router.push(item.path)}
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: isActive ? '#0052FF' : '#666',
                      textDecoration: 'none',
                      marginBottom: '0.75rem',
                      fontWeight: isActive ? '600' : '400',
                      transition: 'color 0.2s ease',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isActive ? '#0052FF' : '#666';
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

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
                            paddingLeft: '1.5rem',
                            listStyleType: 'disc'
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
                            paddingLeft: '1.5rem',
                            listStyleType: 'decimal'
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
                      a: ({ node, href, children, ...props }) => {
                        if (href?.startsWith('/')) {
                          return (
                            <button
                              type="button"
                              onClick={() => router.push(href)}
                              style={{
                                ...linkBaseStyle,
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontSize: 'inherit',
                                textAlign: 'left',
                              }}
                            >
                              {children}
                            </button>
                          );
                        }

                        return (
                          <a
                            style={linkBaseStyle}
                            target={href?.startsWith('#') ? undefined : '_blank'}
                            rel={href?.startsWith('#') ? undefined : 'noopener noreferrer'}
                            href={href}
                            {...props}
                          >
                            {children}
                          </a>
                        );
                      },
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
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<DocsPageProps> = async () => {
  const filePath = join(process.cwd(), 'docs', 'index.md');
  const content = readFileSync(filePath, 'utf-8');

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ id: string; text: string; level: number }> = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/\{#.*?\}/g, '').trim();
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
