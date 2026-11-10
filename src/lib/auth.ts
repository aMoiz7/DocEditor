import { cookies } from "next/headers";
import { getUser } from "./db";

export async function currentUser() {
  const userId = (await cookies()).get("ajaia_user")?.value;
  return userId ? getUser(userId) : undefined;
}
