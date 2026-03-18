import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase-server";

// Custom Supabase adapter — stores NextAuth sessions/accounts in Supabase
// This keeps all data in one database without needing Supabase Auth
const supabaseAdapter = {
  async createUser(user: {
    email: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: Date | null;
  }) {
    const supabase = createServiceRoleClient();
    console.log("[createUser] Creating user:", user.email);
    const { data, error } = await supabase
      .from("nextauth_users")
      .insert({
        email: user.email,
        name: user.name,
        image: user.image,
        email_verified: user.emailVerified?.toISOString() ?? null,
      })
      .select()
      .maybeSingle();
    if (error) {
      // Unique constraint: user already exists — fetch and return them
      if (error.code === "23505") {
        console.log("[createUser] User already exists, fetching:", user.email);
        const { data: existing } = await supabase
          .from("nextauth_users")
          .select()
          .eq("email", user.email)
          .maybeSingle();
        if (existing) return { ...existing, emailVerified: existing.email_verified ? new Date(existing.email_verified) : null };
      }
      console.error("[createUser] Error:", error.message, error.code);
      throw error;
    }
    if (!data) { throw new Error("[createUser] No data returned after insert"); }
    console.log("[createUser] Created user:", user.email);
    return { ...data, emailVerified: data.email_verified ? new Date(data.email_verified) : null };
  },
  async getUser(id: string) {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("nextauth_users")
      .select()
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return { ...data, emailVerified: data.email_verified ? new Date(data.email_verified) : null };
  },
  async getUserByEmail(email: string) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("nextauth_users")
      .select()
      .eq("email", email)
      .maybeSingle();
    if (error) console.error("[getUserByEmail] Error:", error.message);
    if (!data) return null;
    console.log("[getUserByEmail] Found user:", email);
    return { ...data, emailVerified: data.email_verified ? new Date(data.email_verified) : null };
  },
  async getUserByAccount({
    providerAccountId,
    provider,
  }: {
    providerAccountId: string;
    provider: string;
  }) {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("nextauth_accounts")
      .select("*, nextauth_users(*)")
      .eq("provider_account_id", providerAccountId)
      .eq("provider", provider)
      .maybeSingle();
    if (!data?.nextauth_users) return null;
    return {
      ...data.nextauth_users,
      emailVerified: data.nextauth_users.email_verified ? new Date(data.nextauth_users.email_verified) : null,
    };
  },
  async updateUser(user: { id: string; [key: string]: unknown }) {
    const supabase = createServiceRoleClient();
    console.log("[updateUser] Updating user:", user.id);
    const updates: Record<string, unknown> = { name: user.name, image: user.image };
    if (user.emailVerified !== undefined) {
      updates.email_verified = user.emailVerified instanceof Date
        ? user.emailVerified.toISOString()
        : user.emailVerified;
    }
    const { data, error } = await supabase
      .from("nextauth_users")
      .update(updates)
      .eq("id", user.id)
      .select()
      .maybeSingle();
    if (error) { console.error("[updateUser] Error:", error.message, error.code); throw error; }
    if (!data) { throw new Error(`[updateUser] User not found: ${user.id}`); }
    return { ...data, emailVerified: data.email_verified ? new Date(data.email_verified) : null };
  },
  async linkAccount(account: {
    userId: string;
    type: string;
    provider: string;
    providerAccountId: string;
    refresh_token?: string | null;
    access_token?: string | null;
    expires_at?: number | null;
    token_type?: string | null;
    scope?: string | null;
    id_token?: string | null;
    session_state?: string | null;
  }) {
    const supabase = createServiceRoleClient();
    await supabase.from("nextauth_accounts").insert({
      user_id: account.userId,
      type: account.type,
      provider: account.provider,
      provider_account_id: account.providerAccountId,
      refresh_token: account.refresh_token,
      access_token: account.access_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
      session_state: account.session_state,
    });
    return account;
  },
  async createSession(session: {
    sessionToken: string;
    userId: string;
    expires: Date;
  }) {
    const supabase = createServiceRoleClient();
    console.log("[createSession] Creating session for user:", session.userId);
    const { data, error } = await supabase
      .from("nextauth_sessions")
      .insert({
        session_token: session.sessionToken,
        user_id: session.userId,
        expires: session.expires.toISOString(),
      })
      .select()
      .maybeSingle();
    if (error) { console.error("[createSession] Error:", error.message, error.code); throw error; }
    if (!data) { throw new Error("[createSession] No data returned after insert"); }
    console.log("[createSession] Session created");
    return { ...data, expires: new Date(data.expires) };
  },
  async getSessionAndUser(sessionToken: string) {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("nextauth_sessions")
      .select("*, nextauth_users(*)")
      .eq("session_token", sessionToken)
      .maybeSingle();
    if (!data?.nextauth_users) return null;
    return {
      session: {
        sessionToken: data.session_token,
        userId: data.user_id,
        expires: new Date(data.expires),
      },
      user: {
        ...data.nextauth_users,
        emailVerified: data.nextauth_users.email_verified,
      },
    };
  },
  async updateSession(session: { sessionToken: string; expires?: Date }) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("nextauth_sessions")
      .update({ expires: session.expires?.toISOString() })
      .eq("session_token", session.sessionToken)
      .select()
      .maybeSingle();
    if (error) { console.error("[updateSession] Error:", error.message); throw error; }
    if (!data) return null;
    return { ...data, expires: new Date(data.expires) };
  },
  async deleteSession(sessionToken: string) {
    const supabase = createServiceRoleClient();
    await supabase
      .from("nextauth_sessions")
      .delete()
      .eq("session_token", sessionToken);
  },
  async createVerificationToken(token: {
    identifier: string;
    token: string;
    expires: Date;
  }) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("nextauth_verification_tokens")
      .insert({
        identifier: token.identifier,
        token: token.token,
        expires: token.expires.toISOString(),
      })
      .select()
      .maybeSingle();
    if (error) {
      console.error("[createVerificationToken] Supabase error:", error.message, error.code);
      throw error;
    }
    if (!data) {
      console.error("[createVerificationToken] No data returned after insert — table may not exist");
      throw new Error("Failed to store verification token");
    }
    console.log("[createVerificationToken] Stored token for:", token.identifier);
    return { ...data, expires: new Date(data.expires) };
  },
  async useVerificationToken({
    identifier,
    token,
  }: {
    identifier: string;
    token: string;
  }) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("nextauth_verification_tokens")
      .select()
      .eq("identifier", identifier)
      .eq("token", token)
      .maybeSingle();
    if (error) {
      console.error("[useVerificationToken] Supabase error:", error.message, error.code);
      return null;
    }
    if (!data) {
      console.error("[useVerificationToken] Token not found for identifier:", identifier);
      return null;
    }
    await supabase
      .from("nextauth_verification_tokens")
      .delete()
      .eq("identifier", identifier)
      .eq("token", token);
    console.log("[useVerificationToken] Token verified and deleted for:", identifier);
    return { ...data, expires: new Date(data.expires) };
  },
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: supabaseAdapter as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      async sendVerificationRequest({ identifier: email, url, provider }) {
        if (!process.env.RESEND_API_KEY) {
          // No API key — print the link to the terminal for local testing
          console.log("\n============================================");
          console.log("  MAGIC LINK (no RESEND_API_KEY configured)");
          console.log("============================================");
          console.log(url);
          console.log("============================================\n");
          return;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
          from: provider.from,
          to: email,
          subject: "Sign in to Blue Zone",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
              <div style="text-align:center;margin-bottom:32px">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;background:#0080cc;color:#fff;font-size:20px;font-weight:700">BZ</div>
                <h1 style="margin:12px 0 4px;font-size:24px;color:#111">Blue Zone</h1>
                <p style="margin:0;color:#666;font-size:14px">Health Intelligence</p>
              </div>
              <p style="color:#333;font-size:15px;line-height:1.6">Click the button below to sign in to your Blue Zone account. This link expires in <strong>24 hours</strong>.</p>
              <div style="text-align:center;margin:32px 0">
                <a href="${url}" style="display:inline-block;background:#0080cc;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Sign in to Blue Zone</a>
              </div>
              <p style="color:#999;font-size:13px;line-height:1.5">If you didn&rsquo;t request this email, you can safely ignore it.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
              <p style="color:#bbb;font-size:12px;text-align:center">Blue Zone &mdash; not a medical service. Insights are for informational purposes only.</p>
            </div>
          `,
        });

        if (error) {
          throw new Error(`Resend error: ${error.message}`);
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn:        "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error:         "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch plan from DB — cached in JWT for the session lifetime
        try {
          const supabase = createServiceRoleClient();
          const { data } = await supabase
            .from("nextauth_users")
            .select("plan")
            .eq("id", user.id)
            .maybeSingle();
          token.plan = (data?.plan as string) ?? "free";
        } catch {
          token.plan = "free";
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.plan = (token.plan as string) ?? "free";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow same-origin URLs
      if (new URL(url).origin === baseUrl) return url;
      // Default to dashboard for fully onboarded users
      return `${baseUrl}/app/dashboard`;
    },
  },
};

// Extend next-auth types to include user.id and plan
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    plan?: string;
  }
}
