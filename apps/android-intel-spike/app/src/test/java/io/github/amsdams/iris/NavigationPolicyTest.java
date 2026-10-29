package io.github.amsdams.iris;

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

    @Test public void dutchGoogleAccountHandoffStaysEmbeddedWithExactHostOnly() {
        for (String url : new String[]{"https://accounts.google.nl/accounts/SetSID?ssdc=1",
                "https://ACCOUNTS.GOOGLE.NL:443/"}) {
            assertTrue(url, NavigationPolicy.isEmbedded(url));
            assertFalse(url, NavigationPolicy.isIntel(url));
        }
        for (String url : new String[]{"http://accounts.google.nl/", "https://accounts.google.nl:8443/",
                "https://user@accounts.google.nl/", "https://accounts.google.nl@attacker.test/",
                "https://accounts.google.nl.attacker.test/", "https://www.google.nl/",
                "https://other.accounts.google.nl/", "https://accounts.google.example/"}) {
            assertFalse(url, NavigationPolicy.isEmbedded(url));
        }
    }

    @Test public void regionalGoogleAccountHostsCoverPublishedMultiLabelDomains() {
        for (String host : new String[]{"accounts.google.fr", "accounts.google.co.uk", "accounts.google.be",
                "accounts.google.com.au", "accounts.google.co.in", "accounts.google.co.jp"}) {
            assertTrue(host, NavigationPolicy.isEmbedded("https://" + host + "/accounts/SetSID?ssdc=1"));
        }
        assertEquals(187, GoogleAccountHosts.HOSTS.size());
    }

    @Test public void everyRegionalAccountHostHasTheSameOriginBoundaries() {
        for (String host : GoogleAccountHosts.HOSTS) {
            String url = "https://" + host + "/accounts/SetSID?ssdc=1";
            assertTrue(url, NavigationPolicy.isEmbedded(url));
            assertTrue(host, NavigationPolicy.isEmbedded("https://" + host.toUpperCase(java.util.Locale.ROOT) + ":443/"));
            assertFalse(host, NavigationPolicy.isIntel(url));
            for (String bad : new String[]{"http://" + host, "https://" + host + ":8443/",
                    "https://user@" + host, "https://" + host + "@attacker.test/",
                    "https://" + host + ".attacker.test/", "https://sub." + host,
                    "https://www." + host.substring("accounts.".length())}) {
                assertFalse(bad, NavigationPolicy.isEmbedded(bad));
            }
        }
    }

    @Test public void googleShapedDomainsOutsideTheVerifiedListStayExternal() {
        for (String host : new String[]{"accounts.google.example", "accounts.google.com.example",
                "accounts.google.invalid", "accounts.google.zz", "accounts.google.co.uk.example",
                "accounts-google.fr", "accounts.google", "google.fr", "accounts.youtube.fr"}) {
            assertFalse(host, NavigationPolicy.isEmbedded("https://" + host + "/"));
        }
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
