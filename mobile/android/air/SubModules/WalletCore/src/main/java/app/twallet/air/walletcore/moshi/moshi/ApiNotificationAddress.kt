package app.twallet.air.walletcore.moshi

import com.squareup.moshi.JsonClass
import app.twallet.air.walletcore.models.blockchain.MBlockchain

@JsonClass(generateAdapter = true)
data class ApiNotificationAddress(
    val title: String?,
    val address: String,
    val chain: MBlockchain
)
