/**
 * AIChatWidget - Floating, draggable AI assistant bubble overlay.
 * Hovers across every section of the Data Suite, draggable to any corner.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Send,
  Trash2,
  X,
  Copy,
  Check,
  Code2,
  Terminal,
  AlertCircle,
  Bot,
  MessageSquare,
  GripHorizontal,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { askQuestion } from '../../services/api';

// ─── Suggested questions ─────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'What are the key patterns in this dataset?',
  'Which columns have the most missing data?',
  'What are the top correlations?',
  'Suggest which column to use as target for ML',
];

// ─── Typing indicator ────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
  >
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'var(--accent-primary-light)',
        color: 'var(--accent-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Sparkles size={12} />
    </div>
    <div
      style={{
        background: 'var(--bg-surface-raised)',
        border: '1px solid var(--border-default)',
        borderRadius: '0 10px 10px 10px',
        padding: '10px 14px',
        display: 'flex',
        gap: '5px',
        alignItems: 'center',
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', display: 'block' }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
    </div>
  </motion.div>
);

// ─── Code message renderer ──────────────────────────────────────────────────

interface CodeIssue {
  type?: string;
  message?: string;
  line?: number | null;
  solution?: string;
}

const CodeMessage: React.FC<{ content: string; errors?: CodeIssue[]; fixedCode?: string | null; executionOutput?: string | null }> = ({
  content,
  errors = [],
  fixedCode,
  executionOutput,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedFixed, setCopiedFixed] = useState(false);

  const parts = content.split(/(```[\s\S]*?```)/g).filter(Boolean);

  const handleCopy = async (code: string, key: 'copied' | 'copiedFixed') => {
    try {
      await navigator.clipboard.writeText(code);
      if (key === 'copied') setCopied(true);
      else setCopiedFixed(true);
      setTimeout(() => {
        if (key === 'copied') setCopied(false);
        else setCopiedFixed(false);
      }, 1500);
    } catch {
      toast.error('Failed to copy code.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {errors.length > 0 && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <AlertCircle size={13} color="var(--status-warning)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--status-warning)' }}>
              {errors.length} {errors.length === 1 ? 'Issue' : 'Issues'} Found in Generated Code
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {errors.map((err, i) => (
              <div key={i} style={{ fontSize: '0.74rem', lineHeight: 1.45 }}>
                <div style={{ color: 'var(--status-danger)' }}>
                  <strong>{err.type || 'Error'}</strong>
                  {err.line ? ` (line ${err.line})` : ''}: {err.message}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '1px' }}>
                  <strong style={{ color: 'var(--status-warning)' }}>Solution:</strong> {err.solution}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fixedCode && (
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            overflow: 'hidden',
            margin: '4px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(16, 185, 129, 0.08)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--status-success)',
              }}
            >
              <Check size={12} />
              Auto-fixed Version
            </span>
            <button
              onClick={() => handleCopy(fixedCode, 'copiedFixed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              {copiedFixed ? <Check size={11} style={{ color: 'var(--status-success)' }} /> : <Copy size={11} />}
              {copiedFixed ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '10px 12px',
              overflowX: 'auto',
              fontSize: '0.76rem',
              lineHeight: 1.55,
              color: '#e6edf3',
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
              whiteSpace: 'pre',
            }}
          >
            {fixedCode}
          </pre>
        </div>
      )}

      {executionOutput && (
        <div
          style={{
            background: '#0b0f14',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            overflow: 'hidden',
            margin: '4px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              background: 'rgba(16, 185, 129, 0.08)',
              borderBottom: '1px solid var(--border-default)',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--status-success)',
            }}
          >
            <Terminal size={12} />
            Execution Output (real dataset)
          </div>
          <pre
            style={{
              margin: 0,
              padding: '10px 12px',
              overflowX: 'auto',
              fontSize: '0.76rem',
              lineHeight: 1.55,
              color: '#9fe8b5',
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
              whiteSpace: 'pre',
            }}
          >
            {executionOutput}
          </pre>
        </div>
      )}

      {parts.map((part, i) => {
        const fenceMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
        if (fenceMatch) {
          const [, lang, code] = fenceMatch;
          return (
            <div
              key={i}
              style={{
                background: '#0d1117',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                overflow: 'hidden',
                margin: '4px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderBottom: '1px solid var(--border-default)',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Code2 size={12} />
                  {lang || 'python'}
                </span>
                <button
                  onClick={() => handleCopy(code.trim(), 'copied')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copied ? <Check size={11} style={{ color: 'var(--status-success)' }} /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  overflowX: 'auto',
                  fontSize: '0.76rem',
                  lineHeight: 1.55,
                  color: '#e6edf3',
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
                  whiteSpace: 'pre',
                }}
              >
                {code}
              </pre>
            </div>
          );
        }
        return (
          <span
            key={i}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)' }}
          >
            {part}
          </span>
        );
      })}
    </div>
  );
};

// ─── Main Widget ─────────────────────────────────────────────────────────────

const AIChatWidget: React.FC = () => {
  const { activeDataset, chatHistory, addChatMessage, clearChat } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [chatHistory, isAiResponding, isOpen, scrollToBottom]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
      setHasUnread(false);
    }
  }, [isOpen]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || !activeDataset || isAiResponding) return;

    addChatMessage('user', question);
    setChatInput('');
    setIsAiResponding(true);

    try {
      const response = (await askQuestion(activeDataset.id, question)) as any;
      let displayText: string = response.answer || '';
      let debugInfo;
      if (response.code) {
        const code = response.code.replace(/```/g, '');
        displayText = `Here's the Python code to ${question.replace(/\?$/, '').toLowerCase()}:\n\n\`\`\`python\n${code}\n\`\`\`\n\n${response.explanation || ''}`;
        if (response.code_errors && response.code_errors.length > 0) {
          debugInfo = {
            code_errors: response.code_errors,
            code_fixed: response.code_fixed || null,
          };
        }
        if (response.execution_output) {
          debugInfo = { ...(debugInfo || {}), execution_output: response.execution_output };
        }
      }
      addChatMessage('ai', displayText, debugInfo);
    } catch {
      toast.error('Failed to get AI response. Please try again.');
      addChatMessage('ai', 'Sorry, I encountered an error processing your question. Please try again.');
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput);
    }
  };

  const handleSuggestion = (q: string) => {
    sendMessage(q);
  };

  const handleToggle = () => {
    if (!activeDataset) {
      toast('Please select a dataset first to chat with the AI assistant.', {
        icon: '💡',
      });
      return;
    }
    setIsOpen(prev => !prev);
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 1000,
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {/* ── Chat Panel ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-widget-window"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              pointerEvents: 'auto',
              width: isMobile ? '100%' : 460,
              maxWidth: isMobile ? '100%' : 'calc(100vw - 32px)',
              height: isMobile ? '100%' : 640,
              maxHeight: isMobile ? '100%' : 'calc(100vh - 120px)',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-surface)',
              border: isMobile ? 'none' : '1px solid var(--border-default)',
              borderRadius: isMobile ? 0 : '16px',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderBottom: '1px solid var(--border-default)',
                background: 'var(--bg-surface)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  <Bot size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    AI Data Copilot
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {activeDataset ? `Analyzing: ${activeDataset.filename}` : 'No dataset selected'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={clearChat}
                  title="Clear chat history"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: 'var(--bg-canvas)',
              }}
            >
              {chatHistory.length === 0 && !isAiResponding ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: 'var(--accent-primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <Sparkles size={22} color="var(--accent-primary)" />
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center' }}>
                    Ask questions about trends, distributions, or predictive features
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '6px' }}>
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestion(q)}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-default)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {chatHistory.map((msg, i) => (
                      <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        {msg.role === 'ai' && (
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'var(--accent-primary-light)',
                              color: 'var(--accent-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <Sparkles size={12} />
                          </div>
                        )}
                        <div
                          style={{
                            maxWidth: '82%',
                            padding: '10px 14px',
                            borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
                            background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                            border: msg.role === 'user' ? 'none' : '1px solid var(--border-default)',
                            color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                            fontSize: '0.82rem',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {msg.role === 'ai' ? (
                            <CodeMessage
                              content={msg.content}
                              errors={msg.debug?.code_errors || []}
                              fixedCode={msg.debug?.code_fixed}
                              executionOutput={msg.debug?.execution_output}
                            />
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                          marginLeft: msg.role === 'ai' ? '30px' : 0,
                        }}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                    ))}
                  </AnimatePresence>

                  <AnimatePresence>{isAiResponding && <TypingIndicator />}</AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div
              style={{
                padding: '12px 14px',
                borderTop: '1px solid var(--border-default)',
                flexShrink: 0,
                background: 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-end',
                  background: 'var(--bg-canvas)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  padding: '8px 10px',
                }}
              >
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your data... (Enter to send)"
                  disabled={isAiResponding}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => sendMessage(chatInput)}
                  disabled={!chatInput.trim() || isAiResponding}
                  className="btn-primary"
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    opacity: chatInput.trim() && !isAiResponding ? 1 : 0.4,
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Bubble Button ─────────────────────────────────────────── */}
      <motion.button
        drag={!isMobile}
        dragMomentum={false}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className="chat-widget-button"
        style={{
          pointerEvents: 'auto',
          width: isMobile ? 52 : 60,
          height: isMobile ? 52 : 60,
          borderRadius: '50%',
          border: 'none',
          cursor: isMobile ? 'pointer' : 'grab',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45), 0 2px 8px rgba(0, 0, 0, 0.15)',
          color: '#ffffff',
          zIndex: 1001,
          touchAction: 'none',
        }}
        onDragStart={() => {
          if (isOpen) setIsOpen(false);
        }}
      >
        {/* Pulsing ring */}
        <motion.span
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '2px solid rgba(99, 102, 241, 0.4)',
          }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Inner glow */}
        <motion.span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 60%)',
          }}
        />
        {/* Icon */}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}
            >
              <X size={26} />
            </motion.span>
          ) : (
            <motion.span
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}
            >
              <Bot size={28} />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Unread dot */}
        {hasUnread && !isOpen && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid #ffffff',
              zIndex: 3,
            }}
          />
        )}
      </motion.button>
    </div>
  );
};

export default AIChatWidget;