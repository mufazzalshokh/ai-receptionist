import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    businessId?: string | null;
    businessSlug?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: string;
      businessId?: string | null;
      businessSlug?: string | null;
    };
  }
}
