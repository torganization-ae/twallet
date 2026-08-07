package app.twallet.air.walletcore.moshi

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class MNetworkRpcConfigItem(
    val chain: String,
    val title: String,
    val fields: List<MNetworkRpcFieldConfig>,
    val isHidden: Boolean? = null,
)

@JsonClass(generateAdapter = true)
data class MNetworkRpcFieldConfig(
    val field: String,
    val label: String,
    val url: String,
    val apiKey: String? = null,
    val isApiKeyLocked: Boolean? = null,
    val hasApiKey: Boolean? = null,
    val isDefault: Boolean,
    val defaultUrl: String,
)

@JsonClass(generateAdapter = true)
data class MRpcTestResult(
    val status: String,
    val details: String? = null,
    val saved: Boolean? = null,
)

@JsonClass(generateAdapter = true)
data class MRpcUnlockResult(
    val ok: Boolean,
    val apiKey: String? = null,
)

@JsonClass(generateAdapter = true)
data class MRpcResetResult(
    val ok: Boolean,
)
