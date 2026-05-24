import { getCurrentAppAuth } from "@/lib/auth";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
import { getAllSongs } from "@/lib/songs";
import { PlaylistView } from "@/components/playlist/PlaylistView";
import { LoginButton } from "@/components/auth/LoginButton";
import { RefreshOnSignIn } from "@/components/auth/RefreshOnSignIn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LanguageDropdown } from "@/components/playlist/LanguageDropdown";

export default async function HomePage() {
  const [appAuth, t] = await Promise.all([
    getCurrentAppAuth(),
    getTranslations(),
  ]);

  if (appAuth.status !== "authenticated") {
    const isForbidden = appAuth.status === "forbidden";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <LanguageDropdown />
        </div>
        {!isForbidden && <RefreshOnSignIn />}
        <div className="text-center space-y-6 sm:space-y-8 max-w-lg w-full">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-primary">
            FM Playlist
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-medium">
            {t("home.tagline")}
          </p>

          {isForbidden ? (
            <Alert
              variant="destructive"
              className="border-2 border-destructive bg-destructive/10 text-left"
            >
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-base sm:text-lg font-bold">
                {t("home.auth.notAllowedTitle")}
              </AlertTitle>
              <AlertDescription className="text-sm sm:text-base text-destructive/90 font-medium">
                {t("home.auth.notAllowedDescription", { domain: ALLOWED_EMAIL_DOMAIN })}
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("home.signInPrompt", { domain: ALLOWED_EMAIL_DOMAIN })}
            </p>
          )}

          <LoginButton />
        </div>
      </div>
    );
  }

  const songs = await getAllSongs(appAuth.user);

  return (
    <PlaylistView
      initialSongs={songs}
      user={appAuth.user}
    />
  );
}
