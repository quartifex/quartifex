# Kaksha quality audit, 19 Oct 2026

What this pass checked: every step of the core flow (setup → class → test → mark → results
→ report card) and the site form, in all twelve states: idle, loading, success, partial,
empty, no results, recoverable error, unrecoverable error, offline, limit, permission and
destructive. It then checked that the same situations look and read the same on every
screen, and broke the product on purpose.

The evidence is the running build. Every claim has a Playwright test against the
production build (`apps/kaksha/e2e/states.spec.ts`, `site.spec.ts`, `app.spec.ts`);
screenshots are written to `reports/kaksha/.shots/`, which git ignores. Each claim
below was re-run after its fix. Any claim without a test or a screenshot was removed from
this report.

## Findings

| # | Where | Problem | Stakes | Fix made | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Mark → any tap | A write that failed was silent, and the line under the controls said "Each tap is saved" whatever happened. | Marks lost | Every marking write goes through `tracked()`. A failure is queued, shown where the teacher is looking ("Taps not saved: 1." + the cause + "Earlier marks are safe."), retried in order on **Try again**, and leaving the page asks first. The line says "Saved on this phone at {time}." only once storage has the write. | `states.spec` "a tap that fails to save…" (storage made to refuse writes mid-session, then restored; the row count is checked before and after); `.shots/states-save-failed.png`; unit `saveState.test.ts` | Done |
| 2 | Any screen | An error thrown while drawing a screen left a blank page. | Dead end; looks like data loss | `ScreenBoundary` shows what happened, "Marks saved before this are still on this phone.", and Try again, Go to Today and Report a problem. Details for support are folded away. Moving to another screen clears it. | `states.spec` "a screen that crashes…" (storage reads broken mid-session); `.shots/states-crash.png` | Done |
| 3 | App open | When the browser refused to open storage (private windows, some locked-down phones), the error was swallowed and every screen then failed. | Marks entered there would never save | A plain screen instead: "This browser is not letting the app save. … Open the app in a normal window." Full storage gets its own wording. | `states.spec` "a browser that blocks storage…"; `.shots/states-storage-blocked.png` | Done |
| 4 | Results, Class | There was no way to delete a test or a class (the database could, the screens couldn't), so a mistake stayed for good. | Blocked task | `DeleteButton`: a sheet that counts what goes ("This removes the test and its {marks} marks for {students} students."), with Delete and Keep it, then Undo for 12 seconds. Undo puts back every row as it was. | `states.spec` "deleting a test…" and "Keep it leaves the class untouched…" (row counts checked before, after and on undo); `.shots/states-undo-delete.png` | Done |
| 5 | Notes → delete | The browser's own `confirm()` box, then gone for good. | Annoyance, small loss | Deletes at once, then "Note deleted." with Undo. | `states.spec` "a note deletes at once…" | Done |
| 6 | New class, Onboarding, New test, Roster add | A double tap made two classes or two students. A failed save gave no message. | Duplicate data | `useAction`: a second tap does nothing while the first is saving, the button shows "Saving…", and a failure says so next to the button and keeps the form. A new class and its school are written in one transaction. | `states.spec` "a double tap on Next makes one class…" (database count = 1; double-tapped Add makes one student) | Done |
| 7 | Onboarding → Add students | If saving the profile failed after the class was made, Continue made the class again. | Duplicate data | The class id is recorded straight after its transaction. Errors keep the names typed. | Code change; covered by the onboarding e2e run | Done |
| 8 | Notes → add | No limit on length, no feedback on failure, and double submits were possible. | Annoyance | 500-character limit with a live count. One submit at a time. On failure: "The note did not save. Your text is still here." | `states.spec` (600 characters typed → 500 kept, "500 of 500 characters"; double-clicked Add makes one note) | Done |
| 9 | Add one student | "this roll number is already used" (a fragment) and a generic no-name error. | Vague copy | "Roll 1 is already used. Pick another number, or leave it empty for 2." and "Type the student's name to add them." On success: "Added Asha Aamla, roll 1." | `states.spec` double-tap test | Done |
| 10 | Desktop search | A search with no results showed nothing. | Silent | "No student named “Zzyzx”. Check the spelling, or type part of the name." | `states.spec` "searches with no results…" | Done |
| 11 | Class → Students search and filters | "No one matches." with no way out. | Vague copy | The search is echoed back, filters are explained in numbers, and **Clear search and filters** appears. | `states.spec` same test | Done |
| 12 | Every failure | No route to a person. | Dead end | **Report a problem** in More and on every failure screen. It says reports are public and must not include students' names or marks, gives the version to copy, and opens a pre-filled GitHub issue that carries no student data. | `states.spec` "Report a problem is reachable…" (link checked for demo names) | Done; see decision 1 |
| 13 | Not found (deleted or old link) | Some screens showed only "We could not find that", with no back button on phones. Roster showed a blank page. | Dead end | `NotFound`: the reason it may be missing, plus Go to Today. | `states.spec` "an old link to something deleted…" | Done |
| 14 | First-use empties (Class tests, Insights) | Empty states with no action. | Dead end | A New test or Add a class button inside each one. The floating New test button hides while the empty state carries it, so there are never two. | `app.spec` onboarding and undo runs (they click the single New test button) | Done |
| 15 | More → Delete all data | It said "This cannot be undone" with no numbers. | Data loss | It now gives the exact counts of classes, students and tests and the backup age, or says no backup was ever made. It still needs the typed word. | Copy and code; `app.spec` backup/wipe/restore passes through it | Done |
| 16 | App update | A new version waited silently. | Silent | "A new version is ready. It opens next time, or now." with **Update now**. It never reloads by itself mid-marking. | Code; needs two deployments to observe, see open issue 3 | Not evidenced |
| 17 | Loading | A blank area while a screen's code loads. | Annoyance | Blank for the first 600 ms only, then "Opening…". | Code; screens load under 600 ms in tests, so it is not seen there | Not evidenced |
| 18 | Site → contact form | Any 429, 502 or offline failure said "That did not go through"; the form was meant to clear on success but did not (the handler lost its reference). | Lost message | Its own sentence for each case, every one ending "Your message is still here". The form clears only once sent. | `site.spec` "a message that does not send…" (429, 502, 503, offline, then 200; field value checked each time) | Done |
| 19 | Hindi → class progress | The line showed a raw `{then}` placeholder (the key was renamed in English only). | Visibly broken | Fixed; the locale test now passes. | `i18n.test.ts` (it was failing) | Done |
| 20 | Words across screens | "child/children" on 20 screens and "student" on 47; परीक्षा and टेस्ट mixed; रिपोर्ट कार्ड and प्रगति पत्र mixed. | Inconsistency | One word per concept (student/विद्यार्थी, test/टेस्ट, report card/प्रगति पत्र), recorded in PATTERNS.md. The site's demo label now matches the app. | Strings check: no "child" left in `en.json`, no परीक्षा in `hi.json` | Done |
| 21 | Numbers and dates | Percentages had one decimal on some screens and were rounded on others. Notes used "22 Sep" while everything else used DD/MM/YYYY. | Inconsistency | Whole percentages everywhere (`formatPercent`), and DD/MM/YYYY for every full date. | `i18n.test.ts` (67%); `screens.spec` captures | Done |
| 22 | Site | The Hindi product page was removed as asked. `/hi` now redirects to `/`; the app keeps Hindi. | n/a | 308 redirect plus a page-level redirect; the language switch is gone. | `site.spec` (`/hi` lands on `/`) | Done |
| 23 | Site hero | The back phone was cut off at most widths, and the single phone at phone widths. | Looks broken | The phones size their own box; nothing clips. | `site.spec` "hero phones are drawn in full at every width" (320 to 1440 px) | Done |

Brand change asked for during the pass: the K mark and the app and site tints now pair
blue with mint green (#7DEBC0) instead of lavender. On mint, text is ink, because blue on
mint is 4.4:1 and fails AA for small text. The site speaks to "teachers and educators".

## Drills run (Phase 3)

| Drill | Result |
| --- | --- |
| Network off mid-session | The app makes no requests once installed (existing offline test). The site form keeps the message and says it is offline. |
| Server error, rate limit | Site form: 502, 503 and 429 each have their own sentence, and the input is kept. |
| Irreversible step fails halfway | A delete that fails says "Nothing was deleted". Class creation is one transaction. |
| Invalid, short and long input | Empty name, duplicate roll, notes over 500 characters, the backup passphrase minimum (existing), and wrong delete word (existing). |
| Empty lists, search for nothing | Desktop search, class search, filters, no tests, no classes. |
| Quota | The only limit in the product is phone storage. Full storage while marking and full storage at open each have their own wording. |
| Double taps | Class, test, roster and note creation, and the delete button. |
| Leave and return | Closing with unsaved taps asks first. Marking resumes at the first gap (existing test). |
| Permission | The PIN lock is the only permission and its wrong-PIN state was already covered. A browser that refuses storage is covered by drill 3. |

## Checks on the final build

- Unit: 48 pass. Typecheck and lint: pass.
- Playwright (`--workers=1`): 38 tests; all pass except 1 skipped (the Hindi site, now removed). The slow-3G first-visit test is a known failure marked `test.fail`, and it still misses.
- axe: 132 page states, 0 violations.
- `/app` initial JS: 125.7 kB gzip of 150. Today now loads on demand. First visit on Lighthouse's mobile network with a 6x slower CPU: 2.7 to 2.8 s.

## Open issues

1. **First visit is close to the 3 s line.** On the Lighthouse network it is 2.7 to 2.8 s, against 2.1 s on 18 Oct. Most of the rise came with the dashboard and brand overhaul, not this pass. Visits from cache are 1.2 to 1.3 s, up from 0.6 s. The next step is to trace what runs at start-up before adding anything else to the first screen.
2. **Long frames on the site.** Scrolling the site shows 4 to 5 long frames against a budget of 4, so it is borderline and varies from run to run. Not a state problem, so it was left alone under "change the smallest thing".
3. **The update banner (16) and the "Opening…" text (17) are written but not observed.** The banner needs two real deployments; the text needs a load slower than 600 ms. Both are listed as not evidenced rather than done.
4. **The Figma file still shows the lavender brand and the removed Hindi site.**

## Patterns added

All of these are in `apps/kaksha/PATTERNS.md`:

- **Words:** one term per concept.
- **Numbers and dates:** one format each.
- **Saved line and save failed:** `SaveStatus` and `tracked`.
- **Form save failed:** `useAction`.
- **Undo bar:** `UndoBar` and `offerUndo`.
- **Delete with count and Undo:** `DeleteButton`.
- **Empty states:** first use, not found (`NotFound`), and no results.
- **Loading.**
- **Screen problem:** `ScreenProblem` and `ScreenBoundary`.
- **Report a problem.**
- **Update ready.**
- **Site form status.**
- **Navigation landmarks.**

## Decisions needed

1. **Where a teacher's report should go.** Today it is a public GitHub issue, which most teachers will not use and which must never hold student data. A support email or a WhatsApp number would be better. Once you name one, I'll add it next to the GitHub link.
2. **The contact form's send key.** Until `KAKSHA_RESEND_KEY` and the from and to addresses are set, every message gets "not switched on yet". The message is kept, but nothing is sent.
3. **The slow-3G first visit.** It is still over 3 s, and the stack you fixed sets that. The options are unchanged: Preact compat, or `idb` instead of Dexie.
