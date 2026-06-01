import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { IS_LOCAL_AUTH } from "@/lib/dev-auth";
import { getCurrentUser } from "@/lib/auth";
import { LocalAuthForm } from "@/components/auth/local-auth-form";

export default async function SignInPage() {
  if (IS_LOCAL_AUTH) {
    const user = await getCurrentUser();
    if (user) redirect("/dashboard");
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/40 p-4">
        <LocalAuthForm mode="signin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/40 p-4">
      <SignIn appearance={{ elements: { rootBox: "mx-auto" } }} />
    </div>
  );
}
