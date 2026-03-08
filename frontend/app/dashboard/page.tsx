"use client";

import { useEffect, useRef, useState } from "react";
import {
    Activity,
    Clock,
    Users,
    AlertCircle,
    CheckCheck,
    WifiOff,
    ChevronRight,
    ShieldAlert,
    Timer,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types & CTAS helpers
// ─────────────────────────────────────────────────────────────────────────────

interface PatientRecord {
    patient_id: string;
    facility_id: number;
    facility_name: string;
    eta_minutes: number;
    symptoms: string[];
    severity: string;
    urgency_label: string;
    care_type: string;
    submitted_at: string;
}

type AckStatus = "pending" | "acknowledged";

interface CtasDef {
    label: string;
    roman: string;
    bg: string;
    border: string;
    text: string;
    stripe: string;
}

const CTAS: Record<number, CtasDef> = {
    1: { label: "Resuscitation", roman: "I",   bg: "bg-red-500/10",     border: "border-red-500/25",     text: "text-red-400",     stripe: "bg-red-500" },
    2: { label: "Emergent",      roman: "II",  bg: "bg-orange-500/10",  border: "border-orange-500/25",  text: "text-orange-400",  stripe: "bg-orange-500" },
    3: { label: "Urgent",        roman: "III", bg: "bg-yellow-500/10",  border: "border-yellow-500/25",  text: "text-yellow-400",  stripe: "bg-yellow-500" },
    4: { label: "Less Urgent",   roman: "IV",  bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400", stripe: "bg-emerald-500" },
    5: { label: "Non-Urgent",    roman: "V",   bg: "bg-sky-500/10",     border: "border-sky-500/25",     text: "text-sky-400",     stripe: "bg-sky-500" },
};

function ctasLevelOf(urgencyLabel: string): number {
    const l = urgencyLabel.toLowerCase();
    if (l.includes("critical") || l.includes("resuscitation") || l.includes("emergency")) return 1;
    if (l.includes("emergent") || l.includes("high")) return 2;
    if (l.includes("urgent") || l.includes("medium") || l.includes("moderate")) return 3;
    if (l.includes("less") || l.includes("low")) return 4;
    return 5;
}

// Live ETA countdown — recomputes every 15 s
function useEtaCountdown(submittedAt: string, etaMinutes: number): number {
    const compute = () => {
        const elapsed = (Date.now() - new Date(submittedAt).getTime()) / 60_000;
        return Math.max(0, Math.round(etaMinutes - elapsed));
    };
    const [remaining, setRemaining] = useState(compute);
    useEffect(() => {
        const id = setInterval(() => setRemaining(compute()), 15_000);
        return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submittedAt, etaMinutes]);
    return remaining;
}

function useClock(): string {
    const fmt = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const [time, setTime] = useState(fmt);
    useEffect(() => {
        const id = setInterval(() => setTime(fmt()), 1000);
        return () => clearInterval(id);
    }, []);
    return time;
}

// ─────────────────────────────────────────────────────────────────────────────
// PatientRow
// ─────────────────────────────────────────────────────────────────────────────

function PatientRow({
    record,
    isNew,
    ackStatus,
    onAck,
}: {
    record: PatientRecord;
    isNew: boolean;
    ackStatus: AckStatus;
    onAck: () => void;
}) {
    const level = ctasLevelOf(record.urgency_label);
    const ctas = CTAS[level];
    const etaRemaining = useEtaCountdown(record.submitted_at, record.eta_minutes);
    const acked = ackStatus === "acknowledged";
    const [, code] = record.patient_id.includes("-")
        ? record.patient_id.split("-")
        : ["PT", record.patient_id];

    return (
        <div
            className={`relative flex items-center border-b border-white/[0.05] last:border-0 transition-all duration-300 ${
                isNew ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
            } ${acked ? "opacity-50" : ""}`}
        >
            {/* CTAS color stripe */}
            <div className={`w-1 self-stretch shrink-0 ${ctas.stripe}`} />

            {/* CTAS badge */}
            <div className={`flex flex-col items-center justify-center w-16 shrink-0 py-4 px-2 ${ctas.bg}`}>
                <span className={`font-black text-lg leading-none ${ctas.text}`}>{ctas.roman}</span>
                <span className={`text-[8px] uppercase tracking-widest font-bold mt-0.5 ${ctas.text} opacity-70`}>
                    {ctas.label.slice(0, 5)}
                </span>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 px-4 py-3">
                <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-black text-white text-sm tracking-widest">
                        PT-{code}
                    </span>
                    <span className="w-px h-3 bg-white/20" />
                    <span className="text-white/60 text-xs font-semibold truncate">{record.care_type}</span>
                    {isNew && (
                        <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                            <span className="w-1 h-1 rounded-full bg-sky-400" />
                            new
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                    {record.symptoms.slice(0, 3).map((s, i) => (
                        <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.07] text-white/40"
                        >
                            {s}
                        </span>
                    ))}
                    {record.symptoms.length > 3 && (
                        <span className="text-[10px] text-white/25">+{record.symptoms.length - 3}</span>
                    )}
                </div>
                <div className="text-white/25 text-[10px] truncate">{record.facility_name}</div>
            </div>

            {/* ETA countdown */}
            <div
                className={`shrink-0 w-20 text-center py-3 ${
                    etaRemaining <= 3 ? "text-red-400 animate-pulse" : "text-white/50"
                }`}
            >
                <Timer size={10} className="mx-auto mb-0.5" />
                <div className="font-black text-lg leading-none">{etaRemaining}</div>
                <div className="text-[9px] uppercase tracking-wider opacity-60">min</div>
            </div>

            {/* Acknowledge button */}
            <div className="shrink-0 w-16 text-center py-3 pr-3">
                <button
                    onClick={onAck}
                    disabled={acked}
                    className={`flex items-center justify-center w-8 h-8 mx-auto rounded-lg border transition-all ${
                        acked
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default"
                            : "bg-white/[0.04] border-white/[0.10] text-white/40 hover:border-white/25 hover:text-white/80"
                    }`}
                    title={acked ? "Acknowledged" : "Acknowledge"}
                >
                    {acked ? <CheckCheck size={13} /> : <ChevronRight size={13} />}
                </button>
            </div>

            {/* New-arrival ring overlay */}
            {isNew && (
                <div className="absolute inset-0 pointer-events-none border border-sky-400/30 animate-pulse" />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [patients, setPatients] = useState<PatientRecord[]>([]);
    const [newIds, setNewIds] = useState<Set<string>>(new Set());
    const [ackMap, setAckMap] = useState<Record<string, AckStatus>>({});
    const [connected, setConnected] = useState(false);
    const [lastArrivedId, setLastArrivedId] = useState<string | null>(null);
    const clock = useClock();
    const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    // Initial queue fetch
    useEffect(() => {
        fetch(`${API_URL}/incoming-patient/`)
            .then((r) => r.json())
            .then((data: PatientRecord[]) => setPatients(data))
            .catch(() => {});
    }, [API_URL]);

    // SSE stream
    useEffect(() => {
        const es = new EventSource(`${API_URL}/incoming-patient/stream`);
        es.onopen = () => setConnected(true);
        es.onerror = () => setConnected(false);
        es.onmessage = (e) => {
            try {
                const record: PatientRecord = JSON.parse(e.data);
                setPatients((prev) =>
                    prev.some((p) => p.patient_id === record.patient_id) ? prev : [record, ...prev]
                );
                setNewIds((prev) => new Set(prev).add(record.patient_id));
                setLastArrivedId(record.patient_id);
                if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
                bannerTimerRef.current = setTimeout(() => {
                    setLastArrivedId(null);
                    setNewIds((prev) => {
                        const n = new Set(prev);
                        n.delete(record.patient_id);
                        return n;
                    });
                }, 6000);
            } catch {
                // ignore parse errors
            }
        };
        return () => {
            es.close();
            setConnected(false);
        };
    }, [API_URL]);

    const acknowledge = (id: string) =>
        setAckMap((prev) => ({ ...prev, [id]: "acknowledged" }));

    const sorted = [...patients].sort((a, b) => {
        const la = ctasLevelOf(a.urgency_label);
        const lb = ctasLevelOf(b.urgency_label);
        if (la !== lb) return la - lb;
        const aa = ackMap[a.patient_id] === "acknowledged" ? 1 : 0;
        const ab = ackMap[b.patient_id] === "acknowledged" ? 1 : 0;
        if (aa !== ab) return aa - ab;
        return a.eta_minutes - b.eta_minutes;
    });

    const criticalCount = patients.filter((p) => ctasLevelOf(p.urgency_label) <= 2).length;
    const pendingCount = patients.filter(
        (p) => (ackMap[p.patient_id] ?? "pending") === "pending"
    ).length;
    const avgEta = patients.length
        ? Math.round(patients.reduce((s, p) => s + p.eta_minutes, 0) / patients.length)
        : 0;

    return (
        <div className="min-h-screen bg-[#07080f] text-white flex flex-col">
            {/* ── Header ── */}
            <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07080f]/90 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                            <ShieldAlert size={15} className="text-sky-400" />
                        </div>
                        <div>
                            <span className="font-black text-white text-sm tracking-tight">ERly</span>
                            <span className="text-white/30 text-xs font-medium ml-2">
                                Provider Dashboard &middot; Demo Mode — All Facilities
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="font-mono text-white/40 text-xs tabular-nums">{clock}</div>
                        <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                connected
                                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                    : "bg-red-500/10 border-red-500/25 text-red-400"
                            }`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                    connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                                }`}
                            />
                            {connected ? "LIVE" : "OFFLINE"}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Stats strip ── */}
            <div className="border-b border-white/[0.05] bg-white/[0.015]">
                <div className="max-w-5xl mx-auto px-6 py-3 grid grid-cols-4 divide-x divide-white/[0.06]">
                    {[
                        { icon: <Users size={12} />,        value: patients.length,                  label: "In Queue" },
                        { icon: <AlertCircle size={12} />,  value: criticalCount,                    label: "Critical (CTAS I–II)", alert: criticalCount > 0 },
                        { icon: <Clock size={12} />,        value: patients.length ? `${avgEta}m` : "—", label: "Avg ETA" },
                        { icon: <Activity size={12} />,     value: pendingCount,                     label: "Awaiting Ack" },
                    ].map(({ icon, value, label, alert }) => (
                        <div key={label} className="px-4 first:pl-0 last:pr-0 flex items-center gap-2">
                            <span className={alert ? "text-red-400" : "text-white/30"}>{icon}</span>
                            <div>
                                <div className={`font-black text-base leading-none ${alert ? "text-red-400" : "text-white"}`}>
                                    {value}
                                </div>
                                <div className="text-white/25 text-[9px] uppercase tracking-wider font-bold mt-0.5">
                                    {label}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Main ── */}
            <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-6">
                {/* New-arrival banner */}
                {lastArrivedId && (
                    <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-sky-500/[0.08] border border-sky-500/20">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
                        <span className="text-sky-300 text-sm font-semibold">
                            New arrival —{" "}
                            <span className="font-mono font-black">{lastArrivedId}</span>
                        </span>
                    </div>
                )}

                {patients.length === 0 ? (
                    /* ── Empty state / how-hospitals-connect ── */
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-5">
                            <WifiOff size={22} className="text-white/15" />
                        </div>
                        <h2 className="text-white/50 font-bold text-lg mb-2">No patients in queue</h2>
                        <p className="text-white/25 text-sm max-w-sm leading-relaxed mb-10">
                            This dashboard updates in real time as patients submit pre-arrival triage
                            reports via the ERly patient app.
                        </p>

                        {/* How hospitals connect */}
                        <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 max-w-lg text-left w-full">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldAlert size={14} className="text-sky-400" />
                                <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                                    How Hospitals Connect
                                </span>
                            </div>
                            <ol className="space-y-4">
                                {[
                                    {
                                        n: "1",
                                        title: "Hospital registers on ERly Provider Network",
                                        desc: "Each ED gets a unique facility_id and API key issued by ERly.",
                                    },
                                    {
                                        n: "2",
                                        title: "Point this dashboard at your facility",
                                        desc: "Filter the SSE stream by facility_id or embed this page in your ED information system.",
                                    },
                                    {
                                        n: "3",
                                        title: "Patients submit pre-arrival reports",
                                        desc: "Via the ERly patient app — symptoms, urgency, and ETA are sent to your queue automatically.",
                                    },
                                    {
                                        n: "4",
                                        title: "ER staff acknowledge & prepare",
                                        desc: "Acknowledge each card as the team is briefed. CTAS level is pre-computed so the right bay is ready on arrival.",
                                    },
                                ].map(({ n, title, desc }) => (
                                    <li key={n} className="flex gap-3">
                                        <span className="w-5 h-5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                            {n}
                                        </span>
                                        <div>
                                            <div className="text-white/60 text-xs font-semibold">{title}</div>
                                            <div className="text-white/30 text-[11px] mt-0.5 leading-relaxed">{desc}</div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div className="mt-8 flex items-center gap-2 text-white/20 text-xs">
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                                }`}
                            />
                            {connected
                                ? "Stream connected — waiting for first patient"
                                : "Connecting to stream…"}
                        </div>
                    </div>
                ) : (
                    /* ── Patient table ── */
                    <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                        {/* Column headers */}
                        <div className="flex items-center bg-white/[0.025] border-b border-white/[0.06] text-[9px] uppercase tracking-widest font-bold text-white/25">
                            <div className="w-1 shrink-0" />
                            <div className="w-16 shrink-0 py-2.5 px-2 text-center">CTAS</div>
                            <div className="flex-1 px-4 py-2.5">Patient · Chief Complaint · Facility</div>
                            <div className="w-20 shrink-0 py-2.5 text-center">ETA</div>
                            <div className="w-16 shrink-0 py-2.5 pr-3 text-center">Ack</div>
                        </div>
                        {sorted.map((p) => (
                            <PatientRow
                                key={p.patient_id}
                                record={p}
                                isNew={newIds.has(p.patient_id)}
                                ackStatus={ackMap[p.patient_id] ?? "pending"}
                                onAck={() => acknowledge(p.patient_id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-white/[0.05] py-4 text-center">
                <span className="text-white/15 text-[10px] uppercase tracking-widest font-bold">
                    ERly Provider Network &middot; Secure pre-arrival intake &middot; HackCanada 2026
                </span>
            </footer>
        </div>
    );
}
