import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@/lib/generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

export type { JWT };
