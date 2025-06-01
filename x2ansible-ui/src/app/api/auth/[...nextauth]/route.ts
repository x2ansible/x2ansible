import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const allowedEmails = ["rbanda@redhat.com"]; // ✅ allow by email

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      console.log("🔍 user.email:", user.email);
      return allowedEmails.includes(user.email || "");
    },
    async session({ session }) {
      return session;
    },
  },
});


export { handler as GET, handler as POST };
