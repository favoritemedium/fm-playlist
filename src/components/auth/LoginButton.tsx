import { Show, SignInButton, SignOutButton } from "@clerk/nextjs";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export async function LoginButton() {
  const t = await getTranslations("auth");

  return (
    <>
      <Show when="signed-out">
        <SignInButton forceRedirectUrl="/" signUpForceRedirectUrl="/">
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-5 shadow-lg shadow-primary/30">
            <LogIn className="w-4 h-4 mr-2" strokeWidth={2.5} />
            {t("signIn")}
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <SignOutButton>
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-5 shadow-lg shadow-primary/30">
            <LogOut className="w-4 h-4 mr-2" strokeWidth={2.5} />
            {t("switchAccount")}
          </Button>
        </SignOutButton>
      </Show>
    </>
  );
}
