// NextAuth session type extensions
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "buyer";
    } & DefaultSession["user"];
  }
}
