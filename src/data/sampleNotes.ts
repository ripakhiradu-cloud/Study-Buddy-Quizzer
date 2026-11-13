import type { SampleNote } from "../types/study";

export const SAMPLE_NOTES: SampleNote[] = [
  {
    id: "bio-respiration",
    subject: "Cell Biology",
    title: "Cellular Respiration & Oxidative Phosphorylation",
    excerpt: "Glycolysis, Pyruvate Oxidation, Citric Acid Cycle, and the Proton-Motive Force.",
    notes: `Cellular Respiration Lecture Notes — Bio 201

1. Glycolysis (Cytosol, Anaerobic)
- Glucose (6C) is phosphorylated twice using 2 ATP during the energy investment phase, then split into two 3-carbon G3P molecules.
- Energy payoff phase produces 4 ATP via substrate-level phosphorylation (net gain = 2 ATP), 2 NADH, and 2 Pyruvate molecules.
- Key regulatory enzyme: Phosphofructokinase (PFK), which is allosterically inhibited by high ATP and citrate, and activated by AMP.

2. Pyruvate Oxidation & Citric Acid Cycle (Mitochondrial Matrix)
- In the presence of O2, pyruvate enters the mitochondrion via active transport. Pyruvate dehydrogenase converts each pyruvate (3C) into Acetyl-CoA (2C), releasing 1 CO2 and reducing NAD+ to NADH.
- Citric Acid Cycle (Krebs Cycle): Each Acetyl-CoA combines with oxaloacetate (4C) to form citrate (6C). Per glucose (2 turns): yields 6 NADH, 2 FADH2, 2 ATP (via GTP substrate-level phosphorylation), and releases 4 CO2.

3. Electron Transport Chain & Chemiosmosis (Inner Mitochondrial Membrane)
- NADH donates electrons to Complex I (pumps 4 H+), while FADH2 enters at Complex II (pumps 0 H+, yielding less ATP per molecule than NADH).
- Electrons pass through Ubiquinone (Q), Complex III, Cytochrome c, and Complex IV, where Oxygen serves as the final electron acceptor, combining with protons to form H2O.
- Without O2, the ETC backs up, NADH cannot be re-oxidized to NAD+, and both the Citric Acid Cycle and ETC halt. Cells must then rely on fermentation solely to regenerate NAD+ for glycolysis.
- Proton-motive force: H+ ions pumped into the intermembrane space flow back into the matrix down their electrochemical gradient through ATP synthase, driving conformational rotation to synthesize ~26-28 ATP via oxidative phosphorylation.`,
  },
  {
    id: "econ-monetary",
    subject: "Macroeconomics",
    title: "Central Bank Monetary Policy & Transmission",
    excerpt: "Open market operations, Taylor rule, liquidity traps, and yield curve inversions.",
    notes: `Macroeconomics Lecture 9 — Monetary Policy & Transmission Mechanisms

1. Central Bank Tools & Reserve Market
- Traditional open market operations (OMOs): Central bank buys Treasury securities from commercial banks to inject reserves and lower the overnight policy rate (e.g., Federal Funds Rate); sells securities to drain reserves and raise rates.
- Ample-reserves regime (post-2008): When bank reserves are abundant, the central bank steers the overnight rate using administered rates—specifically Interest on Reserve Balances (IORB) as a floor/anchor and the Overnight Reverse Repo (ON RRP) facility for non-bank institutions.

2. Monetary Transmission Channels
- Interest Rate Channel: Lower policy rates reduce real borrowing costs (r = i - expected inflation), stimulating business capital expenditure (I) and durable consumption (C).
- Exchange Rate Channel: Lower domestic real interest rates lead to capital outflows, depreciating the domestic currency and boosting net exports (NX).
- Asset Price / Wealth Channel: Lower discount rates raise equity and housing valuations, increasing household net worth and consumption.

3. Limits & Unconventional Policy
- Zero Lower Bound (ZLB) & Liquidity Trap: When nominal policy rates hit ~0% and expected inflation is low or negative, conventional rate cuts lose traction because holding cash yields 0%.
- Quantitative Easing (QE): Central bank purchases long-duration bonds and MBS to compress term premiums and push down long-term yields even when short-term rates are pinned at zero.
- Yield Curve Inversion: Occurs when short-term yields exceed long-term yields, often signaling that markets expect tight near-term policy to slow future growth and force future rate cuts.`,
  },
  {
    id: "cs-virtual-memory",
    subject: "Operating Systems",
    title: "Virtual Memory, Paging & TLB Mechanics",
    excerpt: "Page tables, Translation Lookaside Buffer, page faults, and thrashing.",
    notes: `CS 320 Operating Systems — Virtual Memory & Paging

1. Address Translation & Page Tables
- Virtual memory separates each process's logical address space from physical RAM frames, providing isolation and allowing programs larger than physical memory to run.
- A virtual address splits into a Virtual Page Number (VPN) and a Page Offset. The offset bits pass unchanged into the physical address; the VPN indexes the per-process page table to locate the Physical Frame Number (PFN) plus permission/valid/dirty bits.
- Multi-level page tables save memory by only allocating inner page tables for actively mapped virtual address regions, at the cost of extra memory lookups on a cache miss.

2. Translation Lookaside Buffer (TLB)
- Accessing the page table in RAM on every memory instruction would halve CPU throughput. The TLB is a small, fast hardware associative cache inside the MMU storing recent VPN -> PFN translations.
- Effective Access Time (EAT): If TLB hit rate is h, TLB lookup is t, and RAM access is m, then EAT = h(t + m) + (1 - h)(t + 2m) for a single-level page table.
- Context switches invalidate non-global TLB entries unless the hardware tags entries with an Address Space Identifier (ASID).

3. Page Faults, Replacement & Thrashing
- If the valid bit in the page table entry is 0 (page not in RAM), the hardware traps to the OS with a page fault. The OS locates the page on disk, evicts a victim frame if RAM is full (writing it back first only if the dirty bit is 1), loads the page, updates the PTE, and restarts the faulting instruction.
- Belady's Anomaly: Under FIFO replacement, increasing the number of allocated physical frames can paradoxically increase page faults. Stack algorithms like LRU do not suffer from Belady's anomaly.
- Thrashing occurs when the sum of active processes' working sets exceeds available physical frames, causing CPU utilization to plummet as the system spends nearly all its time paging to and from disk.`,
  },
];
