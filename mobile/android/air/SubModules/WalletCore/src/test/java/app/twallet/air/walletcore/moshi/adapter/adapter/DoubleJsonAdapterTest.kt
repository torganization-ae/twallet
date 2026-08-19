package app.twallet.air.walletcore.moshi.adapter

import com.squareup.moshi.JsonDataException
import com.squareup.moshi.Moshi
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class DoubleJsonAdapterTest {
    private val adapter = Moshi.Builder()
        .add(Double::class.javaObjectType, DoubleJsonAdapter())
        .build()
        .adapter(Double::class.javaObjectType)

    @Test
    fun decodesJsonNumber() {
        assertEquals(83.43, adapter.fromJson("83.43")!!, 0.0001)
    }

    @Test
    fun decodesNumericString() {
        assertEquals(1.0, adapter.fromJson("\"1\"")!!, 0.0)
        assertEquals(83.43563, adapter.fromJson("\"83.43563\"")!!, 0.0000001)
    }

    @Test
    fun rejectsNonNumericString() {
        assertThrows(JsonDataException::class.java) {
            adapter.fromJson("\"not-a-number\"")
        }
    }
}
