import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@ai-receptionist/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      lead: true,
    },
  });

  if (!conversation) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/conversations"
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conversation</h1>
          <p className="text-sm text-slate-500">
            {conversation.channel} &middot; {conversation.language.toUpperCase()} &middot; {conversation.createdAt.toLocaleDateString()}
          </p>
        </div>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${
            conversation.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {conversation.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Messages */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Messages ({conversation.messages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversation.messages.length === 0 && (
                  <p className="text-sm text-slate-400">No messages in this conversation.</p>
                )}
                {conversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`mt-1 text-xs ${
                          msg.role === "user" ? "text-indigo-200" : "text-slate-400"
                        }`}
                      >
                        {msg.createdAt.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Lead Info</CardTitle>
            </CardHeader>
            <CardContent>
              {conversation.lead ? (
                <dl className="space-y-3 text-sm">
                  <InfoRow label="Name" value={conversation.lead.name} />
                  <InfoRow label="Phone" value={conversation.lead.phone} />
                  <InfoRow label="Email" value={conversation.lead.email} />
                  <InfoRow label="Score" value={conversation.lead.score} />
                  <InfoRow label="Status" value={conversation.lead.status} />
                  <InfoRow label="Source" value={conversation.lead.source} />
                  {conversation.lead.interests.length > 0 && (
                    <div>
                      <dt className="font-medium text-slate-500">Interests</dt>
                      <dd className="mt-0.5 text-slate-900">
                        {conversation.lead.interests.join(", ")}
                      </dd>
                    </div>
                  )}
                  {conversation.lead.notes && (
                    <div>
                      <dt className="font-medium text-slate-500">Notes</dt>
                      <dd className="mt-0.5 text-slate-900">{conversation.lead.notes}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-slate-400">No lead data captured.</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <InfoRow label="ID" value={conversation.id} />
                <InfoRow label="Channel" value={conversation.channel} />
                <InfoRow label="Language" value={conversation.language} />
                <InfoRow label="Created" value={conversation.createdAt.toLocaleString()} />
                <InfoRow label="Updated" value={conversation.updatedAt.toLocaleString()} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{value}</dd>
    </div>
  );
}
