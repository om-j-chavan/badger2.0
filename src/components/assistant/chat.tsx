"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Sparkles, Check, X, ArrowRight, Bot, User, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { sendAssistantMessage, commitDraft } from "@/app/actions/ai";
import type { AssistantResponse, ChatMessage, DraftAction } from "@/lib/ai/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
  draft?: DraftAction;
  links?: { title: string; route: string }[];
  search?: { type: string; items: unknown[] };
  committed?: boolean;
}

const SUGGESTIONS = [
  "Spent 500 on fuel today",
  "Can I afford a PS5?",
  "Where's my money going?",
  "Add Netflix 649 monthly",
  "Show all food expenses",
  "Where do I find the budget planner?",
];

export function AssistantChat({ initial, aiAvailable }: { initial: Msg[]; aiAvailable: boolean }) {
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<Msg[]>(initial);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [useLlm, setUseLlm] = React.useState(aiAvailable);
  const endRef = React.useRef<HTMLDivElement>(null);

  // Restore the saved preference (only meaningful when a key is configured).
  React.useEffect(() => {
    if (!aiAvailable) return;
    const saved = window.localStorage.getItem("badger-use-llm");
    if (saved != null) setUseLlm(saved === "1");
  }, [aiAvailable]);

  function toggleLlm(v: boolean) {
    setUseLlm(v);
    window.localStorage.setItem("badger-use-llm", v ? "1" : "0");
  }

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setInput("");
    const history: ChatMessage[] = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setPending(true);
    try {
      const res = await sendAssistantMessage(trimmed, history, useLlm);
      if (res.ok) {
        const r: AssistantResponse = res.data;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: r.reply, draft: r.draft, links: r.links, search: r.search },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: res.error }]);
      }
    } finally {
      setPending(false);
    }
  }

  async function confirmDraft(index: number, draft: DraftAction) {
    setPending(true);
    const res = await commitDraft(draft);
    setPending(false);
    if (res.ok) {
      toast({ title: "Saved!", variant: "success" });
      setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, committed: true } : m)));
    } else {
      toast({ title: res.error, variant: "error" });
    }
  }

  function dismissDraft(index: number) {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, draft: undefined } : m)));
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-5xl">🦡</span>
            <h2 className="mt-3 text-xl font-bold">Hey, I'm Badger AI</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ask me about your money, add expenses in plain English, search your data, or find your way around the app.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/50 hover:text-primary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-secondary" : "bg-primary/10 text-primary")}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </span>
            <div className={cn("max-w-[80%] space-y-2", m.role === "user" && "items-end")}>
              <Card className={cn("px-4 py-2.5 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "")}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              </Card>

              {/* Draft action confirmation */}
              {m.draft && !m.committed && (
                <Card className="border-primary/40 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" /> {m.draft.label}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.draft.summary}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => confirmDraft(i, m.draft!)} disabled={pending}>
                      <Check className="h-4 w-4" /> Save it
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => dismissDraft(i)}>
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                  </div>
                </Card>
              )}
              {m.committed && (
                <p className="text-xs text-success">✓ Saved</p>
              )}

              {/* Navigation links */}
              {m.links && m.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {m.links.map((l) => (
                    <Button key={l.route} size="sm" variant="outline" asChild>
                      <Link href={l.route}>{l.title} <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </Button>
                  ))}
                </div>
              )}

              {/* Search results preview */}
              {m.search && m.search.items.length > 0 && (
                <Card className="divide-y p-0 text-sm">
                  {m.search.items.slice(0, 6).map((item, idx) => (
                    <SearchRow key={idx} item={item as Record<string, unknown>} />
                  ))}
                </Card>
              )}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <Card className="px-4 py-3">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
              </span>
            </Card>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-center justify-end gap-2 pb-2 text-xs text-muted-foreground">
        {!aiAvailable && (
          <span className="mr-1 italic">Add an OpenAI key to enable GPT ·</span>
        )}
        <span className={cn("flex items-center gap-1", (!useLlm || !aiAvailable) && "font-medium text-foreground")}>
          <Cpu className="h-3.5 w-3.5" /> Local
        </span>
        <Switch
          checked={useLlm && aiAvailable}
          onCheckedChange={toggleLlm}
          disabled={!aiAvailable}
          aria-label="Use GPT for answers"
        />
        <span className={cn("flex items-center gap-1", useLlm && aiAvailable && "font-medium text-primary")}>
          <Zap className="h-3.5 w-3.5" /> GPT
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t pt-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything, or try 'spent 200 on coffee'…"
          disabled={pending}
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function SearchRow({ item }: { item: Record<string, unknown> }) {
  const name = (item.name as string) ?? (item.note as string) ?? (item.category as Record<string, unknown>)?.name ?? "Item";
  const amount = item.amount ?? item.cost ?? item.emiAmount ?? item.targetAmount;
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="truncate">{String(name)}</span>
      {amount != null && <span className="font-medium">{Number(amount).toLocaleString()}</span>}
    </div>
  );
}
