import { useState, useEffect, useRef, useCallback } from "react";

const Fonts = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.06); opacity: 1; } }
    .fade-up { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
    .fade-up-d1 { animation-delay: 0.08s; }
    .fade-up-d2 { animation-delay: 0.16s; }
    .fade-up-d3 { animation-delay: 0.24s; }
    .fade-up-d4 { animation-delay: 0.32s; }
    input, textarea, select { font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
    input:focus, textarea:focus, select:focus { border-color: #c8a96e !important; box-shadow: 0 0 0 3px rgba(200,169,110,0.12) !important; }
    button { font-family: 'DM Sans', sans-serif; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #2e3a2e; border-radius: 2px; }
    .btn-primary { background: #c8a96e; color: #0f1410; border: none; border-radius: 12px; padding: 15px 32px; font-size: 14px; font-weight: 600; cursor: pointer; letter-spacing: 0.03em; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
    .btn-primary:hover { background: #d4b87a; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(200,169,110,0.25); }
    .btn-primary:active { transform: translateY(0); }
    .btn-primary:disabled { background: #2a342a; color: #5a645a; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-ghost { background: transparent; color: #9ea89e; border: 1px solid #2e3a2e; border-radius: 12px; padding: 14px 32px; font-size: 14px; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
    .btn-ghost:hover { border-color: #c8a96e; color: #c8a96e; background: rgba(200,169,110,0.06); }
    .card { background: #1a221a; border: 1px solid #252f25; border-radius: 16px; }
    .card-hover { transition: border-color 0.2s, box-shadow 0.2s; }
    .card-hover:hover { border-color: #354535; box-shadow: 0 4px 32px rgba(0,0,0,0.3); }
    .input-field { width: 100%; background: #141c14; border: 1px solid #252f25; border-radius: 10px; padding: 12px 16px; color: #e8e4dc; font-size: 14px; font-family: 'DM Sans', sans-serif; }
    .input-field::placeholder { color: #4a544a; }
    .label { display: block; font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #6a746a; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
    .tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
  `}</style>
);

const C = {
    bg: "#0f1410", surface: "#131913", card: "#1a221a", elevated: "#202820",
    border: "#252f25", borderMid: "#2e3a2e",
    gold: "#c8a96e", goldSoft: "rgba(200,169,110,0.1)",
    green: "#4caf78", greenSoft: "rgba(76,175,120,0.1)",
    amber: "#e8a030", amberSoft: "rgba(232,160,48,0.1)",
    red: "#e05252", redSoft: "rgba(224,82,82,0.1)",
    blue: "#5b9bd5", blueSoft: "rgba(91,155,213,0.1)",
    text: "#e8e4dc", textSub: "#9ea89e", textMuted: "#5a645a", textDim: "#3a443a",
};

const srcStyle = {
    "WHO IMCI": { color: C.green, border: "rgba(76,175,120,0.3)", bg: "rgba(76,175,120,0.08)" },
    ORPHANET: { color: C.blue, border: "rgba(91,155,213,0.3)", bg: "rgba(91,155,213,0.08)" },
    MSF: { color: C.amber, border: "rgba(232,160,48,0.3)", bg: "rgba(232,160,48,0.08)" },
};
const triageCfg = {
    local: { color: C.green, bg: C.greenSoft, border: "rgba(76,175,120,0.2)", icon: "●", label: "Manage Locally" },
    refer: { color: C.amber, bg: C.amberSoft, border: "rgba(232,160,48,0.2)", icon: "◆", label: "Refer to Clinic" },
    emergency: { color: C.red, bg: C.redSoft, border: "rgba(224,82,82,0.2)", icon: "▲", label: "Emergency Referral" },
};

const SCENARIOS = {
    A: {
        id: "A", mode: "standard",
        loading: ["Parsing symptom description…", "Retrieving WHO IMCI Fever Protocol §4.1…", "Scanning Orphanet disease profiles…", "MedGemma 1.5 4B inference running…", "Validating against safety thresholds…"],
        emergency: false, lowConf: false,
        triage: { level: "refer", detail: "Visceral Leishmaniasis requires rK39 rapid test and specialist confirmation. Refer within 24 hours.", protocol: "WHO IMCI §4.1 · MSF Kala-Azar Protocol 2023" },
        differential: [
            {
                rank: 1, name: "Visceral Leishmaniasis (Kala-Azar)", confidence: 67, sources: ["WHO IMCI", "ORPHANET"],
                flags: [
                    { label: "Fever duration >14 days", drawer: "View protocol", icon: "📄", ref: "WHO IMCI Fever Protocol §4.1", bc: C.green, excerpt: "A child with fever lasting 7 days or more should be referred urgently. Prolonged fever >14 days in endemic areas strongly suggests systemic infection — consider Visceral Leishmaniasis, Typhoid, or Brucellosis.", stat: "Clinical threshold: >7 days = refer · >14 days = urgent referral" },
                    { label: "Hepatosplenomegaly reported", drawer: "View criteria", icon: "📘", ref: "Orphanet — Visceral Leishmaniasis (ORPHA:507)", bc: C.blue, excerpt: "Hepatosplenomegaly is present in >95% of confirmed VL cases. Massive splenomegaly with progressive weight loss in an endemic region is the classic triad for Kala-Azar diagnosis.", stat: "Prevalence of sign in confirmed VL: 95–100%" },
                    { label: "Progressive weight loss", drawer: "View criteria", icon: "📙", ref: "MSF Field Guide 2023 — Kala-Azar §2.1", bc: C.amber, excerpt: "Weight loss >10% of body weight combined with splenomegaly and prolonged fever constitutes a presumptive diagnosis of VL in endemic settings. Treat empirically if rK39 is unavailable.", stat: "Action: rK39 rapid test recommended before treatment" },
                    { label: "Region: Sub-Saharan Africa (endemic zone)", drawer: "View epidemiology", icon: "📘", ref: "Orphanet — Epidemiological Data", bc: C.blue, excerpt: "Annual incidence: 50,000–90,000 new cases globally. East Africa accounts for ~30% of global VL burden. Kisumu region, Kenya: classified high-endemic by WHO.", stat: "East Africa share of global burden: ~30%" },
                ]
            },
            {
                rank: 2, name: "Typhoid Fever", confidence: 21, sources: ["WHO IMCI"],
                flags: [{ label: "Sustained step-ladder fever pattern", drawer: "View protocol", icon: "📄", ref: "WHO IMCI §3.7", bc: C.green, excerpt: "Typhoid presents with abdominal pain, relative bradycardia, and sustained fever. Endemic region increases pre-test probability significantly.", stat: "Widal test or blood culture required for confirmation" }]
            },
            {
                rank: 3, name: "Drug-Resistant Malaria", confidence: 12, sources: ["MSF"],
                flags: [{ label: "No response to prior antimalarials", drawer: "View guidance", icon: "📙", ref: "MSF Field Guide 2023 §2.3", bc: C.amber, excerpt: "Treatment failure after adequate antimalarial therapy requires parasitological confirmation and resistance testing. Consider artemisinin partial resistance in East Africa.", stat: "Thick blood smear + RDT recommended immediately" }]
            },
        ],
    },
    B: {
        id: "B", mode: "rare",
        loading: ["Parsing symptom description…", "Activating RarePath engine…", "Querying Orphanet — 6,000+ rare disease profiles…", "MedGemma 27B deep reasoning engaged…", "Rare disease pattern matching…"],
        emergency: false, lowConf: true,
        triage: { level: "emergency", detail: "Suspected lysosomal storage disorder requiring pediatric hematology/metabolic specialist. Do not delay transport. Notify receiving facility in advance.", protocol: "Orphanet ORPHA:77261 · MSF Rare Disease Pathway" },
        differential: [
            {
                rank: 1, name: "Gaucher Disease (Type 3)", confidence: 54, sources: ["ORPHANET"],
                flags: [
                    { label: "Progressive hepatosplenomegaly, child <5y", drawer: "View criteria", icon: "📘", ref: "Orphanet — Gaucher Disease Type 3 (ORPHA:77261)", bc: C.blue, excerpt: "Hepatosplenomegaly is the most common presenting sign in Gaucher Disease, occurring in >95% of patients. In Type 3, onset before age 5 with progressive organomegaly and neurological regression is characteristic.", stat: "Diagnosed by age 5 in 80% of Type 3 cases" },
                    { label: "Neurological regression after normal milestones", drawer: "View criteria", icon: "📘", ref: "Orphanet — Gaucher Neuronopathic (ORPHA:77261)", bc: C.blue, excerpt: "Features include oculomotor apraxia, progressive ataxia, seizures, and developmental regression. Regression after previously normal milestones is a key diagnostic indicator.", stat: "Distinguishing feature: Type 3 = hepatosplenomegaly + neuro regression" },
                    { label: "Afebrile >4 weeks with massive splenomegaly", drawer: "View rule", icon: "📙", ref: "MSF Field Guide 2023 — Splenomegaly §3.4", bc: C.amber, excerpt: "Massive splenomegaly WITHOUT fever in a child under 5 should prompt consideration of storage disorders (Gaucher, Niemann-Pick) rather than infectious causes.", stat: "Clinical rule: afebrile + massive spleen in child = storage disorder until proven otherwise" },
                ]
            },
            {
                rank: 2, name: "Niemann-Pick Disease Type B", confidence: 27, sources: ["ORPHANET"],
                flags: [{ label: "Massive splenomegaly + recurrent infections", drawer: "View criteria", icon: "📘", ref: "Orphanet — Niemann-Pick Type B (ORPHA:607)", bc: C.blue, excerpt: "Niemann-Pick Type B presents with massive splenomegaly, pulmonary infiltration, and recurrent respiratory infections.", stat: "Distinguishing test: sphingomyelinase enzyme assay in leukocytes" }]
            },
            {
                rank: 3, name: "Hemophagocytic Lymphohistiocytosis", confidence: 19, sources: ["ORPHANET"],
                flags: [{ label: "Systemic involvement + cytopenias", drawer: "View criteria", icon: "📘", ref: "Orphanet — HLH (ORPHA:158)", bc: C.blue, excerpt: "HLH presents with prolonged fever, hepatosplenomegaly, cytopenias, and elevated ferritin. HLH-2004 diagnostic criteria require 5 of 8 features.", stat: "HLH-2004 criteria: 5 of 8 required for diagnosis" }]
            },
        ],
    },
};

const HISTORY = [
    { id: "BDX-0039", ageSex: "28y F", region: "Kisumu West, Kenya", mode: "standard", dx: "Visceral Leishmaniasis", conf: 67, triage: "refer", impression: "Agree", date: "21 Feb 2026, 14:32", sc: "A" },
    { id: "BDX-0038", ageSex: "4y M", region: "Bihar, India", mode: "rare", dx: "Gaucher Disease Type 3", conf: 54, triage: "emergency", impression: "Agree", date: "21 Feb 2026, 11:08", sc: "B" },
    { id: "BDX-0037", ageSex: "42y M", region: "Kampala District", mode: "standard", dx: "Typhoid Fever", conf: 71, triage: "refer", impression: "Disagree", date: "20 Feb 2026, 16:44", sc: "A" },
    { id: "BDX-0036", ageSex: "9y F", region: "Nairobi West", mode: "standard", dx: "Malaria (Uncomplicated)", conf: 83, triage: "local", impression: "Agree", date: "20 Feb 2026, 09:15", sc: "A" },
    { id: "BDX-0035", ageSex: "67y M", region: "Dhaka Division", mode: "rare", dx: "Niemann-Pick Disease", conf: 41, triage: "emergency", impression: "Unsure", date: "19 Feb 2026, 13:22", sc: "B" },
    { id: "BDX-0034", ageSex: "22y F", region: "Lagos State", mode: "standard", dx: "Drug-Resistant Malaria", conf: 62, triage: "refer", impression: "Agree", date: "18 Feb 2026, 10:05", sc: "A" },
];

// ── ATOMS ──────────────────────────────────────────────────────────────
const BridgeLogo = ({ size = 16 }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <svg width={size * 1.4} height={size} viewBox="0 0 28 20" fill="none">
            <path d="M2 17 Q7 4 14 4 Q21 4 26 17" stroke={C.gold} strokeWidth="2" fill="none" strokeLinecap="round" />
            <line x1="2" y1="17" x2="26" y2="17" stroke={C.gold} strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="17" x2="9" y2="11" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="14" y1="17" x2="14" y2="7" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="19" y1="17" x2="19" y2="11" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "'Libre Baskerville',serif", fontSize: size, color: C.text, letterSpacing: "0.02em" }}>
            Bridge<span style={{ color: C.gold }}>Dx</span>
        </span>
    </div>
);

const TriagePill = ({ level, size = "sm" }) => {
    const t = triageCfg[level];
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: size === "lg" ? "10px 20px" : "5px 14px", borderRadius: 99, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: size === "lg" ? 14 : 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}><span style={{ fontSize: size === "lg" ? 10 : 8 }}>{t.icon}</span>{t.label}</span>;
};

const SourceTag = ({ source }) => {
    const s = srcStyle[source]; if (!s) return null;
    return <span className="tag" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{source}</span>;
};

const ConfBar = ({ pct }) => {
    const color = pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0" }}>
            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, background: color, width: `${pct}%`, transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color, minWidth: 34, textAlign: "right" }}>{pct}%</span>
        </div>
    );
};

const InfoBubble = ({ type = "info", children }) => {
    const s = { warning: { color: C.amber, bg: C.amberSoft, border: "rgba(232,160,48,0.25)", icon: "⚠" }, emergency: { color: C.red, bg: C.redSoft, border: "rgba(224,82,82,0.25)", icon: "🚨" }, info: { color: C.blue, bg: C.blueSoft, border: "rgba(91,155,213,0.25)", icon: "ℹ" }, success: { color: C.green, bg: C.greenSoft, border: "rgba(76,175,120,0.25)", icon: "✓" }, lock: { color: C.textSub, bg: C.elevated, border: C.border, icon: "🔒" } }[type];
    return <div style={{ display: "flex", gap: 12, padding: "14px 18px", borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, marginBottom: 16 }}><span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{s.icon}</span><div style={{ fontSize: 13, color: C.textSub, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>{children}</div></div>;
};

const Divider = ({ label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "28px 0 22px" }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted, letterSpacing: "0.15em", whiteSpace: "nowrap" }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
);

const Nav = ({ onBack, backLabel, title, right }) => (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: `${C.surface}ee`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {onBack ? <button onClick={onBack} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 7, padding: "8px 0", fontFamily: "'DM Sans',sans-serif", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.textSub}><span style={{ fontSize: 18 }}>‹</span>{backLabel}</button> : <BridgeLogo size={14} />}
        {title && <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: C.textSub, fontWeight: 500, pointerEvents: "none" }}>{title}</span>}
        {right || <div style={{ width: 80 }} />}
    </header>
);

// ── EVIDENCE FLAG ──────────────────────────────────────────────────────
const EvidenceFlag = ({ flag, open, onToggle }) => (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div onClick={onToggle} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, padding: "13px 0", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
                <span style={{ color: C.green, fontSize: 11, marginTop: 3, flexShrink: 0 }}>✓</span>
                <span style={{ color: C.text, fontSize: 13.5, lineHeight: 1.45, fontFamily: "'DM Sans',sans-serif" }}>{flag.label}</span>
            </div>
            <span style={{ color: open ? C.gold : C.textMuted, fontSize: 11, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap", flexShrink: 0, paddingTop: 3, transition: "color 0.15s", userSelect: "none" }}>{open ? "▲ Hide" : `▼ ${flag.drawer}`}</span>
        </div>
        <div style={{ overflow: "hidden", maxHeight: open ? 280 : 0, transition: "max-height 0.3s cubic-bezier(0.22,1,0.36,1),opacity 0.25s", opacity: open ? 1 : 0 }}>
            <div style={{ marginLeft: 20, marginBottom: 14, borderRadius: 10, border: `1px solid ${flag.bc}28`, borderLeft: `3px solid ${flag.bc}`, background: "rgba(255,255,255,0.02)", padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: flag.bc, marginBottom: 10, display: "flex", alignItems: "center", gap: 6, lineHeight: 1.4 }}><span>{flag.icon}</span><span>{flag.ref}</span></div>
                <p style={{ fontSize: 12.5, color: "#aca8a0", lineHeight: 1.7, fontFamily: "'Libre Baskerville',serif", fontStyle: "italic", margin: "0 0 12px" }}>"{flag.excerpt}"</p>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>{flag.stat}</div>
            </div>
        </div>
    </div>
);

// ── DIFF CARD ──────────────────────────────────────────────────────────
const DiffCard = ({ cond, delayMs = 0 }) => {
    const [open, setOpen] = useState(null);
    const [vis, setVis] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVis(true), delayMs); return () => clearTimeout(t); }, [delayMs]);
    const rankColor = cond.rank === 1 ? C.gold : cond.rank === 2 ? C.textSub : C.textMuted;
    return (
        <div className="card" style={{ padding: "22px 24px", marginBottom: 10, opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(18px)", transition: "opacity 0.5s,transform 0.5s cubic-bezier(0.22,1,0.36,1)", borderLeft: cond.rank === 1 ? `3px solid ${C.gold}` : "3px solid transparent" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${rankColor}44`, color: rankColor, fontFamily: "'Libre Baskerville',serif", fontSize: 14, flexShrink: 0, marginTop: 2 }}>{cond.rank}</div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 16, color: C.text, fontWeight: 400, lineHeight: 1.35 }}>{cond.name}</h3>
                    <ConfBar pct={cond.confidence} />
                </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 18, paddingLeft: 46, flexWrap: "wrap" }}>{cond.sources.map(s => <SourceTag key={s} source={s} />)}</div>
            <div style={{ paddingLeft: 46 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", color: C.textMuted, fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>WHY FLAGGED</div>
                {cond.flags.map((f, i) => <EvidenceFlag key={i} flag={f} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />)}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════
// SPLASH
// ══════════════════════════════════════════════════════════════════════
const SplashPage = ({ onEnter }) => {
    const [step, setStep] = useState(0);
    const steps = [
        { icon: "🌍", title: "Built for the last mile", body: "Designed for community health workers in low-resource settings — no specialist required, minimal connectivity needed." },
        { icon: "🔬", title: "Powered by MedGemma", body: "Google's open medical AI model, grounded in WHO IMCI, Orphanet rare disease database, and MSF field guidelines — works offline." },
        { icon: "🛡", title: "Safety first, always", body: "AI is decision support only. Every output requires your clinical confirmation. No identifiable patient data is ever stored." },
    ];
    if (step === 0) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(76,175,120,0.05) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "5%", right: "-15%", width: 400, height: 400, background: "radial-gradient(circle, rgba(200,169,110,0.04) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
            <div className="fade-up" style={{ textAlign: "center", maxWidth: 380, position: "relative" }}>
                <div style={{ marginBottom: 32, animation: "breathe 3s ease-in-out infinite" }}>
                    <svg width={72} height={52} viewBox="0 0 28 20" fill="none" style={{ display: "block", margin: "0 auto" }}>
                        <path d="M2 17 Q7 4 14 4 Q21 4 26 17" stroke={C.gold} strokeWidth="2" fill="none" strokeLinecap="round" />
                        <line x1="2" y1="17" x2="26" y2="17" stroke={C.gold} strokeWidth="2" strokeLinecap="round" />
                        <line x1="9" y1="17" x2="9" y2="11" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="14" y1="17" x2="14" y2="7" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="19" y1="17" x2="19" y2="11" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                </div>
                <h1 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 44, color: C.text, letterSpacing: "0.01em", marginBottom: 6, lineHeight: 1.1 }}>Bridge<span style={{ color: C.gold }}>Dx</span></h1>
                <p style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 16, color: C.textSub, fontStyle: "italic", marginBottom: 48, lineHeight: 1.6 }}>Diagnostic support for the hardest cases,<br />in the hardest places.</p>
                <button className="btn-primary" onClick={() => setStep(1)} style={{ width: "100%", maxWidth: 300, marginBottom: 14, display: "block", margin: "0 auto 14px" }}>Get Started</button>
                <button className="btn-ghost" onClick={onEnter} style={{ width: "100%", maxWidth: 300, display: "block", margin: "0 auto" }}>Skip to App</button>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
                    {["WHO IMCI", "Orphanet", "MSF 2023", "MedGemma 1.5"].map(b => <span key={b} className="tag" style={{ color: C.textMuted, border: `1px solid ${C.border}` }}>{b}</span>)}
                </div>
                <p style={{ fontSize: 11, color: C.textDim, fontFamily: "'DM Sans',sans-serif", marginTop: 28, lineHeight: 1.7 }}>For trained health workers only.<br />AI outputs are decision support, not diagnosis.</p>
            </div>
        </div>
    );
    const cur = steps[step - 1];
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
            <Nav right={<button onClick={onEnter} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>Skip</button>} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
                <div key={step} className="fade-up" style={{ textAlign: "center", maxWidth: 340 }}>
                    <div style={{ fontSize: 56, marginBottom: 28 }}>{cur.icon}</div>
                    <h2 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 26, color: C.text, fontWeight: 400, marginBottom: 16 }}>{cur.title}</h2>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: C.textSub, lineHeight: 1.7, marginBottom: 48 }}>{cur.body}</p>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
                    {steps.map((_, i) => <div key={i} style={{ width: i === step - 1 ? 20 : 6, height: 6, borderRadius: 3, background: i === step - 1 ? C.gold : C.borderMid, transition: "all 0.3s" }} />)}
                </div>
                <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 320 }}>
                    {step > 1 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>Back</button>}
                    <button className="btn-primary" onClick={() => step < 3 ? setStep(s => s + 1) : onEnter()} style={{ flex: 1 }}>{step < 3 ? "Next" : "Start BridgeDx"}</button>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════════════════════
