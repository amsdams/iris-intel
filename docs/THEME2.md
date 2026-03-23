This theme guide provides the exact color palette and UI logic to build an Ingress-inspired AI interface. It mimics the "Scanner" aesthetic, focusing on high-contrast neon elements against a deep, dark background.
🌐 Ingress AI Agent Theme Specification
1. Core Atmosphere (The "Scanner" Look)
   The base should always be a dark, tactical "HUD" style.
   Primary Background: #000000 (Pure Black) or #050708 (Deep Charcoal)
   Secondary Background: #0A141A (Dark Navy Slate)
   Borders/Lines: #1B3E46 (Subtle Cyan-Grey)
   Accent Glow: Use box-shadow: 0 0 10px [Color] to mimic the XM glow.
2. Faction & Identity Colors
   Use these to distinguish the "personality" or "alignment" of the AI agent.
   Element	Hex Code	Usage
   Enlightened (ENL)	#03DC03	Success states, Pro-Evolution responses, Green team.
   Resistance (RES)	#0088FF	System stability, Security-focused responses, Blue team.
   Machina (AI)	#FF0000	Errors, Red-team alerts, Autonomous system overrides.
   Neutral / XM	#D1FFFF	Primary text highlights, Loading states, Active XM energy.
3. Portal Level Spectrum (Progression & Severity)
   Use this spectrum for progress bars, priority levels, or data density (L1 = Low, L8 = Critical).
   🟡 L1 - L2: #FECE5A → #FFA630 (Low Priority / Info)
   🟠 L3 - L4: #FF7315 → #E40000 (Medium Priority / Warning)
   💖 L5 - L6: #FD2992 → #EB26CD (High Priority / Complex)
   🟣 L7 - L8: #C124E0 → #9627F4 (Max Priority / Critical)
4. Rarity & Module System
   If the AI agent uses "Modules" (tools/plugins), color-code them by rarity:
   🟢 Common: #8CFFBF (Basic utilities)
   🔵 Rare: #73A8FF (Advanced logic)
   🟣 Very Rare: #B08CFF (Specialized API access)
   🔴 Ultra Rare: #FF0000 (Root access / System-level tools)
5. Typography & UI Components
   Font Style: Monospace or clean Sans-Serif (e.g., Roboto, Exo 2, or Share Tech Mono).
   Key Indicator: #FFFF00 (Yellow) for "Knowledge Base" hits or saved data icons.
   Active Link: #51D4CD (Teal) for connections between data points (similar to Link lines).
   Status Tiers:
   Silver: #A1B8BE (Standard Tier)
   Gold: #FFE092 (Premium/Pro Tier)
   Onyx: #646261 (Developer/Admin Tier)
6. Interaction Logic (The "Scanner" Feel)
   Pulse Effect: Use a slow opacity pulse (0.6 to 1.0) on the AI "Thinking" indicator using the XM White (#D1FFFF).
   Scanline Overlay: Add a subtle horizontal linear-gradient over the entire UI to simulate an old CRT or high-tech scanner screen.
   Glitch Transitions: Use quick, 100ms red/cyan color shifts when the AI encounters an error (Machina Red).
