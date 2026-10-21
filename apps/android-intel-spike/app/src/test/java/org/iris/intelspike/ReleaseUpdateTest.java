package org.iris.intelspike;

import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.junit.Test;
import static org.junit.Assert.*;

public class ReleaseUpdateTest {
    private static String metadata(String code, String name) {
        return "schema=1\napplicationId=org.iris.intelspike\nversionCode=" + code + "\nversionName=" + name + "\n";
    }

    @Test public void comparesAndroidCodesRatherThanVersionNamesOrCommitHashes() throws Exception {
        ReleaseUpdate update = ReleaseUpdate.parse(metadata("1833", "0.4.1-alpha+abc1234"));
        assertEquals("0.4.1-alpha+abc1234", update.versionName);
        assertTrue(update.isNewerThan(1832));
        assertFalse(update.isNewerThan(1833));
        assertFalse(update.isNewerThan(1834)); // A local build can be ahead of GitHub.
    }

    @Test public void rejectsWrongAppSchemaAndMalformedReleaseResponses() {
        for (String text : new String[]{"", "<html>Not found</html>", metadata("0", "0.4.1"),
                metadata("-1", "0.4.1"), metadata("2100000001", "0.4.1"), metadata("999999999999", "0.4.1"),
                metadata("1833", ""), metadata("1833", "Untrusted version text!"),
                metadata("1833", "0.4.1").replace("schema=1", "schema=2"),
                metadata("1833", "0.4.1").replace("org.iris.intelspike", "another.app"),
                "x".repeat(4097), "schema=\\uZZZZ"}) {
            assertThrows(IOException.class, () -> ReleaseUpdate.parse(text));
        }
    }

    @Test public void followsAssetRedirectsWithoutIntelSessionHeaders() throws Exception {
        String body = metadata("1833", "0.4.1-alpha+abc1234");
        try (TestServer server = new TestServer("HTTP/1.1 302 Found\r\nLocation: /asset\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                response(200, body))) {
            assertEquals(1833, ReleaseUpdate.fetch(server.url()).versionCode);
        }
    }

    @Test public void rejectsHttpErrorsAndOversizedResponses() throws Exception {
        try (TestServer server = new TestServer(response(404, ""), response(200, "x".repeat(4097)))) {
            assertThrows(IOException.class, () -> ReleaseUpdate.fetch(server.url()));
            assertThrows(IOException.class, () -> ReleaseUpdate.fetch(server.url()));
        }
    }

    private static String response(int code, String body) {
        return "HTTP/1.1 " + code + " Test\r\nContent-Length: " + body.length()
                + "\r\nConnection: close\r\n\r\n" + body;
    }

    // A real socket keeps network/redirect coverage independent of Android and extra test libraries.
    private static final class TestServer implements AutoCloseable {
        private final ServerSocket socket = new ServerSocket(0, 2, InetAddress.getByName("127.0.0.1"));
        private final Thread worker;
        private volatile Throwable failure;

        TestServer(String... responses) throws IOException {
            socket.setSoTimeout(3000);
            worker = new Thread(() -> {
                try {
                    for (String response : responses) {
                        try (Socket client = socket.accept()) {
                            client.setSoTimeout(3000);
                            BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
                            String line;
                            boolean userAgent = false;
                            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                                assertFalse(line.toLowerCase(java.util.Locale.ROOT).startsWith("cookie:"));
                                assertFalse(line.toLowerCase(java.util.Locale.ROOT).startsWith("authorization:"));
                                if (line.equals("User-Agent: IRIS-Update-Check")) userAgent = true;
                            }
                            assertTrue("Expected a neutral update-check user agent", userAgent);
                            client.getOutputStream().write(response.getBytes(StandardCharsets.UTF_8));
                        }
                    }
                } catch (Throwable error) { failure = error; }
            });
            worker.start();
        }

        URL url() throws IOException { return new URL("http://127.0.0.1:" + socket.getLocalPort() + "/release"); }

        @Override public void close() throws Exception {
            worker.join(4000);
            socket.close();
            assertFalse("HTTP test server did not finish", worker.isAlive());
            if (failure != null) throw new AssertionError(failure);
        }
    }
}
