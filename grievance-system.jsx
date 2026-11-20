import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Shield, Bell, LogOut, Plus, Search, Filter, ChevronRight, ChevronLeft, Clock,
  AlertTriangle, CheckCircle2, FileText, Paperclip, Send, Star, Lock,
  Download, Printer, RefreshCw, Eye, MessageSquare,
  ArrowUpRight, Gavel, Sparkles, ClipboardList, X, Check
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

/* ============================================================================
   STUDENT GRIEVANCE REDRESSAL MANAGEMENT SYSTEM (SGRMS)
   Single-file working prototype — Institute of Engineering & Technology (demo)
   Covers: student portal, multi-level workflow, SLA + auto-escalation, RBAC,
   confidential handling, notifications, resolution & feedback, appeals,
   analytics/reports, admin configuration, audit trail, advisory AI assist.
   ========================================================================== */

/* ---------------------------------- theme --------------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Spectral:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.sg{--ink:#0F1E2B;--ink-2:#2A3F4F;--paper:#F4F6F3;--card:#FFFFFF;--rule:#D9DFD8;
    --seal:#8C1D40;--amber:#B26A00;--ok:#146B4F;--info:#1F5673;--muted:#6B7C88;
    font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:var(--paper);}
.sg *{box-sizing:border-box}
.sg-display{font-family:'Spectral',Georgia,serif;letter-spacing:-0.01em}
.sg-mono{font-family:'IBM Plex Mono',ui-monospace,monospace;font-variant-ligatures:none}
.sg-card{background:var(--card);border:1px solid var(--rule);border-radius:4px}
.sg-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.14em;
    text-transform:uppercase;color:var(--muted)}
.sg-btn{font-family:'Inter';font-size:13px;font-weight:600;border-radius:3px;
    border:1px solid var(--ink);background:var(--ink);color:#fff;padding:8px 14px;cursor:pointer;
    display:inline-flex;align-items:center;gap:7px;transition:opacity .15s}
.sg-btn:hover{opacity:.86}
.sg-btn:disabled{opacity:.4;cursor:not-allowed}
.sg-btn.ghost{background:transparent;color:var(--ink);border-color:var(--rule)}
.sg-btn.ghost:hover{border-color:var(--ink)}
.sg-btn.seal{background:var(--seal);border-color:var(--seal)}
.sg-btn.sm{padding:5px 10px;font-size:12px}
.sg-in{width:100%;font-family:'Inter';font-size:13.5px;padding:9px 11px;border:1px solid var(--rule);
    border-radius:3px;background:#fff;color:var(--ink);outline:none}
.sg-in:focus{border-color:var(--info);box-shadow:0 0 0 3px rgba(31,86,115,.12)}
.sg-lbl{display:block;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
    color:var(--ink-2);margin-bottom:5px}
.sg-th{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
    color:var(--muted);text-align:left;padding:9px 10px;border-bottom:1px solid var(--rule);white-space:nowrap}
.sg-td{padding:11px 10px;border-bottom:1px solid var(--rule);font-size:13px;vertical-align:top}
.sg-row:hover{background:#FAFBFA;cursor:pointer}
.sg-tab{font-size:13px;font-weight:600;padding:9px 2px;border-bottom:2px solid transparent;
    color:var(--muted);cursor:pointer;white-space:nowrap;background:none;border-top:0;border-left:0;border-right:0}
.sg-tab[data-on="1"]{color:var(--ink);border-bottom-color:var(--seal)}
.sg-seg{display:inline-flex;gap:2px;align-items:center}
.sg-seg i{display:block;width:7px;height:12px;border-radius:1px;background:var(--rule)}
.sg-link{color:var(--info);text-decoration:underline;text-underline-offset:2px;cursor:pointer;background:none;border:0;padding:0;font-size:inherit;font-family:inherit}
.sg-scroll::-webkit-scrollbar{height:6px;width:6px}
.sg-scroll::-webkit-scrollbar-thumb{background:var(--rule);border-radius:3px}
@media print{.sg-noprint{display:none!important}}
@media (prefers-reduced-motion:reduce){.sg *{animation:none!important;transition:none!important}}
`;

/* -------------------------------- reference -------------------------------- */
const DEPARTMENTS = [
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "ENTC", name: "Electronics & Telecommunication" },
  { code: "CIVIL", name: "Civil Engineering" },
];

const LEVELS = [
  { level: 1, key: "OFFICER", label: "Department Grievance Officer" },
  { level: 2, key: "HOD", label: "Head of Department" },
  { level: 3, key: "DEAN", label: "Dean / Registrar" },
  { level: 4, key: "COMMITTEE", label: "Grievance Redressal Committee" },
  { level: 5, key: "APPELLATE", label: "Appellate Authority" },
];

const DEFAULT_SLA = [
  { level: 1, days: 3 }, { level: 2, days: 5 }, { level: 3, days: 7 },
  { level: 4, days: 15 }, { level: 5, days: 15 },
];

const cat = (id, name, subs, priority, startLevel, opts = {}) => ({
  id, name, subs, priority, startLevel, active: true,
  confidentialDefault: !!opts.conf, slaOverride: opts.sla || null,
});

const DEFAULT_CATEGORIES = [
  cat("ACAD", "Academic", ["Syllabus coverage", "Credit / grade dispute", "Course registration", "Study material"], "Medium", 1),
  cat("EXAM", "Examination", ["Hall ticket", "Revaluation", "Result discrepancy", "Malpractice case", "Exam form / fee"], "High", 1),
  cat("ATTN", "Attendance", ["Attendance shortage", "Wrong marking", "Medical leave adjustment"], "Medium", 1),
  cat("TT", "Timetable", ["Clashing lectures", "Frequent rescheduling", "Practical batch timing"], "Low", 1),
  cat("TL", "Teaching-Learning", ["Teaching quality", "Classes not conducted", "Doubt-solving support"], "Medium", 1),
  cat("STAFF", "Faculty / Staff related", ["Misconduct by staff", "Unfair treatment", "Non-availability"], "High", 2),
  cat("HOST", "Hostel", ["Room allotment", "Mess food", "Water / electricity", "Cleanliness", "Warden issue"], "Medium", 1),
  cat("LIB", "Library", ["Book unavailability", "Fine dispute", "Timings", "Digital access"], "Low", 1),
  cat("LAB", "Laboratory", ["Equipment not working", "Consumables shortage", "Lab safety"], "High", 1),
  cat("INFRA", "Infrastructure", ["Classroom condition", "Washrooms", "Drinking water", "Power / fans", "Wi-Fi"], "Medium", 1),
  cat("TRANS", "Transport", ["Bus route", "Bus timing", "Bus condition", "Pass / fee"], "Medium", 1),
  cat("CANT", "Canteen / Food", ["Food quality", "Hygiene", "Overcharging"], "Medium", 1),
  cat("FEE", "Scholarships / Fees", ["Scholarship not credited", "Fee refund", "Fee receipt", "Instalment request"], "High", 2),
  cat("ADMIN", "Administration", ["Certificate / bonafide", "Transcript", "Document delay", "Office behaviour"], "Medium", 1),
  cat("IT", "IT / ERP", ["ERP login", "Marks not visible", "Portal error", "Email account"], "Medium", 1),
  cat("PLACE", "Placement", ["Eligibility criteria", "Company communication", "Training quality"], "Medium", 2),
  cat("INTERN", "Internship", ["Approval delay", "Credit mapping", "Stipend / offer issue"], "Medium", 2),
  cat("DISC", "Discipline", ["Disciplinary action appeal", "Peer conflict", "Property damage"], "High", 2),
  cat("HARASS", "Harassment / Discrimination", ["Sexual harassment", "Caste / religion based", "Gender based", "Cyber harassment"], "Critical", 4, { conf: true }),
  cat("ACCESS", "Accessibility", ["Ramp / lift access", "Assistive technology", "Exam accommodation"], "High", 2),
  cat("RAG", "Ragging", ["Physical ragging", "Verbal ragging", "Online ragging"], "Critical", 4, { conf: true, sla: 3 }),
  cat("HEALTH", "Health and Safety", ["Medical facility", "Campus safety", "Fire / electrical hazard", "Emergency response"], "Critical", 3, { sla: 2 }),
  cat("OTH", "Other", ["General"], "Low", 1),
];

/* users: authentication is simulated; production uses institutional SSO/LDAP */
const USERS = [
  { id: "S2201", pin: "demo", role: "STUDENT", name: "Aarav Sharma", dept: "ME", prog: "B.Tech Mechanical", sem: 5, div: "A", hostel: "Boys Hostel B / 204", year: "2026-27", email: "aarav.s@iet.edu.in", phone: "+91 98•••• ••21" },
  { id: "S2202", pin: "demo", role: "STUDENT", name: "Isha Patil", dept: "CSE", prog: "B.Tech Computer Science", sem: 7, div: "B", hostel: "Girls Hostel A / 112", year: "2026-27", email: "isha.p@iet.edu.in", phone: "+91 97•••• ••08" },
  { id: "OFF-ME", pin: "demo", role: "OFFICER", level: 1, name: "Prof. R. Kulkarni", dept: "ME", title: "Department Grievance Officer — ME" },
  { id: "OFF-CSE", pin: "demo", role: "OFFICER", level: 1, name: "Prof. S. Nair", dept: "CSE", title: "Department Grievance Officer — CSE" },
  { id: "OFF-ENTC", pin: "demo", role: "OFFICER", level: 1, name: "Prof. D. Bhosale", dept: "ENTC", title: "Department Grievance Officer — ENTC" },
  { id: "OFF-CIVIL", pin: "demo", role: "OFFICER", level: 1, name: "Prof. K. Shirke", dept: "CIVIL", title: "Department Grievance Officer — CIVIL" },
  { id: "HOD-ME", pin: "demo", role: "HOD", level: 2, name: "Dr. A. Deshmukh", dept: "ME", title: "Head of Department — ME" },
  { id: "HOD-CSE", pin: "demo", role: "HOD", level: 2, name: "Dr. M. Iyer", dept: "CSE", title: "Head of Department — CSE" },
  { id: "HOD-ENTC", pin: "demo", role: "HOD", level: 2, name: "Dr. S. Kale", dept: "ENTC", title: "Head of Department — ENTC" },
  { id: "HOD-CIVIL", pin: "demo", role: "HOD", level: 2, name: "Dr. J. Pawar", dept: "CIVIL", title: "Head of Department — CIVIL" },
  { id: "DEAN", pin: "demo", role: "DEAN", level: 3, name: "Dr. P. Rao", title: "Dean, Student Affairs", confidential: true },
  { id: "COMM", pin: "demo", role: "COMMITTEE", level: 4, name: "Dr. N. Joshi", title: "Convener, Grievance Redressal Committee", confidential: true },
  { id: "APPEL", pin: "demo", role: "APPELLATE", level: 5, name: "Dr. V. Menon", title: "Appellate Authority / Director", confidential: true },
  { id: "ADMIN", pin: "demo", role: "ADMIN", name: "System Administrator", title: "IQAC / System Administrator" },
];

const userById = (id) => USERS.find((u) => u.id === id);
const holderFor = (level, dept) => {
  if (level === 1) return `OFF-${dept}`;
  if (level === 2) return `HOD-${dept}`;
  if (level === 3) return "DEAN";
  if (level === 4) return "COMM";
  return "APPEL";
};

const STATUS = {
  SUBMITTED: { label: "Submitted", tone: "info" },
  ASSIGNED: { label: "Assigned", tone: "info" },
  IN_REVIEW: { label: "Under review", tone: "info" },
  CLARIFICATION: { label: "Awaiting student reply", tone: "amber" },
  ESCALATED: { label: "Escalated", tone: "seal" },
  RESOLVED: { label: "Resolved — awaiting feedback", tone: "ok" },
  CLOSED: { label: "Closed", tone: "grey" },
  REOPENED: { label: "Reopened", tone: "amber" },
  APPEALED: { label: "Under appeal", tone: "seal" },
};
const OPEN_STATES = ["SUBMITTED", "ASSIGNED", "IN_REVIEW", "CLARIFICATION", "ESCALATED", "REOPENED", "APPEALED"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const TONE = {
  info: { bg: "#EAF1F5", fg: "#1F5673" }, amber: { bg: "#FBF1E2", fg: "#B26A00" },
  ok: { bg: "#E7F1EC", fg: "#146B4F" }, seal: { bg: "#F7E9ED", fg: "#8C1D40" },
  grey: { bg: "#EFF1EF", fg: "#6B7C88" },
};

/* ---------------------------------- dates ---------------------------------- */
const DAY = 86400000;
const isWorkday = (d) => d.getDay() !== 0 && d.getDay() !== 6;
function addWorkdays(from, n) {
  const d = new Date(from); let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); if (isWorkday(d)) left--; }
  d.setHours(17, 30, 0, 0); return d;
}
function workdaysBetween(a, b) {
  let s = new Date(a), e = new Date(b), sign = 1;
  if (s > e) { const t = s; s = e; e = t; sign = -1; }
  s.setHours(0, 0, 0, 0); e.setHours(0, 0, 0, 0);
  let n = 0; const d = new Date(s);
  while (d < e) { d.setDate(d.getDate() + 1); if (isWorkday(d)) n++; }
  return n * sign;
}
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtDT = (iso) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const daysAgoISO = (n, h = 10) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 15, 0, 0); return d.toISOString(); };

