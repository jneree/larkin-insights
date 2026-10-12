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
- Link previews (iMessage, WhatsApp, Slack) show the generic card `images/og.png`; they
  cannot see the code, so they cannot show a conversation's title.

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
