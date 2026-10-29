package io.github.amsdams.iris;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

/** Public release metadata only; independent of Intel's WebView and session. */
final class ReleaseUpdate {
    static final String RELEASES_URL = "https://github.com/amsdams/iris-intel/releases/tag/latest";
    static final String METADATA_URL = "https://github.com/amsdams/iris-intel/releases/download/latest/iitc-iris-android-update.properties";
    private static final int MAX_BYTES = 4096;
    final long versionCode;
    final String versionName;

    private ReleaseUpdate(long versionCode, String versionName) {
        this.versionCode = versionCode;
        this.versionName = versionName;
    }

    boolean isNewerThan(long installedCode) { return versionCode > installedCode; }

    static ReleaseUpdate fetch() throws IOException {
        return fetch(new URL(METADATA_URL));
    }

    static ReleaseUpdate fetch(URL url) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        connection.setUseCaches(false);
        connection.setRequestProperty("Cache-Control", "no-cache");
        connection.setRequestProperty("User-Agent", "IRIS-Update-Check");
        try {
            if (connection.getResponseCode() != 200) throw new IOException("Release metadata unavailable");
            try (InputStream input = connection.getInputStream()) {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                byte[] buffer = new byte[1024];
                int length;
                while ((length = input.read(buffer)) != -1) {
                    if (bytes.size() + length > MAX_BYTES) throw new IOException("Release metadata too large");
                    bytes.write(buffer, 0, length);
                }
                return parse(bytes.toString(StandardCharsets.UTF_8.name()));
            }
        } finally { connection.disconnect(); }
    }

    static ReleaseUpdate parse(String text) throws IOException {
        if (text.length() > MAX_BYTES) throw new IOException("Release metadata too large");
        Properties values = new Properties();
        try {
            values.load(new StringReader(text));
            String code = values.getProperty("versionCode", "");
            String name = values.getProperty("versionName", "");
            if (!"1".equals(values.getProperty("schema"))
                    || !"io.github.amsdams.iris".equals(values.getProperty("applicationId"))
                    || !code.matches("[1-9][0-9]{0,9}") || !name.matches("[0-9A-Za-z.+-]{1,100}")) {
                throw new IOException("Invalid release metadata");
            }
            long version = Long.parseLong(code);
            if (version > 2100000000L) throw new IOException("Invalid version code");
            return new ReleaseUpdate(version, name);
        } catch (IllegalArgumentException error) {
            throw new IOException("Invalid release metadata", error);
        }
    }
}
