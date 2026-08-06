package app.twallet.air.walletcore.api

import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.MApiCheckTransactionDraftOptions
import app.twallet.air.walletcore.moshi.MApiCheckTransactionDraftResult

suspend fun WalletCore.Transfer.checkTransactionDraft(
    chain: MBlockchain,
    options: MApiCheckTransactionDraftOptions
) = run {
    val moshi = WalletCore.moshi
    val arg = moshi.adapter(MApiCheckTransactionDraftOptions::class.java).toJson(options)

    WalletCore.requiredBridge.callApiAsync<MApiCheckTransactionDraftResult>(
        "checkTransactionDraft",
        "[\"${chain.name}\", $arg]",
        MApiCheckTransactionDraftResult::class.java
    )
}
