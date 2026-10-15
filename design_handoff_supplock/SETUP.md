# Setup checklist (do these when Claude Code asks)

1. **Install tools**: Node.js LTS (nodejs.org), Git, and Claude Code (`npm install -g @anthropic-ai/claude-code`, then run `claude` in your project folder).
2. **Supabase** (supabase.com, free): New project → copy the **Project URL**, **anon key** and **service role key** (Settings → API). Claude Code will put them in `.env.local`. Never share the service role key.
3. **Resend** (resend.com, free tier): create an API key. To send from your own domain, add the DNS records it shows you.
4. **GitHub** (github.com): create an empty repo. Claude Code can push the code there.
5. **Vercel** (vercel.com, free): Import the GitHub repo → add the same env vars → Deploy. You get a live URL.
6. **Domain (optional)**: buy one (e.g. supplock.app) and add it in Vercel → Domains.

## Before real schools use it
- Pilot with one school first.
- Write a privacy policy and terms. Check your district's student-data rules (e.g. FERPA in the US). Avoid storing student names.
- Turn on Supabase daily backups (paid plan) once real data is in.
- Keep the service role key server-side only.
