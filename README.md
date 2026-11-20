# Student Grievance Redressal Management System (SGRMS)

A working web application for an autonomous engineering institute: students file grievances,
named officers process them against working-day deadlines, and cases that miss a deadline move
up the ladder on their own.

Two files:

- `grievance-system.jsx` — the running application (React, single file, no backend needed to demo)
- `schema.sql` — the normalised MySQL schema for deployment

## Sign in

Password for every demonstration account is `demo`.

| Account | Who they are | What to look at |
|---|---|---|
| `S2201` | Aarav Sharma, B.Tech ME, Sem 5 | File a grievance, reply to a clarification, rate a resolution, appeal |
| `S2202` | Isha Patil, B.Tech CSE, Sem 7 | A confidential ragging report and a scholarship case in escalation |
| `OFF-ME` | Department Grievance Officer, ME | Level 1 queue, enquiry notes, issuing an order |
| `HOD-CSE` | Head of Department, CSE | Escalated departmental cases, department analytics |
| `DEAN` | Dean, Student Affairs | Institution-wide view, critical cases, confidential access |
| `COMM` | Convener, Grievance Redressal Committee | Ragging and harassment cases under restricted workflow |
| `APPEL` | Appellate Authority | Appeals against departmental orders |
| `ADMIN` | IQAC / System Administrator | Categories, timelines, roles, full audit log |

Open `OFF-ME` and `S2201` in turn to watch one case travel end to end.

## What the system does

**Filing.** Three-step form: category and sub-category, then the statement with evidence and a
confidentiality choice, then a review screen that states in advance who will receive the case and
by when they must reply. Student details are read from the ERP record and never re-typed.

**Numbering.** Every case gets a permanent reference in the form `GRV/ME/2026/000125`.

**Routing.** Category determines the entry level. Most cases start with the Department Grievance
Officer; staff misconduct, fees and placement start with the HOD; ragging and harassment go
straight to the Grievance Committee under a sealed-identity workflow; health-and-safety cases go
to the Dean with a two-day statutory clock.

**The clock.** Deadlines are counted in working days — 3 / 5 / 7 / 15 / 15 across the five levels,
all editable by the administrator. The strip of segments beside each case is one segment per
working day; it fills as time is consumed and turns maroon on breach.

**Escalation.** An engine runs on load: it sends a reminder one day before a deadline and, when a
deadline passes, moves the case to the next authority, resets the clock, writes the reason into the
audit trail and notifies both the student and the receiving officer. Cases awaiting a student reply
are excluded, so no student is penalised for an officer's clock.

**Confidentiality.** Confidential cases are invisible to departmental staff. The Dean, the Committee
and the Appellate Authority see them in full; the administrator sees the case exists but not its
content, and that access attempt is logged.

**Resolution and feedback.** The officer records findings, action taken, corrective measure and the
text the student receives. The student rates it 1–5 and either accepts — which closes the case — or
rejects it, which opens the reconsideration route to the Appellate Authority.

**Analytics.** Category mix, filed-against-closed by month, case mix, department performance table
with average days, SLA compliance and satisfaction, plus recurring-problem detection. CSV export and
print-to-PDF are formatted for IQAC, NAAC and NBA files.

**Assistant.** Category match, severity suggestion, duplicate detection, tone reading, extractive
summary, comparable past cases and a suggested line of action. Every output is labelled advisory;
nothing is decided by it.

**Audit trail.** Submission, assignment, notes, clarifications, escalations, orders, feedback,
appeals and closure are all written to a log that cannot be edited from the interface.

## Running it

The `.jsx` file runs as-is in a React environment with `recharts` and `lucide-react` available.
For a standalone build:

```bash
npm create vite@latest sgrms -- --template react
cd sgrms && npm i recharts lucide-react
# replace src/App.jsx with grievance-system.jsx, then
npm run dev
```

State persists in browser storage so the demonstration survives a reload. Restore the sample
register from **Administration → Data**.

## Deployment notes

The prototype keeps the register in the browser. For institutional use, put the same domain logic
behind an API:

- **Backend** — Node/Express or Django REST; the schema in `schema.sql` maps one-to-one onto the
  entities used here.
- **Authentication** — institutional SSO or LDAP, argon2id for any local passwords, server-side
  sessions with rotation, optional MFA for authorities.
- **Attachments** — object storage with server-side encryption; the database keeps only the key and
  a SHA-256 checksum, and every download is written to `confidential_access_log`.
- **Escalation** — move the engine to a scheduled job (cron or Celery beat) running each morning
  against `v_open_grievance`, so escalation does not depend on anyone opening the site.
- **Notifications** — a queue with pluggable channels: SMTP, an SMS gateway, and WhatsApp Business
  API where the institute has one.
- **ERP integration** — nightly pull into `student` with `erp_sync_at`, plus a lookup on login so a
  mid-semester division change is reflected immediately.
- **Hardening** — parameterised queries throughout, output escaping, CSRF tokens on state-changing
  routes, rate limiting on filing, TLS everywhere, and daily encrypted backups with a tested restore.
