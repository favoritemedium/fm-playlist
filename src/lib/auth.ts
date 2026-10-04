import { currentUser } from "@clerk/nextjs/server";
import { isAllowedEmailDomain } from "@/lib/constants";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export type AppAuthResult =
  | { status: "authenticated"; user: AppUser }
  | { status: "unauthenticated" }
  | { status: "forbidden"; user?: AppUser; email?: string };

export async function getCurrentAppAuth(): Promise<AppAuthResult> {
  const user = await currentUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  const email = user.primaryEmailAddress?.emailAddress;

  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    email ||
    "";

  const appUser: AppUser = {
    id: user.id,
    name,
    email: email || "",
    picture: user.imageUrl || undefined,
  };

  if (!email || !isAllowedEmailDomain(email)) {
    return { status: "forbidden", user: appUser, email };
  }

  return {
    status: "authenticated",
    user: appUser,
  };
}
