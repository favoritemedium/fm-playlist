import { currentUser } from "@clerk/nextjs/server";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export type AppAuthResult =
  | { status: "authenticated"; user: AppUser }
  | { status: "unauthenticated" }
  | { status: "forbidden"; email?: string };

function isAllowedEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@").at(-1);
  return domain === ALLOWED_EMAIL_DOMAIN.toLowerCase();
}

export async function getCurrentAppAuth(): Promise<AppAuthResult> {
  const user = await currentUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  const email = user.primaryEmailAddress?.emailAddress;

  if (!email || !isAllowedEmail(email)) {
    return { status: "forbidden", email };
  }

  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    email;

  return {
    status: "authenticated",
    user: {
      id: user.id,
      name,
      email,
      picture: user.imageUrl || undefined,
    },
  };
}
