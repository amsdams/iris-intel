package io.github.amsdams.iris;

import org.junit.Test;
import static org.junit.Assert.*;

public class BundledAssetsTest {
    private static final String BASE = "https://intel.ingress.com/__iris_android__/";

    @Test public void mapsOnlyBundledScriptsStylesAndImages() {
        assertEquals("iris/content.js", BundledAssets.path(BASE + "content.js?v=1"));
        assertEquals("iris/page-map-runtime.js", BundledAssets.path(BASE + "page-map-runtime.js"));
        assertEquals("iris/maplibre-worker.cjs", BundledAssets.path(BASE + "maplibre-worker.cjs"));
        assertEquals("text/javascript", BundledAssets.mimeType("iris/maplibre-worker.cjs"));
        assertEquals("iris/iitc-iris.css", BundledAssets.path(BASE + "iitc-iris.css"));
        assertEquals("iris/leaflet.css", BundledAssets.path(BASE + "leaflet.css"));
        assertEquals("iris/images/marker-blue-2x.png", BundledAssets.path(BASE + "images/marker-blue-2x.png"));
    }

    @Test public void rejectsTraversalEncodedPathsAndPrivateAssets() {
        for (String path : new String[]{"../session-check.js", "%2e%2e/session-check.js", "images/../content.js",
                "images/%2e%2e/content.js", "images//marker.png", "images%2fmarker-blue.png",
                "session-check.js", "manifest.json", "content.js/extra", ""}) {
            assertTrue(BundledAssets.handles(BASE + path));
            assertNull(path, BundledAssets.path(BASE + path));
        }
    }

    @Test public void leavesIntelRequestsAndOtherOriginsToTheirNormalOwners() {
        for (String url : new String[]{"https://intel.ingress.com/r/getEntities",
                "https://intel.ingress.com/authorize", "https://accounts.google.com/__iris_android__/content.js",
                "http://intel.ingress.com/__iris_android__/content.js",
                "https://intel.ingress.com.attacker.test/__iris_android__/content.js",
                "https://intel.ingress.com:8443/__iris_android__/content.js", null}) {
            assertFalse(String.valueOf(url), BundledAssets.handles(url));
            assertNull(BundledAssets.path(url));
        }
    }
}
