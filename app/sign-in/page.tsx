import { SignIn } from "@stackframe/stack";
import Link from "next/link";
import { stackServerApp } from "@/stack/server";
import { redirect } from "next/navigation";
import { ArrowLeftCircle } from "lucide-react";

export default async function SignInPage() {
  const user = await stackServerApp.getUser();

  if (user) {
    redirect("/select-role");
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
      <div className="max-w-md w-full space-y-8">
        <Link href="/" className="flex gap-2">
          <ArrowLeftCircle className="h-6 w-6 text-purple-600 mb-4 hover:scale-110 transition-transform" />
          Go Back
        </Link>
        <SignIn />
      </div>
    </div>
  );
}
