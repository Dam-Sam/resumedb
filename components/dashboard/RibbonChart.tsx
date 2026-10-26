"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STATUS_LABELS, STATUSES, type Status } from "@/lib/applications/repository";
import type { WeeklySnapshots } from "@/lib/applications/weekly";

const CHART_KEY: Record<Status, string> = {
  applied: "applied",
  received: "received",
  screening: "screening",
  interview: "interview",
  offer: "offer",
  rejected: "closed",
};

const W = 1086, H = 320, PAD_L = 8, PAD_R = 140, PAD_T = 16, PAD_B = 40, COL_W = 22, GAP = 3;
const AMP = 4, WAVELEN = 520, PERIOD = 11000;

const wave = (x: number, t: number) => {
  const p = (t / PERIOD) * Math.PI * 2;
  return AMP * Math.sin((x / WAVELEN) * Math.PI * 2 - p) + AMP * 0.35 * Math.sin((x / (WAVELEN * 0.45)) * Math.PI * 2 - p * 1.7 + 1.3);
};
const ease = (u: number) => u * u * (3 - 2 * u);

type Pos = { top: number; bot: number };

// Weekly ribbons: each column stacks the statuses by size, ribbons flow between columns,
// and a slow wind moves every series together (held still with reduced motion).
export default function RibbonChart({ data }: { data: WeeklySnapshots }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);
  const [dim, setDim] = useState<Status | null>(null);
  const flows = useRef<(SVGPathElement | null)[][]>([]);
  const cols = useRef<(SVGPathElement | null)[][]>([]);
  const labels = useRef<(SVGTextElement | null)[]>([]);

  const n = data.weeks.length;
  const last = n - 1;
  const series = STATUSES.map((s) => ({ status: s, key: CHART_KEY[s], name: STATUS_LABELS[s], v: data.counts[s] }));

  const geo = useMemo(() => {
    const plotH = H - PAD_T - PAD_B;
    const step = (W - PAD_L - PAD_R - COL_W) / (n - 1);
    let maxT = 1;
    for (let i = 0; i < n; i++) maxT = Math.max(maxT, series.reduce((t, s) => t + s.v[i], 0));
    const unit = (plotH - GAP * (series.length - 1)) / maxT;
    const pos: Pos[][] = series.map(() => []);
    for (let i = 0; i < n; i++) {
      const order = series.map((_, k) => k).sort((a, b) => series[a].v[i] - series[b].v[i] || b - a);
      let y = H - PAD_B;
      for (const k of order) {
        const th = series[k].v[i] * unit;
        pos[k][i] = { top: y - th, bot: y };
        y -= th + (th > 0 ? GAP : 0);
      }
    }
    // Direct labels at the last column, nudged apart so they don't overlap.
    const labs = series.map((_, k) => ({ k, y: (pos[k][last].top + pos[k][last].bot) / 2 }));
    const so = [...labs].sort((a, b) => a.y - b.y);
    for (let i = 1; i < so.length; i++) if (so[i].y - so[i - 1].y < 18) so[i].y = so[i - 1].y + 18;
    let mY = H - PAD_B - 4;
    for (let i = so.length - 1; i >= 0; i--) {
      if (so[i].y > mY) so[i].y = mY;
      mY = so[i].y - 18;
    }
    return { plotH, step, pos, labs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const cx = (i: number) => PAD_L + i * geo.step;

  useEffect(() => {
    if (view !== "chart") return;
    const { pos, labs } = geo;
    const area = (k: number, t: number) => {
      const top: number[][] = [], bot: number[][] = [];
      for (let i = 0; i < n; i++) {
        const x0 = cx(i), x1 = x0 + COL_W;
        for (let x = x0; x <= x1; x += COL_W / 2) {
          top.push([x, pos[k][i].top + wave(x, t)]);
          bot.push([x, pos[k][i].bot + wave(x, t)]);
        }
        if (i < n - 1)
          for (let x = x1 + 6; x < cx(i + 1); x += 6) {
            const u = ease((x - x1) / (cx(i + 1) - x1)), a = pos[k][i], b = pos[k][i + 1];
            top.push([x, a.top + (b.top - a.top) * u + wave(x, t)]);
            bot.push([x, a.bot + (b.bot - a.bot) * u + wave(x, t)]);
          }
      }
      const f = (p: number[]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
      return `M${top.map(f).join("L")}L${bot.reverse().map(f).join("L")}Z`;
    };
    const columns = (k: number, t: number) => {
      let d = "";
      for (let i = 0; i < n; i++) {
        const p = pos[k][i];
        if (p.bot - p.top < 0.5) continue;
        const x0 = cx(i), x1 = x0 + COL_W, r = Math.min(4, (p.bot - p.top) / 2);
        const a = p.top + wave(x0, t), b = p.top + wave(x1, t), c = p.bot + wave(x1, t), e = p.bot + wave(x0, t);
        d += `M${x0 + r},${a}L${x1 - r},${b}Q${x1},${b} ${x1},${b + r}L${x1},${c - r}Q${x1},${c} ${x1 - r},${c}L${x0 + r},${e}Q${x0},${e} ${x0},${e - r}L${x0},${a + r}Q${x0},${a} ${x0 + r},${a}Z`;
      }
      return d;
    };
    const lx = cx(last) + COL_W + 10;
    const frame = (t: number) => {
      series.forEach((_, k) => {
        const a = area(k, t), c = columns(k, t);
        flows.current[k]?.forEach((p) => p?.setAttribute("d", a));
        cols.current[k]?.forEach((p) => p?.setAttribute("d", c));
      });
      labs.forEach((L) => {
        const el = labels.current[L.k];
        el?.setAttribute("x", String(lx));
        el?.setAttribute("y", (L.y + 4 + wave(lx, t)).toFixed(1));
      });
    };
    frame(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      frame(now - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, view]);

  const byLatest = [...series].sort((a, b) => b.v[last] - a.v[last]);
  const hoverRows = hover === null ? [] : [...series].sort((a, b) => b.v[hover] - a.v[hover]);
  const hoverTotal = hover === null ? 0 : series.reduce((t, s) => t + s.v[hover], 0);
  const hoverX = hover === null ? 0 : cx(hover) + COL_W / 2;
  const tipLeft = hoverX + 16 + 200 > W ? hoverX - 216 : hoverX + 16;

  return (
    <section className="rdb-section" aria-labelledby="h-state">
      <div className="rdb-section__head">
        <div>
          <h2 id="h-state" className="rdb-h2">Where your applications stand</h2>
          <p className="rdb-sub">Every application by status at the end of each week. Ribbons are ordered by size each week.</p>
        </div>
        <div className="rdb-seg" role="group" aria-label="View">
          {(["chart", "table"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
              {v === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {view === "chart" ? (
        <>
          <ul className="db-legend">
            {byLatest.map((s) => (
              <li key={s.key} onMouseEnter={() => setDim(s.status)} onMouseLeave={() => setDim(null)}>
                <svg width="14" height="14" aria-hidden="true">
                  <rect width="14" height="14" rx="4" className={`s-${s.key}`} />
                  {s.key === "closed" && <rect width="14" height="14" rx="4" fill="url(#db-hatch)" />}
                </svg>
                <b>{s.v[last]}</b> {s.name}
              </li>
            ))}
          </ul>
          <div className="db-chart">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Applications by status for each of the last weeks. The table view has the same numbers.">
              <defs>
                <pattern id="db-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" className="hatch-line" />
                </pattern>
              </defs>
              <line x1={PAD_L} x2={W - PAD_R + 30} y1={H - PAD_B + 9.5} y2={H - PAD_B + 9.5} className="grid" />
              {data.weeks.map((w, i) => (
                <text key={i} x={cx(i) + COL_W / 2} y={H - 10} textAnchor="middle" className={`axis${i === last ? " now" : ""}`}>
                  {w}
                </text>
              ))}
              <g>
                {series.map((s, k) => (
                  <g key={s.key} className={`rib${dim && dim !== s.status ? " dim" : ""}`}>
                    <path ref={(el) => { (flows.current[k] ??= [])[0] = el; }} className={`flow s-${s.key}`} />
                    {s.key === "closed" && <path ref={(el) => { (flows.current[k] ??= [])[1] = el; }} className="flow" fill="url(#db-hatch)" />}
                    <path ref={(el) => { (cols.current[k] ??= [])[0] = el; }} className={`s-${s.key}`} />
                    {s.key === "closed" && <path ref={(el) => { (cols.current[k] ??= [])[1] = el; }} fill="url(#db-hatch)" />}
                  </g>
                ))}
              </g>
              <g>
                {series.map((s, k) => (
                  <text key={s.key} ref={(el) => { labels.current[k] = el; }} className="dl">
                    {s.name} <tspan>{s.v[last]}</tspan>
                  </text>
                ))}
              </g>
              <line className="cross" y1={PAD_T - 6} y2={H - PAD_B} x1={hoverX} x2={hoverX} style={{ opacity: hover === null ? 0 : 1 }} />
              <g>
                {data.weeks.map((_, i) => (
                  <rect
                    key={i}
                    className="hit"
                    x={cx(i) - geo.step / 2 + COL_W / 2}
                    y={PAD_T - 8}
                    width={geo.step}
                    height={geo.plotH + 8}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </g>
            </svg>
            <div className={`db-tip${hover !== null ? " on" : ""}`} role="status" style={{ left: `${(tipLeft / W) * 100}%`, top: 8 }}>
              {hover !== null && (
                <>
                  <h4>
                    {hover === last ? "This week" : `Week ending ${data.weeks[hover]}`} · {hoverTotal} total
                  </h4>
                  {hoverRows.map((s) => (
                    <div key={s.key}>
                      <i style={{ background: `var(--chart-${s.key})` }} />
                      {s.name}
                      <span>{s.v[hover]}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <table className="rdb-table db-table">
          <thead>
            <tr>
              <th>Status</th>
              {data.weeks.map((w) => (
                <th key={w}>{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.key}>
                <td>
                  <b>{s.name}</b>
                </td>
                {s.v.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
