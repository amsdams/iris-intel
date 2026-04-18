Great point! Links and fields are derived from portals, so their density is a ratio of portal count. Here's the fuller picture:
Links
A link connects two portals (max ~6,800 km range at L8, but in dense urban areas typically <1 km). In practice:

Each captured portal has 0–8 links attached, but averages 1–3 in dense urban areas
Rule of thumb: ~0.5–1.5 links per portal
So at 200 portals/km²: expect ~100–300 links/km²
Links are line geometries (LineStrings), crossing through areas — so a single link can intersect many viewport tiles even if its endpoints are far away. This makes them disproportionately expensive to query spatially compared to portals.

Fields
A field is a filled triangle between 3 mutually linked portals. Fields cannot overlap (a core Ingress rule), so density is self-limiting.

Rule of thumb: ~0.1–0.3 fields per portal in active play areas
At 200 portals/km²: expect ~20–60 fields/km²
Fields are Polygon geometries and can be nested (layered fields are a key strategy), so one area might have 5–10 stacked fields covering it
Large "blockers" can cover entire cities with a single triangle — so field count/km² is misleading; you may have 1 field covering 50 km²

Updated Density Summary
EntityGeometryDensity at 200 portals/km²NotesPortalsPoint~200/km²Base entityLinksLineString~100–300/km²Cross tile boundariesFieldsPolygon~20–60/km²Can be nested/layered; large fields skew numbers
POC Implications

Links are your hardest spatial query problem — a line from one side of Amsterdam to the other intersects every tile it crosses. Use a proper segment intersection index (R-tree on bounding boxes + exact test).
Fields need polygon-in-viewport queries. If you want to mock layering, stack 3–8 overlapping triangles in the same area.
A realistic mock ratio for 10,000 portals would be roughly ~12,000 links and ~2,000–3,000 fields citywide.