/* ------------------------------- advisory AI ------------------------------- */
const KEYWORDS = {
  RAG: ["ragging", "senior forced", "seniors forced", "initiation", "bullied by senior"],
  HARASS: ["harass", "harassment", "discriminat", "casteist", "abusive message", "inappropriate touch", "molest", "slur"],
  EXAM: ["exam", "revaluation", "re-evaluation", "hall ticket", "result", "marks not", "answer sheet", "backlog"],
  ATTN: ["attendance", "defaulter", "present but marked", "shortage"],
  HOST: ["hostel", "warden", "mess", "roommate", "room allotment"],
  LIB: ["library", "book", "fine", "issue counter"],
  LAB: ["lab", "laboratory", "apparatus", "equipment", "practical"],
  INFRA: ["washroom", "toilet", "drinking water", "fan", "projector", "classroom", "wifi", "wi-fi", "leak"],
  TRANS: ["bus", "transport", "driver", "route", "pass"],
  CANT: ["canteen", "food", "hygiene", "overcharg", "stale"],
  FEE: ["scholarship", "fee", "refund", "instalment", "installment", "receipt"],
  IT: ["erp", "portal", "login", "password reset", "server error", "otp"],
  PLACE: ["placement", "company", "eligibility", "tpo", "drive"],
  INTERN: ["internship", "stipend", "intern"],
  HEALTH: ["fire", "shock", "unsafe", "injury", "ambulance", "medical emergency", "exposed wire"],
  ACCESS: ["wheelchair", "ramp", "lift not", "scribe", "disabilit"],
  TL: ["not taught", "syllabus not", "teaching", "lecture not conducted", "doubt"],
  ADMIN: ["bonafide", "transcript", "certificate", "office", "clerk"],
  ACAD: ["credit", "elective", "registration", "grade"],
  TT: ["timetable", "clash", "rescheduled"],
  DISC: ["disciplinary", "fine imposed", "suspension"],
  STAFF: ["faculty behaviour", "professor said", "staff rude", "favouritism"],
};
const CRITICAL_WORDS = ["ragging", "harass", "molest", "fire", "shock", "threat", "assault", "unsafe", "discriminat", "emergency"];
const HIGH_WORDS = ["exam", "result", "scholarship", "revaluation", "placement", "attendance shortage", "safety", "refund"];
const NEG = ["worst", "pathetic", "angry", "frustrat", "ignored", "no response", "repeatedly", "rude", "unfair", "disgust", "terrible", "harass", "threat", "shouted"];
const POS = ["thank", "appreciate", "kindly", "request", "please", "helpful", "grateful"];

