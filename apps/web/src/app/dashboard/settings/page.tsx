import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { vividermConfig } from "@ai-receptionist/config";
import { getSessionBusiness } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getSessionBusiness();
  if (!session) redirect("/login");

  // MVP: static config for vividerm; production: load config from DB by session.businessSlug
  const config = vividermConfig;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Business configuration and AI receptionist settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Business Info */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Your business profile used by the AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <SettingField label="Business Name" value={config.name} />
              <SettingField label="Industry" value={config.industry.replace("_", " ")} />
              <SettingField label="Phone" value={config.contact.phone} />
              <SettingField label="Address" value={`${config.contact.address}, ${config.contact.city}`} />
              <SettingField label="Timezone" value={config.timezone} />
              <SettingField label="Languages" value={config.languages.join(", ").toUpperCase()} />
            </div>
          </CardContent>
        </Card>

        {/* AI Persona */}
        <Card>
          <CardHeader>
            <CardTitle>AI Persona</CardTitle>
            <CardDescription>How your AI receptionist behaves</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <SettingField label="Assistant Name" value={config.aiPersona.name} />
              <SettingField label="Tone" value={config.aiPersona.tone.replace("_", " ")} />
              <div>
                <p className="mb-1 font-medium text-slate-500">Greeting (EN)</p>
                <p className="rounded-lg bg-slate-50 p-3 text-slate-700">
                  {config.aiPersona.greeting.en}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {config.hours.map((h) => (
                <div key={h.day} className="flex justify-between">
                  <span className="font-medium capitalize text-slate-600">
                    {h.day}
                  </span>
                  <span className={h.isOpen ? "text-slate-900" : "text-slate-400"}>
                    {h.isOpen ? `${h.open} — ${h.close}` : "Closed"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Widget Embed Code */}
        <Card>
          <CardHeader>
            <CardTitle>Chat Widget</CardTitle>
            <CardDescription>Embed this code on your website to add the AI chat</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-green-400">
{`<!-- AI Receptionist Widget -->
<script
  src="${process.env.NEXT_PUBLIC_WIDGET_URL ?? "https://your-domain.com"}/widget.js"
  data-business-id="${session.businessSlug}"
  data-language="lv"
  data-color="#6366f1"
  async
></script>`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-900 capitalize">{value}</p>
    </div>
  );
}
