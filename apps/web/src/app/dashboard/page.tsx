import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@ai-receptionist/db";
import { getSessionBusiness } from "@/lib/auth";

async function getStats(businessSlug: string) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true },
  });

  if (!business) {
    return { conversations: 0, conversationsToday: 0, leads: 0, hotLeads: 0, escalations: 0, bookings: 0 };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [conversations, conversationsToday, leads, hotLeads, escalations, bookings] = await Promise.all([
    prisma.conversation.count({ where: { businessId: business.id } }),
    prisma.conversation.count({ where: { businessId: business.id, createdAt: { gte: todayStart } } }),
    prisma.lead.count({ where: { businessId: business.id } }),
    prisma.lead.count({ where: { businessId: business.id, score: "hot" } }),
    prisma.escalation.count({ where: { businessId: business.id } }),
    prisma.booking.count({ where: { businessId: business.id } }),
  ]);

  return { conversations, conversationsToday, leads, hotLeads, escalations, bookings };
}

export default async function DashboardPage() {
  const session = await getSessionBusiness();
  if (!session) redirect("/login");

  const stats = await getStats(session.businessSlug);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          VIVIDERM AI Receptionist Overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Conversations Today"
          value={String(stats.conversationsToday)}
          subtitle={`${stats.conversations} total`}
        />
        <StatCard
          title="Leads Captured"
          value={String(stats.leads)}
          subtitle={stats.hotLeads > 0 ? `${stats.hotLeads} hot leads` : "No hot leads yet"}
        />
        <StatCard
          title="Appointments Booked"
          value={String(stats.bookings)}
          subtitle={stats.bookings === 0 ? "No bookings yet" : "Via AI receptionist"}
        />
        <StatCard
          title="Escalations"
          value={String(stats.escalations)}
          subtitle={stats.escalations === 0 ? "No escalations" : "Review in conversations"}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <QuickAction
                href="/demo"
                title="Test Chat Demo"
                description="Try the AI receptionist in action"
              />
              <QuickAction
                href="/dashboard/conversations"
                title="View Conversations"
                description="See all customer interactions"
              />
              <QuickAction
                href="/dashboard/leads"
                title="Manage Leads"
                description="Review captured leads and contacts"
              />
              <QuickAction
                href="/dashboard/settings"
                title="Configure Business"
                description="Update services, FAQs, and settings"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ChecklistItem done label="Business profile configured" />
              <ChecklistItem done label="Services & pricing loaded" />
              <ChecklistItem done label="FAQ knowledge base created" />
              <ChecklistItem done label="Multi-language support (EN/LV/RU)" />
              <ChecklistItem label="Embed chat widget on website" />
              <ChecklistItem label="Connect phone number (Twilio)" />
              <ChecklistItem label="Set up booking integration (Alteg)" />
              <ChecklistItem label="Configure escalation contacts" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-slate-50"
    >
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

function ChecklistItem({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          done
            ? "border-green-500 bg-green-50 text-green-500"
            : "border-slate-300 bg-white"
        }`}
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${done ? "text-slate-500 line-through" : "text-slate-700"}`}>
        {label}
      </span>
    </div>
  );
}
