package app.twallet.air.uiassets.models

import app.twallet.air.walletcore.moshi.ApiNft

data class ExpiringDomainsData(
    val domainNfts: List<ApiNft>,
    val count: Int,
    val minDays: Int,
)
