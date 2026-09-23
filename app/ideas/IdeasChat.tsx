'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ClipboardList, RotateCcw, Square, Lightbulb } from 'lucide-react';
import { event } from '@/lib/gtag';
import { EXAMPLE_PROMPTS, FILI_TAGLINE } from '@/lib/ideas/examples';
import { applyStreamEvent, textOf } from '@/lib/ideas/parts';
import { loadChat, loadQuote, newMessageId, newSessionId, saveChat, saveQuote } from '@/lib/ideas/storage';
import { normalizeText } from '@/lib/ideas/text';
import { IDEAS_LIMITS, type ChatMessage, type ChatStreamEvent, type IdeaCardData, type QuoteItem } from '@/lib/ideas/types';
import { buildQuoteLinkMessage, buildQuoteMessage, whatsappUrl } from '@/lib/ideas/whatsapp';
import IdeaCard from './IdeaCard';
import QuoteDrawer from './QuoteDrawer';

const GENERIC_ERROR = 'No pude responder en este momento. Inténtalo de nuevo en unos segundos.';
const FOLLOW_UPS = ['Dame más ideas', 'Que lleven mi nombre o logo', 'Opciones más sencillas'];

const quoteKey = (item: Pick<QuoteItem, 'id' | 'title' | 'product' | 'custom'>) =>
  item.custom ? `c:${item.id}` : item.product ? `p:${item.product.id}` : `t:${normalizeText(item.title)}`;

// Este componente sólo se renderiza en el navegador (ver IdeasChatLoader), así que puede leer
// localStorage y la URL directamente al arrancar, sin desajustes de hidratación.
function readInitialState() {
  const q = new URLSearchParams(window.location.search).get('q')?.trim() || '';
  const stored = q ? null : loadChat(); // un atajo de la home (?q=) empieza una conversación nueva
  return {
    q,
    sessionId: stored?.sessionId ?? newSessionId(),
    messages: stored?.messages ?? [],
    quote: loadQuote(),
  };
}

