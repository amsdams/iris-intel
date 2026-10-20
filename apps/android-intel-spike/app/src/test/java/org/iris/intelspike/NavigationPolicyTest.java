package org.iris.intelspike;

import org.junit.Test;
import static org.junit.Assert.*;

public class NavigationPolicyTest {
    @Test public void intelPagesPermitQueriesAndHttpsDefaultPort() {
        assertTrue(NavigationPolicy.isIntel("https://intel.ingress.com/intel?ll=52,4&z=15"));
        assertTrue(NavigationPolicy.isIntel("https://INTEL.INGRESS.COM:443/"));
    }

    @Test public void lookalikesAndInsecureSchemesCannotReceiveTheProbe() {
        for (String url : new String[]{"http://intel.ingress.com", "https://intel.ingress.com.attacker.test/",
                "https://intel.ingress.com@attacker.test/", "https://user@intel.ingress.com/",
                "https://intel.ingress.com:8443/", "javascript:alert(1)", "file:///etc/passwd", "bad url", null}) {
            assertFalse(String.valueOf(url), NavigationPolicy.isIntel(url));
            assertFalse(String.valueOf(url), NavigationPolicy.isEmbedded(url));
        }
    }

    @Test public void ingressAndNianticLoginPagesAreEmbeddedButNeverReceiveTheProbe() {
        for (String url : new String[]{"https://login.ingress.com/authorize?client_id=intel",
                "https://LOGIN.INGRESS.COM:443/authorize", "https://signin.nianticlabs.com/login",
                "https://signin.nianticspatial.com/login"}) {
            assertTrue(NavigationPolicy.isEmbedded(url));
            assertFalse(NavigationPolicy.isIntel(url));
        }
    }

    @Test public void googleLoginStaysEmbeddedWithoutGainingIntelProbeAccess() {
        for (String url : new String[]{"https://accounts.google.com/o/oauth2/auth",
                "https://accounts.youtube.com/accounts/SetSID?ssdc=1",
                "https://ACCOUNTS.YOUTUBE.COM:443/accounts/SetSID"}) {
            assertTrue(url, NavigationPolicy.isEmbedded(url));
            assertFalse(url, NavigationPolicy.isIntel(url));
        }
    }

    @Test public void unrelatedPagesUseTheBrowser() {
        assertFalse(NavigationPolicy.isEmbedded("https://signin.nianticspatial.com.attacker.test/"));
        assertFalse(NavigationPolicy.isEmbedded("https://example.org/"));
        assertFalse(NavigationPolicy.isEmbedded("https://www.youtube.com/"));
    }

    @Test public void loginHostLookalikesAndUnsafeOriginsStayOutsideTheWebView() {
        for (String url : new String[]{"https://login.ingress.com.attacker.test/",
                "https://login.ingress.com@attacker.test/", "https://user@login.ingress.com/",
                "http://login.ingress.com/", "https://login.ingress.com:8443/",
                "https://accounts.google.com.attacker.test/", "https://accounts.google.com@attacker.test/",
                "http://accounts.google.com/", "https://accounts.google.com:8443/",
                "https://user@accounts.google.com/", "https://accounts.youtube.com.attacker.test/",
                "https://accounts.youtube.com@attacker.test/", "http://accounts.youtube.com/",
                "https://accounts.youtube.com:8443/", "https://user@accounts.youtube.com/"}) {
            assertFalse(url, NavigationPolicy.isEmbedded(url));
        }
    }
}
