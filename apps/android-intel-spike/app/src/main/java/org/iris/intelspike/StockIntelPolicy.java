package org.iris.intelspike;

import java.net.URI;
import java.net.URISyntaxException;

/** Leave the dashboard script tag/version intact, but prevent its stock runtime from executing in IRIS mode. */
final class StockIntelPolicy {
    private StockIntelPolicy() {}

    static boolean blocks(String url, boolean irisMode) {
        if (!irisMode || !NavigationPolicy.isIntel(url)) return false;
        try {
            String path = new URI(url).getRawPath();
            String name = path.substring(path.lastIndexOf('/') + 1);
            return name.matches("gen_dashboard_[a-fA-F0-9]+\\.js");
        } catch (URISyntaxException ignored) { return false; }
    }
}
