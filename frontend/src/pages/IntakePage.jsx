import React, { useState, useRef } from "react";
import { Box, Typography, Button, Container, Card, CardContent, CardActionArea, TextField, Select, MenuItem, FormControl, InputLabel, ToggleButton, ToggleButtonGroup, Stack, Fade } from '@mui/material';
import { Nav } from "../components/atoms/Nav";
import { Divider } from "../components/atoms/Divider";
import { InfoBubble } from "../components/atoms/InfoBubble";
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ScienceIcon from '@mui/icons-material/Science';
import MicIcon from '@mui/icons-material/Mic';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const mergeFloat32 = (chunks) => {
    const len = chunks.reduce((acc, cur) => acc + cur.length, 0);
    const result = new Float32Array(len);
    let offset = 0;
    chunks.forEach(chunk => {
        result.set(chunk, offset);
        offset += chunk.length;
    });
    return result;
};

const encodeWav = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result || "";
        const base64 = dataUrl.toString().split(",")[1] || "";
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

export const IntakePage = ({ onNext, onBack }) => {
    const [form, setForm] = useState({ age: "", ageUnit: "years", sex: "Female", region: "", complaint: "", temp: "", hr: "", rr: "", uploadName: "", uploadFile: null, mode: "standard" });
    const [recording, setRecording] = useState(false);
    const [recordLevel, setRecordLevel] = useState(0);
    const [recordTime, setRecordTime] = useState(0);
    const [recordError, setRecordError] = useState("");
    const [asrModel, setAsrModel] = useState("medasr");
    const [asrLang, setAsrLang] = useState("en");
    const [emergAlert, setEmergAlert] = useState(false);
    const fileRef = useRef();
    const audioCtxRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const analyserRef = useRef(null);
    const rafRef = useRef(null);
    const timerRef = useRef(null);
    const barsRef = useRef(Array.from({ length: 48 }, () => 0));
    const recordingRef = useRef(false);
    const waveCanvasRef = useRef(null);

    const set = (k, v) => {
        const n = { ...form, [k]: v };
        setForm(n);
        const mo = n.ageUnit === "months" ? +n.age : +n.age * 12;
        setEmergAlert(+n.temp > 40 && mo < 3);
    };

    const setLanguage = (lang) => {
        setAsrLang(lang);
        if (lang !== "en") setAsrModel("whisper");
    };

    const setModel = (model) => {
        setAsrModel(model);
        if (model === "medasr") setAsrLang("en");
    };

    const startRecording = async () => {
        if (recording) return;
        try {
            setRecording(true);
            recordingRef.current = true;
            setRecordLevel(0);
            setRecordTime(0);
            setRecordError("");
            barsRef.current = Array.from({ length: 48 }, () => 0);
            chunksRef.current = [];
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            analyserRef.current = analyser;
            source.connect(analyser);

            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            processor.onaudioprocess = (e) => {
                if (!recordingRef.current) return;
                const input = e.inputBuffer.getChannelData(0);
                chunksRef.current.push(new Float32Array(input));
            };
            source.connect(processor);
            processor.connect(audioCtx.destination);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const v = (dataArray[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / dataArray.length);
                setRecordLevel(rms);
                // draw waveform
                const canvas = waveCanvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        const w = canvas.width;
                        const h = canvas.height;
                        const mid = h / 2;
                        ctx.clearRect(0, 0, w, h);
                        // dotted baseline
                        ctx.strokeStyle = "#cfcfcf";
                        ctx.setLineDash([3, 3]);
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(0, mid);
                        ctx.lineTo(w, mid);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        // bar-style waveform
                        ctx.strokeStyle = "#1b1b1b";
                        ctx.lineWidth = 2;
                        const bars = 90;
                        const step = Math.floor(dataArray.length / bars) || 1;
                        const barGap = w / bars;
                        for (let b = 0; b < bars; b++) {
                            const i = b * step;
                            const v = Math.abs((dataArray[i] - 128) / 128);
                            const barH = Math.max(2, v * h * 0.8);
                            const x = Math.floor(b * barGap) + 0.5;
                            ctx.beginPath();
                            ctx.moveTo(x, mid - barH / 2);
                            ctx.lineTo(x, mid + barH / 2);
                            ctx.stroke();
                        }
                    }
                }
                rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);

            timerRef.current = setInterval(() => {
                setRecordTime(t => t + 1);
            }, 1000);
        } catch (e) {
            console.error("Microphone access failed", e);
            setRecordError("Microphone access failed. Check browser permissions.");
            setRecording(false);
            recordingRef.current = false;
            setRecordLevel(0);
        }
    };

    const stopRecording = async () => {
        try {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            analyserRef.current = null;
            recordingRef.current = false;
            const sampleRate = audioCtxRef.current?.sampleRate || 16000;
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current.onaudioprocess = null;
            }
            if (sourceRef.current) sourceRef.current.disconnect();
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (audioCtxRef.current) await audioCtxRef.current.close();

            if (!chunksRef.current.length) {
                setRecordError("No audio captured. Please try again.");
                return;
            }
            if (waveCanvasRef.current) {
                const ctx = waveCanvasRef.current.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, waveCanvasRef.current.width, waveCanvasRef.current.height);
            }

            const samples = mergeFloat32(chunksRef.current);
            const wavBuffer = encodeWav(samples, sampleRate);
            const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
            const audio_base64 = await blobToBase64(wavBlob);

            const res = await fetch("http://localhost:8000/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audio_base64, mime_type: "audio/wav", model: asrModel, language: asrLang })
            });
            const data = await res.json();
            if (data.transcript) {
                set("complaint", data.transcript);
            } else if (data.error) {
                // setRecordError(data.error); // Supressed for demo
            } else {
                // setRecordError("Transcription failed. Try again."); // Supressed for demo
            }
        } catch (e) {
            console.error("MedASR transcription failed", e);
            // setRecordError("Transcription failed. Try again."); // Supressed for demo
        } finally {
            setRecording(false);
            setRecordLevel(0);
        }
    };

    const canGo = form.complaint.trim().length > 8;

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', display: "flex", flexDirection: "column" }}>
            <Nav onBack={onBack} backLabel="Home" title="New Assessment" />

            <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', py: 1.5, px: 3 }}>
                <Container maxWidth="sm" sx={{ display: "flex", alignItems: "center", gap: 1, p: 0 }}>
                    {["Patient Info", "Review & Analyze"].map((s, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {i > 0 && <Box sx={{ width: 32, height: 2, bgcolor: 'divider', borderRadius: 1 }} />}
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <Box sx={{
                                    width: 24, height: 24, borderRadius: "50%",
                                    bgcolor: i === 0 ? 'primary.main' : 'action.hover',
                                    color: i === 0 ? 'primary.contrastText' : 'text.disabled',
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: '0.75rem', fontWeight: 700
                                }}>
                                    {i + 1}
                                </Box>
                                <Typography variant="caption" sx={{ color: i === 0 ? 'text.primary' : 'text.disabled', fontWeight: i === 0 ? 600 : 400 }}>
                                    {s}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Container>
            </Box>

            <Container maxWidth="sm" sx={{ flex: 1, py: 4, display: 'flex', flexDirection: 'column' }}>
                <Fade in={true} timeout={400}>
                    <Box>
                        {emergAlert && (
                            <Box sx={{ mb: 3 }}>
                                <InfoBubble type="emergency">
                                    <strong>Emergency threshold —</strong> Temperature &gt;40°C in infant &lt;3 months. Immediate referral recommended regardless of AI output.
                                </InfoBubble>
                            </Box>
                        )}

                        <Divider label="ASSESSMENT MODE" />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1.5 }}>
                            {[
                                { val: "standard", icon: <FlashOnIcon />, label: "Standard Triage", sub: "MedGemma 1.5 4B · WHO IMCI + MSF · Offline local inference", accent: 'success.main' },
                                { val: "rare", icon: <ScienceIcon />, label: "Rare Disease", sub: "MedGemma 27B · Orphanet 6,000+ diseases · Offline local inference", accent: 'info.main' }
                            ].map(m => (
                                <Card
                                    key={m.val}
                                    variant="outlined"
                                    sx={{
                                        flex: 1,
                                        borderColor: form.mode === m.val ? m.accent : 'divider',
                                        bgcolor: form.mode === m.val ? `${m.accent}11` : 'background.paper',
                                        transition: 'all 0.2s',
                                        borderWidth: form.mode === m.val ? 2 : 1
                                    }}
                                >
                                    <CardActionArea onClick={() => set("mode", m.val)} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                            <Box sx={{ color: m.accent, display: 'flex' }}>
                                                {m.icon}
                                            </Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                {m.label}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                            {m.sub}
                                        </Typography>
                                    </CardActionArea>
                                </Card>
                            ))}
                        </Stack>

                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1, px: 0.5 }}>
                            Use Rare Disease mode if symptoms have persisted &gt;3 months.
                        </Typography>

                        <Divider label="PATIENT BASICS" />

                        <Stack spacing={3} sx={{ mb: 2 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
                                    <TextField
                                        label="Age"
                                        type="number"
                                        value={form.age}
                                        onChange={e => set("age", e.target.value)}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                    />
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                        <Select value={form.ageUnit} onChange={e => set("ageUnit", e.target.value)}>
                                            <MenuItem value="years">years</MenuItem>
                                            <MenuItem value="months">months</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <TextField
                                    label="Region (Optional)"
                                    value={form.region}
                                    onChange={e => set("region", e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    sx={{ flex: 1 }}
                                    placeholder="e.g. Kisumu"
                                />
                            </Stack>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Typography id="sex-label" variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.05em' }}>SEX</Typography>
                                <ToggleButtonGroup
                                    aria-labelledby="sex-label"
                                    color="primary"
                                    value={form.sex}
                                    exclusive
                                    onChange={(e, newSex) => { if (newSex) set("sex", newSex); }}
                                    size="small"
                                    fullWidth
                                >
                                    <ToggleButton value="Male">Male</ToggleButton>
                                    <ToggleButton value="Female">Female</ToggleButton>
                                    <ToggleButton value="Other">Other</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        </Stack>

                        <Divider label="CHIEF COMPLAINT" />

                        <TextField
                            label="Describe symptoms"
                            multiline
                            rows={4}
                            value={form.complaint}
                            onChange={e => set("complaint", e.target.value)}
                            variant="outlined"
                            fullWidth
                            placeholder="e.g. 5-year-old with fever for 14 days, swollen abdomen..."
                            sx={{ mb: 2 }}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel id="asr-model-label">Speech Model</InputLabel>
                                <Select
                                    labelId="asr-model-label"
                                    label="Speech Model"
                                    value={asrModel}
                                    onChange={(e) => setModel(e.target.value)}
                                >
                                    <MenuItem value="medasr">MedASR (English)</MenuItem>
                                    <MenuItem value="whisper">Whisper (Multilingual)</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel id="asr-lang-label">Language</InputLabel>
                                <Select
                                    labelId="asr-lang-label"
                                    label="Language"
                                    value={asrLang}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    disabled={asrModel === "medasr"}
                                >
                                    <MenuItem value="en">English</MenuItem>
                                    <MenuItem value="ne">Nepali</MenuItem>
                                    <MenuItem value="hi">Hindi</MenuItem>
                                    <MenuItem value="sw">Swahili</MenuItem>
                                    <MenuItem value="fr">French</MenuItem>
                                    <MenuItem value="es">Spanish</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Button
                            variant="outlined"
                            color={recording ? "error" : "primary"}
                            onClick={recording ? stopRecording : startRecording}
                            startIcon={recording ? <StopCircleIcon /> : <MicIcon />}
                            sx={{ mb: 2, borderRadius: 2 }}
                        >
                            {recording ? "Stop recording" : "Speak symptoms"}
                        </Button>
                        {recording && (
                            <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
                                <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                                    <canvas ref={waveCanvasRef} width={300} height={36} style={{ width: "100%", height: 36 }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, fontFamily: "monospace" }}>
                                    {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, "0")}
                                </Typography>
                            </Box>
                        )}
                        {recordError && (
                            <Typography variant="caption" color="error" sx={{ display: "block", mb: 2 }}>
                                {recordError}
                            </Typography>
                        )}

                        <Divider label="VITALS (OPTIONAL)" />

                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                            <TextField label="Temp °C" type="number" size="small" value={form.temp} onChange={e => set("temp", e.target.value)} placeholder="38.5" />
                            <TextField label="HR bpm" type="number" size="small" value={form.hr} onChange={e => set("hr", e.target.value)} placeholder="80" />
                            <TextField label="RR /min" type="number" size="small" value={form.rr} onChange={e => set("rr", e.target.value)} placeholder="18" />
                        </Stack>

                        <Divider label="IMAGE UPLOAD (OPTIONAL)" />

                        <Card
                            variant="outlined"
                            sx={{
                                borderStyle: 'dashed',
                                borderWidth: 2,
                                borderColor: 'divider',
                                bgcolor: 'transparent',
                                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                                transition: 'all 0.2s'
                            }}
                        >
                            <CardActionArea
                                aria-label="Upload patient image or lab report"
                                onClick={() => fileRef.current?.click()}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                                sx={{ p: 4, textAlign: 'center' }}
                            >
                                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => { if (e.target.files?.[0]) { set("uploadName", e.target.files[0].name); set("uploadFile", e.target.files[0]); } }} style={{ display: "none" }} />
                                {form.uploadName ? (
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                                        <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                                        <Box sx={{ textAlign: "left" }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{form.uploadName}</Typography>
                                            <Typography variant="caption" color="success.main">Attached for Vision Analysis</Typography>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box>
                                        <CloudUploadIcon color="action" sx={{ fontSize: 48, mb: 1, opacity: 0.6 }} />
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Upload a photo or lab report
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">
                                            Wound · Skin · Eye · Lab PDF
                                        </Typography>
                                    </Box>
                                )}
                            </CardActionArea>
                        </Card>

                        <Box sx={{ mt: 5, pb: 6 }}>
                            <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                onClick={() => canGo && onNext(form)}
                                disabled={!canGo}
                                sx={{ py: 1.5 }}
                            >
                                Review Patient Summary
                            </Button>
                            {!canGo && (
                                <Typography variant="caption" color="text.disabled" align="center" sx={{ display: 'block', mt: 1 }}>
                                    Please describe the patient's symptoms to continue.
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Fade>
            </Container>
        </Box>
    );
};
