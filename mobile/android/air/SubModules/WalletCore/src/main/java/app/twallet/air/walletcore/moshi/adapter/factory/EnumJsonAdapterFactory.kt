package app.twallet.air.walletcore.moshi.adapter.factory

import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.JsonAdapter.Factory
import com.squareup.moshi.Moshi
import app.twallet.air.walletcore.moshi.MDieselStatus
import app.twallet.air.walletcore.moshi.adapter.EnumJsonAdapter
import kotlin.reflect.KClass
import kotlin.reflect.full.isSubclassOf

class EnumJsonAdapterFactory : Factory {
    override fun create(
        type: java.lang.reflect.Type,
        annotations: MutableSet<out Annotation>,
        moshi: Moshi
    ): JsonAdapter<*>? {
        val rawType = (type as? Class<*>)?.kotlin ?: return null
        if (rawType == MDieselStatus::class) {
            return EnumJsonAdapter(MDieselStatus::class, MDieselStatus.NOT_AVAILABLE)
        }
        if (rawType.isSubclassOf(Enum::class)) {
            @Suppress("UNCHECKED_CAST")
            return EnumJsonAdapter(rawType as KClass<out Enum<*>>)
        }
        return null
    }
}
