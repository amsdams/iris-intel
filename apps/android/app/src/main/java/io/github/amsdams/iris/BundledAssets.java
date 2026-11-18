package io.github.amsdams.iris;

import java.net.URI;
import java.net.URISyntaxException;

/** Maps a reserved Intel URL prefix to bundled public files, never arbitrary asset paths. */
final class BundledAssets {
    static final String PREFIX = "/__iris_android__/";

    private BundledAssets() {}

    static boolean handles(String url) {
        if (!NavigationPolicy.isIntel(url)) return false;
        try { return new URI(url).getRawPath().startsWith(PREFIX); }
        catch (URISyntaxException ignored) { return false; }
    }

    static String path(String url) {
        if (!handles(url)) return null;
        try {
            String path = new URI(url).getRawPath().substring(PREFIX.length());
            if (path.matches("maplibre-worker\\.cjs|content\\.js|page-map-runtime\\.js|iitc-iris\\.css|leaflet\\.css|images/[a-z0-9-]+\\.png")) {
                return "iris/" + path;
            }
        } catch (URISyntaxException ignored) { /* Invalid paths cannot access packaged assets. */ }
        return null;
    }

    static String mimeType(String path) {
        if (path.endsWith(".js") || path.endsWith(".cjs")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        return "image/png";
    }
}
