# Kaksha patterns

One way to handle each situation that comes up more than once. A new screen uses these
before it makes anything new. Each entry names the component, when to use it, and the
copy template. Copy follows one rule throughout:

> **What happened + what it means for the teacher + what to do next.** About 20 words
> or fewer, next to its cause, calm on anything that risks marks, and the same words
> for the same situation everywhere.

## Words

| Concept | English | Hindi | Never |
| --- | --- | --- | --- |
| A person in a class | student, students | विद्यार्थी | child, children, kid; बच्चे, छात्र |
| Something that is marked | test | टेस्ट | exam, assessment; परीक्षा |
| The printed summary for one student | report card | प्रगति पत्र | report; रिपोर्ट कार्ड |
| Entering answers | mark, marking | जाँचना | grade, score (as a verb) |
| Where data lives | on this phone | इसी फ़ोन पर | the cloud, our servers |

The product page (`src/site`) speaks to adults about the job, so it may say "children"
in prose; any label it shares with the app (the demo label) uses the app's words.

## Numbers and dates

| What | Format | Function |
| --- | --- | --- |
| Percentages | Whole numbers: `67%`; `–` when there is nothing to show | `formatPercent` |
| Counts | Indian grouping, Latin digits in both languages: `1,00,000` | `formatNumber` |
| Full dates | `DD/MM/YYYY`, as in a register | `formatDate` |
| Chart axis months | Short month: `Sep`, `सित॰` | `formatShortMonth` |
| Today's heading | Written out: `Sunday, 18 October` | Home only |
| Times | `10:42 am` | `toLocaleTimeString` in `SaveStatus` |

## Saving

**Saved line** (`SaveStatus`, in `src/product/SaveStatus.tsx`). Under every marking
control. It says "Saved on this phone at {time}." only after storage has the write;
"Saving…" if a write takes longer than 400 ms. Every marking write goes through
`tracked()` in `src/lib/saveState.ts`, so the line cannot claim what did not happen.

**Save failed** (same component). Red notice where the saved line was:
"Taps not saved: {n}." + the cause + "Earlier marks are safe." Buttons: **Try again**
(re-runs the failed writes in order) and **Get help** (Report a problem). The taps stay
on screen; leaving the page asks first. If Try again fails, add: "Still not saved. Make a
backup now…". Causes:

- full storage: "The phone's storage is full. Free some space, then try again."
- blocked: "This browser stopped saving. … Try again, or reload the app."
- other: "The phone did not accept them. … Try again."

**Form save failed** (`useAction` in `src/product/useAction.ts` + `common.saveFailed`).
Any button that creates something: one tap only while it saves (label becomes
"Saving…"), and on failure "That did not save: the phone's storage refused it. What you
typed is still here. Try again." next to the button. Never clear the form on failure.

## Taking things back

| Situation | Pattern | Copy |
| --- | --- | --- |
| A tap while marking | Undo button beside the controls; puts back the value and the position | "Undone" (spoken to screen readers) |
| Something small and easy to recreate (a note) | Delete at once, then `offerUndo` | "Note deleted." [Undo] → "Note is back." |
| Something that holds marks (a test, a class) | `DeleteButton`: a sheet that counts what goes, then Undo | "Delete {name}?" "This removes the test and its {marks} marks for {students} students." [Delete] [Keep it] → "Deleted {name}." [Undo] |
| Everything on the phone | Typed confirmation with exact counts and backup age | "This removes {classes} classes, {students} students and {tests} tests…" + "Your last backup is {n} days old…" |

The Undo bar (`UndoBar`) lasts 12 seconds, sits above the tabs on phones and bottom left
on wide screens, and replaces any earlier offer. A delete confirmation always has a
"Keep it" button beside the destructive one; the destructive button is `btn--danger`
and is never the default focus.

## Empty, not found, no results

| Situation | Component | Must have |
| --- | --- | --- |
| First use (no classes, no tests) | `Empty` with a primary button inside | Why it is empty + the one action that fills it ("New test", "Add a class") |
| Not on this phone (deleted, old link) | `NotFound` | "We could not find that on this phone." + "It may have been deleted, or the link is from another phone." + Go to Today |
| A search with no results | Plain line where results would be | The search echoed: "No student named “{q}”." + how to widen it, and a clear button where there are filters |
| A filter with no members | Same line | What the filter means, in numbers ("No student is below half in the latest test.") + Clear |

## Loading

Nothing for the first 600 ms (most screens open faster), then "Opening…". Buttons that
save show "Saving…" or "Deleting…" and are disabled while they work.

## Failures

**Screen problem** (`ScreenProblem` in `src/product/ErrorBoundary.tsx`). A screen that
throws, a browser that will not open storage, or a screen that is not yet saved for
offline use. Card with: title (what happened), one line (why, without blame), the
reassurance "Marks saved before this are still on this phone.", and three actions:
Try again, Go to Today, Report a problem. Details for support are folded away. No
playful art on this card.

**Report a problem** (`/more/problem`). The escalation route from every failure. Says
reports are public and must not include students' names or marks; gives the app and
browser version to copy; opens a pre-filled GitHub issue.

**Update ready** (`UpdateBanner`). "A new version is ready. It opens next time, or now."
[Update now]. Never reloads by itself, so marking in progress is not interrupted.

## Product page form

Status line under the Send button, `role="status"`, always starting "Sent." or "Not
sent:", and on any failure "Your message is still here". Offline, rate limit (5 an hour),
server error and form-switched-off each have their own sentence.

## Navigation

The rail (wide screens) and bottom tabs (phones, top-level screens only) never move.
Every inner screen has a back button at the top left that goes to its parent, not
browser history. Primary actions sit at the bottom of the content on phones
(`sticky-actions`) and in the top bar's action slot for secondary actions (print,
delete).
