package org.iris.intelspike;

/** IITC-style compatibility experiment; not a supported Google OAuth integration. */
final class LoginUserAgent {
    private LoginUserAgent() {}

    static String forWebView(String original) {
        // Match upstream IITC's mobile login workaround without pinning a stale browser version.
        return original.replace("; wv", "")
                .replaceAll("Chrome/(\\d+)\\.0\\.0\\.0(?= |$)", "Chrome/$1.0.0.1");
    }
}
