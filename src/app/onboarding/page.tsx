import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/40 p-4">
      <OnboardingForm defaultName={user.name ?? ""} defaultCurrency={user.currency || env.app.defaultCurrency} />
    </div>
  );
}