const HomePage = ({ onAssess, onHistory }) => {
    const stats = [
        { v: "12", l: "Cases This Week", c: C.text, d: "+3 vs last week" },
        { v: "2", l: "Emergencies", c: C.red, d: "16% of cases" },
        { v: "78%", l: "AI Agreement", c: C.green, d: "Up from 71%" },
        { v: "4", l: "Rare Disease", c: C.blue, d: "33% of total" },
    ];
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
            <Nav right={<button onClick={onHistory} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", color: C.textSub, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}>History</button>} />
            <div style={{ flex: 1, padding: "32px 24px", maxWidth: 640, margin: "0 auto", width: "100%" }}>
                <div className="fade-up" style={{ marginBottom: 32 }}>
                    <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted, letterSpacing: "0.1em", marginBottom: 6 }}>SAT, 21 FEB 2026 · FIELD MODE</p>
                    <h1 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 30, color: C.text, fontWeight: 400, lineHeight: 1.25 }}>Good afternoon,<br /><span style={{ color: C.gold }}>Health Worker.</span></h1>
                </div>
                <div className="fade-up fade-up-d1 card" style={{ padding: "28px 24px", marginBottom: 12, background: "linear-gradient(135deg,#1a221a 0%,#1e281e 100%)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle,rgba(200,169,110,0.07) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
                    <span className="tag" style={{ color: C.gold, background: C.goldSoft, border: "1px solid rgba(200,169,110,0.3)", marginBottom: 12, display: "inline-flex" }}>New Assessment</span>
                    <h2 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 22, color: C.text, fontWeight: 400, margin: "12px 0 8px" }}>Start Patient Assessment</h2>
                    <p style={{ fontSize: 13, color: C.textSub, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, marginBottom: 22 }}>Enter symptoms, vitals, and optionally an image to receive a WHO/Orphanet-grounded differential diagnosis.</p>
                    <button className="btn-primary" onClick={onAssess} style={{ width: "100%" }}>Begin Assessment →</button>
                </div>
                <div className="fade-up fade-up-d2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                    {stats.map((s, i) => (
                        <div key={i} className="card card-hover" style={{ padding: "18px 16px" }}>
                            <div style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 26, color: s.c, marginBottom: 4 }}>{s.v}</div>
                            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace", marginBottom: 5, letterSpacing: "0.04em" }}>{s.l}</div>
                            <div style={{ fontSize: 11, color: C.textSub, fontFamily: "'DM Sans',sans-serif" }}>{s.d}</div>
                        </div>
                    ))}
                </div>
                <div className="fade-up fade-up-d3" style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted, letterSpacing: "0.1em" }}>RECENT CASES</span>
                        <button onClick={onHistory} style={{ background: "none", border: "none", color: C.textSub, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>View all →</button>
                    </div>
                    {HISTORY.slice(0, 3).map((c, i) => (
                        <div key={i} className="card card-hover" style={{ padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={onHistory}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: C.text, fontFamily: "'DM Sans',sans-serif", fontWeight: 500, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.dx}</div>
                                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "'DM Sans',sans-serif" }}>{c.ageSex} · {c.region}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                                <TriagePill level={c.triage} />
                                <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>{c.date.split(",")[0]}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="fade-up fade-up-d4">
                    <InfoBubble type="lock"><strong style={{ color: C.textSub }}>Privacy:</strong> No identifiable patient data is stored. All AI outputs require your clinical confirmation before logging.</InfoBubble>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════
// INTAKE
// ══════════════════════════════════════════════════════════════════════
const IntakePage = ({ onNext, onBack }) => {
    const [form, setForm] = useState({ age: "", ageUnit: "years", sex: "Female", region: "", complaint: "", temp: "", hr: "", rr: "", uploadName: "", mode: "standard" });
    const [recording, setRecording] = useState(false);
    const [emergAlert, setEmergAlert] = useState(false);
    const fileRef = useRef();
    const set = (k, v) => { const n = { ...form, [k]: v }; setForm(n); const mo = n.ageUnit === "months" ? +n.age : +n.age * 12; setEmergAlert(+n.temp > 40 && mo < 3); };
    const handleSpeak = () => { setRecording(true); setTimeout(() => { set("complaint", form.mode === "rare" ? "4-year-old male with progressive abdominal swelling for 8 months, recurrent infections, pale appearance, developmental regression in past 3 months. No current fever." : "Fever for 16 days, severe weakness, swollen belly, rapid weight loss. No response to standard antimalarials."); setRecording(false); }, 2500); };
    const canGo = form.complaint.trim().length > 8;
    const SexBtn = ({ val }) => <button onClick={() => set("sex", val)} style={{ flex: 1, padding: "10px 0", background: form.sex === val ? C.gold : "transparent", color: form.sex === val ? C.bg : C.textSub, border: "none", cursor: "pointer", fontSize: 13, fontWeight: form.sex === val ? 600 : 400, transition: "all 0.15s", fontFamily: "'DM Sans',sans-serif" }}>{val}</button>;
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
            <Nav onBack={onBack} backLabel="Home" title="New Assessment" />
            <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
                <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
                    {["Patient Info", "Review & Analyze"].map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {i > 0 && <div style={{ width: 32, height: 1, background: C.border }} />}
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: i === 0 ? C.gold : C.elevated, border: `1px solid ${i === 0 ? C.gold : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: i === 0 ? C.bg : C.textMuted, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{i + 1}</div>
                                <span style={{ fontSize: 12, color: i === 0 ? C.text : C.textMuted, fontFamily: "'DM Sans',sans-serif" }}>{s}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
                <div style={{ maxWidth: 640, margin: "0 auto" }}>
                    {emergAlert && <div className="fade-up"><InfoBubble type="emergency"><strong style={{ color: C.red }}>Emergency threshold —</strong> Temperature &gt;40°C in infant &lt;3 months. Immediate referral recommended regardless of AI output.</InfoBubble></div>}
                    <Divider label="ASSESSMENT MODE" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[{ val: "standard", icon: "⚡", label: "Standard Triage", sub: "MedGemma 1.5 4B · WHO IMCI + MSF · Acute presentations", accent: C.green }, { val: "rare", icon: "🔬", label: "Rare Disease Investigation", sub: "MedGemma 27B · Orphanet 6,000+ diseases · Complex or long-duration cases", accent: C.blue }].map(m => (
                            <div key={m.val} onClick={() => set("mode", m.val)} className="card" style={{ padding: "16px 18px", cursor: "pointer", borderColor: form.mode === m.val ? m.accent + "44" : C.border, background: form.mode === m.val ? `rgba(${m.accent === C.green ? "76,175,120" : "91,155,213"},0.05)` : C.card, transition: "all 0.2s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${m.accent}`, background: form.mode === m.val ? m.accent : "transparent", flexShrink: 0, transition: "background 0.15s" }} /><span style={{ fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: C.text }}>{m.icon} {m.label}</span></div>
                                <p style={{ margin: "6px 0 0 26px", fontSize: 11.5, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>{m.sub}</p>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 11.5, color: C.textMuted, fontFamily: "'DM Sans',sans-serif", margin: "8px 0 0", lineHeight: 1.6 }}>Use Rare Disease mode if symptoms have persisted &gt;3 months or presentation is unusual.</p>
                    <Divider label="PATIENT BASICS" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div><label className="label">AGE</label><div style={{ display: "flex", gap: 8 }}><input type="number" min="0" placeholder="0" value={form.age} onChange={e => set("age", e.target.value)} className="input-field" style={{ width: 64 }} /><select value={form.ageUnit} onChange={e => set("ageUnit", e.target.value)} className="input-field" style={{ flex: 1 }}><option>years</option><option>months</option></select></div></div>
                        <div><label className="label">REGION (OPTIONAL)</label><input type="text" placeholder="e.g. Kisumu County, Kenya" value={form.region} onChange={e => set("region", e.target.value)} className="input-field" /></div>
                    </div>
                    <div><label className="label">SEX</label><div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", background: C.elevated }}><SexBtn val="Male" /><SexBtn val="Female" /><SexBtn val="Other" /></div></div>
                    <Divider label="CHIEF COMPLAINT" />
                    <label className="label">DESCRIBE THE PATIENT'S MAIN SYMPTOMS</label>
                    <textarea value={form.complaint} onChange={e => set("complaint", e.target.value)} placeholder="e.g. 5-year-old with fever for 14 days, swollen abdomen, weight loss, no response to antimalarials…" rows={5} className="input-field" style={{ resize: "vertical", lineHeight: 1.7, marginBottom: 10 }} />
                    <button onClick={handleSpeak} disabled={recording} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", background: recording ? "rgba(224,82,82,0.08)" : C.elevated, border: `1px solid ${recording ? C.red + "44" : C.border}`, borderRadius: 10, color: recording ? C.red : C.textSub, cursor: recording ? "default" : "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s", width: "fit-content" }}>
                        <span style={{ fontSize: 18 }}>{recording ? "🔴" : "🎤"}</span>
                        <span>{recording ? "Recording… (MedASR processing)" : "Speak symptoms — powered by MedASR"}</span>
                    </button>
                    <Divider label="VITALS · OPTIONAL" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {[["TEMP (°C)", "temp", "38.5"], ["HEART RATE", "hr", "80"], ["RESP RATE", "rr", "18"]].map(([l, k, p]) => (
                            <div key={k}><label className="label">{l}</label><input type="number" placeholder={p} value={form[k]} onChange={e => set(k, e.target.value)} className="input-field" /></div>
                        ))}
                    </div>
                    <Divider label="IMAGE UPLOAD · OPTIONAL" />
                    <div onClick={() => fileRef.current?.click()} className="card" style={{ padding: "28px 24px", textAlign: "center", cursor: "pointer", borderStyle: "dashed", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => { if (e.target.files?.[0]) set("uploadName", e.target.files[0].name); }} style={{ display: "none" }} />
                        {form.uploadName ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}><span style={{ fontSize: 28 }}>{form.uploadName.endsWith(".pdf") ? "📄" : "🖼️"}</span><div style={{ textAlign: "left" }}><div style={{ fontSize: 13, color: C.text, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>{form.uploadName}</div><div style={{ fontSize: 11, color: C.green, fontFamily: "'JetBrains Mono',monospace" }}>✓ Will be analyzed by MedGemma Vision</div></div></div> : <><div style={{ fontSize: 32, marginBottom: 10 }}>📎</div><div style={{ fontSize: 13, color: C.textSub, fontFamily: "'DM Sans',sans-serif", marginBottom: 5 }}>Upload a photo or lab report</div><div style={{ fontSize: 11, color: C.textMuted, fontFamily: "'DM Sans',sans-serif" }}>Wound · Skin · Eye · Lab report PDF</div></>}
                    </div>
                    <div style={{ marginTop: 32, marginBottom: 40 }}>
                        <button className="btn-primary" onClick={() => canGo && onNext(form)} style={{ width: "100%" }} disabled={!canGo}>Review Patient Summary →</button>
                        {!canGo && <p style={{ textAlign: "center", fontSize: 12, color: C.textMuted, fontFamily: "'DM Sans',sans-serif", marginTop: 8 }}>Please describe the patient's symptoms to continue.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════
// REVIEW
// ══════════════════════════════════════════════════════════════════════
const ReviewPage = ({ form, onConfirm, onBack }) => {
    const fields = [
        { l: "Age", v: form.age ? `${form.age} ${form.ageUnit}` : "Not provided" },
        { l: "Sex", v: form.sex },
        { l: "Region", v: form.region || "Not provided" },
        { l: "Mode", v: form.mode === "rare" ? "Rare Disease Investigation" : "Standard Triage" },
        { l: "Temperature", v: form.temp ? `${form.temp}°C` : "Not recorded" },
        { l: "Heart Rate", v: form.hr ? `${form.hr} bpm` : "Not recorded" },
        { l: "Resp Rate", v: form.rr ? `${form.rr}/min` : "Not recorded" },
        { l: "Image", v: form.uploadName || "None uploaded" },
    ];
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
            <Nav onBack={onBack} backLabel="Edit Patient" title="Review Summary" />
            <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
                <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
                    {["Patient Info", "Review & Analyze"].map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {i > 0 && <div style={{ width: 32, height: 1, background: i === 1 ? C.gold : C.border }} />}
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: i === 1 ? C.gold : C.elevated, border: `1px solid ${i === 1 ? C.gold : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: i === 1 ? C.bg : C.textMuted, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{i === 0 ? "✓" : i + 1}</div>
                                <span style={{ fontSize: 12, color: i === 1 ? C.text : C.textSub, fontFamily: "'DM Sans',sans-serif" }}>{s}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
                <div style={{ maxWidth: 640, margin: "0 auto" }}>
                    <div className="fade-up" style={{ marginBottom: 24 }}>
                        <h2 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 22, color: C.text, fontWeight: 400, marginBottom: 8 }}>Review before analysis</h2>
                        <p style={{ fontSize: 13, color: C.textSub, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>Confirm the patient information is correct. AI inference will begin once you proceed.</p>
                    </div>
                    <div className="fade-up fade-up-d1 card" style={{ padding: "20px 22px", marginBottom: 12 }}>
                        <label className="label" style={{ marginBottom: 12 }}>CHIEF COMPLAINT</label>
                        <p style={{ fontSize: 14, color: C.text, fontFamily: "'Libre Baskerville',serif", lineHeight: 1.7, fontStyle: "italic" }}>"{form.complaint}"</p>
                    </div>
                    <div className="fade-up fade-up-d2 card" style={{ padding: "20px 22px", marginBottom: 12 }}>
                        <label className="label" style={{ marginBottom: 14 }}>PATIENT DETAILS</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
                            {fields.map(f => (
                                <div key={f.l}>
                                    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted, marginBottom: 3, letterSpacing: "0.1em" }}>{f.l.toUpperCase()}</div>
                                    <div style={{ fontSize: 13, color: f.v.includes("Not") || f.v === "None uploaded" ? C.textMuted : C.text, fontFamily: "'DM Sans',sans-serif" }}>{f.v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="fade-up fade-up-d3 card" style={{ padding: "16px 20px", marginBottom: 24, borderColor: "rgba(200,169,110,0.2)", background: C.goldSoft }}>
                        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: C.gold, letterSpacing: "0.1em", marginBottom: 8 }}>MODEL SELECTED</div>
                        <div style={{ fontSize: 13, color: C.text, fontFamily: "'DM Sans',sans-serif", fontWeight: 500, marginBottom: 4 }}>
                            {form.mode === "rare" ? "🔬 MedGemma 27B Text — Rare Disease Reasoning" : "⚡ MedGemma 1.5 4B Multimodal — Standard Triage"}
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>
                            {form.mode === "rare" ? "Orphanet 6,000+ profiles · 87.7% MedQA score" : "WHO IMCI + MSF protocols · Offline capable · 69.1% MedQA"}
                        </div>
                    </div>
                    <div className="fade-up fade-up-d4">
                        <InfoBubble type="info">AI will generate a ranked differential diagnosis grounded in clinical protocols. All outputs require your professional confirmation before any action is taken.</InfoBubble>
                        <button className="btn-primary" onClick={onConfirm} style={{ width: "100%", marginBottom: 12 }}>Run Analysis →</button>
                        <button className="btn-ghost" onClick={onBack} style={{ width: "100%" }}>← Edit Patient Information</button>
                    </div>
                    <div style={{ height: 40 }} />
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════
// LOADING
// ══════════════════════════════════════════════════════════════════════
const LoadingPage = ({ scenario, onDone }) => {
    const [idx, setIdx] = useState(0);
    const [pct, setPct] = useState(0);
    useEffect(() => {
        const iv = setInterval(() => { setIdx(i => Math.min(i + 1, scenario.loading.length - 1)); setPct(p => Math.min(p + 19, 95)); }, 540);
        const t = setTimeout(() => { clearInterval(iv); setPct(100); setTimeout(onDone, 500); }, 3000);
        return () => { clearInterval(iv); clearTimeout(t); };
    }, []);
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
            <BridgeLogo size={18} />
            <div style={{ marginTop: 60, marginBottom: 40, width: "100%", maxWidth: 340 }}>
                <div style={{ height: 2, background: C.border, borderRadius: 2, overflow: "hidden", marginBottom: 20, position: "relative" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${C.gold},#e8c88e)`, borderRadius: 2, transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textMuted }}>{scenario.mode === "rare" ? "MEDGEMMA 27B · RAREPATH" : "MEDGEMMA 1.5 4B · STANDARD"}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gold }}>{pct}%</span>
                </div>
                {scenario.loading.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", opacity: i <= idx ? 1 : 0.2, transition: "opacity 0.4s" }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: i < idx ? C.green : i === idx ? C.gold : C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.3s" }}>
                            {i < idx && <span style={{ color: C.bg, fontSize: 9, fontWeight: 700 }}>✓</span>}
                            {i === idx && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.bg, animation: "pulse 0.8s infinite" }} />}
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: i === idx ? C.text : C.textMuted, transition: "color 0.3s" }}>{m}</span>
                    </div>
                ))}
            </div>
            <p style={{ fontSize: 11, color: C.textDim, fontFamily: "'DM Sans',sans-serif", textAlign: "center" }}>Processing offline · No data leaving your device</p>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════════════
