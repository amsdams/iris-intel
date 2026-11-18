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

    /** Only user-activated coordinate links from Intel may launch a maps app. */
    static boolean mayOpenPortalLocation(String source, String url, boolean mainFrame, boolean gesture) {
        if (!isIntel(source) || !mainFrame || !gesture || url == null) return false;
        java.util.regex.Matcher match = java.util.regex.Pattern.compile(
                "^geo:(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)$").matcher(url);
        if (!match.matches()) return false;
        return Math.abs(Double.parseDouble(match.group(1))) <= 90
                && Math.abs(Double.parseDouble(match.group(2))) <= 180;
    }

    static boolean isEmbedded(String url) {
        String host = host(url);
        return isIntel(url) || "login.ingress.com".equals(host) || "signin.nianticlabs.com".equals(host)
                || "signin.nianticspatial.com".equals(host) || GoogleAccountHosts.HOSTS.contains(host)
                || "accounts.youtube.com".equals(host);
    }
}
