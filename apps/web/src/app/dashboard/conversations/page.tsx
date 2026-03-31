"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConversationSummary {
  id: string;
  channel: string;
  language: string;
  status: string;
  messageCount: number;
  lead: { name?: string; phone?: string; score?: string };
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conversations?businessId=vividerm")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setConversations(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Conversations</h1>
        <p className="text-sm text-slate-500">
          All customer interactions across channels
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-slate-600">
              No conversations yet
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Conversations will appear here once customers start chatting with
              your AI receptionist.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Card key={conv.id} className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                    {conv.lead.name?.[0]?.toUpperCase() ?? conv.channel[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {conv.lead.name ?? "Unknown visitor"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {conv.lastMessage || "No messages"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {conv.channel}
                    </span>
                    <span className="ml-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {conv.language.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {conv.messageCount} msgs
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
