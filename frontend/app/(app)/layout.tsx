import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthProvider } from "@/lib/auth-context";
import { SurveyPrompt } from "@/components/survey/survey-prompt";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SurveyPrompt />
      <div className="flex min-h-full flex-1 flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:px-6 md:pb-10">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthProvider>
  );
}
