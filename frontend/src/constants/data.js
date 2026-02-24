

export const SCENARIOS = {
    A: {
        id: "A", mode: "standard",
        loading: ["Parsing symptom description…", "Retrieving WHO IMCI Fever Protocol §4.1…", "Scanning Orphanet disease profiles…", "MedGemma 1.5 4B inference running…", "Validating against safety thresholds…"],
        emergency: false, lowConf: false,
        triage: { level: "refer", detail: "Visceral Leishmaniasis requires rK39 rapid test and specialist confirmation. Refer within 24 hours.", protocol: "WHO IMCI §4.1 · MSF Kala-Azar Protocol 2023" },
        differential: [
            {
                rank: 1, name: "Visceral Leishmaniasis (Kala-Azar)", confidence: 67, sources: ["WHO IMCI", "ORPHANET"],
                flags: [
                    { label: "Fever duration >14 days", drawer: "View protocol", icon: "📄", ref: "WHO IMCI Fever Protocol §4.1", bc: "success.main", excerpt: "A child with fever lasting 7 days or more should be referred urgently. Prolonged fever >14 days in endemic areas strongly suggests systemic infection — consider Visceral Leishmaniasis, Typhoid, or Brucellosis.", stat: "Clinical threshold: >7 days = refer · >14 days = urgent referral" },
                    { label: "Hepatosplenomegaly reported", drawer: "View criteria", icon: "📘", ref: "Orphanet — Visceral Leishmaniasis (ORPHA:507)", bc: "info.main", excerpt: "Hepatosplenomegaly is present in >95% of confirmed VL cases. Massive splenomegaly with progressive weight loss in an endemic region is the classic triad for Kala-Azar diagnosis.", stat: "Prevalence of sign in confirmed VL: 95–100%" },
                    { label: "Progressive weight loss", drawer: "View criteria", icon: "📙", ref: "MSF Field Guide 2023 — Kala-Azar §2.1", bc: "warning.main", excerpt: "Weight loss >10% of body weight combined with splenomegaly and prolonged fever constitutes a presumptive diagnosis of VL in endemic settings. Treat empirically if rK39 is unavailable.", stat: "Action: rK39 rapid test recommended before treatment" },
                    { label: "Region: Sub-Saharan Africa (endemic zone)", drawer: "View epidemiology", icon: "📘", ref: "Orphanet — Epidemiological Data", bc: "info.main", excerpt: "Annual incidence: 50,000–90,000 new cases globally. East Africa accounts for ~30% of global VL burden. Kisumu region, Kenya: classified high-endemic by WHO.", stat: "East Africa share of global burden: ~30%" },
                ]
            },
            {
                rank: 2, name: "Typhoid Fever", confidence: 21, sources: ["WHO IMCI"],
                flags: [{ label: "Sustained step-ladder fever pattern", drawer: "View protocol", icon: "📄", ref: "WHO IMCI §3.7", bc: "success.main", excerpt: "Typhoid presents with abdominal pain, relative bradycardia, and sustained fever. Endemic region increases pre-test probability significantly.", stat: "Widal test or blood culture required for confirmation" }]
            },
            {
                rank: 3, name: "Drug-Resistant Malaria", confidence: 12, sources: ["MSF"],
                flags: [{ label: "No response to prior antimalarials", drawer: "View guidance", icon: "📙", ref: "MSF Field Guide 2023 §2.3", bc: "warning.main", excerpt: "Treatment failure after adequate antimalarial therapy requires parasitological confirmation and resistance testing. Consider artemisinin partial resistance in East Africa.", stat: "Thick blood smear + RDT recommended immediately" }]
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
                    { label: "Progressive hepatosplenomegaly, child <5y", drawer: "View criteria", icon: "📘", ref: "Orphanet — Gaucher Disease Type 3 (ORPHA:77261)", bc: "info.main", excerpt: "Hepatosplenomegaly is the most common presenting sign in Gaucher Disease, occurring in >95% of patients. In Type 3, onset before age 5 with progressive organomegaly and neurological regression is characteristic.", stat: "Diagnosed by age 5 in 80% of Type 3 cases" },
                    { label: "Neurological regression after normal milestones", drawer: "View criteria", icon: "📘", ref: "Orphanet — Gaucher Neuronopathic (ORPHA:77261)", bc: "info.main", excerpt: "Features include oculomotor apraxia, progressive ataxia, seizures, and developmental regression. Regression after previously normal milestones is a key diagnostic indicator.", stat: "Distinguishing feature: Type 3 = hepatosplenomegaly + neuro regression" },
                    { label: "Afebrile >4 weeks with massive splenomegaly", drawer: "View rule", icon: "📙", ref: "MSF Field Guide 2023 — Splenomegaly §3.4", bc: "warning.main", excerpt: "Massive splenomegaly WITHOUT fever in a child under 5 should prompt consideration of storage disorders (Gaucher, Niemann-Pick) rather than infectious causes.", stat: "Clinical rule: afebrile + massive spleen in child = storage disorder until proven otherwise" },
                ]
            },
            {
                rank: 2, name: "Niemann-Pick Disease Type B", confidence: 27, sources: ["ORPHANET"],
                flags: [{ label: "Massive splenomegaly + recurrent infections", drawer: "View criteria", icon: "📘", ref: "Orphanet — Niemann-Pick Type B (ORPHA:607)", bc: "info.main", excerpt: "Niemann-Pick Type B presents with massive splenomegaly, pulmonary infiltration, and recurrent respiratory infections.", stat: "Distinguishing test: sphingomyelinase enzyme assay in leukocytes" }]
            },
            {
                rank: 3, name: "Hemophagocytic Lymphohistiocytosis", confidence: 19, sources: ["ORPHANET"],
                flags: [{ label: "Systemic involvement + cytopenias", drawer: "View criteria", icon: "📘", ref: "Orphanet — HLH (ORPHA:158)", bc: "info.main", excerpt: "HLH presents with prolonged fever, hepatosplenomegaly, cytopenias, and elevated ferritin. HLH-2004 diagnostic criteria require 5 of 8 features.", stat: "HLH-2004 criteria: 5 of 8 required for diagnosis" }]
            },
        ],
    },
};

