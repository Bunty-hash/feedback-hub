# Feedback Hub

A React + Vite (TypeScript) website with four feedback forms and a secure admin dashboard.
It uses **GitHub** (source), **Vercel** (hosting) and **Supabase** (database and authentication) only.

## What is included

| Area | Details |
|---|---|
| Public site | Home page with four category cards; one independent form per category; validation; success and error messages; responsive layout |
| Admin dashboard (`/admin`) | Sign-in; totals; counts and average ratings by category; positive / neutral / negative split; search; category and date filters; individual response view; CSV export |
| Database | `supabase/schema.sql`: `feedback` table, Row Level Security, admin allow-list |

Sentiment is derived from the overall rating: 4–5 positive, 3 neutral, 1–2 negative.

## Set-up order

1. **Supabase**: run `supabase/schema.sql` in SQL Editor.
2. **Supabase**: Authentication > Users > Add user (email and password, auto-confirm). Then run the commented "Make yourself an admin" block at the bottom of `schema.sql` with that email.
3. **Supabase**: Authentication > Providers > Email: switch off "Allow new users to sign up" (admins are added manually).
4. **GitHub**: push this folder to a new repository.
5. **Vercel**: Add New Project > import the repository (framework: Vite is detected). Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings > API in Supabase), then deploy.
6. **Supabase**: Authentication > URL Configuration: set Site URL to your Vercel address.

Never use the `service_role` key anywhere in this project. The anon (publishable) key is safe in the browser because Row Level Security protects the data.

## Local development

```bash
cp .env.example .env.local   # then fill in the two values
npm install
npm run dev
```

## Security model

- Visitors can **insert only**; they cannot read, edit or delete anything.
- Only users listed in `admin_users` can read feedback (policy uses `is_admin()`).
- `admin_users` cannot be reached through the API.
- Participant name is optional; no email, phone or other contact details are collected.

## Test checklist (after deployment)

1. Submit one response on each of the four forms; confirm each shows the thank-you message.
2. Sign in at `/admin`; confirm four new rows appear with the right category.
3. Open each row with **View** and check ratings and comments.
4. Filter by category and date, search a word, and export CSV.
5. While signed out, confirm `/admin` shows only the sign-in form.
