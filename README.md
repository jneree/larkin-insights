# insights.getlarkin.com

The web page for conversation notes shared from the Larkin app. Static files, served by GitHub Pages.

## How it works

- Share on a conversation page in the app publishes only the sections the person chose
  (summary, notes, to-dos, and optionally how they came across and their insights) to
  the Supabase function `capture-v1-share`, and gets a link: `https://insights.getlarkin.com/#<code>`.
- The code is 128 random bits and sits after `#`, so it never reaches GitHub Pages,
  link-preview services or `Referer` headers.
- `notes.js` reads the code and fetches the sections from the public function
  `capture-v1-shared-notes?code=…` (JSON, no sign-in). It writes them as text, never as HTML.
  A stopped or unknown link shows "These notes aren't shared anymore."
- No transcript, recording, quote or chat is ever uploaded for sharing, and there is no AI on the page.
- Link previews (iMessage, WhatsApp, Slack) show the generic card `images/og.png` for `#<code>`
  links: they cannot see the code, so they cannot show a conversation's title.

## Link previews like Granola's (30 October 2026; needs Vercel)

- A `/n/<code>` link reaches `api/n.js` (Vercel edge function, rewritten in `vercel.json`), which
  answers with `index.html` plus this conversation's `og:title` (its title), `og:description`
  ("Notes shared by Julien · Oct 27, 2026") and `og:image` (`/og/<code>`, drawn by `api/og.js`:
  design B in Figma "Oct 30 Link previews (Claude)", the lime card with the one-colour wordmark,
  the title, the date and "With Julien"). The summary never goes into a preview. `preview.js` holds
  the shared logic; `tests/preview.test.mjs` tests it. `notes.js` reads the code from the path too.
- GitHub Pages can't run the functions, so the site moves to Vercel:
  1. Import this repository in Vercel (no build command; the root is the site).
  2. In Vercel, add the domain `insights.getlarkin.com`; at GoDaddy, change its CNAME from
     `jneree.github.io` to the target Vercel shows (`cname.vercel-dns.com`).
  3. Check `https://insights.getlarkin.com/n/<code>` and `/og/<code>` with a real link.
  4. Set the Supabase secret `LARKIN_SHARE_LINK_STYLE=path`: new links become `/n/<code>`.
     `#<code>` links keep working.
- Previews mean WhatsApp's and Apple's servers fetch the title, date and sharer's name of a link.

The backend (table, functions, tests) lives in `larkin-ios/Backend/supabase`; the share sheet in
`larkin-ios/Apps/LarkinPhone/Sources/CaptureV1/PhoneCaptureV1SharedNotes.swift`.

## Design

The app's 12 October 2026 guideline (Larkin Design System: "App screens" and the Tile component):
the grey page (`#F0F0F0`, dark `#0B0B0B`), one white tile per section with its kind's glossy
28px icon (`images/kind-*.svg`: amber conversation, lime insight, graphite about-you, violet focus,
teal to-do) and its name, sentences at 15/20 and weight 450 with key words in ink and the rest in
one grey, inner cards for items, no capital labels, colour bars or expand controls. Lime only as
the hook's button on its white tile (never on the grey page) and as text in the dark section.
A shared report keeps its own always-dark look (9 October). DM Sans is self-hosted in `fonts/`;
logo files come from the design system in `images/`. Light and dark follow the reader's system.

## Deploy

GitHub Pages from `main`, custom domain from `CNAME`. DNS: a `CNAME` record for `insights`
pointing to the GitHub Pages host. The Content-Security-Policy in `index.html` only allows
requests to the Supabase project, so update it if the project changes.

Never commit real shared notes or transcripts here; use synthetic examples for testing.
