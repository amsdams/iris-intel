package io.github.amsdams.iris;

import org.junit.Test;
import static org.junit.Assert.*;

public class LoginUserAgentTest {
    @Test public void adjustsWebViewMarkersWhilePreservingDeviceAndBrowserMajorVersion() {
        String original = "Mozilla/5.0 (Linux; Android 16; Pixel 9; wv) AppleWebKit/537.36 "
                + "Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36";
        String expected = "Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 "
                + "Version/4.0 Chrome/140.0.0.1 Mobile Safari/537.36";
        assertEquals(expected, LoginUserAgent.forWebView(original));
        assertEquals(expected, LoginUserAgent.forWebView(expected));
    }

    @Test public void leavesFullBrowserVersionsAndOtherProductsUnchanged() {
        String original = "Mozilla/5.0 Chrome/140.0.7339.123 Mobile Safari/537.36 Other/140.0.0.0";
        assertEquals(original, LoginUserAgent.forWebView(original));
        assertEquals("Chrome/140.0.0.1", LoginUserAgent.forWebView("Chrome/140.0.0.0"));
    }
}