export const HISTORY = [
    { id: "BDX-0039", ageSex: "28y F", region: "Kisumu West, Kenya", mode: "standard", dx: "Visceral Leishmaniasis", conf: 67, triage: "refer", impression: "Agree", date: "21 Feb 2026, 14:32", sc: "A" },
    { id: "BDX-0038", ageSex: "4y M", region: "Bihar, India", mode: "rare", dx: "Gaucher Disease Type 3", conf: 54, triage: "emergency", impression: "Agree", date: "21 Feb 2026, 11:08", sc: "B" },
    { id: "BDX-0037", ageSex: "42y M", region: "Kampala District", mode: "standard", dx: "Typhoid Fever", conf: 71, triage: "refer", impression: "Disagree", date: "20 Feb 2026, 16:44", sc: "A" },
    { id: "BDX-0036", ageSex: "9y F", region: "Nairobi West", mode: "standard", dx: "Malaria (Uncomplicated)", conf: 83, triage: "local", impression: "Agree", date: "20 Feb 2026, 09:15", sc: "A" },
    { id: "BDX-0035", ageSex: "67y M", region: "Dhaka Division", mode: "rare", dx: "Niemann-Pick Disease", conf: 41, triage: "emergency", impression: "Unsure", date: "19 Feb 2026, 13:22", sc: "B" },
    { id: "BDX-0034", ageSex: "22y F", region: "Lagos State", mode: "standard", dx: "Drug-Resistant Malaria", conf: 62, triage: "refer", impression: "Agree", date: "18 Feb 2026, 10:05", sc: "A" },
];
