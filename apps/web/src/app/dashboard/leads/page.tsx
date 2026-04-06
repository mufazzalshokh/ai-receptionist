"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api-client";

interface LeadSummary {
  conversationId: string;
  name?: string;
  phone?: string;
  email?: string;
  score: string;
  status: string;
  interests: string[];
  timeline?: string;
  channel: string;
  language: string;
  messageCount: number;
  lastActivity: string;
}

const SCORE_COLORS = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-blue-100 text-blue-700",
} as const;

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<LeadSummary[]>("/api/leads")
      .then((data) => {
        if (data.success && data.data) {
          setLeads(data.data);
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(() => setError("Failed to load leads"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500">
          Captured leads from all conversations
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-slate-600">
              No leads captured yet
            </p>
            <p className="mt-1 text-sm text-slate-400">
              When customers share their name, phone, or email during conversations,
              they&apos;ll appear here as leads.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Score</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Timeline</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.conversationId} className="border-b border-border last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {lead.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{lead.phone ?? "—"}</div>
                    {lead.email && <div className="text-xs text-slate-400">{lead.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SCORE_COLORS[lead.score as keyof typeof SCORE_COLORS] ?? "bg-slate-100 text-slate-600"}`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{lead.status}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {lead.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.timeline ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