const ResultsPage = ({ scenario, form, onNew, onHistory }) => {
    const [checked, setChecked] = useState(false);
    const [impression, setImpression] = useState("");
    const [notes, setNotes] = useState("");
    const [logged, setLogged] = useState(false);
    const [toast, setToast] = useState(false);
    const triage = triageCfg[scenario.triage.level];
    const handleLog = () => { if (!checked) return; setLogged(true); setToast(true); setTimeout(() => setToast(false), 3200); };
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
            {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: C.green, color: C.bg, padding: "12px 24px", borderRadius: 12, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, animation: "fadeUp 0.35s ease", boxShadow: "0 8px 32px rgba(76,175,120,0.35)", whiteSpace: "nowrap" }}>✓ Case logged to history</div>}
            <Nav onBack={onNew} backLabel="New Assessment" title="Assessment Results" right={<span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted }}>{form.mode === "rare" ? "🔬 RAREPATH" : "⚡ STANDARD"}</span>} />
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                <div style={{ maxWidth: 640, margin: "0 auto" }}>
                    <div className="fade-up" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                        <span style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 99, padding: "6px 14px", fontSize: 12, color: C.textSub, fontFamily: "'DM Sans',sans-serif" }}>{form.age ? `${form.age} ${form.ageUnit}` : "Age N/A"} · {form.sex}{form.region ? ` · ${form.region}` : ""}</span>
                        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>21 Feb 2026, 14:32</span>
                    </div>
                    {scenario.emergency && <div className="fade-up" style={{ background: C.redSoft, border: `1px solid rgba(224,82,82,0.3)`, borderLeft: `4px solid ${C.red}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}><div style={{ fontWeight: 700, color: C.red, fontFamily: "'DM Sans',sans-serif", fontSize: 15, marginBottom: 7 }}>🚨 Emergency Criteria Detected</div><div style={{ color: C.textSub, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>Emergency signs present. <strong style={{ color: C.text }}>Refer immediately.</strong> Do not wait for full AI assessment.</div></div>}
                    {scenario.lowConf && <div className="fade-up fade-up-d1"><InfoBubble type="warning"><strong style={{ color: C.amber }}>Low AI confidence —</strong> This presentation is unusual. Prioritize clinical judgment. Consider physician referral.</InfoBubble></div>}
                    <div className="fade-up fade-up-d1" style={{ background: triage.bg, border: `1px solid ${triage.border}`, borderLeft: `4px solid ${triage.color}`, borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
                        <div style={{ marginBottom: 10 }}><TriagePill level={scenario.triage.level} size="lg" /></div>
                        <p style={{ margin: "0 0 10px", fontSize: 13.5, color: C.textSub, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65 }}>{scenario.triage.detail}</p>
                        <div style={{ fontSize: 10.5, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>{scenario.triage.protocol}</div>
                    </div>
                    <div className="fade-up fade-up-d2" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <h2 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 20, color: C.text, fontWeight: 400, flex: 1 }}>AI Differential Diagnosis</h2>
                        <span title="Ranked by likelihood. Grounded in WHO IMCI and Orphanet protocols. Decision support only." style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.textMuted, cursor: "help", flexShrink: 0 }}>i</span>
                    </div>
                    {scenario.differential.map((c, i) => <DiffCard key={i} cond={c} delayMs={i * 160} />)}
                    {form.mode === "rare" && <div className="fade-up" style={{ background: C.blueSoft, border: `1px solid rgba(91,155,213,0.2)`, borderRadius: 12, padding: "18px 20px", margin: "20px 0" }}><div style={{ fontWeight: 600, color: C.blue, fontFamily: "'DM Sans',sans-serif", fontSize: 13, marginBottom: 8 }}>🔬 Rare Disease Pathway Activated</div><p style={{ margin: "0 0 10px", fontSize: 12.5, color: C.textSub, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65 }}>These conditions require specialist genetic/metabolic confirmation. Do not use for treatment decisions without specialist review.</p><div style={{ fontSize: 11, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>Suggested: Orphanet registry · Enzyme assay panel · Pediatric hematology referral</div></div>}
                    <div className="fade-up card" style={{ padding: "24px 22px", marginTop: 28, borderColor: checked ? "rgba(76,175,120,0.3)" : C.border, transition: "border-color 0.3s" }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.14em", color: C.textMuted, fontFamily: "'JetBrains Mono',monospace", marginBottom: 18 }}>YOUR ASSESSMENT</div>
                        <div onClick={() => setChecked(!checked)} style={{ display: "flex", alignItems: "flex-start", gap: 13, cursor: "pointer", marginBottom: 20, padding: "14px 16px", borderRadius: 10, background: checked ? C.greenSoft : C.elevated, border: `1px solid ${checked ? "rgba(76,175,120,0.25)" : C.border}`, transition: "all 0.25s" }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? C.green : C.borderMid}`, background: checked ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.2s" }}>{checked && <span style={{ color: C.bg, fontSize: 12, fontWeight: 800, lineHeight: 1 }}>✓</span>}</div>
                            <p style={{ margin: 0, fontSize: 13, color: C.textSub, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>I have reviewed the AI reasoning above and understand this is <strong style={{ color: C.text }}>clinical decision support only</strong>, not a diagnosis. I take clinical responsibility for any action taken.</p>
                        </div>
                        <div style={{ marginBottom: 14, opacity: checked ? 1 : 0.4, transition: "opacity 0.25s" }}>
                            <label className="label">MY CLINICAL IMPRESSION</label>
                            <select value={impression} onChange={e => setImpression(e.target.value)} disabled={!checked} className="input-field">
                                <option value="">Select your impression…</option>
                                <option>Agree with top suggestion</option>
                                <option>Partially agree</option>
                                <option>Disagree — my assessment differs</option>
                                <option>Unsure — referring regardless</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: 22, opacity: checked ? 1 : 0.4, transition: "opacity 0.25s" }}>
                            <label className="label">ADDITIONAL NOTES (OPTIONAL)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Clinical observations, action taken…" rows={3} disabled={!checked} className="input-field" style={{ resize: "none", lineHeight: 1.6 }} />
                        </div>
                        <button className="btn-primary" onClick={handleLog} disabled={!checked} style={{ width: "100%", marginBottom: 12 }}>{logged ? "✓ Case Logged" : "Confirm & Log Case"}</button>
                        {logged && <div style={{ display: "flex", gap: 10, animation: "fadeIn 0.3s ease" }}><button className="btn-ghost" onClick={onNew} style={{ flex: 1, padding: "12px" }}>New Assessment</button><button className="btn-ghost" onClick={onHistory} style={{ flex: 1, padding: "12px" }}>Case History</button></div>}
                    </div>
                    <p style={{ textAlign: "center", fontSize: 11, color: C.textDim, fontFamily: "'DM Sans',sans-serif", marginTop: 24, lineHeight: 1.7 }}>No identifiable patient data is stored. De-identified summary only.</p>
                    <div style={{ height: 48 }} />
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════════════════════════════
const HistoryPage = ({ onBack, onNew }) => {
    const [exp, setExp] = useState(null);
    const [filter, setFilter] = useState("all");
    const total = HISTORY.length, emerg = HISTORY.filter(c => c.triage === "emergency").length, agree = HISTORY.filter(c => c.impression === "Agree").length, rare = HISTORY.filter(c => c.mode === "rare").length;
    const agreePct = Math.round(agree / total * 100);
    const filtered = filter === "all" ? HISTORY : HISTORY.filter(c => filter === "rare" ? c.mode === "rare" : c.triage === filter);
    const impColor = { Agree: C.green, Disagree: C.red, Unsure: C.amber };
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
            <Nav onBack={onBack} backLabel="Home" title="Case History" right={<button className="btn-primary" onClick={onNew} style={{ padding: "8px 16px", fontSize: 12 }}>+ New</button>} />
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                <div style={{ maxWidth: 640, margin: "0 auto" }}>
                    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
                        {[{ v: total, l: "Total", c: C.text }, { v: emerg, l: "Emergencies", c: C.red }, { v: `${agreePct}%`, l: "Agreement", c: C.green }, { v: rare, l: "Rare Disease", c: C.blue }].map((s, i) => (
                            <div key={i} className="card" style={{ padding: "16px 12px", textAlign: "center" }}>
                                <div style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 26, color: s.c, marginBottom: 5 }}>{s.v}</div>
                                <div style={{ fontSize: 9, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em", lineHeight: 1.4 }}>{s.l}</div>
                            </div>
                        ))}
                    </div>
                    <div className="fade-up fade-up-d1"><InfoBubble type="lock"><strong style={{ color: C.textSub }}>De-identified records only.</strong> No names, exact ages, or precise locations stored. Images discarded after inference.</InfoBubble></div>
                    <div className="fade-up fade-up-d2" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                        {[["all", "All"], ["emergency", "Emergencies"], ["refer", "Referrals"], ["rare", "Rare Disease"]].map(([v, l]) => (
                            <button key={v} onClick={() => setFilter(v)} style={{ padding: "7px 16px", borderRadius: 99, border: `1px solid ${filter === v ? C.gold : C.border}`, background: filter === v ? C.goldSoft : "transparent", color: filter === v ? C.gold : C.textMuted, fontSize: 12, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", transition: "all 0.15s" }}>{l}</button>
                        ))}
                    </div>
                    <div className="fade-up fade-up-d2" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {filtered.map((c, i) => {
                            const isOpen = exp === i; const sc = SCENARIOS[c.sc]; return (
                                <div key={c.id} className="card" style={{ overflow: "hidden", borderColor: isOpen ? C.borderMid : C.border, transition: "border-color 0.2s" }}>
                                    <div onClick={() => setExp(isOpen ? null : i)} style={{ padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted }}>{c.id}</span>
                                                {c.mode === "rare" && <span className="tag" style={{ color: C.blue, background: C.blueSoft, border: "1px solid rgba(91,155,213,0.3)" }}>RARE</span>}
                                            </div>
                                            <div style={{ fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", fontWeight: 500, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.dx}</div>
                                            <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "'DM Sans',sans-serif" }}>{c.ageSex} · {c.region}</div>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                                            <TriagePill level={c.triage} />
                                            <span style={{ fontSize: 11, color: impColor[c.impression] || C.textMuted, fontFamily: "'DM Sans',sans-serif" }}>{c.impression}</span>
                                        </div>
                                        <span style={{ color: C.textMuted, fontSize: 12, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                                    </div>
                                    <div style={{ overflow: "hidden", maxHeight: isOpen ? 500 : 0, transition: "max-height 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
                                        <div style={{ borderTop: `1px solid ${C.border}`, padding: "18px 18px 20px" }}>
                                            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted, marginBottom: 14, display: "flex", justifyContent: "space-between" }}><span>FULL DIFFERENTIAL</span><span>{c.date}</span></div>
                                            {sc.differential.map((cond, ci) => (
                                                <div key={ci} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: ci < sc.differential.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textMuted, width: 14, flexShrink: 0 }}>{cond.rank}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, color: C.text, fontFamily: "'DM Sans',sans-serif", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cond.name}</div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <div style={{ width: 70, height: 3, background: C.border, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${cond.confidence}%`, background: cond.confidence >= 70 ? C.green : cond.confidence >= 40 ? C.amber : C.red, borderRadius: 3 }} /></div>
                                                            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted }}>{cond.confidence}%</span>
                                                            {cond.sources.map(s => <SourceTag key={s} source={s} />)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ height: 48 }} />
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════
export default function BridgeDx() {
    const [page, setPage] = useState("splash");
    const [form, setForm] = useState(null);
    const [scenario, setScenario] = useState(null);
    const go = useCallback(pg => setPage(pg), []);
    const handleIntakeNext = f => { setForm(f); go("review"); };
    const handleRun = () => {
        if (!form) return;
        const useRare = form.mode === "rare" || form.complaint.toLowerCase().includes("month") || form.complaint.toLowerCase().includes("swelling") || form.complaint.toLowerCase().includes("regression");
        setScenario(useRare ? SCENARIOS.B : SCENARIOS.A);
        go("loading");
    };
    return (
        <>
            <Fonts />
            {page === "splash" && <SplashPage onEnter={() => go("home")} />}
            {page === "home" && <HomePage onAssess={() => go("intake")} onHistory={() => go("history")} />}
            {page === "intake" && <IntakePage onNext={handleIntakeNext} onBack={() => go("home")} />}
            {page === "review" && <ReviewPage form={form} onConfirm={handleRun} onBack={() => go("intake")} />}
            {page === "loading" && <LoadingPage scenario={scenario} onDone={() => go("results")} />}
            {page === "results" && <ResultsPage scenario={scenario} form={form} onNew={() => go("intake")} onHistory={() => go("history")} />}
            {page === "history" && <HistoryPage onBack={() => go("home")} onNew={() => go("intake")} />}
        </>
    );
}