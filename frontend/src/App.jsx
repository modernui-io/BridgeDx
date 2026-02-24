import { useState, useCallback, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "./constants/theme";
import { AppProvider } from "./context/AppContext";
import { SplashPage } from "./pages/SplashPage";
import { HomePage } from "./pages/HomePage";
import { IntakePage } from "./pages/IntakePage";
import { ReviewPage } from "./pages/ReviewPage";
import { LoadingPage } from "./pages/LoadingPage";
import { ResultsPage } from "./pages/ResultsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SCENARIOS } from "./constants/data";

export default function BridgeDx() {
    const [page, setPage] = useState("splash");
    const [form, setForm] = useState(null);
    const [scenario, setScenario] = useState(null);
    const [isFetching, setIsFetching] = useState(false);

    const go = useCallback(pg => setPage(pg), []);

    const handleIntakeNext = f => { setForm(f); go("review"); };

    const handleRun = async () => {
        if (!form) return;

        // Setup initial loading scenario so UI doesn't break
        setScenario({
            loading: [
                "Analyzing demographics...",
                "Cross-referencing RAG protocols...",
                "Running local AI inference...",
                "Generating differential...",
                "Finalizing safe triage level..."
            ],
            mode: form.mode
        });
        setIsFetching(true);
        go("loading");

        try {
            let image_file_key = null;
            let image_mime_type = null;
            if (form.uploadFile) {
                try {
                    const nameParts = form.uploadFile.name.split(".");
                    const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : "jpg";
                    const presigned = await fetch("http://localhost:8000/api/files/upload-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ file_extension: ext })
                    });
                    const presignedData = await presigned.json();
                    await fetch(presignedData.upload_url, {
                        method: "PUT",
                        body: form.uploadFile
                    });
                    image_file_key = presignedData.file_key;
                    image_mime_type = form.uploadFile.type || (ext === "pdf" ? "application/pdf" : "image/jpeg");
                } catch (e) {
                    console.warn("Image upload failed, continuing without image.", e);
                }
            }

            const payload = {
                complaint: form.complaint,
                age_group: form.age < 1 ? "infant" : form.age < 12 ? "child" : "adult",
                sex: form.sex.toLowerCase(),
                region_district: form.region || "Unknown",
                mode: form.mode,
                temperature_c: form.temp ? parseFloat(form.temp) : null,
                heart_rate_bpm: form.hr ? parseInt(form.hr) : null,
                resp_rate: form.rr ? parseInt(form.rr) : null,
                image_file_key,
                image_mime_type
            };

            const res = await fetch("http://localhost:8000/api/assess", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            // Map backend response shape to what DiffCard / EvidenceFlag expect
            const sourceIcon = { "WHO IMCI": "📄", ORPHANET: "📘", MSF: "📙" };
            const mappedDiff = (data.differential || []).map((d, idx) => {
                // Extract unique source names from flags
                const sources = [...new Set(
                    (d.flags || [])
                        .map(f => {
                            const ref = f.source_ref || "";
                            // "[CONTEXT 2] WHO IMCI — 4.1" → "WHO IMCI"
                            const match = ref.match(/\]\s*(.+?)(?:\s*[—–-]\s*|$)/);
                            return match ? match[1].trim() : ref;
                        })
                        .filter(Boolean)
                )];
                return {
                    name: d.name,
                    confidence: d.confidence_pct,
                    rank: idx + 1,
                    sources: sources.length ? sources : ["Clinical Assessment"],
                    flags: (d.flags || []).map(f => ({
                        label: f.label,
                        ref: f.source_ref || "",
                        excerpt: f.excerpt || "",
                        icon: sourceIcon[sources[0]] || "📋",
                        stat: f.source_ref || "",
                        bc: undefined
                    }))
                };
            });

            setScenario({
                mode: form.mode,
                loading: [
                    "Analyzing demographics…",
                    "Cross-referencing RAG protocols…",
                    "Running local AI inference…",
                    "Generating differential…",
                    "Finalizing safe triage level…"
                ],
                triage: {
                    level: data.triage_level,
                    detail: data.triage_detail,
                    protocol: data.triage_protocol
                },
                differential: mappedDiff,
                emergency: data.emergency_triggered,
                lowConf: data.low_confidence,
                raw: data
            });
        } catch (err) {
            console.error("Inference Error:", err);
            // Revert to mock for safety so the demo doesn't freeze
            const useRare = form.mode === "rare" || form.complaint.toLowerCase().includes("month");
            setScenario(useRare ? SCENARIOS.B : SCENARIOS.A);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppProvider>
                {page === "splash" && <SplashPage onEnter={() => go("home")} />}
                {page === "home" && <HomePage onAssess={() => go("intake")} onHistory={() => go("history")} />}
                {page === "intake" && <IntakePage onNext={handleIntakeNext} onBack={() => go("home")} />}
                {page === "review" && <ReviewPage form={form} onConfirm={handleRun} onBack={() => go("intake")} />}
                {page === "loading" && <LoadingPage scenario={scenario} isFetching={isFetching} onDone={() => go("results")} />}
                {page === "results" && <ResultsPage scenario={scenario} form={form} onNew={() => go("intake")} onHistory={() => go("history")} />}
                {page === "history" && <HistoryPage onBack={() => go("home")} onNew={() => go("intake")} />}
            </AppProvider>
        </ThemeProvider>
    );
}
