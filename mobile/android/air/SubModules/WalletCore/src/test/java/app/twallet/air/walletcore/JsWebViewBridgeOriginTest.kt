package app.twallet.air.walletcore

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class JsWebViewBridgeOriginTest {
    @Test
    fun prodPlayApplicationIdIsHttpsOrigin() {
        assertEquals("https://com.sveves.twallet", sdkWebViewOrigin("com.sveves.twallet"))
        assertEquals(
            "https://com.sveves.twallet/assets/js/index.html",
            sdkIndexUrl("com.sveves.twallet"),
        )
        assertFalse(sdkIndexUrl("com.sveves.twallet").startsWith("file:"))
    }

    @Test
    fun debugAndBetaKeepTheirApplicationIdHost() {
        assertEquals(
            "https://com.sveves.twallet.debug",
            sdkWebViewOrigin("com.sveves.twallet.debug"),
        )
        assertEquals(
            "https://com.sveves.twallet.beta",
            sdkWebViewOrigin("com.sveves.twallet.beta"),
        )
    }
}
