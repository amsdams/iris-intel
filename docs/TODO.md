That's the core pipeline working end to end. Portals are flowing from Intel → XHR interceptor → store → MapLibre overlay.
The slight position mismatch is expected — we're centering on the first portal coordinate, not the true centre of Intel's viewport. We can refine that later.
What's working:

XHR interception ✅
Entity parsing ✅
Zustand store ✅
MapLibre rendering ✅
Initial position sync ✅

Next priorities — what do you want to tackle first?

Position sync — MapLibre follows Intel as you pan, so the overlay always shows the right area
Portals not loading on pan — when you pan Intel, new portals appear on the overlay
Visual polish — portal colours, sizes, links, fields rendering correctly
Remove the Intel map — hide Intel's UI entirely and drive everything from your overlay

Which of these matters most to you right now?