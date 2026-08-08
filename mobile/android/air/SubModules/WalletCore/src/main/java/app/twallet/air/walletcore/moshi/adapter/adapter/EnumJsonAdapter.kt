package app.twallet.air.walletcore.moshi.adapter

import com.squareup.moshi.FromJson
import com.squareup.moshi.Json
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.JsonReader
import com.squareup.moshi.JsonWriter
import com.squareup.moshi.ToJson
import kotlin.reflect.KClass

class EnumJsonAdapter<T : Enum<T>>(
    private val enumClass: KClass<T>,
    private val unknownFallback: T? = null,
) : JsonAdapter<T>() {
    private val values =
        requireNotNull(enumClass.java.enumConstants) { "$enumClass is not an enum class" }
            .associateBy {
                enumClass.java.getField(it.name).getAnnotation(Json::class.java)?.name ?: it.name
            }

    @FromJson
    override fun fromJson(reader: JsonReader): T? {
        if (!reader.hasNext()) {
            return null
        }

        val value = reader.nextString()
        return values[value] ?: unknownFallback
    }

    @ToJson
    override fun toJson(writer: JsonWriter, value: T?) {
        val enumName = value?.name ?: run {
            writer.nullValue()
            return
        }

        val annotationName = enumClass.java.getField(enumName)
            .getAnnotation(Json::class.java)?.name

        writer.value(annotationName ?: enumName)
    }
}