export default function IdeasChat() {
  const [initial] = useState(readInitialState);
  const [sessionId, setSessionId] = useState(initial.sessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [quote, setQuote] = useState<QuoteItem[]>(initial.quote);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  // Enlace de WhatsApp para abrir a mano si el navegador bloqueó la ventana emergente.
  const [manualHref, setManualHref] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const autoStartedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---------- Conversación ----------

  const sendMessage = useCallback(async (text: string, baseHistory: ChatMessage[], sid: string) => {
    const trimmed = text.trim().slice(0, IDEAS_LIMITS.maxUserChars);
    if (!trimmed) return;

    const userMessage: ChatMessage = { id: newMessageId(), role: 'user', parts: [{ type: 'text', text: trimmed }] };
    const assistantId = newMessageId();
    const history = [...baseHistory, userMessage];

    setMessages([...history, { id: assistantId, role: 'assistant', parts: [] }]);
    setStreaming(true);
    setError(null);
    setInput('');
    stickToBottomRef.current = true;
    event('ideas_message_sent', { source: 'ideas_chat', turn: history.filter((m) => m.role === 'user').length });

    const controller = new AbortController();
    abortRef.current = controller;

    const handleEvent = (e: ChatStreamEvent) => {
      if (e.type === 'meta') setDemo(e.demo);
      else if (e.type === 'error') setError(e.message);
      else if (e.type === 'text' || e.type === 'ideas') {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, parts: applyStreamEvent(m.parts, e) } : m)));
      }
    };

    try {
      const response = await fetch('/api/ideas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, assistantId, messages: history }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || GENERIC_ERROR);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) handleEvent(JSON.parse(line) as ChatStreamEvent);
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error && err.message ? err.message : GENERIC_ERROR);
    } finally {
      // Si no llegó nada (error o el cliente lo detuvo antes de recibir texto), se quita el globo vacío.
      setMessages((prev) => prev.filter((m) => !(m.id === assistantId && m.parts.length === 0)));
      setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const stop = () => abortRef.current?.abort();

  const startOver = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(newSessionId());
    setError(null);
    setInput('');
  };

  const retry = () => {
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex < 0) return;
    const text = textOf(messages[lastUserIndex].parts);
    void sendMessage(text, messages.slice(0, lastUserIndex), sessionId);
  };

  const submit = (text: string) => {
    if (streaming) return;
    void sendMessage(text, messages, sessionId);
  };

  // ---------- Arranque: atajo ?q= desde la home ----------

  useEffect(() => {
    if (!initial.q || autoStartedRef.current) return;
    autoStartedRef.current = true;
    window.history.replaceState(null, '', '/ideas');
    void sendMessage(initial.q, [], initial.sessionId);
  }, [initial, sendMessage]);

  // Guarda la conversación al terminar cada respuesta (no en cada palabra).
  useEffect(() => {
    if (!streaming) saveChat({ sessionId, messages });
  }, [streaming, sessionId, messages]);

  useEffect(() => {
    saveQuote(quote);
  }, [quote]);

  // ---------- Scroll ----------

  useEffect(() => {
    const onScroll = () => {
      stickToBottomRef.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 180;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  // El cuadro de texto crece con lo que se escribe (hasta unas 5 líneas).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [input]);

  // ---------- Mi cotización ----------

  const addedKeys = useMemo(() => new Set(quote.map(quoteKey)), [quote]);

  const toggleIdea = (idea: IdeaCardData) => {
    const candidate: QuoteItem = { id: idea.id, title: idea.title, description: idea.description, quantity: 1, note: '', product: idea.product };
    const key = quoteKey(candidate);
    setQuote((prev) => {
      if (prev.some((item) => quoteKey(item) === key)) return prev.filter((item) => quoteKey(item) !== key);
      if (prev.length >= IDEAS_LIMITS.maxQuoteItems) return prev;
      return [...prev, candidate];
    });
    if (!addedKeys.has(key)) event('add_to_wishlist', { source: 'ideas_chat', item_name: idea.title, in_catalog: Boolean(idea.product) });
  };

  const addCustom = (text: string) => {
    const id = newMessageId();
    setQuote((prev) => [...prev, { id, title: 'Idea propia', description: text.slice(0, 300), quantity: 1, note: '', custom: true }]);
    event('add_to_wishlist', { source: 'ideas_chat', item_name: 'idea_propia', in_catalog: false });
  };

  const changeQuantity = (id: string, delta: number) =>
    setQuote((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: Math.min(999, Math.max(1, item.quantity + delta)) } : item)));
  const changeNote = (id: string, note: string) => setQuote((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)));
  const removeItem = (id: string) => setQuote((prev) => prev.filter((item) => item.id !== id));

  // La necesidad original del cliente (su primer mensaje) va en el mensaje de cotización.
  const need = useMemo(() => {
    const first = messages.find((m) => m.role === 'user');
    return first ? textOf(first.parts).slice(0, 200) : '';
  }, [messages]);

  const origin = useMemo(() => window.location.origin, []);

  const sendQuote = async () => {
    if (sendingQuote || quote.length === 0) return;
    setSendingQuote(true);
    setManualHref(null);
    event('generate_lead', { method: 'whatsapp', source: 'ideas_chat', items: quote.length });

    // La pestaña de WhatsApp se abre YA (dentro del toque) y se rellena cuando el enlace está listo:
    // si se abriera después de esperar al servidor, los celulares bloquearían la ventana emergente.
    const popup = window.open('', '_blank');
    if (popup) popup.opener = null;

    // Respaldo: si no se puede generar el enlace, se manda la lista completa como texto.
    let href = whatsappUrl(buildQuoteMessage({ need, items: quote, origin }).text);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/ideas/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, need, items: quote }),
        signal: controller.signal,
      });
      const data = response.ok ? ((await response.json()) as { token?: string | null }) : null;
      if (data?.token) {
        href = whatsappUrl(buildQuoteLinkMessage({ need, count: quote.length, url: `${origin}/cotizacion/${data.token}` }));
      }
    } catch {
      // se queda el mensaje completo
    } finally {
      window.clearTimeout(timer);
    }

    if (popup && !popup.closed) popup.location.href = href;
    else setManualHref(href);
    setSendingQuote(false);
  };

  // ---------- Render ----------

  const lastMessage = messages[messages.length - 1];
  const showFollowUps = !streaming && !error && lastMessage?.role === 'assistant' && lastMessage.parts.some((p) => p.type === 'ideas');
  const showTyping = streaming && lastMessage?.role === 'assistant' && lastMessage.parts.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Barra de herramientas del chat */}
      <div className="sticky top-16 z-40 border-b border-zinc-200/80 bg-zinc-50/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-900">
              <Lightbulb className="h-4 w-4 text-primary" />
              Fili
            </span>
            {demo && (
              <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-300/60" title="Las respuestas son de ejemplo, no de una IA real todavía">
                <span className="sm:hidden">Demo</span>
                <span className="hidden sm:inline">Modo demostración</span>
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={startOver}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary-dark transition-colors hover:border-primary/50 hover:bg-primary/15 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Nueva idea
              </button>
            )}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary cursor-pointer"
            >
              <ClipboardList className="h-4 w-4" />
              Mi cotización
              <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] leading-none ${quote.length ? 'bg-primary text-white' : 'bg-white/20 text-white/80'}`}>{quote.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-6 sm:px-6">
        {messages.length === 0 && (
          <div className="pt-6 text-center sm:pt-14">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/25">
              <Lightbulb className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">¡Hola! Soy Fili 👋</h1>
            <p className="mx-auto mt-2 max-w-xl font-medium text-primary-dark">{FILI_TAGLINE}</p>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600">
              Cuéntame tu problema o lo que quieres lograr, como “quiero ordenar mi escritorio” o “quiero decorar mi sala”, y te doy ideas de artículos que se pueden imprimir en 3D. Guarda las que te gusten y mándalas a cotizar por WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2.5">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submit(prompt)}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary-dark cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm text-white shadow-sm">
                  {textOf(message.parts)}
                </p>
              </div>
            ) : (
              <div key={message.id} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  {message.parts.map((part, index) =>
                    part.type === 'text' ? (
                      <p key={index} className="whitespace-pre-line break-words text-[15px] leading-relaxed text-zinc-800">
                        {part.text}
                      </p>
                    ) : (
                      <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {part.ideas.map((idea) => (
                          <IdeaCard key={idea.id} idea={idea} added={addedKeys.has(quoteKey({ ...idea, custom: false }))} onToggle={toggleIdea} />
                        ))}
                      </div>
                    ),
                  )}
                  {message.id === lastMessage?.id && showTyping && (
                    <div className="flex items-center gap-1.5 py-2" aria-label="Escribiendo">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {showFollowUps && (
            <div className="flex flex-wrap gap-2 pl-11">
              {FOLLOW_UPS.map((text) => (
                <button key={text} type="button" onClick={() => submit(text)} className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-primary/40 hover:text-primary-dark cursor-pointer">
                  {text}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              {messages.some((m) => m.role === 'user') && (
                <button type="button" onClick={retry} className="font-semibold underline hover:text-red-900 cursor-pointer">
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>
        <div ref={endRef} />
      </div>

      {/* Escribir */}
      <div className="sticky bottom-0 z-30 border-t border-zinc-200/80 bg-zinc-50/90 backdrop-blur-md">
        <form
          className="mx-auto max-w-3xl px-4 py-3 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-zinc-300 bg-white p-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              maxLength={IDEAS_LIMITS.maxUserChars}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder={messages.length ? 'Escribe para afinar las ideas...' : 'Ej. Quiero ordenar mi escritorio'}
              aria-label="Tu mensaje"
              className="max-h-[132px] min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-zinc-900 placeholder-zinc-400 focus:outline-none"
            />
            {streaming ? (
              <button type="button" onClick={stop} aria-label="Detener" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white hover:bg-zinc-700 cursor-pointer">
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Enviar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white transition-all hover:brightness-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] leading-snug text-zinc-500">
            Las ideas las genera una IA y pueden tener errores. El precio y los detalles finales los confirma nuestro equipo.
          </p>
        </form>
      </div>

      <QuoteDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setManualHref(null);
        }}
        items={quote}
        sending={sendingQuote}
        manualHref={manualHref}
        onQuantity={changeQuantity}
        onNote={changeNote}
        onRemove={removeItem}
        onClear={() => setQuote([])}
        onAddCustom={addCustom}
        onSend={sendQuote}
      />
    </div>
  );
}
