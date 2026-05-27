import { getCurrentAppAuth } from "@/lib/auth";
import { getAllSongs } from "@/lib/songs";
import { PlaylistView } from "@/components/playlist/PlaylistView";

export default async function HomePage() {
  const appAuth = await getCurrentAppAuth();
  const user =
    appAuth.status === "authenticated" || appAuth.status === "forbidden"
      ? appAuth.user
      : null;
  const isForbidden = appAuth.status === "forbidden";

  const songs = await getAllSongs(user ?? undefined);

  return (
    <PlaylistView
      initialSongs={songs}
      user={user}
      isForbidden={isForbidden}
    />
  );
}
