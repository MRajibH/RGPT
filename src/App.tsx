import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, Plus, Copy, Check, RefreshCw, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, Brain, Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import './index.css';

const STORAGE_KEY = 'rgpt-data';
const SYSTEM_PROMPT = `You are RGPT, a helpful AI assistant created by Rajib. When someone asks who you are, what you are, or who made you, always respond that you are RGPT, created by Rajib. For more information about your creator, direct them to visit rajib.uk. You are friendly, knowledgeable, and always ready to help.`;
const GREETING: Message = { role: 'ai', content: 'Hello! I am **RGPT**, your personal AI assistant created by **Rajib**. How can I help you today?' };
const OLLAMA_HOST = 'http://localhost:11434';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
}

function getSessionTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser?.content.trim()) return 'New chat';
  return firstUser.content.trim().slice(0, 50) + (firstUser.content.length > 50 ? '…' : '');
}

function loadStored(): { sessions: Session[]; currentSessionId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], currentSessionId: null };
    const data = JSON.parse(raw);
    return {
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      currentSessionId: data.currentSessionId ?? null
    };
  } catch {
    return { sessions: [], currentSessionId: null };
  }
}

function saveStored(sessions: Session[], currentSessionId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentSessionId }));
  } catch (_) {}
}

// Custom R avatar component using the SVG icon
function RAvatar() {
  return (
    <img src="/rgpt.svg" alt="RGPT" className="r-avatar-img" />
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('rgpt-auth') === 'true';
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [sessions, setSessions] = useState<Session[]>(() => loadStored().sessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => loadStored().currentSessionId);
  const [messages, setMessages] = useState<Message[]>(() => {
    const { sessions: s, currentSessionId: cid } = loadStored();
    if (cid) {
      const sess = s.find(s => s.id === cid);
      if (sess?.messages?.length) return sess.messages;
    }
    return [GREETING];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen3:0.6b');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCreatedSessionRef = useRef(false);
  const codeBlockIdRef = useRef(0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    setTimeout(() => {
      if (loginUser === 'rajib' && loginPass === 'rajib') {
        sessionStorage.setItem('rgpt-auth', 'true');
        setIsLoggedIn(true);
      } else {
        setLoginError('Invalid username or password');
      }
      setLoginLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('rgpt-auth');
    setIsLoggedIn(false);
    setLoginUser('');
    setLoginPass('');
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    fetch(`${OLLAMA_HOST}/api/tags`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.models?.length) {
          const names = data.models.map((m: { name: string }) => m.name);
          setModels(names);
          if (!names.includes(selectedModel)) setSelectedModel(names[0] ?? selectedModel);
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((s: Session[], cid: string | null) => {
    saveStored(s, cid);
  }, []);

  useEffect(() => {
    persist(sessions, currentSessionId);
  }, [sessions, currentSessionId, persist]);

  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages } : s));
  }, [currentSessionId, messages]);

  useEffect(() => {
    if (currentSessionId || messages.length <= 2 || hasCreatedSessionRef.current) return;
    const title = getSessionTitle(messages);
    const newSession: Session = { id: `id-${Date.now()}`, title, messages: [...messages] };
    hasCreatedSessionRef.current = true;
    setCurrentSessionId(newSession.id);
    setSessions(prev => [newSession, ...prev]);
  }, [messages, currentSessionId]);

  const handleNewChat = () => {
    hasCreatedSessionRef.current = false;
    if (messages.length > 1) {
      const title = getSessionTitle(messages);
      const newSession: Session = { id: `id-${Date.now()}`, title, messages: [...messages] };
      setSessions(prev => [newSession, ...prev]);
    }
    setMessages([GREETING]);
    setCurrentSessionId(null);
    setInput('');
    setEditingIndex(null);
  };

  const loadSession = (session: Session) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setInput('');
    setEditingIndex(null);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setMessages([GREETING]);
      setCurrentSessionId(null);
      setInput('');
      setEditingIndex(null);
    }
  };

  const runChat = useCallback(async (messagesToSend: Message[]) => {
    const systemMsg = { role: 'system' as const, content: SYSTEM_PROMPT };
    const mapped = messagesToSend.map(m => ({
      role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
      content: m.content
    }));
    const allMessages = [systemMsg, ...mapped];
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selectedModel, messages: allMessages, stream: true })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullResponse += data.message.content;
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1].content = fullResponse;
                return u;
              });
            }
          } catch (_) {}
        }
      }
    }
    return fullResponse;
  }, [selectedModel]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    let nextMessages: Message[];

    if (editingIndex !== null && messages[editingIndex]?.role === 'user') {
      nextMessages = messages.slice(0, editingIndex);
      setEditingIndex(null);
    } else {
      nextMessages = [...messages];
    }

    const userMessage: Message = { role: 'user', content: text };
    nextMessages = [...nextMessages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
      await runChat(nextMessages);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1].content = `**Error:** Failed to connect to Ollama. Ensure Ollama is running and CORS is enabled. ${errMsg}`;
        return u;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserIdx = messages.map((m, i) => m.role === 'user' ? i : -1).filter(i => i >= 0).pop();
    if (lastUserIdx == null || isLoading) return;
    const upTo = messages.slice(0, lastUserIdx);
    const userContent = messages[lastUserIdx].content;
    const toSend = [...upTo, { role: 'user' as const, content: userContent }];
    setMessages([...toSend, { role: 'ai', content: '' }]);
    setInput('');
    setIsLoading(true);
    (async () => {
      try {
        await runChat(toSend);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1].content = `**Error:** ${errMsg}`;
          return u;
        });
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleRetry = () => {
    const last = messages[messages.length - 1];
    if (last?.role !== 'ai' || !last.content.startsWith('**Error:**') || isLoading) return;
    const prevUser = messages.filter(m => m.role === 'user').pop();
    if (!prevUser) return;
    const upTo = messages.slice(0, -1);
    setMessages([...upTo, { role: 'ai', content: '' }]);
    setIsLoading(true);
    (async () => {
      try {
        await runChat(upTo);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1].content = `**Error:** ${errMsg}`;
          return u;
        });
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleEdit = (idx: number) => {
    if (messages[idx]?.role !== 'user') return;
    setInput(messages[idx].content);
    setEditingIndex(idx);
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const lastAi = messages.length - 1 >= 0 && messages[messages.length - 1].role === 'ai';
  const lastContent = lastAi ? messages[messages.length - 1].content : '';
  const isError = lastContent.startsWith('**Error:**');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Parse thinking blocks from content for Qwen 3 style <think>...</think>
  const parseThinkingContent = (content: string): { thinking: string | null; response: string; isThinking: boolean } => {
    if (!content.includes('<think>')) {
      return { thinking: null, response: content, isThinking: false };
    }

    const thinkStart = content.indexOf('<think>');
    const thinkEnd = content.indexOf('</think>');

    if (thinkEnd === -1) {
      // Still thinking — no closing tag yet (streaming)
      const thinkContent = content.slice(thinkStart + 7);
      const beforeThink = content.slice(0, thinkStart);
      return { thinking: thinkContent, response: beforeThink, isThinking: true };
    }

    // Complete thinking block
    const thinkContent = content.slice(thinkStart + 7, thinkEnd);
    const afterThink = content.slice(thinkEnd + 8).trim();
    const beforeThink = content.slice(0, thinkStart);
    return { thinking: thinkContent, response: beforeThink + afterThink, isThinking: false };
  };

  const [collapsedThinking, setCollapsedThinking] = useState<Record<number, boolean>>({});

  const toggleThinking = (idx: number) => {
    setCollapsedThinking(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // --- LOGIN PAGE ---
  if (!isLoggedIn) {
    return (
      <div className="login-page">
        {/* Left side — visual hero */}
        <div className="login-hero">
          <div className="hero-gradient-mesh" />
          <div className="floating-particles">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={`particle particle-${i % 5}`} style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${6 + Math.random() * 8}s`,
              }} />
            ))}
          </div>
          <div className="hero-3d-scene">
            <div className="cube-wrapper">
              <div className="cube">
                <div className="cube-face front"><img src="/rgpt.svg" alt="R" className="cube-icon" /></div>
                <div className="cube-face back"><span>G</span></div>
                <div className="cube-face right"><span>P</span></div>
                <div className="cube-face left"><span>T</span></div>
                <div className="cube-face top"><span>AI</span></div>
                <div className="cube-face bottom"><span>✦</span></div>
              </div>
            </div>
          </div>
          <div className="hero-text">
            <h2 className="hero-tagline">Intelligence at your fingertips</h2>
            <p className="hero-desc">Powered by local AI models. Private. Fast. Yours.</p>
          </div>
          <div className="hero-glow-orb hero-orb-1" />
          <div className="hero-glow-orb hero-orb-2" />
        </div>

        {/* Right side — login form */}
        <div className="login-panel">
          <div className="login-card">
            <div className="login-brand">
              <img src="/rgpt.svg" alt="RGPT" className="login-logo" />
              <h1 className="login-title">Welcome back</h1>
              <p className="login-subtitle">Sign in to continue to RGPT</p>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-field">
                <label htmlFor="login-user">Username</label>
                <div className="login-input-wrap">
                  <User size={16} className="login-input-icon" />
                  <input
                    id="login-user"
                    type="text"
                    value={loginUser}
                    onChange={e => setLoginUser(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>
              <div className="login-field">
                <label htmlFor="login-pass">Password</label>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" />
                  <input
                    id="login-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {loginError && <div className="login-error">{loginError}</div>}
              <button type="submit" className="login-btn" disabled={loginLoading || !loginUser || !loginPass}>
                {loginLoading ? (
                  <><Loader2 size={18} className="spinner-icon" /> Signing in...</>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="login-footer">
              <p>Created by <strong>Rajib</strong></p>
              <a href="https://rajib.uk" target="_blank" rel="noopener">rajib.uk →</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN CHAT UI ---
  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-brand">
          <img src="/rgpt.svg" alt="RGPT" className="brand-svg" />
          <span className="brand-name">RGPT</span>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={18} />
          New chat
        </button>
        <div className="session-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
            >
              <button
                className="session-btn"
                onClick={() => loadSession(session)}
              >
                {session.title || 'New chat'}
              </button>
              <button
                className="session-delete-btn"
                onClick={(e) => deleteSession(session.id, e)}
                title="Delete chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <select
            className="model-select"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
          >
            {models.length ? models.map(m => <option key={m} value={m}>{m}</option>) : <option value={selectedModel}>{selectedModel}</option>}
          </select>
        </div>

        <div className="chat-messages">
          {messages.map((msg, idx) => {
            const parsed = msg.role === 'ai' ? parseThinkingContent(msg.content) : null;
            const isThisLoading = isLoading && msg.role === 'ai' && idx === messages.length - 1 && msg.content === '';
            const isCollapsed = collapsedThinking[idx] ?? false;

            return (
            <div key={idx} className={`message-wrapper ${msg.role}`}>
              <div className="message-content">
                <div className={`avatar ${msg.role}-avatar`}>
                  {msg.role === 'user' ? <User size={18} color="white" /> : <RAvatar />}
                </div>
                <div className="message-body">
                  {isThisLoading ? (
                    <div className="loading-spinner-wrap">
                      <Loader2 size={20} className="spinner-icon" />
                      <span className="loading-text">Thinking...</span>
                    </div>
                  ) : (
                  <>
                  {parsed?.thinking != null && (
                    <div className={`think-block ${parsed.isThinking ? 'thinking-active' : ''}`}>
                      <button
                        type="button"
                        className="think-toggle"
                        onClick={() => toggleThinking(idx)}
                      >
                        <Brain size={14} className={parsed.isThinking ? 'brain-pulse' : ''} />
                        <span>{parsed.isThinking ? 'Thinking...' : 'Thought process'}</span>
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {!isCollapsed && (
                        <div className="think-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}
                            components={{ p: ({ node, ...props }) => <p {...props} className="md-p" /> }}>
                            {parsed.thinking}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="message-text">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        p: ({ node, ...props }) => <p {...props} className="md-p" />,
                        pre: ({ children, ...props }) => {
                          const el = Array.isArray(children) ? children[0] : children;
                          const raw = (el as React.ReactElement)?.props?.children;
                          const codeStr = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join('') : String(raw ?? '');
                          const id = `code-${idx}-${(codeBlockIdRef.current += 1)}`;
                          return (
                            <div className="code-block-wrap">
                              <button
                                type="button"
                                className="copy-code-btn"
                                onClick={() => copyMessage(id, codeStr)}
                              >
                                {copiedId === id ? <Check size={14} /> : <Copy size={14} />}
                                Copy code
                              </button>
                              <pre {...props}>{children}</pre>
                            </div>
                          );
                        }
                      }}
                    >
                      {msg.role === 'ai' ? (parsed?.response ?? '') : msg.content}
                    </ReactMarkdown>
                  </div>
                  <div className="message-actions">
                    {msg.role === 'user' && (
                      <button type="button" className="msg-action" onClick={() => handleEdit(idx)} title="Edit">
                        <Pencil size={14} />
                      </button>
                    )}
                    {msg.role === 'ai' && idx === messages.length - 1 && !isError && !isLoading && (
                      <button type="button" className="msg-action" onClick={handleRegenerate} title="Regenerate">
                        <RefreshCw size={14} />
                      </button>
                    )}
                    {msg.role === 'ai' && idx === messages.length - 1 && isError && (
                      <button type="button" className="msg-action retry" onClick={handleRetry} title="Retry">
                        <RefreshCw size={14} /> Retry
                      </button>
                    )}
                    <button
                      type="button"
                      className="msg-action"
                      onClick={() => copyMessage(`msg-${idx}`, msg.content)}
                      title="Copy"
                    >
                      {copiedId === `msg-${idx}` ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  </>
                  )}
                </div>
              </div>
            </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <div className="input-box">
            <textarea
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={editingIndex !== null ? 'Edit your message...' : 'Message RGPT...'}
              rows={1}
            />
            <button className="send-btn" onClick={handleSend} disabled={!input.trim() || isLoading}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
