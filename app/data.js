// DYD prototype — runtime mocks (JS port of /src/lib/mock-data.ts + api.ts)
// Single source for the HTML preview. The Next.js source files in /src/lib are
// the authoritative versions for the repo handoff.

(function (root) {
  const STORAGE_KEY = "dyd:state:v1";
  const LATENCY = () => 150 + Math.floor(Math.random() * 150);

  const challenge = {
    id: "dyd-001",
    number: "DYD #001",
    title: "The Testimonial Hunt",
    subtitle: "Collect client stories. Create marketing impact. Climb the Hype Ranking.",
    description:
      "Leadership has unlocked the first DYD. Your mission: collect valuable client testimonials that prove BairesDev's real business impact. The catch — quantity alone won't win this. Final results are decided after human review of evidence quality.",
    sponsor: "Office of the CEO",
    reward: "Trip to Buenos Aires",
    rewardSubtitle: "+ dinner with leadership",
    registrationDeadline: "2026-05-12T23:59:00-03:00",
    submissionDeadline: "2026-05-26T23:59:00-03:00",
    status: "open",
    primaryMetricLabel: "Number of testimonials",
    hypeRankingDisclaimer:
      "This ranking is based on self-reported progress. Final results may change after human review.",
    rules: [
      "Register before the registration deadline. Late entries are not accepted.",
      "Self-report your progress at any time. The Hype Ranking updates live.",
      "Submit evidence before the submission deadline.",
      "Quality matters more than quantity. Final ranking is decided after review.",
      "If you register and submit no valid evidence, admins may issue a DYD Strike.",
    ],
    evidenceRequirements: [
      "Client name", "Client company", "Client role",
      "Permission to use testimonial",
      "Business impact summary",
      "Uploaded evidence (video / zip / text)",
    ],
    rubric: [
      { key: "clarity", label: "Clarity of testimonial", weight: 20 },
      { key: "businessImpact", label: "Business impact", weight: 30 },
      { key: "clientRelevance", label: "Client relevance", weight: 20 },
      { key: "specificity", label: "Specificity of the result", weight: 20 },
      { key: "permissionCompleteness", label: "Permission and usage readiness", weight: 10 },
    ],
  };

  const users = {
    "u-bob":       { id: "u-bob", name: "Bob Martinez", role: "participant", jobTitle: "Account Executive" },
    "u-admin":     { id: "u-admin", name: "Sofia Reyes", role: "admin", jobTitle: "Growth Lead" },
    "u-sponsor":   { id: "u-sponsor", name: "Diego Aguirre", role: "sponsor", jobTitle: "CEO" },
    "u-spectator": { id: "u-spectator", name: "Maya Iverson", role: "spectator", jobTitle: "Software Engineer II" },
  };

  const seedParticipants = [
    { id: "p-bob", userId: "u-bob", name: "Bob Martinez", role: "Account Executive", avatarInitials: "BM", registered: true, selfReportedValue: 18, evidenceStatus: "pending_review", hypeRank: 1, badges: ["On fire", "Needs review"] },
    { id: "p-patrick", userId: "u-patrick", name: "Patrick Olawale", role: "Delivery Manager", avatarInitials: "PO", registered: true, selfReportedValue: 9, evidenceStatus: "uploaded", hypeRank: 2, badges: ["Quality threat"] },
    { id: "p-alice", userId: "u-alice", name: "Alice Chen", role: "Customer Success Manager", avatarInitials: "AC", registered: true, selfReportedValue: 7, evidenceStatus: "pending_review", hypeRank: 3, badges: ["Rising"] },
    { id: "p-charlie", userId: "u-charlie", name: "Charlie Okonkwo", role: "Engineering Manager", avatarInitials: "CO", registered: true, selfReportedValue: 6, evidenceStatus: "uploaded", hypeRank: 4, badges: ["Dark horse"] },
    { id: "p-rena", userId: "u-rena", name: "Rena Singh", role: "Sales Engineer", avatarInitials: "RS", registered: true, selfReportedValue: 5, evidenceStatus: "uploaded", hypeRank: 5, badges: ["Rising"] },
    { id: "p-diego", userId: "u-diego", name: "Diego Salinas", role: "Account Executive", avatarInitials: "DS", registered: true, selfReportedValue: 4, evidenceStatus: "uploaded", hypeRank: 6, badges: [] },
    { id: "p-mira", userId: "u-mira", name: "Mira Ostrowski", role: "Partner Manager", avatarInitials: "MO", registered: true, selfReportedValue: 4, evidenceStatus: "pending_review", hypeRank: 7, badges: [] },
    { id: "p-leo", userId: "u-leo", name: "Leonardo Vega", role: "Delivery Manager", avatarInitials: "LV", registered: true, selfReportedValue: 3, evidenceStatus: "uploaded", hypeRank: 8, badges: [] },
    { id: "p-julia", userId: "u-julia", name: "Julia Park", role: "Marketing PM", avatarInitials: "JP", registered: true, selfReportedValue: 3, evidenceStatus: "needs_clarification", hypeRank: 9, badges: ["Needs evidence"] },
    { id: "p-omar", userId: "u-omar", name: "Omar Haddad", role: "Customer Success Manager", avatarInitials: "OH", registered: true, selfReportedValue: 2, evidenceStatus: "uploaded", hypeRank: 10, badges: [] },
    { id: "p-tina", userId: "u-tina", name: "Tina Bianchi", role: "Account Executive", avatarInitials: "TB", registered: true, selfReportedValue: 2, evidenceStatus: "not_submitted", hypeRank: 11, badges: ["Awaiting review"], strikeRisk: true },
    { id: "p-noah", userId: "u-noah", name: "Noah Bennett", role: "Engineering Manager", avatarInitials: "NB", registered: true, selfReportedValue: 1, evidenceStatus: "uploaded", hypeRank: 12, badges: [] },
  ];

  const auditMap = { "p-bob": 46, "p-patrick": 91, "p-alice": 78, "p-charlie": 88, "p-rena": 65, "p-diego": 58, "p-mira": 52, "p-leo": 70 };

  function buildRanking(parts) {
    const sorted = [...parts].sort((a, b) => b.selfReportedValue - a.selfReportedValue);
    sorted.forEach((p, i) => (p.hypeRank = i + 1));
    const max = Math.max(1, sorted[0].selfReportedValue);
    return sorted.map((p) => ({
      ...p,
      hypeProgress: Math.round((p.selfReportedValue / max) * 100),
      auditScore: auditMap[p.id],
      movement: p.id === "p-bob" || p.id === "p-charlie" ? "up" : p.id === "p-julia" ? "down" : "flat",
    }));
  }

  const seedAudits = {
    "p-bob": {
      participantId: "p-bob", declaredMetric: 18, validatedItems: 11, rejectedItems: 7,
      qualityScore: 46, qualityMultiplier: 0.55, suggestedFinalScore: 6.05,
      flags: ["7 testimonials under minimum quality threshold", "4 missing permission confirmation", "Weak business impact in several testimonials"],
      recommendation: "Needs manual review", adminStatus: "pending",
      rubricBreakdown: [
        { key: "clarity", label: "Clarity", score: 12, max: 20 },
        { key: "businessImpact", label: "Business impact", score: 9, max: 30 },
        { key: "clientRelevance", label: "Client relevance", score: 14, max: 20 },
        { key: "specificity", label: "Specificity", score: 8, max: 20 },
        { key: "permissionCompleteness", label: "Permissions", score: 3, max: 10 },
      ],
    },
    "p-patrick": {
      participantId: "p-patrick", declaredMetric: 9, validatedItems: 9, rejectedItems: 0,
      qualityScore: 91, qualityMultiplier: 1.15, suggestedFinalScore: 10.35,
      flags: [], recommendation: "Strong candidate for winner", adminStatus: "pending",
      rubricBreakdown: [
        { key: "clarity", label: "Clarity", score: 19, max: 20 },
        { key: "businessImpact", label: "Business impact", score: 28, max: 30 },
        { key: "clientRelevance", label: "Client relevance", score: 18, max: 20 },
        { key: "specificity", label: "Specificity", score: 17, max: 20 },
        { key: "permissionCompleteness", label: "Permissions", score: 9, max: 10 },
      ],
    },
    "p-alice": {
      participantId: "p-alice", declaredMetric: 7, validatedItems: 6, rejectedItems: 1,
      qualityScore: 78, qualityMultiplier: 1.0, suggestedFinalScore: 7.8,
      flags: ["1 missing permission confirmation"], recommendation: "Good submission", adminStatus: "pending",
    },
    "p-charlie": {
      participantId: "p-charlie", declaredMetric: 6, validatedItems: 6, rejectedItems: 0,
      qualityScore: 88, qualityMultiplier: 1.1, suggestedFinalScore: 7.92,
      flags: [], recommendation: "Dark horse candidate", adminStatus: "pending",
    },
  };

  const seedFeed = [
    { id: "fp-1", author: "Daremaster", authorType: "bot", authorRole: "DYD Bot", pinned: true,
      content: "A new DYD has been unlocked. DYD #001 — The Testimonial Hunt is now open. Trip to Buenos Aires + dinner with leadership goes to the participant whose evidence holds up under audit. The Dare is open for 14 days.",
      createdAt: "2026-04-28T09:00:00-03:00",
      reactions: { fire: 124, clap: 87, rocket: 54, eyes: 211, trophy: 18 } },
    { id: "fp-2", author: "Hype Bot", authorType: "bot", authorRole: "DYD Bot",
      content: "Bob is leading with 18 testimonials. But remember: quality can flip the board. The audit hasn't started yet.",
      createdAt: "2026-05-05T11:42:00-03:00",
      reactions: { fire: 41, clap: 12, rocket: 4, eyes: 89, trophy: 0 } },
    { id: "fp-3", author: "Patrick Olawale", authorRole: "Delivery Manager", authorType: "participant",
      content: "Just uploaded 9 testimonials. Each one has the client on camera, with explicit permission, naming the dollar impact. I'd rather submit fewer that hold up than chase a number.",
      createdAt: "2026-05-05T14:17:00-03:00",
      reactions: { fire: 67, clap: 92, rocket: 34, eyes: 12, trophy: 11 } },
    { id: "fp-4", author: "Hype Bot", authorType: "bot", authorRole: "DYD Bot",
      content: "Patrick just uploaded new evidence. The leaderboard may not tell the full story.",
      createdAt: "2026-05-05T14:31:00-03:00",
      reactions: { fire: 22, clap: 8, rocket: 2, eyes: 73, trophy: 0 } },
    { id: "fp-5", author: "Maya Iverson", authorRole: "Software Engineer II", authorType: "employee",
      content: "Watching this from the sidelines and the Bob vs Patrick situation is the best thing internal comms has shipped in two years.",
      createdAt: "2026-05-05T16:02:00-03:00",
      reactions: { fire: 38, clap: 51, rocket: 6, eyes: 9, trophy: 0 } },
    { id: "fp-6", author: "Hype Bot", authorType: "bot", authorRole: "DYD Bot",
      content: "Charlie is a dark horse. Fewer testimonials, but the ones uploaded so far are clean. Quality multiplier looks favorable.",
      createdAt: "2026-05-06T08:55:00-03:00",
      reactions: { fire: 28, clap: 14, rocket: 9, eyes: 41, trophy: 2 } },
    { id: "fp-7", author: "Alice Chen", authorRole: "Customer Success Manager", authorType: "participant",
      content: "Got two CSMs from healthcare on video this morning. Permissions in writing. Slow and steady.",
      createdAt: "2026-05-06T11:20:00-03:00",
      reactions: { fire: 19, clap: 27, rocket: 4, eyes: 6, trophy: 1 } },
    { id: "fp-8", author: "Sofia Reyes", authorRole: "Growth Lead", authorType: "admin",
      content: "Reminder: the audit contract scores Specificity and Business Impact at 50 points combined. \"They were great\" doesn't move the needle — name the outcome, the metric, and the timeframe.",
      createdAt: "2026-05-07T10:00:00-03:00",
      reactions: { fire: 45, clap: 73, rocket: 8, eyes: 22, trophy: 0 } },
    { id: "fp-9", author: "Hype Bot", authorType: "bot", authorRole: "DYD Bot",
      content: "48 hours left to register. The Dare is still open.",
      createdAt: "2026-05-10T09:00:00-03:00",
      reactions: { fire: 14, clap: 6, rocket: 3, eyes: 31, trophy: 0 } },
    { id: "fp-10", author: "Diego Salinas", authorRole: "Account Executive", authorType: "participant",
      content: "I dare. Going for 5 high-quality testimonials, no padding.",
      createdAt: "2026-05-10T15:33:00-03:00",
      reactions: { fire: 12, clap: 18, rocket: 2, eyes: 4, trophy: 0 } },
    { id: "fp-11", author: "Hype Bot", authorType: "bot", authorRole: "DYD Bot",
      content: "The Hype Ranking is heating up. Final audit will decide the real winner.",
      createdAt: "2026-05-11T09:00:00-03:00",
      reactions: { fire: 33, clap: 11, rocket: 7, eyes: 56, trophy: 0 } },
    { id: "fp-12", author: "Bob Martinez", authorRole: "Account Executive", authorType: "participant",
      content: "18 testimonials in. Going for 25.",
      createdAt: "2026-05-11T14:12:00-03:00",
      reactions: { fire: 71, clap: 22, rocket: 14, eyes: 45, trophy: 3 } },
  ];

  const agents = [
    { id: "challenge_designer", name: "Challenge Designer",
      purpose: "Turns a one-line growth goal from leadership into a complete DYD challenge: title, rules, deadlines, scoring rubric, evidence requirements, and bot scripts.",
      sampleInput: "I want employees to collect client testimonials for marketing.",
      latestOutput: "Generated DYD #001 — The Testimonial Hunt. Defined 5-criteria audit contract, 14-day window, evidence requirements, and Hype Bot launch script.",
      status: "ready", lastActionAt: "2026-04-28T08:42:00-03:00" },
    { id: "hype_bot", name: "Hype Bot",
      purpose: "Keeps the challenge socially alive. Posts leaderboard updates, deadline reminders, and competitive commentary in the feed.",
      sampleInput: "Trigger: Patrick uploaded new evidence.",
      latestOutput: 'Posted: "Patrick just uploaded new evidence. The leaderboard may not tell the full story."',
      status: "running", lastActionAt: "2026-05-05T14:31:00-03:00" },
    { id: "audit_assistant", name: "AI Audit Assistant",
      purpose: "Reviews evidence against the audit contract. Suggests quality scores, flags issues, and recommends approve / reject / needs-clarification. Final decision belongs to a human admin.",
      sampleInput: "Bob's 18 submitted testimonials + audit contract.",
      latestOutput: "Validated 11 of 18. 7 flagged for low quality. 4 missing permission. Suggested final score 6.05. Recommendation: needs manual review.",
      status: "ready", lastActionAt: "2026-05-09T18:00:00-03:00" },
    { id: "insight_extractor", name: "Growth Insight Extractor",
      purpose: "After approval, mines the testimonial corpus for reusable marketing assets: campaign quotes, case study leads, sales snippets, LinkedIn drafts, and landing page copy.",
      sampleInput: "21 approved testimonials from DYD #001.",
      latestOutput: "Extracted 6 strong quotes, 3 case study leads, 5 sales snippets, 4 LinkedIn drafts. Ready for marketing review.",
      status: "idle", lastActionAt: "2026-05-09T18:30:00-03:00" },
  ];

  const growthAssets = {
    challengeId: "dyd-001",
    totals: { submitted: 34, approved: 21, rejected: 13, quotes: 6, caseStudies: 3, snippets: 5, linkedinPosts: 4 },
    topQuotes: [
      { quote: "BairesDev shipped our lending platform two quarters ahead of plan. We unlocked $14M in originations we'd otherwise have left on the table.", client: "Marcus Lee", company: "Wells Fargo" },
      { quote: "We hired BairesDev to clean up a 4-year tech debt mess. Six months later we're shipping weekly. They're now embedded across three of our product lines.", client: "Hannah Voss", company: "Monolith Pharma" },
      { quote: "We tried four other vendors before BairesDev. They were the only team that asked us about the business outcome before they wrote any code.", client: "Tobias Engle", company: "Northwind Logistics" },
      { quote: "Their engineers don't feel like contractors. They argue with us. They push back. That's how we know they're invested.", client: "Priya Banerjee", company: "Helio Health" },
      { quote: "We cut our infra costs by 38% in the first quarter after the platform rebuild.", client: "Daniel Cho", company: "Stripe-adjacent fintech" },
      { quote: "BairesDev's team scales up and down without the contract drama we'd had with every previous partner.", client: "Marisa Quinn", company: "Acuity Insurance" },
    ],
    caseStudies: [
      { title: "Wells Fargo — Lending platform, two quarters early", summary: "$14M in originations unlocked. 12-year-old monolith modernized.", client: "Wells Fargo" },
      { title: "Monolith Pharma — From tech debt to weekly releases", summary: "4 years of accreted complexity rationalized in 6 months.", client: "Monolith Pharma" },
      { title: "Helio Health — Embedded engineering as a partnership", summary: "5 BairesDev engineers in a 30-person org. Zero attrition.", client: "Helio Health" },
    ],
    snippets: [
      { tag: "sales", text: "Our average client ships 2.1 quarters ahead of their original roadmap after embedding BairesDev engineers." },
      { tag: "sales", text: "38% average infra cost reduction following a BairesDev platform rebuild." },
      { tag: "sales", text: "Zero contractor attrition across our top 20 accounts in the last 18 months." },
      { tag: "marketing", text: "BairesDev: the team your engineers argue with — and that's the point." },
      { tag: "marketing", text: "We don't ship code until we understand the business outcome." },
    ],
    linkedinPosts: [
      { title: "What 21 client testimonials taught us in two weeks", body: "47 employees. 34 testimonials submitted. 21 approved. Six emerged that we'd put on a billboard." },
      { title: "Why we let our engineers argue with our clients", body: "A direct quote from a Helio Health VP this week. That's the bar." },
      { title: "Two quarters ahead of plan", body: "Wells Fargo's lending platform launched two quarters early. Team was 60% BairesDev. Unlocked: $14M." },
      { title: "The DYD experiment", body: "We turned testimonial-collection into an internal competition. 21 marketing-ready assets in 14 days." },
    ],
  };

  const notifications = [
    { id: "n-1", title: "A new DYD has been unlocked.", body: "DYD #001 — The Testimonial Hunt. Trip to Buenos Aires + dinner with leadership.", cta: "View Challenge", href: "/", unread: true, createdAt: "2026-04-28T09:00:00-03:00" },
    { id: "n-2", title: "Patrick uploaded new evidence.", body: "The leaderboard may not tell the full story.", cta: "Open Hype Ranking", href: "/ranking", unread: true, createdAt: "2026-05-05T14:31:00-03:00" },
    { id: "n-3", title: "48 hours left to register.", body: "The Dare is still open.", cta: "Accept the Dare", href: "/", unread: false, createdAt: "2026-05-10T09:00:00-03:00" },
  ];

  function clone(v) { return typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)); }

  let state = null;
  function hydrate() {
    if (state) return state;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { state = JSON.parse(raw); return state; }
    } catch {}
    state = {
      participants: clone(seedParticipants),
      ranking: buildRanking(clone(seedParticipants)),
      feed: clone(seedFeed),
      audits: clone(seedAudits),
      evidence: [],
      challenge: clone(challenge),
      currentUserId: "u-bob",
      notifications: clone(notifications),
    };
    persist();
    return state;
  }
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }
  function delay(v) { return new Promise((r) => setTimeout(() => r(clone(v)), LATENCY())); }
  function recompute(s) { s.ranking = buildRanking(s.participants); }

  const api = {
    getChallenge: () => delay(hydrate().challenge),
    getParticipants: () => delay(hydrate().participants),
    getHypeRanking: () => delay(hydrate().ranking),
    getFeed: () => {
      const s = hydrate();
      const posts = [...s.feed].sort((a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return delay({ posts });
    },
    getMySubmission: (_, userId) => {
      const s = hydrate();
      const p = s.participants.find((x) => x.userId === userId);
      if (!p) return delay(null);
      return delay(s.evidence.find((e) => e.participantId === p.id) || null);
    },
    getAuditQueue: () => delay(Object.values(hydrate().audits)),
    getAuditResult: (pid) => delay(hydrate().audits[pid] || null),
    getAgents: () => delay(agents),
    getGrowthAssets: () => delay(growthAssets),
    getCurrentUser: () => delay(users[hydrate().currentUserId] || users["u-bob"]),
    getNotifications: () => delay(hydrate().notifications),

    setRole: (role) => {
      const map = { participant: "u-bob", admin: "u-admin", sponsor: "u-sponsor", spectator: "u-spectator" };
      const s = hydrate();
      s.currentUserId = map[role] || "u-bob";
      persist();
      return delay(users[s.currentUserId]);
    },
    register: (_, userId) => {
      const s = hydrate();
      const ex = s.participants.find((p) => p.userId === userId);
      if (ex) ex.registered = true;
      else {
        const u = users[userId];
        if (u) s.participants.push({
          id: `p-${userId}`, userId, name: u.name, role: u.jobTitle,
          avatarInitials: u.name.split(" ").map((n) => n[0]).slice(0, 2).join(""),
          registered: true, selfReportedValue: 0, evidenceStatus: "not_submitted",
          hypeRank: s.participants.length + 1, badges: [],
        });
      }
      recompute(s); persist();
      return delay(undefined);
    },
    updateSelfReport: (_, userId, value) => {
      const s = hydrate();
      const p = s.participants.find((x) => x.userId === userId);
      if (!p) return Promise.reject(new Error("Not registered"));
      p.selfReportedValue = Math.max(0, value);
      recompute(s); persist();
      return delay(p);
    },
    submitEvidence: (cid, userId, draft) => {
      const s = hydrate();
      const p = s.participants.find((x) => x.userId === userId);
      if (!p) return Promise.reject(new Error("Not registered"));
      const sub = { id: `ev-${userId}-${Date.now()}`, participantId: p.id, challengeId: cid, submittedAt: new Date().toISOString(), ...draft };
      s.evidence = s.evidence.filter((e) => e.participantId !== p.id);
      s.evidence.push(sub);
      p.evidenceStatus = "uploaded";
      persist();
      return delay(sub);
    },
    postFeedComment: (_, content) => {
      const s = hydrate();
      const u = users[s.currentUserId];
      const post = {
        id: `fp-${Date.now()}`, author: u.name, authorRole: u.jobTitle,
        authorType: u.role === "admin" ? "admin" : u.role === "participant" ? "participant" : "employee",
        content, createdAt: new Date().toISOString(),
        reactions: { fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 },
      };
      s.feed = [post, ...s.feed]; persist();
      return delay(post);
    },
    react: (postId, kind) => {
      const s = hydrate();
      const p = s.feed.find((x) => x.id === postId);
      if (!p) return Promise.reject(new Error("Not found"));
      p.reactions[kind] = (p.reactions[kind] || 0) + 1; persist();
      return delay(p);
    },
    adminApprove: (pid) => {
      const s = hydrate();
      const a = s.audits[pid]; if (!a) return Promise.reject(new Error("Not found"));
      a.adminStatus = "approved";
      const part = s.participants.find((p) => p.id === pid);
      if (part) part.evidenceStatus = "approved";
      persist();
      return delay(a);
    },
    adminReject: (pid, reason) => {
      const s = hydrate();
      const a = s.audits[pid]; if (!a) return Promise.reject(new Error("Not found"));
      a.adminStatus = "rejected";
      a.flags = [...a.flags, `Admin reason: ${reason}`];
      const part = s.participants.find((p) => p.id === pid);
      if (part) part.evidenceStatus = "rejected";
      persist();
      return delay(a);
    },
    adminOverrideScore: (pid, score) => {
      const s = hydrate();
      const a = s.audits[pid]; if (!a) return Promise.reject(new Error("Not found"));
      a.suggestedFinalScore = score; a.adminStatus = "overridden"; persist();
      return delay(a);
    },
    adminDeclareWinner: (pid) => {
      const s = hydrate();
      s.challenge.winnerId = pid;
      s.challenge.status = "completed";
      const p = s.participants.find((x) => x.id === pid);
      if (p) p.finalRank = 1;
      persist();
      return delay(s.challenge);
    },
    resetState: () => { localStorage.removeItem(STORAGE_KEY); state = null; },
  };

  // AI helpers via window.claude
  const ai = {
    async designChallenge(goal) {
      const prompt = `You are the DYD Challenge Designer. Turn the growth goal below into a complete internal-hackathon challenge for BairesDev. Reply ONLY with valid JSON matching this shape (no preamble):
{
  "title": string,
  "description": string,
  "reward": string,
  "registrationDays": number,
  "submissionDays": number,
  "rules": string[],
  "rubric": [{ "key": string, "label": string, "weight": number }],
  "evidenceRequirements": string[],
  "hypeBotLaunchScript": string
}

Rules: rubric weights must sum to 100. Tone: confident, plainspoken, slightly mysterious — never childish. The reward should feel premium. The script is one paragraph spoken by the DYD Bot to launch the challenge.

Goal: ${goal}`;
      const raw = await window.claude.complete(prompt);
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      return JSON.parse(cleaned);
    },
    async auditEvidence(args) {
      const prompt = `You are the DYD AI Audit Assistant. You do NOT make final decisions — you assist a human admin.

Audit ${args.participantName}'s testimonial submission against this rubric:
${args.rubric.map(r => `- ${r.label} (${r.weight} pts)`).join("\n")}

Declared metric: ${args.declaredMetric} testimonials
Evidence summary: ${args.evidenceSummary}

Reply ONLY with valid JSON (no preamble):
{
  "qualityScore": number,
  "qualityMultiplier": number,
  "validatedItems": number,
  "flags": string[],
  "recommendation": string,
  "rubricBreakdown": [{ "label": string, "score": number, "note": string }]
}`;
      const raw = await window.claude.complete(prompt);
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      return JSON.parse(cleaned);
    },
  };

  root.DYD = { api, ai, users, agents };
})(window);
