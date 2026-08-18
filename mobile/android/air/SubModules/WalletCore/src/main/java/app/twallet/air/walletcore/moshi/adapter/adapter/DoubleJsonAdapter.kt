package app.twallet.air.walletcore.moshi.adapter

import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.JsonDataException
import com.squareup.moshi.JsonReader
import com.squareup.moshi.JsonWriter

/**
 * JS SDK / backend payloads often encode numbers as strings (`"1"`, `"83.43"`).
 * Moshi's default Double adapter rejects those tokens; iOS accepts them via `MDouble`.
 */
class DoubleJsonAdapter : JsonAdapter<Double>() {
    override fun fromJson(reader: JsonReader): Double? {
        return when (reader.peek()) {
            JsonReader.Token.NULL -> {
                reader.nextNull<Unit>()
                null
            }
            JsonReader.Token.STRING -> {
                val raw = reader.nextString()
                raw.toDoubleOrNull()
                    ?: throw JsonDataException("Expected a number, was \"$raw\"")
            }
            JsonReader.Token.NUMBER -> reader.nextDouble()
            else -> throw JsonDataException("Expected a number, was ${reader.peek()}")
        }
    }

    override fun toJson(writer: JsonWriter, value: Double?) {
        if (value == null) {
            writer.nullValue()
        } else {
            writer.value(value)
        }
    }
}
