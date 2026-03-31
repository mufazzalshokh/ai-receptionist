import { ChatInterface } from "@/components/chat/chat-interface";
import { vividermConfig } from "@ai-receptionist/config";
import Link from "next/link";

export default function DemoPage() {
  const greeting = vividermConfig.aiPersona.greeting.en;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-50 to-slate-100 py-8">
      <div className="mb-6 text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          VIVIDERM AI Receptionist Demo
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Try chatting in English, Latvian, or Russian
        </p>
      </div>

      <ChatInterface
        businessId="vividerm"
        initialLanguage="en"
        greeting={greeting}
      />

      <div className="mt-6 max-w-lg text-center text-xs text-slate-400">
        <p>
          This is a live demo powered by Claude AI. The assistant knows
          VIVIDERM&apos;s services, pricing, hours, and can help book appointments.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {[
            "What services do you offer?",
            "Cik maksā lāzerepilācija?",
            "Хочу записаться на консультацию",
            "Do you have any promotions?",
            "Where are you located?",
          ].map((hint) => (
            <span
              key={hint}
              className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600"
            >
              {hint}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
