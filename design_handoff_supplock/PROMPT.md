# Paste this into Claude Code

I'm building **Supplock**, a real web app for real schools. It's **not** a demo: there is **no demo data, no seed file and no demo accounts**. The folder `design_handoff_supplock/` contains a working HTML prototype and a full spec.

**I'm not a developer, so guide me one small step at a time.** Give me one instruction, then wait for me to say "done" before the next. When I need to do something in Supabase or another website, tell me exactly which button to click. When I need to run SQL, open the file in TextEdit for me (`open -e <file>`) so I can copy it. Don't paste secret keys into chat.

First read `design_handoff_supplock/README.md` fully. Then read `prototype/store.js`: it is the source of truth for the business rules, but ignore its demo/seed data. Then look at the prototype HTML screens.

Build it with **Next.js (App Router) + TypeScript + Supabase (Postgres, Auth, Storage, Row Level Security) + Resend**, deployed to Vercel. Match the prototype's look closely. Reuse `icons.js` and `blocks.js`.

Milestones. Stop after each one, tell me in plain words how to test it, and wait for my OK:
1. **Setup**: Next.js app, Supabase connection, `.env.local` (walk me through filling it in), and **one** SQL migration file with every table, including Spaces, plus RLS so each school only sees its own data. Add a simple setup-check page.
2. **Accounts & schools**: Register school (the first person becomes admin and gets a unique school code, with an optional logo), Join as teacher (with the school code), Sign in, Sign out, Forgot password, and the school logo/name in the headers. No demo-account buttons.
3. **Teacher**: inventory list (no prices or vendors), request popup, custom request, laptop request, My requests.
4. **Admin approvals**, with the exact stock rules and notifications.
5. **Inventory**: add/edit items, pack sizes, icon picker, shopping list, reorders, receiving, Excel export, and **Import from Excel** so I can upload my real supply list.
6. **Laptops.**
7. **Spaces**: classroom and subject inventories, counts, placement prompt, Excel export.
8. **To-do & Gazette.**
9. **Transaction log.**
10. **Email notifications** (Resend).
11. **Go live**: put the code on GitHub and deploy to Vercel, so I get a real web address I can share.

Keep all stock-changing logic on the server or in database functions, never in the browser.
