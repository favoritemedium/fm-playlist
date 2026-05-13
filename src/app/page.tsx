import { getCurrentAppAuth } from "@/lib/auth";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
import { getAllSongs } from "@/lib/songs";
import { PlaylistView } from "@/components/playlist/PlaylistView";
import { LoginButton } from "@/components/auth/LoginButton";
import { RefreshOnSignIn } from "@/components/auth/RefreshOnSignIn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default async function HomePage() {
  const appAuth = await getCurrentAppAuth();

  if (appAuth.status !== "authenticated") {
    const isForbidden = appAuth.status === "forbidden";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        {!isForbidden && <RefreshOnSignIn />}
        <div className="text-center space-y-6 sm:space-y-8 max-w-lg w-full">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-primary">
            FM Playlist
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-medium">
            Share your favorite tracks, discover what&apos;s moving the FM crew
          </p>

          {isForbidden ? (
            <Alert
              variant="destructive"
              className="border-2 border-destructive bg-destructive/10 text-left"
            >
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-base sm:text-lg font-bold">
                Account not allowed
              </AlertTitle>
              <AlertDescription className="text-sm sm:text-base text-destructive/90 font-medium">
                Access is restricted to{" "}
                <span className="font-bold">@{ALLOWED_EMAIL_DOMAIN}</span>{" "}
                Google accounts. Sign out and choose an approved account.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in with your @{ALLOWED_EMAIL_DOMAIN} Google account
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
