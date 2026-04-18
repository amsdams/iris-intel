For mocking realistic Ingress portal density in a POC, here's what you can expect:
Ingress Portal Density (Real-World Estimates)
Urban Areas
Area TypeDensityDense city center (NYC, London, Tokyo)~50–200 portals/km²Regular city / downtown~20–80 portals/km²Suburban residential~5–20 portals/km²
Rural / Other
Area TypeDensitySmall towns~1–10 portals/km²Rural / countryside~0.1–2 portals/km²Wilderness / uninhabited~0 portals/km²

Practical Numbers for POC Mocking
If you want a realistic stress test, here are some concrete targets:

A city the size of Amsterdam (~220 km²): ~5,000–15,000 portals
A typical 1km × 1km city block area: ~50–150 portals
A metropolitan area (e.g. greater London, ~1,500 km²): ~50,000–150,000 portals


Tips for Generating Mock Data

Cluster portals around POIs: churches, murals, parks, sculptures, transit stops — avoid uniform random distribution, which looks fake and doesn't stress spatial queries realistically
Use a Poisson disk sampling approach with min distance ~30–50m between portals (Niantic enforces ~20m minimum in practice)
For worst-case performance testing, use ~200 portals/km² across your whole test area
For average case, use ~30–50 portals/km² in populated zones with sparse rural fill