const tokens = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
function aiCategory(text, categories) {
  const t = (text || "").toLowerCase(); const scored = [];
  Object.entries(KEYWORDS).forEach(([id, words]) => {
    const hits = words.filter((w) => t.includes(w)).length;
    if (hits) scored.push({ id, score: hits });
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((s) => ({
    ...s, name: (categories.find((c) => c.id === s.id) || {}).name || s.id,
    confidence: Math.min(96, 58 + s.score * 14),
  }));
}
function aiPriority(text) {
  const t = (text || "").toLowerCase();
  if (CRITICAL_WORDS.some((w) => t.includes(w))) return "Critical";
  if (HIGH_WORDS.some((w) => t.includes(w))) return "High";
  return t.length > 400 ? "Medium" : "Medium";
}
function aiSentiment(text) {
  const t = (text || "").toLowerCase();
  const n = NEG.filter((w) => t.includes(w)).length, p = POS.filter((w) => t.includes(w)).length;
  const score = p - n;
  if (score <= -2) return { label: "Highly distressed", tone: "seal", score };
  if (score < 0) return { label: "Negative", tone: "amber", score };
  if (score === 0) return { label: "Neutral", tone: "grey", score };
  return { label: "Cordial", tone: "ok", score };
}
function similarity(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / (A.size + B.size - inter);
}
function aiDuplicates(text, list, studentId) {
  return list
    .map((g) => ({ g, s: similarity(text, g.title + " " + g.description) }))
    .filter((x) => x.s > 0.34 && (x.g.studentId === studentId || OPEN_STATES.includes(x.g.status)))
    .sort((a, b) => b.s - a.s).slice(0, 3);
}
function aiSummary(text) {
  const sentences = (text || "").split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return text;
  const key = sentences.slice(0, 2).join(" ");
  return key.length > 260 ? key.slice(0, 257) + "…" : key;
}
function aiSuggestedAction(catId) {
  const map = {
    EXAM: "Verify the record with the Examination Section, obtain the answer-book audit note, and communicate the corrected position in writing.",
    ATTN: "Cross-check biometric/ERP attendance logs for the disputed dates with the course teacher before deciding.",
    HOST: "Refer to the Hostel Warden for a site check within 24 hours; record the maintenance work-order number in the action note.",
    RAG: "Convene the Anti-Ragging Committee immediately under UGC Regulations 2009; ensure complainant confidentiality and protection from retaliation.",
    HARASS: "Forward to the Internal Complaints Committee; do not disclose identity; follow the statutory enquiry timeline.",
    FEE: "Obtain the disbursement status from the Accounts Section and share the transaction reference with the student.",
    INFRA: "Raise a maintenance work order and set an inspection date; update the student when the work order closes.",
    IT: "Reproduce the error with the ERP vendor, log a ticket number, and share the expected fix date.",
  };
  return map[catId] || "Record the facts verified, the corrective action taken and the responsible unit, then communicate the outcome to the student in writing.";
}

/* ------------------------------- seed dataset ------------------------------ */
function seedState() {
  let seq = 100;
  const G = [];
  const mk = (o) => {
    seq++;
    const created = daysAgoISO(o.ago, 9 + (seq % 7));
    const c = DEFAULT_CATEGORIES.find((x) => x.id === o.cat);
    const level = o.level || c.startLevel;
    const slaDays = c.slaOverride || (DEFAULT_SLA.find((s) => s.level === level) || {}).days;
    const g = {
      id: "g" + seq,
      code: `GRV/${o.dept}/2026/${String(seq).padStart(6, "0")}`,
      studentId: o.sid, dept: o.dept, categoryId: o.cat, sub: o.sub,
      title: o.title, description: o.desc,
      confidential: o.conf || c.confidentialDefault,
      priority: o.pri || c.priority, level,
      assignedTo: o.assignedTo || holderFor(level, o.dept),
      status: o.status, createdAt: created,
      dueAt: addWorkdays(new Date(created), slaDays).toISOString(),
      attachments: o.att || [], timeline: [], resolution: o.res || null,
      feedback: o.fb || null, appeal: null, reopened: 0, escalations: o.esc || 0,
      clarification: o.clar || null,
    };
    g.timeline.push({ at: created, actor: o.sid, action: "SUBMITTED", note: "Grievance registered through student portal." });
    g.timeline.push({ at: created, actor: "SYSTEM", action: "ASSIGNED", note: `Auto-routed to ${userById(g.assignedTo).name} (Level ${level}) as per category routing rules.` });
    (o.tl || []).forEach((t) => g.timeline.push({ at: daysAgoISO(t[0], 12), actor: t[1], action: t[2], note: t[3] }));
    if (g.resolution) g.timeline.push({ at: g.resolution.at, actor: g.resolution.by, action: "RESOLVED", note: g.resolution.summary });
    if (g.feedback) g.timeline.push({ at: g.feedback.at, actor: g.studentId, action: g.feedback.satisfied ? "CLOSED" : "REOPENED", note: `Feedback recorded — ${g.feedback.rating}/5. ${g.feedback.comment}` });
    G.push(g);
  };

  mk({ ago: 22, sid: "S2201", dept: "ME", cat: "EXAM", sub: "Revaluation", pri: "High", status: "CLOSED",
    title: "Revaluation result of Thermodynamics not declared", assignedTo: "OFF-ME",
    desc: "I applied for revaluation of Thermodynamics (ME304) on 12 June and paid the fee, but the revised result has not been declared even after four weeks. My scholarship renewal depends on this result.",
    tl: [[20, "OFF-ME", "IN_REVIEW", "Application traced in the Examination Section register; file called for."]],
    res: { at: daysAgoISO(18, 16), by: "OFF-ME", findings: "Revaluation file was pending signature at the Exam Section.", action: "Result processed and uploaded to ERP on 06 August.", corrective: "Weekly reconciliation of pending revaluation files introduced.", summary: "Revised result declared; marks increased from 41 to 52. Student informed by email." },
    fb: { at: daysAgoISO(17, 11), rating: 5, satisfied: true, comment: "Resolved quickly once escalated. Thank you." } });

  mk({ ago: 19, sid: "S2202", dept: "CSE", cat: "HOST", sub: "Mess food", status: "CLOSED", assignedTo: "OFF-CSE",
    title: "Repeated stale food served at girls hostel mess",
    desc: "Food served at dinner has been stale on several days this month. Two students reported stomach upset last week. The hygiene of the serving area is also poor.",
    tl: [[17, "OFF-CSE", "IN_REVIEW", "Joint inspection with Hostel Warden and mess contractor conducted."]],
    res: { at: daysAgoISO(15, 15), by: "OFF-CSE", findings: "Contractor was reusing preparations from lunch service.", action: "Written warning issued to contractor; penalty of Rs 10,000 levied.", corrective: "Daily food sample retention and student mess committee inspection made mandatory.", summary: "Contractor penalised; mess committee inspection introduced from 01 August." },
    fb: { at: daysAgoISO(14, 10), rating: 4, satisfied: true, comment: "Improved, but hygiene should be checked regularly." } });

  mk({ ago: 12, sid: "S2201", dept: "ME", cat: "ATTN", sub: "Wrong marking", status: "CLARIFICATION", assignedTo: "OFF-ME",
    title: "Marked absent on 04 and 05 August despite attending practicals",
    desc: "I attended the Machine Design practical on 04 and 05 August but the ERP shows me absent. My attendance is now at 73% and I am shown in the defaulter list. Please correct the record.",
    clar: { at: daysAgoISO(3, 14), by: "OFF-ME", question: "Please upload the practical journal signed by the lab in-charge for those two dates, and the lab batch number." },
    tl: [[6, "OFF-ME", "IN_REVIEW", "Attendance register requisitioned from lab in-charge."]] });

  mk({ ago: 9, sid: "S2202", dept: "CSE", cat: "FEE", sub: "Scholarship not credited", pri: "High", status: "ESCALATED", level: 2, esc: 1,
    title: "MahaDBT scholarship amount not credited for two semesters",
    desc: "My scholarship for the last two semesters has not been credited. The department office says the file is with Accounts, and Accounts says the college has not uploaded the verification. I have been following up since March with no response.",
    tl: [[7, "OFF-CSE", "IN_REVIEW", "Case forwarded to Accounts Section for disbursement status."],
         [4, "SYSTEM", "ESCALATED", "SLA of 3 working days breached at Level 1. Auto-escalated to Head of Department — CSE."]] });

  mk({ ago: 6, sid: "S2201", dept: "ME", cat: "LAB", sub: "Equipment not working", pri: "High", status: "IN_REVIEW", assignedTo: "OFF-ME",
    title: "Three UTM machines out of order in Materials Testing lab",
    desc: "Three of the five universal testing machines have been out of order for over a month. Batches of 20 students are sharing two machines and most of us could not complete the prescribed experiments before the term-end submission.",
    att: [{ name: "lab-machines-photo.jpg", size: "1.2 MB" }],
    tl: [[3, "OFF-ME", "IN_REVIEW", "Service request raised with vendor; quotation awaited."]] });

  mk({ ago: 2, sid: "S2202", dept: "CSE", cat: "RAG", sub: "Verbal ragging", status: "IN_REVIEW", conf: true, level: 4,
    title: "Confidential — reported intimidation of first-year students in hostel wing",
    desc: "First-year students in the C wing are being called to senior rooms after 10 pm and made to do errands. They are afraid to complain individually. Please act without revealing my identity.",
    tl: [[3, "COMM", "IN_REVIEW", "Anti-Ragging Committee convened; wardens briefed; complainant identity sealed."]] });

  mk({ ago: 3, sid: "S2201", dept: "ME", cat: "INFRA", sub: "Drinking water", status: "ASSIGNED", assignedTo: "OFF-ME",
    title: "Water purifier on second floor not working since two weeks",
    desc: "The RO purifier near the ME staff room has been out of service for two weeks. Students are buying bottled water. Kindly repair it." });

  mk({ ago: 2, sid: "S2202", dept: "CSE", cat: "IT", sub: "Marks not visible", status: "SUBMITTED", assignedTo: "OFF-CSE",
    title: "Internal marks for two subjects missing on ERP",
    desc: "Internal assessment marks for Compiler Design and Machine Learning are not visible on the ERP portal, although the faculty has displayed them on the notice board." });

  mk({ ago: 26, sid: "S2201", dept: "ME", cat: "TRANS", sub: "Bus timing", status: "CLOSED", assignedTo: "OFF-ME",
    title: "Evening bus on Route 7 leaves before scheduled time",
    desc: "The Route 7 bus leaves at 5:20 pm instead of 5:35 pm, so students with a 5:30 practical miss it twice a week.",
    res: { at: daysAgoISO(23, 16), by: "OFF-ME", findings: "Driver was advancing departure to avoid traffic.", action: "Departure time enforced at 5:35 pm; GPS log review started.", corrective: "Transport in-charge to review GPS logs weekly.", summary: "Departure time restored to 5:35 pm from 29 July." },
    fb: { at: daysAgoISO(22, 9), rating: 3, satisfied: true, comment: "Fixed, but it took longer than needed." } });

  mk({ ago: 31, sid: "S2202", dept: "CSE", cat: "TL", sub: "Classes not conducted", status: "CLOSED", level: 2, esc: 1, assignedTo: "HOD-CSE",
    title: "Elective course lagging by nine lectures",
    desc: "The Cloud Computing elective is behind by nine lectures. At this rate the syllabus will not be completed before the end-semester examination.",
    tl: [[29, "SYSTEM", "ESCALATED", "SLA breached at Level 1. Auto-escalated to Head of Department — CSE."]],
    res: { at: daysAgoISO(26, 17), by: "HOD-CSE", findings: "Faculty was on approved deputation for three weeks without a substitute.", action: "Extra lectures scheduled on Saturdays; syllabus tracker shared with class representative.", corrective: "Substitute faculty must be nominated for any deputation beyond five days.", summary: "Compensatory lecture plan issued; syllabus back on schedule." },
    fb: { at: daysAgoISO(25, 12), rating: 4, satisfied: true, comment: "Good response from the department." } });

  mk({ ago: 16, sid: "S2201", dept: "ME", cat: "ADMIN", sub: "Document delay", status: "CLOSED", assignedTo: "OFF-ME",
    title: "Bonafide certificate delayed beyond fifteen days",
    desc: "I applied for a bonafide certificate for a passport application on 20 July. It has still not been issued despite three visits to the office.",
    res: { at: daysAgoISO(13, 15), by: "OFF-ME", findings: "Application was not entered in the office inward register.", action: "Certificate issued on 09 August.", corrective: "Online request tracking enabled for all certificates.", summary: "Certificate issued and collected by the student." },
    fb: { at: daysAgoISO(12, 10), rating: 2, satisfied: false, comment: "Issued only after I complained here. The office should not need a grievance for this." } });

  mk({ ago: 10, sid: "S2202", dept: "CSE", cat: "PLACE", sub: "Eligibility criteria", status: "RESOLVED", level: 2, assignedTo: "HOD-CSE",
    title: "Backlog clause applied inconsistently in campus drive",
    desc: "Two students with live backlogs were allowed to sit for the drive while I was not, although my backlog was cleared last semester. Please clarify the eligibility rule.",
    res: { at: daysAgoISO(2, 16), by: "HOD-CSE", findings: "The company revised its criteria mid-drive; the revision was not circulated to all students.", action: "Student's candidature restored for the next drive of the same company.", corrective: "All eligibility revisions to be circulated on the ERP notice board within 24 hours.", summary: "Candidature restored; circulation protocol issued to the Training and Placement Cell." } });

  mk({ ago: 5, sid: "S2201", dept: "ME", cat: "HEALTH", sub: "Fire / electrical hazard", pri: "Critical", status: "ESCALATED", level: 3, esc: 1,
    title: "Exposed wiring near workshop distribution board",
    desc: "There is exposed wiring near the distribution board at the entrance of the workshop. Water collects near that wall during rain. This is a serious safety hazard for students working in the workshop.",
    att: [{ name: "workshop-db-hazard.jpg", size: "860 KB" }],
    tl: [[4, "SYSTEM", "ESCALATED", "Critical severity — immediately escalated to Dean, Student Affairs with alert to Estate Section."],
         [3, "DEAN", "IN_REVIEW", "Estate Section directed to barricade the area pending rectification."]] });

  mk({ ago: 40, sid: "S2202", dept: "CSE", cat: "EXAM", sub: "Result discrepancy", status: "CLOSED", level: 5, esc: 2,
    title: "Grade for seminar course not reflected in final grade card",
    desc: "The seminar course grade is missing from my final grade card, which affects my CGPA and my eligibility for the placement drive.",
    tl: [[37, "SYSTEM", "ESCALATED", "SLA breached at Level 1. Auto-escalated to Head of Department — CSE."],
         [33, "S2202", "APPEALED", "Student requested reconsideration; matter placed before the Appellate Authority."]],
    res: { at: daysAgoISO(30, 17), by: "APPEL", findings: "Seminar award list for two students was not uploaded by the coordinator.", action: "Revised grade card issued with corrected CGPA of 8.14.", corrective: "Award-list upload confirmation made a mandatory step before result freeze.", summary: "Corrected grade card issued; result-freeze checklist amended." },
    fb: { at: daysAgoISO(29, 11), rating: 4, satisfied: true, comment: "Long process but the outcome was correct." } });

  mk({ ago: 1, sid: "S2201", dept: "ME", cat: "LIB", sub: "Fine dispute", status: "SUBMITTED", assignedTo: "OFF-ME",
    title: "Late fee charged for a book returned on time",
    desc: "I returned Strength of Materials on 12 August at the counter but the system shows it as returned on 18 August and a fine of Rs 120 has been charged." });

  mk({ ago: 34, sid: "S2201", dept: "ME", cat: "STAFF", sub: "Unfair treatment", pri: "High", status: "APPEALED", level: 5, esc: 2,
    title: "Internal marks reduced after a classroom dispute",
    desc: "My internal marks in two subjects were reduced after I questioned a scheduling decision in class. The department enquiry accepted the faculty explanation without examining the answer books.",
    tl: [[30, "SYSTEM", "ESCALATED", "SLA breached at Level 1. Auto-escalated to Head of Department — ME."],
         [24, "HOD-ME", "RESOLVED", "Enquiry held; marks found to be within the discretion of the course teacher."],
         [21, "S2201", "APPEALED", "Student did not accept the finding and appealed to the Appellate Authority."],
         [18, "APPEL", "IN_REVIEW", "Answer books called for; independent moderation ordered."]] });

  mk({ ago: 2, sid: "S2202", dept: "CSE", cat: "CANT", sub: "Overcharging", status: "IN_REVIEW", assignedTo: "OFF-CSE",
    title: "Canteen charging above the approved rate list",
    desc: "The canteen is charging twenty rupees above the approved rate for the thali and the rate list displayed at the counter is from last year.",
    tl: [[1, "OFF-CSE", "IN_REVIEW", "Approved rate list obtained from the Estate Section for verification."]] });

  mk({ ago: 8, sid: "S2202", dept: "CSE", cat: "ACCESS", sub: "Exam accommodation", pri: "High", status: "IN_REVIEW", level: 2, assignedTo: "HOD-CSE",
    title: "Scribe not arranged for practical examination",
    desc: "A scribe was approved for my theory papers but not arranged for the practical examination, so I could not complete the record work in the allotted time.",
    tl: [[5, "HOD-CSE", "IN_REVIEW", "Examination Section asked to include practicals in the scribe allotment order."]] });

  return {
    seq, categories: DEFAULT_CATEGORIES, sla: DEFAULT_SLA, grievances: G,
    notifications: [], audit: [{ at: daysAgoISO(0, 8), actor: "SYSTEM", action: "SEED", detail: "Demonstration dataset initialised." }],
  };
}

/* ------------------------------ storage layer ------------------------------ */
const KEY = "sgrms:state:v1";
async function loadState() {
  try {
    const r = await window.storage.get(KEY);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) { /* first run or storage unavailable */ }
  return null;
}
async function saveState(s) {
  try { await window.storage.set(KEY, JSON.stringify(s)); } catch (e) { /* keep working in memory */ }
}

/* --------------------------- workflow computations ------------------------- */
const slaDaysFor = (state, g) => {
  const c = state.categories.find((x) => x.id === g.categoryId);
  if (c && c.slaOverride && g.level === c.startLevel) return c.slaOverride;
  const r = state.sla.find((s) => s.level === g.level);
  return r ? r.days : 5;
};
const isOpen = (g) => OPEN_STATES.includes(g.status);
const isOverdue = (g) => isOpen(g) && new Date(g.dueAt) < new Date();
const daysLeft = (g) => workdaysBetween(new Date(), new Date(g.dueAt));
const catName = (state, id) => (state.categories.find((c) => c.id === id) || { name: id }).name;

function canSee(user, g) {
  if (!user) return false;
  if (user.role === "STUDENT") return g.studentId === user.id;
  if (g.confidential && !user.confidential && user.role !== "ADMIN") return false;
  if (user.role === "ADMIN" || user.role === "DEAN") return true;
  if (user.role === "COMMITTEE" || user.role === "APPELLATE") return g.level >= 4 || g.assignedTo === user.id;
  if (user.role === "HOD") return g.dept === user.dept;
  if (user.role === "OFFICER") return g.dept === user.dept && (g.assignedTo === user.id || g.level === 1);
  return false;
}
const isActor = (user, g) => user && g.assignedTo === user.id && isOpen(g);
const masked = (user, g) => g.confidential && user.role === "ADMIN" && !user.confidential;

/* ----------------------------- small UI pieces ----------------------------- */
function Chip({ tone = "grey", children, icon: Icon }) {
  const t = TONE[tone] || TONE.grey;
  return (
    <span style={{ background: t.bg, color: t.fg }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-semibold whitespace-nowrap">
      {Icon ? <Icon size={12} /> : null}{children}
    </span>
  );
}
function StatusChip({ g }) {
  const s = STATUS[g.status] || STATUS.SUBMITTED;
  return <Chip tone={isOverdue(g) ? "seal" : s.tone}>{s.label}</Chip>;
}
function PriorityChip({ p }) {
  const tone = p === "Critical" ? "seal" : p === "High" ? "amber" : p === "Medium" ? "info" : "grey";
  return <Chip tone={tone}>{p}</Chip>;
}
/* signature element: the docket strip — case number + one segment per SLA working day */
function SlaClock({ g, total }) {
  const left = daysLeft(g);
  const done = Math.max(0, Math.min(total, total - Math.max(0, left)));
  const breach = isOverdue(g);
  const closed = !isOpen(g);
  const color = closed ? "#146B4F" : breach ? "#8C1D40" : left <= 1 ? "#B26A00" : "#1F5673";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="sg-seg" aria-hidden="true">
        {Array.from({ length: Math.min(total, 15) }).map((_, i) => (
          <i key={i} style={{ background: i < done || closed ? color : "#D9DFD8" }} />
        ))}
      </span>
      <span className="sg-mono text-xs" style={{ color }}>
        {closed ? "closed" : breach ? `${Math.abs(left)}d over` : `${left}d left`}
      </span>
    </span>
  );
}
function Kpi({ label, value, sub, tone = "grey", icon: Icon }) {
  const t = TONE[tone];
  return (
    <div className="sg-card p-4">
      <div className="flex items-start justify-between">
        <div className="sg-eyebrow">{label}</div>
        {Icon ? <Icon size={15} style={{ color: t.fg }} /> : null}
      </div>
      <div className="sg-display mt-2" style={{ fontSize: 30, lineHeight: 1, color: t.fg }}>{value}</div>
      {sub ? <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>{sub}</div> : null}
    </div>
  );
}
function Field({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="sg-lbl">{label}</label>
      {children}
      {hint ? <div className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>{hint}</div> : null}
    </div>
  );
}
function Empty({ title, body, action }) {
  return (
    <div className="sg-card p-10 text-center">
      <div className="sg-display" style={{ fontSize: 18 }}>{title}</div>
      <div className="text-sm mt-2" style={{ color: "var(--muted)" }}>{body}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
function Stars({ value, onChange, size = 20 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={onChange ? () => onChange(n) : undefined}
          className="p-0.5" style={{ background: "none", border: 0, cursor: onChange ? "pointer" : "default" }}
          aria-label={`${n} of 5`}>
          <Star size={size} style={{ color: n <= value ? "#B26A00" : "#D9DFD8" }} fill={n <= value ? "#B26A00" : "none"} />
        </button>
      ))}
    </div>
  );
}
function download(filename, text, type = "text/csv") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ================================== APP =================================== */
export default function App() {
  const [state, setState] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState(null);
  const engineRan = useRef(false);

  useEffect(() => {
    let alive = true;
    loadState().then((s) => { if (alive) setState(s || seedState()); });
    return () => { alive = false; };
  }, []);

  useEffect(() => { if (state) saveState(state); }, [state]);

  /* escalation engine: reminders near due date, auto-escalation on breach */
  useEffect(() => {
    if (!state || engineRan.current) return;
    engineRan.current = true;
    setState((prev) => {
      const now = new Date();
      const notes = [...prev.notifications];
      const audit = [...prev.audit];
      const grievances = prev.grievances.map((g) => {
        if (!isOpen(g) || g.status === "CLARIFICATION") return g;
        const due = new Date(g.dueAt);
        if (due >= now) {
          if (workdaysBetween(now, due) <= 1) {
            notes.push(note(g.assignedTo, `Reminder: ${g.code} is due on ${fmtDate(g.dueAt)}.`, g.id, "reminder"));
          }
          return g;
        }
        if (g.level >= 5) {
          notes.push(note(g.assignedTo, `${g.code} has exceeded the appellate timeline.`, g.id, "overdue"));
          return g;
        }
        const level = g.level + 1;
        const holder = holderFor(level, g.dept);
        const due2 = addWorkdays(now, (prev.sla.find((s) => s.level === level) || { days: 5 }).days).toISOString();
        const lvlLabel = LEVELS[level - 1].label;
        audit.push({ at: now.toISOString(), actor: "SYSTEM", action: "AUTO_ESCALATE", detail: `${g.code} escalated to Level ${level}` });
        notes.push(note(holder, `Escalated to you: ${g.code} — ${g.title}`, g.id, "escalation"));
        notes.push(note(g.studentId, `${g.code} was escalated to the ${lvlLabel} because the timeline was exceeded.`, g.id, "escalation"));
        return {
          ...g, level, assignedTo: holder, status: "ESCALATED", dueAt: due2, escalations: (g.escalations || 0) + 1,
          timeline: [...g.timeline, { at: now.toISOString(), actor: "SYSTEM", action: "ESCALATED",
            note: `Timeline exceeded at Level ${g.level}. Auto-escalated to ${userById(holder).name} — ${lvlLabel}.` }],
        };
      });
      return { ...prev, grievances, notifications: notes, audit };
    });
  }, [state]);

  function note(to, text, gid, type) {
    return { id: "n" + Math.random().toString(36).slice(2, 9), to, text, at: new Date().toISOString(), read: false, gid, type };
  }
  function flash(msg) { setToast(msg); setTimeout(() => setToast(null), 3200); }
  function patch(fn) { setState((prev) => fn(prev)); }

  /* ------------------------------- actions -------------------------------- */
  function submitGrievance(form) {
    const now = new Date().toISOString();
    let created;
    patch((prev) => {
      const seq = prev.seq + 1;
      const c = prev.categories.find((x) => x.id === form.categoryId);
      const level = c.startLevel;
      const days = c.slaOverride || (prev.sla.find((s) => s.level === level) || { days: 5 }).days;
      const holder = holderFor(level, user.dept);
      const g = {
        id: "g" + seq, code: `GRV/${user.dept}/2026/${String(seq).padStart(6, "0")}`,
        studentId: user.id, dept: user.dept, categoryId: form.categoryId, sub: form.sub,
        title: form.title, description: form.description,
        confidential: form.confidential || c.confidentialDefault,
        priority: form.priority, level, assignedTo: holder, status: "ASSIGNED",
        createdAt: now, dueAt: addWorkdays(new Date(), days).toISOString(),
        attachments: form.attachments, timeline: [
          { at: now, actor: user.id, action: "SUBMITTED", note: "Grievance registered through student portal." },
          { at: now, actor: "SYSTEM", action: "ASSIGNED", note: `Auto-routed to ${userById(holder).name} — ${LEVELS[level - 1].label}. Response due by ${fmtDate(addWorkdays(new Date(), days))}.` },
        ],
        resolution: null, feedback: null, appeal: null, reopened: 0, escalations: 0, clarification: null,
        aiMeta: form.aiMeta || null,
      };
      created = g;
      const notes = [
        note(user.id, `${g.code} registered. ${LEVELS[level - 1].label} will respond by ${fmtDate(g.dueAt)}.`, g.id, "submit"),
        note(holder, `New grievance assigned: ${g.code} — ${g.title}`, g.id, "assign"),
      ];
      if (g.priority === "Critical") {
        notes.push(note("DEAN", `Critical grievance registered: ${g.code} (${catName(prev, g.categoryId)}).`, g.id, "critical"));
      }
      return {
        ...prev, seq, grievances: [g, ...prev.grievances], notifications: [...prev.notifications, ...notes],
        audit: [...prev.audit, { at: now, actor: user.id, action: "CREATE", detail: `${g.code} registered (${catName(prev, g.categoryId)})` }],
      };
    });
    flash(`Grievance registered. Email and SMS sent to ${user.email}.`);
    setTab("mine");
    setTimeout(() => { if (created) setOpenId(created.id); }, 60);
    return created;
  }

  function act(gid, kind, payload = {}) {
    const now = new Date().toISOString();
    patch((prev) => {
      const notes = [...prev.notifications];
      const audit = [...prev.audit];
      const grievances = prev.grievances.map((g) => {
        if (g.id !== gid) return g;
        let n = { ...g, timeline: [...g.timeline] };
        const push = (action, text) => n.timeline.push({ at: now, actor: user.id, action, note: text });

        if (kind === "TAKE_UP") {
          n.status = "IN_REVIEW";
          push("IN_REVIEW", payload.note || "Case taken up for enquiry.");
          notes.push(note(g.studentId, `${g.code} is under review by ${user.name}.`, g.id, "status"));
        }
        if (kind === "NOTE") { push("NOTE", payload.note); }
        if (kind === "CLARIFY") {
          n.status = "CLARIFICATION";
          n.clarification = { at: now, by: user.id, question: payload.note, reply: null };
          push("CLARIFICATION", payload.note);
          notes.push(note(g.studentId, `Clarification requested on ${g.code}. Please respond.`, g.id, "clarify"));
        }
        if (kind === "REPLY") {
          n.status = "IN_REVIEW";
          n.clarification = { ...(n.clarification || {}), reply: payload.note, replyAt: now };
          push("REPLY", payload.note);
          notes.push(note(g.assignedTo, `Student replied on ${g.code}.`, g.id, "reply"));
        }
        if (kind === "ESCALATE") {
          const level = Math.min(5, g.level + 1);
          const holder = holderFor(level, g.dept);
          n.level = level; n.assignedTo = holder; n.status = "ESCALATED";
          n.escalations = (g.escalations || 0) + 1;
          n.dueAt = addWorkdays(new Date(), (prev.sla.find((s) => s.level === level) || { days: 5 }).days).toISOString();
          push("ESCALATED", `${payload.note || "Referred upward for decision."} Forwarded to ${userById(holder).name} — ${LEVELS[level - 1].label}.`);
          notes.push(note(holder, `Referred to you: ${g.code} — ${g.title}`, g.id, "escalation"));
          notes.push(note(g.studentId, `${g.code} has been referred to the ${LEVELS[level - 1].label}.`, g.id, "escalation"));
          audit.push({ at: now, actor: user.id, action: "ESCALATE", detail: `${g.code} → Level ${level}` });
        }
        if (kind === "RESOLVE") {
          n.status = "RESOLVED";
          n.resolution = { at: now, by: user.id, findings: payload.findings, action: payload.action, corrective: payload.corrective, summary: payload.summary, attachments: payload.attachments || [] };
          push("RESOLVED", payload.summary);
          notes.push(note(g.studentId, `${g.code} has been resolved. Please review the order and record your feedback.`, g.id, "resolved"));
          audit.push({ at: now, actor: user.id, action: "RESOLVE", detail: `${g.code} resolved at Level ${g.level}` });
        }
        if (kind === "FEEDBACK") {
          n.feedback = { at: now, rating: payload.rating, satisfied: payload.satisfied, comment: payload.comment };
          if (payload.satisfied) {
            n.status = "CLOSED"; n.closedAt = now;
            push("CLOSED", `Feedback ${payload.rating}/5 — resolution accepted. ${payload.comment || ""}`);
            notes.push(note(g.assignedTo, `${g.code} closed by student with rating ${payload.rating}/5.`, g.id, "closed"));
          } else {
            push("FEEDBACK", `Feedback ${payload.rating}/5 — resolution not accepted. ${payload.comment || ""}`);
          }
        }
        if (kind === "APPEAL") {
          const level = Math.min(5, Math.max(4, g.level + 1));
          const holder = holderFor(level, g.dept);
          n.appeal = { at: now, by: user.id, reason: payload.note, level };
          n.status = "APPEALED"; n.level = level; n.assignedTo = holder;
          n.reopened = (g.reopened || 0) + 1;
          n.dueAt = addWorkdays(new Date(), (prev.sla.find((s) => s.level === level) || { days: 15 }).days).toISOString();
          push("APPEALED", payload.note);
          notes.push(note(holder, `Appeal received on ${g.code}.`, g.id, "appeal"));
          audit.push({ at: now, actor: user.id, action: "APPEAL", detail: `${g.code} appealed to Level ${level}` });
        }
        return n;
      });
      return { ...prev, grievances, notifications: notes, audit };
    });
    const msgs = {
      TAKE_UP: "Case marked under review. Student notified.",
      NOTE: "Note added to the case record.",
      CLARIFY: "Clarification requested. Student notified.",
      REPLY: "Reply sent to the grievance officer.",
      ESCALATE: "Case referred to the next level.",
      RESOLVE: "Resolution recorded and communicated to the student.",
      FEEDBACK: "Feedback recorded. Thank you.",
      APPEAL: "Appeal registered with the appellate authority.",
    };
    flash(msgs[kind] || "Saved.");
  }

  function markRead(ids) {
    patch((prev) => ({ ...prev, notifications: prev.notifications.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)) }));
  }

  if (!state) {
    return (
      <div className="sg min-h-screen flex items-center justify-center">
        <style>{CSS}</style>
        <div className="sg-eyebrow">Loading grievance registry…</div>
      </div>
    );
  }
  if (!user) return <Login onLogin={(u) => { setUser(u); setTab("home"); setOpenId(null); }} css={CSS} />;

  const visible = state.grievances.filter((g) => canSee(user, g));
  const myNotes = state.notifications.filter((n) => n.to === user.id).slice().reverse();
  const openG = openId ? state.grievances.find((g) => g.id === openId) : null;

  const tabs = {
    STUDENT: [["home", "Overview"], ["new", "File a grievance"], ["mine", "My grievances"], ["alerts", "Notifications"]],
    OFFICER: [["home", "Overview"], ["queue", "Case queue"], ["alerts", "Notifications"]],
    HOD: [["home", "Overview"], ["queue", "Case queue"], ["analytics", "Analytics"], ["alerts", "Notifications"]],
    DEAN: [["home", "Overview"], ["queue", "Case queue"], ["analytics", "Analytics"], ["alerts", "Notifications"]],
    COMMITTEE: [["home", "Overview"], ["queue", "Case queue"], ["analytics", "Analytics"], ["alerts", "Notifications"]],
    APPELLATE: [["home", "Overview"], ["queue", "Case queue"], ["analytics", "Analytics"], ["alerts", "Notifications"]],
    ADMIN: [["home", "Overview"], ["queue", "All cases"], ["analytics", "Analytics"], ["config", "Configuration"], ["audit", "Audit log"]],
  }[user.role];

  return (
    <div className="sg min-h-screen">
      <style>{CSS}</style>
      <Header user={user} notes={myNotes} onLogout={() => { setUser(null); setOpenId(null); }}
        onBell={() => { setTab("alerts"); setOpenId(null); }} />
      <nav className="sg-noprint sticky top-0 z-10" style={{ background: "var(--card)", borderBottom: "1px solid var(--rule)" }}>
        <div className="max-w-6xl mx-auto px-4 flex gap-6 overflow-x-auto sg-scroll">
          {tabs.map(([k, label]) => (
            <button key={k} className="sg-tab" data-on={tab === k && !openG ? "1" : "0"}
              onClick={() => { setTab(k); setOpenId(null); }}>
              {label}
              {k === "alerts" && myNotes.some((n) => !n.read) ? (
                <span className="ml-1.5 sg-mono" style={{ color: "var(--seal)" }}>{myNotes.filter((n) => !n.read).length}</span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-20">
        {openG ? (
          <CaseView state={state} user={user} g={openG} onBack={() => setOpenId(null)} act={act} />
        ) : tab === "home" ? (
          <Overview state={state} user={user} list={visible} onOpen={setOpenId} go={setTab} />
        ) : tab === "new" ? (
          <NewGrievance state={state} user={user} onSubmit={submitGrievance} />
        ) : tab === "mine" || tab === "queue" ? (
          <CaseList state={state} user={user} list={visible} onOpen={setOpenId} go={setTab} />
        ) : tab === "analytics" ? (
          <Analytics state={state} user={user} list={visible} />
        ) : tab === "alerts" ? (
          <Notifications notes={myNotes} onOpen={setOpenId} markRead={markRead} state={state} />
        ) : tab === "config" ? (
          <AdminConfig state={state} patch={patch} flash={flash} onReset={() => { setState(seedState()); flash("Demonstration dataset restored."); }} />
        ) : tab === "audit" ? (
          <AuditLog state={state} />
        ) : null}
      </main>

      {toast ? (
        <div className="sg-noprint fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-3 rounded-sm flex items-center gap-2 shadow-lg"
          style={{ background: "var(--ink)", color: "#fff", fontSize: 13, maxWidth: "92vw" }}>
          <CheckCircle2 size={15} /> {toast}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------- login ---------------------------------- */
function Login({ onLogin, css }) {
  const [id, setId] = useState("S2201");
  const [pin, setPin] = useState("demo");
  const [err, setErr] = useState("");
  const groups = [
    { label: "Students", ids: ["S2201", "S2202"] },
    { label: "Grievance officers", ids: ["OFF-ME", "OFF-CSE"] },
    { label: "Heads of department", ids: ["HOD-ME", "HOD-CSE"] },
    { label: "Institute authorities", ids: ["DEAN", "COMM", "APPEL", "ADMIN"] },
  ];
  const submit = () => {
    const u = USERS.find((x) => x.id.toLowerCase() === id.trim().toLowerCase());
    if (!u || pin !== u.pin) { setErr("That enrolment number or password is not recognised. Use password: demo"); return; }
    onLogin(u);
  };
  return (
    <div className="sg min-h-screen">
      <style>{css}</style>
      <div className="grid md:grid-cols-2 min-h-screen">
        <div className="p-8 md:p-12 flex flex-col justify-between" style={{ background: "var(--ink)", color: "#F4F6F3" }}>
          <div>
            <div className="flex items-center gap-2.5">
              <Shield size={18} />
              <span className="sg-eyebrow" style={{ color: "#9FB3C0" }}>Institute of Engineering &amp; Technology</span>
            </div>
            <h1 className="sg-display mt-8" style={{ fontSize: 40, lineHeight: 1.08 }}>
              Student Grievance<br />Redressal Registry
            </h1>
            <p className="mt-5 text-sm" style={{ color: "#C4D2DB", maxWidth: 420, lineHeight: 1.65 }}>
              Every complaint is entered in a numbered register, routed to a named officer, and given a
              working-day deadline. When the deadline passes, the case moves up on its own.
            </p>
          </div>
          <div className="mt-10">
            <div className="sg-eyebrow" style={{ color: "#9FB3C0" }}>Escalation ladder</div>
            <div className="mt-3 space-y-2">
              {LEVELS.map((l, i) => (
                <div key={l.level} className="flex items-center gap-3 text-sm">
                  <span className="sg-mono" style={{ color: "#7E96A6", fontSize: 11, width: 46 }}>L{l.level}</span>
                  <span className="sg-seg">
                    {Array.from({ length: Math.min(DEFAULT_SLA[i].days, 15) }).map((_, k) => (
                      <i key={k} style={{ background: "#3B5568", height: 9, width: 5 }} />
                    ))}
                  </span>
                  <span style={{ color: "#C4D2DB" }}>{l.label}</span>
                  <span className="sg-mono ml-auto" style={{ color: "#7E96A6", fontSize: 11 }}>{DEFAULT_SLA[i].days}d</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 flex items-center">
          <div className="w-full" style={{ maxWidth: 400 }}>
            <div className="sg-eyebrow">Sign in</div>
            <h2 className="sg-display mt-1.5" style={{ fontSize: 24 }}>Use your institute account</h2>
            <div className="mt-6">
              <Field label="Enrolment number or staff ID">
                <input className="sg-in sg-mono" value={id} onChange={(e) => { setId(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </Field>
              <Field label="Password" hint="Demonstration build — the password for every account is “demo”.">
                <input className="sg-in" type="password" value={pin} onChange={(e) => { setPin(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </Field>
              {err ? <div className="text-xs mb-3" style={{ color: "var(--seal)" }}>{err}</div> : null}
              <button className="sg-btn w-full justify-center" onClick={submit}>Sign in <ChevronRight size={15} /></button>
            </div>
            <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--rule)" }}>
              <div className="sg-eyebrow mb-3">Open a demonstration account</div>
              {groups.map((gr) => (
                <div key={gr.label} className="mb-3">
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{gr.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {gr.ids.map((uid) => {
                      const u = userById(uid);
                      return (
                        <button key={uid} className="sg-btn ghost sm" onClick={() => onLogin(u)}>
                          {u.name.split(" ").slice(-1)[0]} <span className="sg-mono" style={{ color: "var(--muted)" }}>{uid}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- header --------------------------------- */
function Header({ user, notes, onLogout, onBell }) {
  const unread = notes.filter((n) => !n.read).length;
  const sub = user.role === "STUDENT"
    ? `${user.prog} · Semester ${user.sem} · Division ${user.div}`
    : user.title;
  return (
    <header style={{ background: "var(--ink)", color: "#F4F6F3" }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Shield size={17} />
        <div className="min-w-0">
          <div className="sg-display" style={{ fontSize: 15, lineHeight: 1.2 }}>Grievance Redressal Registry</div>
          <div className="sg-eyebrow truncate" style={{ color: "#8FA6B4" }}>Institute of Engineering &amp; Technology</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button className="sg-noprint relative" onClick={onBell} aria-label="Notifications"
            style={{ background: "none", border: 0, color: "inherit", cursor: "pointer" }}>
            <Bell size={17} />
            {unread ? (
              <span className="absolute -top-1.5 -right-2 sg-mono px-1 rounded-sm"
                style={{ background: "var(--seal)", color: "#fff", fontSize: 9.5 }}>{unread}</span>
            ) : null}
          </button>
          <div className="text-right hidden sm:block">
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{user.name}</div>
            <div className="sg-mono" style={{ fontSize: 10, color: "#8FA6B4" }}>{user.id} · {sub}</div>
          </div>
          <button className="sg-noprint" onClick={onLogout} aria-label="Sign out"
            style={{ background: "none", border: 0, color: "inherit", cursor: "pointer" }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------- case row -------------------------------- */
function CaseRow({ state, user, g, onOpen }) {
  const hide = masked(user, g);
  return (
    <tr className="sg-row" onClick={() => onOpen(g.id)}>
      <td className="sg-td">
        <div className="sg-mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{g.code}</div>
        <div className="mt-1 font-medium flex items-center gap-1.5" style={{ fontSize: 13.5 }}>
          {g.confidential ? <Lock size={12} style={{ color: "var(--seal)" }} /> : null}
          {hide ? "Confidential case — content restricted" : g.title}
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          {catName(state, g.categoryId)} · {g.sub} · {g.dept} · filed {fmtDate(g.createdAt)}
        </div>
      </td>
      <td className="sg-td"><PriorityChip p={g.priority} /></td>
      <td className="sg-td">
        <StatusChip g={g} />
        <div className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
          L{g.level} · {userById(g.assignedTo) ? userById(g.assignedTo).name : g.assignedTo}
        </div>
      </td>
      <td className="sg-td"><SlaClock g={g} total={slaDaysFor(state, g)} /></td>
    </tr>
  );
}
function CaseTable({ state, user, list, onOpen, empty }) {
  if (!list.length) return empty || <Empty title="Nothing here yet" body="Cases matching these filters will appear in this register." />;
  return (
    <div className="sg-card overflow-x-auto sg-scroll">
      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 660 }}>
        <thead><tr>
          <th className="sg-th">Case</th><th className="sg-th">Severity</th>
          <th className="sg-th">Status &amp; holder</th><th className="sg-th">Deadline</th>
        </tr></thead>
        <tbody>{list.map((g) => <CaseRow key={g.id} state={state} user={user} g={g} onOpen={onOpen} />)}</tbody>
      </table>
    </div>
  );
}

/* -------------------------------- overview -------------------------------- */
function Overview({ state, user, list, onOpen, go }) {
  const open = list.filter(isOpen);
  const overdue = list.filter(isOverdue);
  const mine = list.filter((g) => isActor(user, g));
  const resolved = list.filter((g) => g.status === "CLOSED" || g.status === "RESOLVED");
  const rated = list.filter((g) => g.feedback);
  const avgRating = rated.length ? (rated.reduce((a, g) => a + g.feedback.rating, 0) / rated.length).toFixed(1) : "—";
  const closedList = list.filter((g) => g.resolution);
  const avgDays = closedList.length
    ? (closedList.reduce((a, g) => a + workdaysBetween(new Date(g.createdAt), new Date(g.resolution.at)), 0) / closedList.length).toFixed(1)
    : "—";
  const withinSla = closedList.filter((g) => new Date(g.resolution.at) <= new Date(g.dueAt)).length;
  const sla = closedList.length ? Math.round((withinSla / closedList.length) * 100) : 0;

  if (user.role === "STUDENT") {
    return (
      <div>
        <div className="mb-6">
          <div className="sg-eyebrow">Signed in as student</div>
          <h1 className="sg-display mt-1" style={{ fontSize: 26 }}>{user.name.split(" ")[0]}, here is your register</h1>
          <p className="text-sm mt-2" style={{ color: "var(--muted)", maxWidth: 620 }}>
            Details below are pulled from the institute ERP. You do not need to enter them again when filing a grievance.
          </p>
        </div>
        <div className="sg-card p-4 mb-6">
          <div className="sg-eyebrow mb-3">Record from ERP</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
            {[["Enrolment number", user.id], ["Programme", user.prog], ["Department", user.dept],
              ["Semester / Division", `${user.sem} / ${user.div}`], ["Academic year", user.year],
              ["Hostel", user.hostel], ["Institute email", user.email], ["Registered mobile", user.phone]].map(([k, v]) => (
              <div key={k}><div className="sg-eyebrow">{k}</div><div className="mt-0.5">{v}</div></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi label="Open" value={open.length} tone="info" icon={ClipboardList} sub="Being processed" />
          <Kpi label="Needs your reply" value={list.filter((g) => g.status === "CLARIFICATION").length} tone="amber" icon={MessageSquare} sub="Officer asked a question" />
          <Kpi label="Awaiting feedback" value={list.filter((g) => g.status === "RESOLVED").length} tone="ok" icon={CheckCircle2} sub="Resolution issued" />
          <Kpi label="Closed" value={list.filter((g) => g.status === "CLOSED").length} tone="grey" icon={FileText} sub="Concluded cases" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="sg-display" style={{ fontSize: 18 }}>Recent cases</h2>
          <button className="sg-btn seal" onClick={() => go("new")}><Plus size={15} /> File a grievance</button>
        </div>
        <CaseTable state={state} user={user} list={list.slice(0, 6)} onOpen={onOpen}
          empty={<Empty title="You have not filed any grievance" body="File one and it will be numbered, routed to a named officer and given a deadline."
            action={<button className="sg-btn seal" onClick={() => go("new")}><Plus size={15} /> File a grievance</button>} />} />
      </div>
    );
  }

  const byDept = DEPARTMENTS.map((d) => ({
    name: d.code,
    open: list.filter((g) => g.dept === d.code && isOpen(g)).length,
    overdue: list.filter((g) => g.dept === d.code && isOverdue(g)).length,
    closed: list.filter((g) => g.dept === d.code && !isOpen(g)).length,
  }));

  return (
    <div>
      <div className="mb-6">
        <div className="sg-eyebrow">{user.title}</div>
        <h1 className="sg-display mt-1" style={{ fontSize: 26 }}>
          {mine.length ? `${mine.length} case${mine.length > 1 ? "s" : ""} await your action` : "No case is pending with you"}
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          {overdue.length ? `${overdue.length} case${overdue.length > 1 ? "s have" : " has"} crossed the prescribed timeline in your jurisdiction.` : "Every open case is within its prescribed timeline."}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="With you" value={mine.length} tone="seal" icon={Gavel} sub="Action required" />
        <Kpi label="Open in scope" value={open.length} tone="info" icon={ClipboardList} sub={`${list.length} total on record`} />
        <Kpi label="Past deadline" value={overdue.length} tone="amber" icon={AlertTriangle} sub="Escalation triggered" />
        <Kpi label="On-time closure" value={`${sla}%`} tone="ok" icon={CheckCircle2} sub={`Avg ${avgDays} working days`} />
      </div>

      {mine.length ? (
        <>
          <h2 className="sg-display mb-3" style={{ fontSize: 18 }}>Pending with you</h2>
          <div className="mb-6"><CaseTable state={state} user={user} list={mine} onOpen={onOpen} /></div>
        </>
      ) : null}

      {user.role !== "OFFICER" ? (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="sg-card p-4">
            <div className="sg-eyebrow mb-3">Department load</div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={byDept} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#E4E9E3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7C88" }} axisLine={{ stroke: "#D9DFD8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7C88" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 3, border: "1px solid #D9DFD8" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" name="Open" fill="#1F5673" radius={[2, 2, 0, 0]} />
                <Bar dataKey="overdue" name="Past deadline" fill="#8C1D40" radius={[2, 2, 0, 0]} />
                <Bar dataKey="closed" name="Closed" fill="#B9C6BD" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="sg-card p-4">
            <div className="sg-eyebrow mb-3">Institutional signals</div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Student satisfaction (mean of {rated.length} ratings)</span><span className="sg-mono">{avgRating}/5</span></div>
              <div className="flex justify-between"><span>Cases escalated at least once</span><span className="sg-mono">{list.filter((g) => (g.escalations || 0) > 0).length}</span></div>
              <div className="flex justify-between"><span>Reopened or appealed</span><span className="sg-mono">{list.filter((g) => (g.reopened || 0) > 0).length}</span></div>
              <div className="flex justify-between"><span>Confidential cases in scope</span><span className="sg-mono">{list.filter((g) => g.confidential).length}</span></div>
              <div className="flex justify-between"><span>Resolved and closed</span><span className="sg-mono">{resolved.length}</span></div>
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--rule)" }}>
              <div className="sg-eyebrow mb-2">Recurring theme flagged by the system</div>
              <RecurringNote state={state} list={list} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-3">
        <h2 className="sg-display" style={{ fontSize: 18 }}>Latest in your jurisdiction</h2>
        <button className="sg-btn ghost sm" onClick={() => go("queue")}>Open case queue <ChevronRight size={14} /></button>
      </div>
      <CaseTable state={state} user={user} list={list.slice(0, 6)} onOpen={onOpen} />
    </div>
  );
}

function RecurringNote({ state, list }) {
  const counts = {};
  list.forEach((g) => { counts[g.categoryId] = (counts[g.categoryId] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return <div className="text-sm" style={{ color: "var(--muted)" }}>Not enough data yet.</div>;
  return (
    <div className="text-sm" style={{ lineHeight: 1.6 }}>
      <Chip tone="amber" icon={Sparkles}>Advisory</Chip>
      <span className="ml-2">
        {catName(state, top[0])} accounts for {top[1]} of {list.length} cases on record — the largest single cause.
        Consider placing it before the standing committee as a systemic item rather than case by case.
      </span>
    </div>
  );
}

/* ------------------------------- case queue -------------------------------- */
function CaseList({ state, user, list, onOpen, go }) {
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState("open");
  const [cat, setCat] = useState("");
  const [dept, setDept] = useState("");
  const [pri, setPri] = useState("");

  const buckets = user.role === "STUDENT"
    ? [["open", "In progress"], ["reply", "Needs my reply"], ["resolved", "Awaiting my feedback"], ["closed", "Closed"], ["all", "All"]]
    : [["mine", "With me"], ["open", "Open"], ["overdue", "Past deadline"], ["resolved", "Resolved"], ["closed", "Closed"], ["all", "All"]];

  const filtered = list.filter((g) => {
    if (bucket === "mine" && !isActor(user, g)) return false;
    if (bucket === "open" && !isOpen(g)) return false;
    if (bucket === "overdue" && !isOverdue(g)) return false;
    if (bucket === "reply" && g.status !== "CLARIFICATION") return false;
    if (bucket === "resolved" && g.status !== "RESOLVED") return false;
    if (bucket === "closed" && g.status !== "CLOSED") return false;
    if (cat && g.categoryId !== cat) return false;
    if (dept && g.dept !== dept) return false;
    if (pri && g.priority !== pri) return false;
    if (q) {
      const hay = `${g.code} ${g.title} ${g.description} ${g.sub}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const exportCsv = () => {
    const head = ["Grievance ID", "Filed on", "Department", "Category", "Sub-category", "Severity", "Level", "Officer", "Status", "Deadline", "Days taken", "Rating"];
    const rows = filtered.map((g) => [
      g.code, fmtDate(g.createdAt), g.dept, catName(state, g.categoryId), g.sub, g.priority, "L" + g.level,
      (userById(g.assignedTo) || {}).name || g.assignedTo, (STATUS[g.status] || {}).label, fmtDate(g.dueAt),
      g.resolution ? workdaysBetween(new Date(g.createdAt), new Date(g.resolution.at)) : "",
      g.feedback ? g.feedback.rating : "",
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(`grievance-register-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="sg-eyebrow">{user.role === "STUDENT" ? "My grievances" : "Case queue"}</div>
          <h1 className="sg-display mt-1" style={{ fontSize: 24 }}>{filtered.length} case{filtered.length === 1 ? "" : "s"} in view</h1>
        </div>
        <div className="flex gap-2 sg-noprint">
          {user.role === "STUDENT" ? (
            <button className="sg-btn seal" onClick={() => go("new")}><Plus size={15} /> File a grievance</button>
          ) : (
            <>
              <button className="sg-btn ghost" onClick={exportCsv}><Download size={14} /> Export CSV</button>
              <button className="sg-btn ghost" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>
            </>
          )}
        </div>
      </div>

      <div className="sg-card p-3 mb-4 sg-noprint">
        <div className="flex gap-4 overflow-x-auto sg-scroll mb-3" style={{ borderBottom: "1px solid var(--rule)" }}>
          {buckets.map(([k, label]) => (
            <button key={k} className="sg-tab" data-on={bucket === k ? "1" : "0"} onClick={() => setBucket(k)}>{label}</button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative">
            <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--muted)" }} />
            <input className="sg-in" style={{ paddingLeft: 30 }} placeholder="Search case number or text"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="sg-in" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {user.role === "STUDENT" || user.role === "OFFICER" || user.role === "HOD" ? (
            <select className="sg-in" value={pri} onChange={(e) => setPri(e.target.value)}>
              <option value="">All severities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <select className="sg-in" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          )}
          <button className="sg-btn ghost justify-center" onClick={() => { setQ(""); setCat(""); setDept(""); setPri(""); setBucket("all"); }}>
            <Filter size={14} /> Clear filters
          </button>
        </div>
      </div>

      <CaseTable state={state} user={user} list={filtered} onOpen={onOpen}
        empty={<Empty title="No case matches these filters" body="Widen the filters or clear them to see the full register." />} />
    </div>
  );
}

/* ----------------------------- file a grievance ---------------------------- */
function NewGrievance({ state, user, onSubmit }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ categoryId: "", sub: "", title: "", description: "", confidential: false, priority: "Medium", attachments: [] });
  const active = state.categories.filter((c) => c.active);
  const chosen = state.categories.find((c) => c.id === f.categoryId);
  const text = `${f.title} ${f.description}`;

  const aiCats = useMemo(() => (text.trim().length > 25 ? aiCategory(text, state.categories) : []), [text, state.categories]);
  const aiPri = useMemo(() => (text.trim().length > 25 ? aiPriority(text) : null), [text]);
  const dupes = useMemo(() => (text.trim().length > 40 ? aiDuplicates(text, state.grievances.filter((g) => g.studentId === user.id), user.id) : []), [text, state.grievances, user.id]);
  const sentiment = useMemo(() => aiSentiment(text), [text]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const addFiles = (e) => {
    const files = Array.from(e.target.files || []).map((x) => ({
      name: x.name, size: `${Math.max(1, Math.round(x.size / 1024))} KB`, type: x.type || "file",
    }));
    set("attachments", [...f.attachments, ...files]);
  };
  const canNext = f.categoryId && f.sub;
  const canSubmit = canNext && f.title.trim().length > 8 && f.description.trim().length > 30;

  useEffect(() => {
    if (chosen) {
      set("priority", chosen.priority);
      if (chosen.confidentialDefault) set("confidential", true);
    }
  }, [f.categoryId]);

  const slaDays = chosen ? (chosen.slaOverride || (state.sla.find((s) => s.level === chosen.startLevel) || {}).days) : null;

  return (
    <div>
      <div className="mb-5">
        <div className="sg-eyebrow">New entry in the register</div>
        <h1 className="sg-display mt-1" style={{ fontSize: 24 }}>File a grievance</h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)", maxWidth: 620 }}>
          Write what happened, when it happened and what you want done. Your enrolment details are attached automatically.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        {["Category", "Details", "Review"].map((s, i) => (
          <div key={s} className="flex-1 pt-2" style={{ borderTop: `2px solid ${step > i ? "var(--seal)" : "var(--rule)"}` }}>
            <div className="sg-mono" style={{ fontSize: 10.5, color: step > i ? "var(--seal)" : "var(--muted)" }}>0{i + 1}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: step > i ? "var(--ink)" : "var(--muted)" }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {step === 1 ? (
            <div className="sg-card p-5">
              <Field label="Category">
                <select className="sg-in" value={f.categoryId} onChange={(e) => { set("categoryId", e.target.value); set("sub", ""); }}>
                  <option value="">Select the area your grievance relates to</option>
                  {active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              {chosen ? (
                <Field label="Sub-category">
                  <div className="flex flex-wrap gap-2">
                    {chosen.subs.map((s) => (
                      <button key={s} type="button" className="sg-btn ghost sm"
                        style={f.sub === s ? { borderColor: "var(--ink)", background: "var(--ink)", color: "#fff" } : {}}
                        onClick={() => set("sub", s)}>{s}</button>
                    ))}
                  </div>
                </Field>
              ) : null}
              {chosen ? (
                <div className="p-3 rounded-sm mt-2" style={{ background: "#F4F6F3", border: "1px solid var(--rule)" }}>
                  <div className="sg-eyebrow mb-1.5">What happens after you submit</div>
                  <div className="text-sm" style={{ lineHeight: 1.6 }}>
                    This category is routed to the <strong>{LEVELS[chosen.startLevel - 1].label}</strong>
                    {chosen.startLevel <= 2 ? ` of ${user.dept}` : " of the institute"}, who must respond within{" "}
                    <strong>{slaDays} working days</strong>. If that deadline passes, the case moves up automatically.
                    {chosen.confidentialDefault ? " Cases in this category are handled confidentially by statute." : ""}
                  </div>
                </div>
              ) : null}
              <div className="mt-5 flex justify-end">
                <button className="sg-btn" disabled={!canNext} onClick={() => setStep(2)}>Continue <ChevronRight size={15} /></button>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="sg-card p-5">
              <Field label="One-line subject">
                <input className="sg-in" placeholder="Marked absent on 04 and 05 August despite attending practicals"
                  value={f.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="What happened" hint="Include dates, subject or course codes, names of the office involved and what you have already tried.">
                <textarea className="sg-in" rows={7} value={f.description} onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe the grievance in your own words." />
              </Field>
              <Field label="Supporting documents" hint="Photographs, receipts, screenshots, letters. Stored in the case file with restricted access.">
                <input type="file" multiple className="sg-in" style={{ padding: 7 }} onChange={addFiles} />
                {f.attachments.length ? (
                  <div className="mt-2 space-y-1.5">
                    {f.attachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Paperclip size={12} style={{ color: "var(--muted)" }} />
                        <span className="sg-mono">{a.name}</span>
                        <span style={{ color: "var(--muted)" }}>{a.size}</span>
                        <button className="sg-link ml-auto" onClick={() => set("attachments", f.attachments.filter((_, k) => k !== i))}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Field>
              <Field label="Severity you claim" hint="The officer may revise this after reading the case.">
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map((p) => (
                    <button key={p} type="button" className="sg-btn ghost sm"
                      style={f.priority === p ? { borderColor: "var(--ink)", background: "var(--ink)", color: "#fff" } : {}}
                      onClick={() => set("priority", p)}>{p}</button>
                  ))}
                </div>
              </Field>
              <label className="flex items-start gap-2.5 p-3 rounded-sm cursor-pointer" style={{ background: "#F4F6F3", border: "1px solid var(--rule)" }}>
                <input type="checkbox" checked={f.confidential} disabled={chosen && chosen.confidentialDefault}
                  onChange={(e) => set("confidential", e.target.checked)} style={{ marginTop: 3 }} />
                <span className="text-sm">
                  <strong>Handle this confidentially.</strong>
                  <span style={{ color: "var(--muted)" }}> Your name is visible only to the Dean, the Grievance Committee and the Appellate Authority. Departmental staff see the case without your identity.
                  {chosen && chosen.confidentialDefault ? " This category is always confidential." : ""}</span>
                </span>
              </label>
              <div className="mt-5 flex justify-between">
                <button className="sg-btn ghost" onClick={() => setStep(1)}><ChevronLeft size={15} /> Back</button>
                <button className="sg-btn" disabled={!canSubmit} onClick={() => setStep(3)}>Review <ChevronRight size={15} /></button>
              </div>
            </div>
          ) : (
            <div className="sg-card p-5">
              <div className="sg-eyebrow mb-3">Confirm before it enters the register</div>
              <div className="sg-display" style={{ fontSize: 18 }}>{f.title}</div>
              <div className="text-sm mt-3 whitespace-pre-wrap" style={{ lineHeight: 1.65 }}>{f.description}</div>
              <div className="grid grid-cols-2 gap-4 mt-5 pt-4" style={{ borderTop: "1px solid var(--rule)" }}>
                {[["Category", `${chosen.name} · ${f.sub}`], ["Severity claimed", f.priority],
                  ["Routed to", `${userById(holderFor(chosen.startLevel, user.dept)).name}`],
                  ["Response due", `${slaDays} working days`],
                  ["Confidential", f.confidential ? "Yes" : "No"],
                  ["Attachments", f.attachments.length ? `${f.attachments.length} file(s)` : "None"]].map(([k, v]) => (
                  <div key={k}><div className="sg-eyebrow">{k}</div><div className="text-sm mt-0.5">{v}</div></div>
                ))}
              </div>
              <div className="mt-5 flex justify-between">
                <button className="sg-btn ghost" onClick={() => setStep(2)}><ChevronLeft size={15} /> Back</button>
                <button className="sg-btn seal" onClick={() => onSubmit({ ...f, aiMeta: { sentiment: sentiment.label, summary: aiSummary(f.description), suggested: aiCats[0] ? aiCats[0].name : null } })}>
                  <Send size={15} /> Submit grievance
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="sg-card p-4">
            <div className="flex items-center gap-2 mb-1"><Sparkles size={14} style={{ color: "var(--seal)" }} />
              <span className="sg-eyebrow">Assistant — advisory only</span></div>
            <p className="text-xs mb-3" style={{ color: "var(--muted)", lineHeight: 1.55 }}>
              Suggestions are generated from the text you type. The officer decides the final category, severity and outcome.
            </p>
            {text.trim().length < 26 ? (
              <div className="text-xs" style={{ color: "var(--muted)" }}>Start typing the description to see suggestions.</div>
            ) : (
              <div className="space-y-3">
                {aiCats.length ? (
                  <div>
                    <div className="sg-eyebrow mb-1.5">Category match</div>
                    {aiCats.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 mb-1.5">
                        <button className="sg-link" onClick={() => { set("categoryId", c.id); set("sub", ""); setStep(1); }}>{c.name}</button>
                        <span className="sg-mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>{c.confidence}%</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {aiPri ? (
                  <div>
                    <div className="sg-eyebrow mb-1.5">Suggested severity</div>
                    <div className="flex items-center gap-2">
                      <PriorityChip p={aiPri} />
                      {aiPri !== f.priority ? <button className="sg-link" onClick={() => set("priority", aiPri)}>Apply</button> : null}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="sg-eyebrow mb-1.5">Tone reading</div>
                  <Chip tone={sentiment.tone}>{sentiment.label}</Chip>
                </div>
                {dupes.length ? (
                  <div className="p-2.5 rounded-sm" style={{ background: TONE.amber.bg }}>
                    <div className="sg-eyebrow mb-1.5" style={{ color: TONE.amber.fg }}>Possible duplicate</div>
                    {dupes.map((d) => (
                      <div key={d.g.id} className="text-xs mb-1" style={{ color: TONE.amber.fg }}>
                        <span className="sg-mono">{d.g.code}</span> — {d.g.title} ({Math.round(d.s * 100)}% similar)
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="sg-card p-4">
            <div className="sg-eyebrow mb-2">Attached from ERP</div>
            <div className="text-xs space-y-1.5" style={{ color: "var(--muted)" }}>
              <div>{user.name} · <span className="sg-mono">{user.id}</span></div>
              <div>{user.prog}, Semester {user.sem}, Division {user.div}</div>
              <div>{user.dept} · {user.year}</div>
              <div>{user.hostel}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* --------------------------------- case view ------------------------------- */
function CaseView({ state, user, g, onBack, act }) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState("");
  const [res, setRes] = useState({ findings: "", action: "", corrective: "", summary: "" });
  const [fb, setFb] = useState({ rating: 0, comment: "", satisfied: null });
  const [appeal, setAppeal] = useState("");
  const hide = masked(user, g);
  const student = userById(g.studentId);
  const holder = userById(g.assignedTo);
  const mine = isActor(user, g);
  const isStudent = user.role === "STUDENT";
  const total = slaDaysFor(state, g);

  if (hide) {
    return (
      <div>
        <button className="sg-btn ghost sm mb-4" onClick={onBack}><ChevronLeft size={14} /> Back</button>
        <Empty title="Confidential case — content restricted"
          body={`${g.code} is handled under a restricted workflow. Only the Dean, the Grievance Committee and the Appellate Authority may open the record. This access attempt has been written to the audit log.`} />
      </div>
    );
  }

  const showStudentIdentity = !g.confidential || user.confidential || isStudent;

  return (
    <div>
      <button className="sg-noprint sg-btn ghost sm mb-4" onClick={onBack}><ChevronLeft size={14} /> Back to register</button>

      {/* docket strip */}
      <div className="sg-card p-5 mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="sg-mono px-2 py-1 rounded-sm" style={{ background: "var(--ink)", color: "#fff", fontSize: 12 }}>{g.code}</span>
          <StatusChip g={g} />
          <PriorityChip p={g.priority} />
          {g.confidential ? <Chip tone="seal" icon={Lock}>Confidential</Chip> : null}
          {(g.escalations || 0) > 0 ? <Chip tone="amber" icon={ArrowUpRight}>Escalated ×{g.escalations}</Chip> : null}
          <span className="ml-auto"><SlaClock g={g} total={total} /></span>
        </div>
        <h1 className="sg-display" style={{ fontSize: 22, lineHeight: 1.25 }}>{g.title}</h1>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--rule)" }}>
          {[["Filed on", fmtDT(g.createdAt)],
            ["Category", `${catName(state, g.categoryId)} · ${g.sub}`],
            ["Currently with", `${holder ? holder.name : g.assignedTo} — L${g.level} ${LEVELS[g.level - 1].label}`],
            ["Deadline at this level", `${fmtDate(g.dueAt)} (${total} working days)`],
            ["Complainant", showStudentIdentity ? `${student.name} · ${student.id}` : "Identity sealed"],
            ["Programme", showStudentIdentity ? `${student.prog}, Sem ${student.sem}` : "—"],
            ["Department", g.dept],
            ["Hostel", showStudentIdentity ? student.hostel : "—"]].map(([k, v]) => (
            <div key={k}><div className="sg-eyebrow">{k}</div><div className="text-sm mt-0.5">{v}</div></div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="sg-card p-5">
            <div className="sg-eyebrow mb-2">Statement of the complainant</div>
            <p className="text-sm whitespace-pre-wrap" style={{ lineHeight: 1.7 }}>{g.description}</p>
            {g.attachments && g.attachments.length ? (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--rule)" }}>
                <div className="sg-eyebrow mb-2">Evidence on file</div>
                {g.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm mb-1.5">
                    <Paperclip size={13} style={{ color: "var(--muted)" }} />
                    <span className="sg-mono" style={{ fontSize: 12 }}>{a.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>{a.size}</span>
                    <span className="ml-auto text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}
                      title="Opens from the encrypted document store; every view is written to the access log.">
                      <Eye size={12} /> restricted store
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {g.clarification ? (
            <section className="sg-card p-5">
              <div className="sg-eyebrow mb-2">Clarification</div>
              <div className="text-sm"><strong>{(userById(g.clarification.by) || {}).name}:</strong> {g.clarification.question}</div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{fmtDT(g.clarification.at)}</div>
              {g.clarification.reply ? (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--rule)" }}>
                  <div className="text-sm"><strong>{student.name}:</strong> {g.clarification.reply}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{fmtDT(g.clarification.replyAt)}</div>
                </div>
              ) : null}
            </section>
          ) : null}

          {g.resolution ? (
            <section className="sg-card p-5" style={{ borderLeft: "3px solid var(--ok)" }}>
              <div className="sg-eyebrow mb-3">Order of the {LEVELS[g.level - 1].label}</div>
              {[["Findings", g.resolution.findings], ["Action taken", g.resolution.action],
                ["Corrective measure", g.resolution.corrective], ["Communicated to the student", g.resolution.summary]].map(([k, v]) => (
                v ? <div key={k} className="mb-3"><div className="sg-eyebrow">{k}</div>
                  <div className="text-sm mt-0.5" style={{ lineHeight: 1.6 }}>{v}</div></div> : null
              ))}
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Signed by {(userById(g.resolution.by) || {}).name} on {fmtDT(g.resolution.at)} ·
                {" "}{workdaysBetween(new Date(g.createdAt), new Date(g.resolution.at))} working days from filing
              </div>
            </section>
          ) : null}

          {g.feedback ? (
            <section className="sg-card p-5">
              <div className="sg-eyebrow mb-2">Student feedback</div>
              <div className="flex items-center gap-3">
                <Stars value={g.feedback.rating} size={16} />
                <Chip tone={g.feedback.satisfied ? "ok" : "amber"}>{g.feedback.satisfied ? "Resolution accepted" : "Not accepted"}</Chip>
              </div>
              {g.feedback.comment ? <p className="text-sm mt-2">{g.feedback.comment}</p> : null}
            </section>
          ) : null}

          <section className="sg-card p-5">
            <div className="sg-eyebrow mb-4">Audit trail</div>
            <ol className="space-y-4">
              {g.timeline.map((t, i) => {
                const who = t.actor === "SYSTEM" ? { name: "System" } : userById(t.actor) || { name: t.actor };
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span style={{ width: 8, height: 8, borderRadius: 8, background: t.actor === "SYSTEM" ? "var(--seal)" : "var(--ink-2)", marginTop: 5 }} />
                      {i < g.timeline.length - 1 ? <span style={{ width: 1, flex: 1, background: "var(--rule)", marginTop: 4 }} /> : null}
                    </div>
                    <div className="pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{who.name}</span>
                        <span className="sg-mono" style={{ fontSize: 10, color: "var(--muted)" }}>{t.action.replace(/_/g, " ")}</span>
                        <span className="sg-mono" style={{ fontSize: 10, color: "var(--muted)" }}>{fmtDT(t.at)}</span>
                      </div>
                      <div className="text-sm mt-1" style={{ lineHeight: 1.6 }}>{t.note}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-3 sg-noprint">
          {/* ladder */}
          <div className="sg-card p-4">
            <div className="sg-eyebrow mb-3">Position in the ladder</div>
            {LEVELS.map((l) => {
              const passed = g.level > l.level, now = g.level === l.level;
              return (
                <div key={l.level} className="flex items-start gap-2.5 mb-2.5">
                  <span className="sg-mono" style={{ fontSize: 10.5, color: now ? "var(--seal)" : "var(--muted)", width: 20, marginTop: 2 }}>L{l.level}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: now ? 700 : 500, color: passed || now ? "var(--ink)" : "var(--muted)" }}>{l.label}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      {userById(holderFor(l.level, g.dept)).name}
                      {now ? " · holding now" : passed ? " · passed" : ""}
                    </div>
                  </div>
                  {now ? <ChevronRight size={14} className="ml-auto" style={{ color: "var(--seal)" }} /> : null}
                </div>
              );
            })}
          </div>

          {/* action panel */}
          {mine && !isStudent ? (
            <div className="sg-card p-4">
              <div className="sg-eyebrow mb-3">Record an action</div>
              {mode === "" ? (
                <div className="space-y-2">
                  {g.status !== "IN_REVIEW" ? <button className="sg-btn w-full justify-center" onClick={() => act(g.id, "TAKE_UP")}><Gavel size={14} /> Take up for enquiry</button> : null}
                  <button className="sg-btn ghost w-full justify-center" onClick={() => setMode("NOTE")}><MessageSquare size={14} /> Add a note to the file</button>
                  <button className="sg-btn ghost w-full justify-center" onClick={() => setMode("CLARIFY")}><Send size={14} /> Ask the student for details</button>
                  {g.level < 5 ? <button className="sg-btn ghost w-full justify-center" onClick={() => setMode("ESCALATE")}><ArrowUpRight size={14} /> Refer to the next level</button> : null}
                  <button className="sg-btn seal w-full justify-center" onClick={() => setMode("RESOLVE")}><CheckCircle2 size={14} /> Record the resolution</button>
                </div>
              ) : mode === "RESOLVE" ? (
                <div>
                  <Field label="Findings of the enquiry">
                    <textarea className="sg-in" rows={3} value={res.findings} onChange={(e) => setRes({ ...res, findings: e.target.value })} />
                  </Field>
                  <Field label="Action taken">
                    <textarea className="sg-in" rows={2} value={res.action} onChange={(e) => setRes({ ...res, action: e.target.value })} />
                  </Field>
                  <Field label="Corrective measure to prevent recurrence">
                    <textarea className="sg-in" rows={2} value={res.corrective} onChange={(e) => setRes({ ...res, corrective: e.target.value })} />
                  </Field>
                  <Field label="What the student will be told">
                    <textarea className="sg-in" rows={2} value={res.summary} onChange={(e) => setRes({ ...res, summary: e.target.value })} />
                  </Field>
                  <div className="p-2.5 rounded-sm mb-3" style={{ background: TONE.info.bg }}>
                    <div className="flex items-center gap-1.5 mb-1"><Sparkles size={12} style={{ color: TONE.info.fg }} />
                      <span className="sg-eyebrow" style={{ color: TONE.info.fg }}>Suggested line of action</span></div>
                    <div className="text-xs" style={{ color: TONE.info.fg, lineHeight: 1.55 }}>{aiSuggestedAction(g.categoryId)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="sg-btn ghost sm" onClick={() => setMode("")}>Cancel</button>
                    <button className="sg-btn seal sm ml-auto" disabled={!res.summary.trim()}
                      onClick={() => { act(g.id, "RESOLVE", res); setMode(""); }}>Issue the order</button>
                  </div>
                </div>
              ) : (
                <div>
                  <Field label={mode === "CLARIFY" ? "What do you need from the student?" : mode === "ESCALATE" ? "Reason for referring upward" : "Note for the file"}>
                    <textarea className="sg-in" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <div className="flex gap-2">
                    <button className="sg-btn ghost sm" onClick={() => { setMode(""); setNote(""); }}>Cancel</button>
                    <button className="sg-btn sm ml-auto" disabled={!note.trim()}
                      onClick={() => { act(g.id, mode, { note }); setNote(""); setMode(""); }}>
                      {mode === "CLARIFY" ? "Send request" : mode === "ESCALATE" ? "Refer upward" : "Save note"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* student panels */}
          {isStudent && g.status === "CLARIFICATION" ? (
            <div className="sg-card p-4">
              <div className="sg-eyebrow mb-2">Reply to the officer</div>
              <textarea className="sg-in" rows={4} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Answer the question asked above." />
              <button className="sg-btn w-full justify-center mt-3" disabled={!note.trim()}
                onClick={() => { act(g.id, "REPLY", { note }); setNote(""); }}><Send size={14} /> Send reply</button>
            </div>
          ) : null}

          {isStudent && g.status === "RESOLVED" && !g.feedback ? (
            <div className="sg-card p-4">
              <div className="sg-eyebrow mb-3">Your feedback closes the case</div>
              <div className="mb-3"><Stars value={fb.rating} onChange={(n) => setFb({ ...fb, rating: n })} /></div>
              <textarea className="sg-in mb-3" rows={3} placeholder="Anything you want on record"
                value={fb.comment} onChange={(e) => setFb({ ...fb, comment: e.target.value })} />
              <div className="space-y-2">
                <button className="sg-btn w-full justify-center" disabled={!fb.rating}
                  onClick={() => act(g.id, "FEEDBACK", { ...fb, satisfied: true })}><Check size={14} /> Accept and close</button>
                <button className="sg-btn ghost w-full justify-center" disabled={!fb.rating}
                  onClick={() => { act(g.id, "FEEDBACK", { ...fb, satisfied: false }); }}><X size={14} /> Not resolved satisfactorily</button>
              </div>
            </div>
          ) : null}

          {isStudent && g.feedback && !g.feedback.satisfied && g.status !== "APPEALED" && g.status !== "CLOSED" ? (
            <div className="sg-card p-4" style={{ borderLeft: "3px solid var(--seal)" }}>
              <div className="sg-eyebrow mb-2">Request reconsideration</div>
              <p className="text-xs mb-2" style={{ color: "var(--muted)", lineHeight: 1.55 }}>
                The case goes to the {LEVELS[Math.min(4, Math.max(3, g.level))].label}, who must decide within 15 working days.
              </p>
              <textarea className="sg-in mb-3" rows={3} placeholder="Why the resolution is not acceptable"
                value={appeal} onChange={(e) => setAppeal(e.target.value)} />
              <button className="sg-btn seal w-full justify-center" disabled={!appeal.trim()}
                onClick={() => act(g.id, "APPEAL", { note: appeal })}><ArrowUpRight size={14} /> File an appeal</button>
            </div>
          ) : null}

          {isStudent && g.status === "CLOSED" ? (
            <div className="sg-card p-4">
              <div className="sg-eyebrow mb-2">Case closed</div>
              <p className="text-xs" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                Closed on {fmtDate(g.timeline[g.timeline.length - 1].at)}. If the same problem recurs, file a fresh grievance
                and refer to <span className="sg-mono">{g.code}</span>.
              </p>
            </div>
          ) : null}

          {/* assistant reading, for officers */}
          {!isStudent ? (
            <div className="sg-card p-4">
              <div className="flex items-center gap-2 mb-2"><Sparkles size={13} style={{ color: "var(--seal)" }} />
                <span className="sg-eyebrow">Assistant reading — advisory</span></div>
              <div className="text-xs mb-2"><strong>Summary:</strong> {aiSummary(g.description)}</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs">Tone:</span><Chip tone={aiSentiment(g.description).tone}>{aiSentiment(g.description).label}</Chip>
              </div>
              <SimilarCases state={state} user={user} g={g} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function SimilarCases({ state, user, g }) {
  const sims = state.grievances
    .filter((x) => x.id !== g.id && canSee(user, x))
    .map((x) => ({ x, s: similarity(g.title + " " + g.description, x.title + " " + x.description) }))
    .filter((r) => r.s > 0.16).sort((a, b) => b.s - a.s).slice(0, 3);
  if (!sims.length) return <div className="text-xs" style={{ color: "var(--muted)" }}>No comparable case found on record.</div>;
  return (
    <div>
      <div className="sg-eyebrow mb-1.5">Comparable cases</div>
      {sims.map((r) => (
        <div key={r.x.id} className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
          <span className="sg-mono">{r.x.code}</span> — {r.x.title.slice(0, 44)}{r.x.title.length > 44 ? "…" : ""}
          {r.x.resolution ? <span style={{ color: "var(--ok)" }}> · resolved</span> : null}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- analytics -------------------------------- */
function Analytics({ state, user, list }) {
  const closed = list.filter((g) => g.resolution);
  const rated = list.filter((g) => g.feedback);
  const withinSla = closed.filter((g) => new Date(g.resolution.at) <= new Date(g.dueAt)).length;
  const slaPct = closed.length ? Math.round((withinSla / closed.length) * 100) : 0;
  const avgDays = closed.length ? (closed.reduce((a, g) => a + workdaysBetween(new Date(g.createdAt), new Date(g.resolution.at)), 0) / closed.length).toFixed(1) : "—";
  const avgRating = rated.length ? (rated.reduce((a, g) => a + g.feedback.rating, 0) / rated.length).toFixed(1) : "—";

  const byCat = useMemo(() => {
    const m = {};
    list.forEach((g) => { const n = catName(state, g.categoryId); m[n] = (m[n] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [list, state.categories]);

  const byMonth = useMemo(() => {
    const m = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      m[d.toLocaleDateString("en-IN", { month: "short" })] = { name: d.toLocaleDateString("en-IN", { month: "short" }), filed: 0, closed: 0 };
    }
    list.forEach((g) => {
      const k = new Date(g.createdAt).toLocaleDateString("en-IN", { month: "short" });
      if (m[k]) m[k].filed++;
      if (g.resolution) {
        const k2 = new Date(g.resolution.at).toLocaleDateString("en-IN", { month: "short" });
        if (m[k2]) m[k2].closed++;
      }
    });
    return Object.values(m);
  }, [list]);

  const mix = [
    { name: "Closed", value: list.filter((g) => g.status === "CLOSED").length, fill: "#146B4F" },
    { name: "Resolved, awaiting feedback", value: list.filter((g) => g.status === "RESOLVED").length, fill: "#1F5673" },
    { name: "Open within timeline", value: list.filter((g) => isOpen(g) && !isOverdue(g)).length, fill: "#B26A00" },
    { name: "Past deadline", value: list.filter(isOverdue).length, fill: "#8C1D40" },
  ].filter((s) => s.value);

  const deptRows = DEPARTMENTS.map((d) => {
    const sub = list.filter((g) => g.dept === d.code);
    const sc = sub.filter((g) => g.resolution);
    const ok = sc.filter((g) => new Date(g.resolution.at) <= new Date(g.dueAt)).length;
    const rt = sub.filter((g) => g.feedback);
    return {
      dept: d.code, name: d.name, total: sub.length, open: sub.filter(isOpen).length,
      overdue: sub.filter(isOverdue).length,
      avg: sc.length ? (sc.reduce((a, g) => a + workdaysBetween(new Date(g.createdAt), new Date(g.resolution.at)), 0) / sc.length).toFixed(1) : "—",
      sla: sc.length ? Math.round((ok / sc.length) * 100) + "%" : "—",
      sat: rt.length ? (rt.reduce((a, g) => a + g.feedback.rating, 0) / rt.length).toFixed(1) : "—",
    };
  }).filter((r) => r.total);

  const exportReport = () => {
    const lines = [
      ["Student Grievance Redressal Management System — institutional report"],
      ["Generated on", new Date().toLocaleString("en-IN")], ["Generated by", `${user.name} (${user.id})`], [],
      ["Indicator", "Value"],
      ["Total grievances on record", list.length],
      ["Open", list.filter(isOpen).length],
      ["Past deadline", list.filter(isOverdue).length],
      ["Resolved / closed", list.filter((g) => !isOpen(g)).length],
      ["Average resolution time (working days)", avgDays],
      ["SLA compliance", slaPct + "%"],
      ["Mean satisfaction rating", avgRating],
      ["Escalated at least once", list.filter((g) => (g.escalations || 0) > 0).length],
      ["Reopened / appealed", list.filter((g) => (g.reopened || 0) > 0).length], [],
      ["Department", "Total", "Open", "Past deadline", "Avg days", "SLA", "Satisfaction"],
      ...deptRows.map((r) => [r.name, r.total, r.open, r.overdue, r.avg, r.sla, r.sat]), [],
      ["Category", "Count"], ...byCat.map((c) => [c.name, c.value]),
    ];
    download(`grievance-report-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\n"));
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <div className="sg-eyebrow">Analytics and statutory reporting</div>
          <h1 className="sg-display mt-1" style={{ fontSize: 24 }}>Redressal performance</h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--muted)" }}>
            Figures cover the {list.length} cases visible to you. Exports are formatted for IQAC, NAAC and NBA files.
          </p>
        </div>
        <div className="flex gap-2 sg-noprint">
          <button className="sg-btn ghost" onClick={exportReport}><Download size={14} /> Export report</button>
          <button className="sg-btn ghost" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi label="Total on record" value={list.length} tone="info" icon={ClipboardList} />
        <Kpi label="Avg resolution" value={avgDays} sub="working days" tone="ok" icon={Clock} />
        <Kpi label="Within timeline" value={`${slaPct}%`} sub={`${withinSla} of ${closed.length} closed`} tone="ok" icon={CheckCircle2} />
        <Kpi label="Satisfaction" value={`${avgRating}`} sub={`mean of ${rated.length} ratings`} tone="amber" icon={Star} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="sg-card p-4">
          <div className="sg-eyebrow mb-3">Where grievances come from</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCat} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E4E9E3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7C88" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10.5, fill: "#3A4B57" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 3, border: "1px solid #D9DFD8" }} />
              <Bar dataKey="value" name="Cases" fill="#1F5673" radius={[0, 2, 2, 0]} barSize={13} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="sg-card p-4">
          <div className="sg-eyebrow mb-3">Filed against closed, last six months</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={byMonth} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E4E9E3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7C88" }} axisLine={{ stroke: "#D9DFD8" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7C88" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 3, border: "1px solid #D9DFD8" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="filed" name="Filed" stroke="#8C1D40" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="closed" name="Closed" stroke="#146B4F" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="sg-card p-4">
          <div className="sg-eyebrow mb-3">Case mix today</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={mix} dataKey="value" nameKey="name" innerRadius={44} outerRadius={72} paddingAngle={2}>
                {mix.map((s, i) => <Cell key={i} fill={s.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 3, border: "1px solid #D9DFD8" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {mix.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span style={{ width: 9, height: 9, background: s.fill, borderRadius: 2 }} />
                <span>{s.name}</span><span className="sg-mono ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sg-card p-4 lg:col-span-2 overflow-x-auto sg-scroll">
          <div className="sg-eyebrow mb-3">Department performance</div>
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 520 }}>
            <thead><tr>
              <th className="sg-th">Department</th><th className="sg-th">Total</th><th className="sg-th">Open</th>
              <th className="sg-th">Past due</th><th className="sg-th">Avg days</th><th className="sg-th">Within SLA</th><th className="sg-th">Rating</th>
            </tr></thead>
            <tbody>
              {deptRows.map((r) => (
                <tr key={r.dept}>
                  <td className="sg-td">{r.name}</td>
                  <td className="sg-td sg-mono">{r.total}</td>
                  <td className="sg-td sg-mono">{r.open}</td>
                  <td className="sg-td sg-mono" style={{ color: r.overdue ? "var(--seal)" : "inherit" }}>{r.overdue}</td>
                  <td className="sg-td sg-mono">{r.avg}</td>
                  <td className="sg-td sg-mono">{r.sla}</td>
                  <td className="sg-td sg-mono">{r.sat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sg-card p-4">
        <div className="flex items-center gap-2 mb-2"><Sparkles size={13} style={{ color: "var(--seal)" }} />
          <span className="sg-eyebrow">Recurring problems the system has flagged — advisory</span></div>
        <RecurringList state={state} list={list} />
      </div>
    </div>
  );
}

function RecurringList({ state, list }) {
  const groups = {};
  list.forEach((g) => {
    const k = `${g.categoryId}|${g.sub}`;
    groups[k] = groups[k] || { cat: g.categoryId, sub: g.sub, items: [] };
    groups[k].items.push(g);
  });
  const rows = Object.values(groups).filter((r) => r.items.length >= 2)
    .sort((a, b) => b.items.length - a.items.length).slice(0, 5);
  if (!rows.length) return <div className="text-sm" style={{ color: "var(--muted)" }}>No sub-category has repeated often enough to be flagged.</div>;
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const depts = Array.from(new Set(r.items.map((g) => g.dept)));
        return (
          <div key={r.cat + r.sub} className="text-sm flex flex-wrap items-center gap-2">
            <span className="sg-mono" style={{ fontSize: 11, color: "var(--seal)" }}>×{r.items.length}</span>
            <strong>{catName(state, r.cat)} — {r.sub}</strong>
            <span style={{ color: "var(--muted)" }}>
              across {depts.join(", ")}; treat as a systemic item rather than {r.items.length} separate complaints.
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ notifications ------------------------------ */
function Notifications({ notes, onOpen, markRead, state }) {
  useEffect(() => {
    const unread = notes.filter((n) => !n.read).map((n) => n.id);
    if (unread.length) { const t = setTimeout(() => markRead(unread), 1400); return () => clearTimeout(t); }
  }, [notes.length]);
  const icon = { escalation: ArrowUpRight, reminder: Clock, resolved: CheckCircle2, critical: AlertTriangle, clarify: MessageSquare };
  return (
    <div>
      <div className="sg-eyebrow">Notifications</div>
      <h1 className="sg-display mt-1 mb-1" style={{ fontSize: 24 }}>Every message sent to you</h1>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        The same messages go to your institute email and registered mobile. WhatsApp delivery can be enabled by the administrator.
      </p>
      {!notes.length ? <Empty title="No notifications yet" body="Alerts about assignment, escalation, deadlines and resolutions will appear here." /> : (
        <div className="sg-card">
          {notes.map((n) => {
            const I = icon[n.type] || Bell;
            return (
              <button key={n.id} onClick={() => n.gid && onOpen(n.gid)}
                className="w-full text-left flex gap-3 p-4"
                style={{ background: n.read ? "transparent" : "#FBFCFA", border: 0, borderBottom: "1px solid var(--rule)", cursor: "pointer" }}>
                <I size={15} style={{ marginTop: 2, color: n.read ? "var(--muted)" : "var(--seal)" }} />
                <div>
                  <div className="text-sm" style={{ fontWeight: n.read ? 400 : 600 }}>{n.text}</div>
                  <div className="sg-mono mt-1" style={{ fontSize: 10.5, color: "var(--muted)" }}>{fmtDT(n.at)} · email · SMS</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ administration ----------------------------- */
function AdminConfig({ state, patch, flash, onReset }) {
  const [sec, setSec] = useState("cats");
  const [nc, setNc] = useState({ name: "", subs: "", priority: "Medium", startLevel: 1, conf: false });

  const toggleCat = (id) => patch((p) => ({
    ...p, categories: p.categories.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    audit: [...p.audit, { at: new Date().toISOString(), actor: "ADMIN", action: "CATEGORY", detail: `Toggled category ${id}` }],
  }));
  const addCat = () => {
    if (!nc.name.trim()) return;
    const id = nc.name.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "CAT" + Date.now() % 100;
    patch((p) => ({
      ...p,
      categories: [...p.categories, {
        id, name: nc.name.trim(), subs: nc.subs.split(",").map((s) => s.trim()).filter(Boolean).length ? nc.subs.split(",").map((s) => s.trim()).filter(Boolean) : ["General"],
        priority: nc.priority, startLevel: Number(nc.startLevel), active: true, confidentialDefault: nc.conf, slaOverride: null,
      }],
      audit: [...p.audit, { at: new Date().toISOString(), actor: "ADMIN", action: "CATEGORY", detail: `Added category ${nc.name}` }],
    }));
    setNc({ name: "", subs: "", priority: "Medium", startLevel: 1, conf: false });
    flash("Category added and available to students immediately.");
  };
  const setSla = (level, days) => patch((p) => ({
    ...p, sla: p.sla.map((s) => (s.level === level ? { ...s, days: Math.max(1, Number(days) || 1) } : s)),
    audit: [...p.audit, { at: new Date().toISOString(), actor: "ADMIN", action: "SLA", detail: `Level ${level} timeline set to ${days} working days` }],
  }));

  return (
    <div>
      <div className="sg-eyebrow">Administration</div>
      <h1 className="sg-display mt-1 mb-4" style={{ fontSize: 24 }}>Configuration</h1>
      <div className="flex gap-5 mb-4 overflow-x-auto sg-scroll" style={{ borderBottom: "1px solid var(--rule)" }}>
        {[["cats", "Categories"], ["sla", "Timelines"], ["users", "Roles and access"], ["data", "Data"]].map(([k, l]) => (
          <button key={k} className="sg-tab" data-on={sec === k ? "1" : "0"} onClick={() => setSec(k)}>{l}</button>
        ))}
      </div>

      {sec === "cats" ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 sg-card overflow-x-auto sg-scroll">
            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 560 }}>
              <thead><tr>
                <th className="sg-th">Category</th><th className="sg-th">Default severity</th>
                <th className="sg-th">Enters at</th><th className="sg-th">Confidential</th><th className="sg-th">State</th>
              </tr></thead>
              <tbody>
                {state.categories.map((c) => (
                  <tr key={c.id}>
                    <td className="sg-td">
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{c.subs.join(" · ")}</div>
                    </td>
                    <td className="sg-td"><PriorityChip p={c.priority} /></td>
                    <td className="sg-td sg-mono" style={{ fontSize: 11.5 }}>L{c.startLevel}{c.slaOverride ? ` · ${c.slaOverride}d` : ""}</td>
                    <td className="sg-td">{c.confidentialDefault ? <Chip tone="seal" icon={Lock}>Always</Chip> : <span style={{ color: "var(--muted)" }}>Optional</span>}</td>
                    <td className="sg-td">
                      <button className="sg-btn ghost sm" onClick={() => toggleCat(c.id)}>
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sg-card p-4">
            <div className="sg-eyebrow mb-3">Add a category</div>
            <Field label="Name"><input className="sg-in" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} placeholder="Sports and cultural" /></Field>
            <Field label="Sub-categories" hint="Separated by commas."><input className="sg-in" value={nc.subs} onChange={(e) => setNc({ ...nc, subs: e.target.value })} placeholder="Ground booking, Equipment" /></Field>
            <Field label="Default severity">
              <select className="sg-in" value={nc.priority} onChange={(e) => setNc({ ...nc, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Enters the ladder at">
              <select className="sg-in" value={nc.startLevel} onChange={(e) => setNc({ ...nc, startLevel: e.target.value })}>
                {LEVELS.map((l) => <option key={l.level} value={l.level}>L{l.level} — {l.label}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={nc.conf} onChange={(e) => setNc({ ...nc, conf: e.target.checked })} />
              Always confidential
            </label>
            <button className="sg-btn w-full justify-center" onClick={addCat}><Plus size={14} /> Add category</button>
          </div>
        </div>
      ) : sec === "sla" ? (
        <div className="sg-card p-5" style={{ maxWidth: 640 }}>
          <div className="sg-eyebrow mb-1">Prescribed timelines</div>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Counted in working days. A case that crosses its timeline moves to the next level automatically and both the
            student and the receiving officer are notified.
          </p>
          {state.sla.map((s) => (
            <div key={s.level} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--rule)" }}>
              <span className="sg-mono" style={{ fontSize: 11, color: "var(--muted)", width: 24 }}>L{s.level}</span>
              <span className="text-sm flex-1">{LEVELS[s.level - 1].label}</span>
              <input className="sg-in sg-mono" type="number" min="1" max="30" value={s.days} style={{ width: 70, textAlign: "right" }}
                onChange={(e) => setSla(s.level, e.target.value)} />
              <span className="text-xs" style={{ color: "var(--muted)", width: 74 }}>working days</span>
            </div>
          ))}
          <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>
            Ragging and health-and-safety categories carry statutory overrides and are handled faster regardless of these values.
          </p>
        </div>
      ) : sec === "users" ? (
        <div className="sg-card overflow-x-auto sg-scroll">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 620 }}>
            <thead><tr>
              <th className="sg-th">User</th><th className="sg-th">ID</th><th className="sg-th">Role</th>
              <th className="sg-th">Scope</th><th className="sg-th">Confidential access</th>
            </tr></thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.id}>
                  <td className="sg-td">{u.name}<div className="text-xs" style={{ color: "var(--muted)" }}>{u.title || u.prog}</div></td>
                  <td className="sg-td sg-mono" style={{ fontSize: 11.5 }}>{u.id}</td>
                  <td className="sg-td">{u.role.charAt(0) + u.role.slice(1).toLowerCase()}</td>
                  <td className="sg-td">{u.dept ? DEPARTMENTS.find((d) => d.code === u.dept).name : "Institute-wide"}</td>
                  <td className="sg-td">{u.confidential ? <Chip tone="seal" icon={Lock}>Permitted</Chip> : <span style={{ color: "var(--muted)" }}>No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sg-card p-5" style={{ maxWidth: 640 }}>
          <div className="sg-eyebrow mb-2">Register data</div>
          <p className="text-sm mb-4" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            This build keeps the register in browser storage so the demonstration survives a reload. In deployment the same
            operations write to the relational schema described in the accompanying document, with encrypted attachments,
            hashed passwords and daily backups.
          </p>
          <button className="sg-btn ghost" onClick={onReset}><RefreshCw size={14} /> Restore demonstration dataset</button>
        </div>
      )}
    </div>
  );
}

function AuditLog({ state }) {
  const rows = [];
  state.grievances.forEach((g) => g.timeline.forEach((t) => rows.push({ ...t, code: g.code })));
  state.audit.forEach((a) => rows.push({ at: a.at, actor: a.actor, action: a.action, note: a.detail, code: "—" }));
  rows.sort((a, b) => new Date(b.at) - new Date(a.at));
  return (
    <div>
      <div className="sg-eyebrow">Audit log</div>
      <h1 className="sg-display mt-1 mb-1" style={{ fontSize: 24 }}>{rows.length} recorded transactions</h1>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        Every submission, assignment, note, escalation, order and closure is written here and cannot be edited from the interface.
      </p>
      <div className="sg-card overflow-x-auto sg-scroll">
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 660 }}>
          <thead><tr>
            <th className="sg-th">Timestamp</th><th className="sg-th">Case</th><th className="sg-th">Actor</th>
            <th className="sg-th">Action</th><th className="sg-th">Detail</th>
          </tr></thead>
          <tbody>
            {rows.slice(0, 120).map((r, i) => (
              <tr key={i}>
                <td className="sg-td sg-mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{fmtDT(r.at)}</td>
                <td className="sg-td sg-mono" style={{ fontSize: 11 }}>{r.code}</td>
                <td className="sg-td" style={{ fontSize: 12.5 }}>{r.actor === "SYSTEM" ? "System" : (userById(r.actor) || { name: r.actor }).name}</td>
                <td className="sg-td sg-mono" style={{ fontSize: 11 }}>{String(r.action).replace(/_/g, " ")}</td>
                <td className="sg-td" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
