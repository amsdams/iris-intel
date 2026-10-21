package org.iris.intelspike;

import org.junit.Test;
import static org.junit.Assert.*;

public class LocationPermissionFlowTest {
    private static final String INTEL = "https://intel.ingress.com";

    private static final class Host implements LocationPermissionFlow.Host {
        boolean intel = true;
        boolean granted;
        int prompts;
        @Override public boolean isIntelPage() { return intel; }
        @Override public boolean hasLocationPermission() { return granted; }
        @Override public void requestLocationPermissions() { prompts++; }
    }

    private static final class Reply implements LocationPermissionFlow.Reply {
        int calls;
        boolean allowed;
        @Override public void invoke(String origin, boolean allow, boolean retain) {
            assertFalse("Never persist a separate WebView grant", retain);
            calls++;
            allowed = allow;
        }
    }

    @Test public void promptsOnlyWhenIntelRequestsLocationAndWaitsForOsResult() {
        Host host = new Host();
        LocationPermissionFlow flow = new LocationPermissionFlow(host);
        Reply reply = new Reply();
        assertEquals(0, host.prompts);
        flow.request(INTEL, reply);
        assertEquals(1, host.prompts);
        assertEquals(0, reply.calls);
        host.granted = true;
        flow.onPermissionResult();
        assertEquals(1, reply.calls);
        assertTrue(reply.allowed);
    }

    @Test public void deniesOtherOriginsAndNonIntelTopLevelPagesWithoutPrompting() {
        Host host = new Host();
        host.granted = true;
        LocationPermissionFlow flow = new LocationPermissionFlow(host);
        for (String origin : new String[]{null, "http://intel.ingress.com", "https://intel.ingress.com:444",
                "https://intel.ingress.com.attacker.test", "https://accounts.google.com",
                "https://intel.ingress.com/path", "https://intel.ingress.com@attacker.test"}) {
            Reply reply = new Reply();
            flow.request(origin, reply);
            assertEquals(1, reply.calls);
            assertFalse(reply.allowed);
        }
        host.intel = false;
        Reply reply = new Reply();
        flow.request(INTEL, reply);
        assertFalse(reply.allowed);
        assertEquals(1, reply.calls);
        assertEquals(0, host.prompts);
    }

    @Test public void reusesOsGrantButRechecksAfterRevocation() {
        Host host = new Host();
        host.granted = true;
        LocationPermissionFlow flow = new LocationPermissionFlow(host);
        for (String origin : new String[]{INTEL, INTEL + "/", INTEL + ":443", INTEL + ":443/"}) {
            Reply reply = new Reply();
            flow.request(origin, reply);
            assertTrue(reply.allowed);
            assertEquals(1, reply.calls);
        }
        assertEquals(0, host.prompts);
        host.granted = false;
        flow.request(INTEL, new Reply());
        assertEquals(1, host.prompts);
    }

    @Test public void denialResolvesRequestAndAllowsALaterRetry() {
        Host host = new Host();
        LocationPermissionFlow flow = new LocationPermissionFlow(host);
        Reply reply = new Reply();
        flow.request(INTEL, reply);
        flow.onPermissionResult();
        assertEquals(1, reply.calls);
        assertFalse(reply.allowed);
        flow.request(INTEL, new Reply());
        assertEquals(2, host.prompts);
    }

    @Test public void cancellationPreventsStaleGrantAndWaitsForOutstandingOsDialog() {
        Host host = new Host();
        LocationPermissionFlow flow = new LocationPermissionFlow(host);
        Reply old = new Reply();
        flow.request(INTEL, old);
        flow.cancel();
        flow.cancel();
        assertEquals(1, old.calls);
        assertFalse(old.allowed);
        Reply replacement = new Reply();
        flow.request(INTEL, replacement);
        assertFalse(replacement.allowed);
        assertEquals(1, replacement.calls);
        assertEquals(1, host.prompts);
        host.granted = true;
        flow.onPermissionResult();
        assertEquals(1, old.calls);
        assertEquals(1, replacement.calls);
        Reply fresh = new Reply();
        flow.request(INTEL, fresh);
        assertTrue(fresh.allowed);
    }

    @Test public void resultRechecksCurrentPageBeforeGranting() {
        Host host = new Host();
        LocationPermissionFlow flow = new LocationPermissionFlow(host);
        Reply reply = new Reply();
        flow.request(INTEL, reply);
        host.granted = true;
        host.intel = false;
        flow.onPermissionResult();
        assertEquals(1, reply.calls);
        assertFalse(reply.allowed);
    }

    @Test public void overlappingRequestsCannotReplaceThePendingCallback() {
        Host host = new Host();
        LocationPermissionFlow flow = new LocationPermissionFlow(host);
        Reply first = new Reply();
        Reply second = new Reply();
        flow.request(INTEL, first);
        flow.request(INTEL, second);
        assertEquals(1, second.calls);
        assertFalse(second.allowed);
        host.granted = true;
        flow.onPermissionResult();
        assertTrue(first.allowed);
        assertEquals(1, first.calls);
        assertEquals(1, host.prompts);
    }
}
