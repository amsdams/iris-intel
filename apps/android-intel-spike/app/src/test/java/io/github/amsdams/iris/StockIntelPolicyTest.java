package io.github.amsdams.iris;

import org.junit.Test;
import static org.junit.Assert.*;

public class StockIntelPolicyTest {
    @Test public void blocksOnlyTheIntelDashboardEntryInIrisMode() {
        for (String url : new String[]{"https://intel.ingress.com/r/gen_dashboard_a123bc.js",
                "https://intel.ingress.com/jsc/gen_dashboard_a123bc.js?v=1"}) {
            assertTrue(StockIntelPolicy.blocks(url, true));
            assertFalse(StockIntelPolicy.blocks(url, false));
        }
    }

    @Test public void preservesAuthMetadataRequestsAndBundledRuntime() {
        for (String url : new String[]{"https://intel.ingress.com/r/getEntities",
                "https://intel.ingress.com/signinhandler", "https://login.ingress.com/authorize",
                "https://intel.ingress.com/__iris_android__/page-map-runtime.js",
                "https://accounts.google.com/gen_dashboard_a123bc.js",
                "https://intel.ingress.com.attacker.test/gen_dashboard_a123bc.js",
                "http://intel.ingress.com/gen_dashboard_a123bc.js", null}) {
            assertFalse(String.valueOf(url), StockIntelPolicy.blocks(url, true));
        }
    }
}
