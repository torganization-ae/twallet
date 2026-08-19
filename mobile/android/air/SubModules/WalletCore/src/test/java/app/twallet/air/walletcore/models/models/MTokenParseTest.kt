package app.twallet.air.walletcore.models

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MTokenParseTest {

    @Test
    fun parsesNumericPriceUsd() {
        val token = MToken(
            JSONObject("""{"slug":"toncoin","symbol":"GRAM","decimals":9,"chain":"ton","priceUsd":1.314543202}""")
        )
        assertEquals(1.314543202, token.priceUsd, 1e-9)
    }

    @Test
    fun parsesStringPriceUsdTheSameAsJsonNumber() {
        val token = MToken(
            JSONObject("""{"slug":"toncoin","symbol":"GRAM","decimals":9,"chain":"ton","priceUsd":"1.314543202"}""")
        )
        assertEquals(1.314543202, token.priceUsd, 1e-9)
    }

    @Test
    fun missingPriceUsdIsZeroLikeWeb() {
        val token = MToken(JSONObject("""{"slug":"toncoin","symbol":"GRAM","decimals":9,"chain":"ton"}"""))
        assertEquals(0.0, token.priceUsd, 0.0)
    }

    @Test
    fun parsesVerificationFieldsFromJsUpdateTokens() {
        val token = MToken(
            JSONObject(
                """{"slug":"ton-jetton","symbol":"JET","decimals":9,"chain":"ton","verification":"whitelist","isPopular":true}"""
            )
        )
        assertEquals("whitelist", token.verification)
        assertTrue(token.isPopular)
        assertFalse(token.isSpam)
    }
}
