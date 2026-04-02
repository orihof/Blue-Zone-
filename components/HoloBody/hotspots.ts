import type { Hotspot } from "./types";

export const HOTSPOTS: Hotspot[] = [
  {
    id: "heart",
    pos: [0.14, 0.52, 0.12],
    label: "CARDIAC",
    category: "organ",
    metrics: [
      { name: "Resting HR", value: "52 bpm", trend: "down", good: true },
      { name: "HRV (RMSSD)", value: "67 ms", trend: "up", good: true },
      { name: "Recovery", value: "84/100", trend: "stable", good: true },
    ],
  },
  {
    id: "lung_l",
    pos: [-0.21, 0.48, 0.1],
    label: "RESPIRATORY",
    category: "organ",
    metrics: [
      {
        name: "VO\u2082max",
        value: "61 ml/kg/min",
        trend: "up",
        good: true,
      },
      { name: "Breath Rate", value: "14 /min", trend: "stable", good: true },
    ],
  },
  {
    id: "lung_r",
    pos: [0.21, 0.48, 0.1],
    label: "RESPIRATORY",
    category: "organ",
    metrics: [],
  },
  {
    id: "brain",
    pos: [0, 1.08, 0.05],
    label: "NEUROLOGICAL",
    category: "organ",
    metrics: [
      { name: "Sleep Score", value: "79/100", trend: "down", good: false },
      { name: "HRV Trend", value: "\u22128%", trend: "down", good: false },
      {
        name: "Cognitive Load",
        value: "Medium",
        trend: "stable",
        good: true,
      },
    ],
  },
  {
    id: "liver",
    pos: [0.19, 0.18, 0.12],
    label: "METABOLIC",
    category: "organ",
    metrics: [
      { name: "CRP", value: "0.4 mg/L", trend: "down", good: true },
      {
        name: "Recovery Idx",
        value: "78/100",
        trend: "stable",
        good: true,
      },
    ],
  },
  {
    id: "gut",
    pos: [0, 0.04, 0.12],
    label: "MICROBIOME",
    category: "organ",
    metrics: [
      { name: "Diversity", value: "68%", trend: "stable", good: true },
    ],
  },
  {
    id: "knee_l",
    pos: [-0.14, -0.42, 0],
    label: "LEFT KNEE",
    category: "joint",
    metrics: [
      { name: "Injury Risk", value: "HIGH", trend: "up", good: false },
      { name: "Asymmetry", value: "14%", trend: "up", good: false },
    ],
  },
  {
    id: "knee_r",
    pos: [0.14, -0.42, 0],
    label: "RIGHT KNEE",
    category: "joint",
    metrics: [
      { name: "Injury Risk", value: "LOW", trend: "stable", good: true },
    ],
  },
  {
    id: "hip_l",
    pos: [-0.19, 0.08, 0],
    label: "LEFT HIP",
    category: "joint",
    metrics: [
      { name: "Mobility", value: "92/100", trend: "stable", good: true },
    ],
  },
  {
    id: "hip_r",
    pos: [0.19, 0.08, 0],
    label: "RIGHT HIP",
    category: "joint",
    metrics: [
      { name: "Mobility", value: "88/100", trend: "down", good: true },
    ],
  },
  {
    id: "shldr_l",
    pos: [-0.44, 0.68, 0],
    label: "LEFT SHOULDER",
    category: "joint",
    metrics: [
      { name: "Load Cap", value: "94%", trend: "stable", good: true },
    ],
  },
  {
    id: "shldr_r",
    pos: [0.44, 0.68, 0],
    label: "RIGHT SHOULDER",
    category: "joint",
    metrics: [
      { name: "Load Cap", value: "87%", trend: "down", good: false },
    ],
  },
];

export const DEFAULT_FLAGGED = ["knee_l", "brain", "shldr_r"];
