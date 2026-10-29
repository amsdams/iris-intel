package io.github.amsdams.iris;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

/** Exact HTTPS hosts used by the disposable embedded-login compatibility test. */
final class NavigationPolicy {
    private NavigationPolicy() {}

    static String host(String url) {
        try {
            URI uri = new URI(url);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443)) return "";
            String host = uri.getHost();
            return host == null ? "" : host.toLowerCase(Locale.ROOT);
        } catch (URISyntaxException | NullPointerException ignored) {
            return "";
        }
    }

    static boolean isIntel(String url) {
        return "intel.ingress.com".equals(host(url));
    }

    static boolean isEmbedded(String url) {
        String host = host(url);
        return isIntel(url) || "login.ingress.com".equals(host) || "signin.nianticlabs.com".equals(host)
                || "signin.nianticspatial.com".equals(host) || GoogleAccountHosts.HOSTS.contains(host)
                || "accounts.youtube.com".equals(host);
    }
}
