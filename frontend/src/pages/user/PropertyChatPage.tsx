/**
 * User Property Chat Page
 * Features a premium ChatGPT-style conversational workspace for searching and filtering properties,
 * dynamic cards for property listings, suggestions chips, and role-based contact masking.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Send, Sparkles, MessageSquare, Trash2, Database, Clock,
  Home, BedDouble, Expand, ShieldAlert, Phone, Mail, ExternalLink, Info
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { queryChatbot, getPropertiesMetadata } from '../../services/chatbotApi';

interface PropertyItem {
  id: string;
  property_id: string | null;
  property_name: string;
  location: string;
  city: string;
  property_type: string;
  bhk: number;
  price: number;
  price_per_sq_ft: number;
  area_sq_ft: number;
  furnishing: string;
  parking: string;
  amenities: string;
  status: string;
  dealer_name: string;
  agent_name: string;
  contact_number: string;
  email: string;
  property_url: string;
  is_contact_masked: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  properties?: PropertyItem[];
}

const SUGGESTIONS = [
  "Show properties in Hinjewadi under ₹60 lakh",
  "Find a furnished 2 BHK in Wakad",
  "Give me the cheapest 3 BHK flat",
  "Which properties have parking space?"
];

const PropertyChatPage: React.FC = () => {
  const { user } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [freshness, setFreshness] = useState<string | null>(null);
  const [metaCount, setMetaCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchFreshness = useCallback(async () => {
    try {
      const data = await getPropertiesMetadata();
      if (data && data.updated_at) {
        setFreshness(new Date(data.updated_at).toLocaleString());
        setMetaCount(data.row_count);
      }
    } catch {
      // Fail silently
    }
  }, []);

  useEffect(() => {
    fetchFreshness();
    // Load greeting message
    setMessages([
      {
        role: 'assistant',
        content: `Hello ${user?.full_name || 'there'}! I am your InterCity Property Assistant. I have access to our live real-estate database. Ask me anything about properties, prices, locations, or BHKs!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [fetchFreshness, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const formatPrice = (price: number) => {
    if (!price) return 'N/A';
    const lakhs = price / 100000;
    if (lakhs < 100) {
      return `₹${lakhs.toFixed(1)} Lakh`;
    }
    return `₹${(lakhs / 100).toFixed(2)} Cr`;
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessageText = textToSend;
    setInput('');
    
    // Add user message
    const userMsg: Message = {
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build history for backend
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await queryChatbot(userMessageText, history);
      
      const botMsg: Message = {
        role: 'assistant',
        content: res.answer,
        properties: res.properties || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      toast.error(err.message || 'Chatbot encountered an error.');
      const errorMsg: Message = {
        role: 'assistant',
        content: `I ran into an issue processing your query: "${err.message || 'Internal server error'}". Please try again shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnquiry = (propName: string) => {
    toast.success(`Enquiry request logged for "${propName}". The dealer will get back to you!`, {
      icon: '📩'
    });
  };

  const clearHistory = () => {
    setMessages([
      {
        role: 'assistant',
        content: `History cleared. How can I help you with InterCity properties today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: 'var(--bg-app)', overflow: 'hidden' }}>
      
      {/* Subheader Metadata Freshness Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-xs)',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={14} style={{ color: 'var(--accent-primary)' }} />
          <span>Properties Catalog Size: <strong>{metaCount} rows</strong></span>
        </div>
        {freshness ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} style={{ color: 'var(--color-success)' }} />
            <span>Data Last Updated: <strong>{freshness}</strong></span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Outdated or empty property dataset. Contact admin.</span>
        )}
      </div>

      {/* Chat Messages Log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <AnimatePresence>
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: '85%',
                  alignItems: isUser ? 'flex-end' : 'flex-start'
                }}>
                  {/* Message Bubble */}
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: isUser ? '16px 16px 0 16px' : '0 16px 16px 16px',
                    background: isUser ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    color: isUser ? 'var(--text-inverse)' : 'var(--text-primary)',
                    border: isUser ? 'none' : '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-sm)',
                    fontSize: '14.5px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                  
                  {/* Message Timestamp */}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                    {msg.timestamp}
                  </span>

                  {/* Render Property Results Cards */}
                  {!isUser && msg.properties && msg.properties.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      style={{ 
                        width: '100%', 
                        overflowX: 'auto', 
                        padding: '12px 2px', 
                        display: 'flex', 
                        gap: '16px',
                        marginTop: '12px',
                        maxWidth: '90vw'
                      }}
                    >
                      {msg.properties.map((p) => (
                        <div key={p.id} style={{
                          minWidth: '290px',
                          maxWidth: '290px',
                          background: 'var(--bg-surface)',
                          borderRadius: '14px',
                          border: '1px solid var(--border-default)',
                          boxShadow: 'var(--shadow-md)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}>
                          {/* Card Header (Image or Colored Banner) */}
                          <div style={{
                            height: '80px',
                            background: 'linear-gradient(135deg, var(--accent-primary-light), rgba(99,102,241,0.15))',
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                          }}>
                            <span style={{
                              background: 'var(--accent-primary)',
                              color: 'var(--text-inverse)',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              textTransform: 'uppercase'
                            }}>
                              {p.property_type}
                            </span>
                            <span style={{
                              background: 'var(--bg-surface)',
                              color: 'var(--accent-primary)',
                              fontSize: '13px',
                              fontWeight: 800,
                              padding: '4px 8px',
                              borderRadius: '8px',
                              boxShadow: 'var(--shadow-xs)'
                            }}>
                              {formatPrice(p.price)}
                            </span>
                          </div>

                          {/* Card Content */}
                          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {p.property_name}
                            </h4>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {p.location}, {p.city}
                            </p>

                            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '6px 0' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <BedDouble size={12} />
                                {p.bhk} BHK
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Expand size={12} />
                                {p.area_sq_ft} sqft
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Home size={12} />
                                {p.furnishing}
                              </span>
                            </div>

                            {/* Status and Parking badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {p.parking && p.parking.toLowerCase() !== 'none' && (
                                <span style={{ background: 'var(--color-success-bg)', color: 'var(--accent-teal)', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-success-border)' }}>
                                  🚗 Parking: {p.parking}
                                </span>
                              )}
                              {p.status && (
                                <span style={{ background: 'var(--color-info-bg)', color: 'var(--accent-indigo)', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-info-border)' }}>
                                  ⚡ {p.status}
                                </span>
                              )}
                            </div>

                            {/* Contact Box */}
                            <div style={{ 
                              background: 'var(--bg-surface-hover)', 
                              border: '1px solid var(--border-default)', 
                              borderRadius: '8px', 
                              padding: '8px', 
                              fontSize: '11.5px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              marginTop: '4px'
                            }}>
                              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Dealer: {p.dealer_name || 'N/A'}</div>
                              
                              {p.is_contact_masked ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)' }}>
                                  <ShieldAlert size={12} />
                                  <span style={{ fontSize: '10.5px' }}>Contacts masked for standard Users</span>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-secondary)' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={11} /> {p.contact_number}
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    <Mail size={11} /> {p.email}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <button 
                                onClick={() => handleEnquiry(p.property_name)}
                                style={{
                                  flex: 1,
                                  background: 'var(--accent-primary-light)',
                                  color: 'var(--accent-primary)',
                                  border: '1px solid var(--border-default)',
                                  borderRadius: '8px',
                                  padding: '7px 0',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                              >
                                Enquire
                              </button>
                              
                              {!p.is_contact_masked ? (
                                <a 
                                  href={`tel:${p.contact_number}`}
                                  style={{
                                    flex: 1,
                                    background: 'var(--accent-primary)',
                                    color: 'var(--text-inverse)',
                                    borderRadius: '8px',
                                    padding: '7px 0',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    textDecoration: 'none'
                                  }}
                                >
                                  <Phone size={11} /> Call
                                </a>
                              ) : (
                                <button 
                                  disabled
                                  title="Upgraded role required"
                                  style={{
                                    flex: 1,
                                    background: 'var(--border-default)',
                                    color: 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '7px 0',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Phone size={11} /> Call
                                </button>
                              )}

                              {p.property_url && (
                                <a 
                                  href={p.property_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{
                                    width: '30px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>

                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading Indicator */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--accent-primary-light)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={12} />
              </div>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '0 10px 10px 10px',
                padding: '10px 14px',
                display: 'flex',
                gap: '5px',
                alignItems: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-primary)', display: 'block' }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Suggestions Chips */}
      {messages.length === 1 && !loading && (
        <div style={{ padding: '0 20px', display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '999px',
                padding: '6px 12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: 'var(--shadow-xs)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.color = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <button
          onClick={clearHistory}
          title="Clear Conversation History"
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.1)',
            color: 'var(--color-danger)',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <Trash2 size={16} />
        </button>

        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }} 
          style={{ display: 'flex', gap: '10px', flex: 1, position: 'relative' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Type your property question here (e.g. 'Show me 2 BHK flats under 60 Lakh in Pune')..."
            style={{
              flex: 1,
              padding: '11px 16px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-strong)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '13.5px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--text-inverse)',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
              opacity: (!input.trim() || loading) ? 0.6 : 1,
              flexShrink: 0
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

    </div>
  );
};

export default PropertyChatPage;
