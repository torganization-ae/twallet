package app.twallet.air.walletcore.moshi

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import app.twallet.air.walletcore.moshi.adapter.DoubleJsonAdapter
import app.twallet.air.walletcore.moshi.api.ApiUpdate

class ApiUpdateCurrencyRatesTest {
    private val adapter = Moshi.Builder()
        .add(Double::class.javaObjectType, DoubleJsonAdapter())
        .addLast(KotlinJsonAdapterFactory())
        .build()
        .adapter(ApiUpdate.ApiUpdateCurrencyRates::class.java)

    @Test
    fun decodesBackendStringRates() {
        val json = """
            {"type":"updateCurrencyRates","rates":{"USD":"1","RUB":"83.43563","EUR":"0.86417"}}
        """.trimIndent()

        val update = adapter.fromJson(json)
        assertNotNull("string rates from /currency-rates must not be dropped as null", update)
        assertEquals(1.0, update!!.rates["USD"]!!, 0.0)
        assertEquals(83.43563, update.rates["RUB"]!!, 0.0000001)
        assertEquals(0.86417, update.rates["EUR"]!!, 0.0000001)
    }

    @Test
    fun decodesNumericRates() {
        val json = """
            {"type":"updateCurrencyRates","rates":{"USD":1,"RUB":80.0}}
        """.trimIndent()

        val update = adapter.fromJson(json)!!
        assertEquals(1.0, update.rates["USD"]!!, 0.0)
        assertEquals(80.0, update.rates["RUB"]!!, 0.0)
    }
}
