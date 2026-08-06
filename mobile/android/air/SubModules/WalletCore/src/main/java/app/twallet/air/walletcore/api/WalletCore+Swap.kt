package app.twallet.air.walletcore.api

import com.squareup.moshi.Types
import org.json.JSONObject
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.ApiSubmitTransferResult
import app.twallet.air.walletcore.moshi.MApiSubmitMultiTransferResult
import app.twallet.air.walletcore.moshi.MApiSubmitTransferOptions
import app.twallet.air.walletcore.moshi.MApiSwapBuildRequest
import app.twallet.air.walletcore.moshi.MApiSwapBuildResponse
import app.twallet.air.walletcore.moshi.MApiSwapCexCreateTransactionRequest
import app.twallet.air.walletcore.moshi.MApiSwapCexCreateTransactionResponse
import app.twallet.air.walletcore.moshi.MApiSwapCexEstimateResponse
import app.twallet.air.walletcore.moshi.MApiSwapEstimateRequest
import app.twallet.air.walletcore.moshi.MApiSwapEstimateResponse
import app.twallet.air.walletcore.moshi.MApiSwapHistoryItem
import app.twallet.air.walletcore.moshi.MApiSwapPairAsset
import app.twallet.air.walletcore.moshi.MApiSwapTransfer
import app.twallet.air.walletcore.moshi.MSwapCexValidateAddressParams
import app.twallet.air.walletcore.moshi.MSwapCexValidateAddressResult

/*
suspend fun WalletCore.Swap.swapGetAssets() =
    WalletCore.requiredBridge.callApiAsync<List<ApiSwapAsset>>(
        "swapGetAssets",
        "[]",
        Types.newParameterizedType(List::class.java, ApiSwapAsset::class.java))
*/

suspend fun swapGetPairs(slug: String) =
    WalletCore.requiredBridge.callApiAsync<List<MApiSwapPairAsset>>(
        "swapGetPairs",
        ArgumentsBuilder()
            .string(slug)
            .build(),
        Types.newParameterizedType(List::class.java, MApiSwapPairAsset::class.java)
    )

suspend fun WalletCore.Swap.swapEstimate(
    accountId: String,
    request: MApiSwapEstimateRequest
) = run {
    WalletCore.requiredBridge.callApiAsync<MApiSwapEstimateResponse>(
        "swapEstimate",
        ArgumentsBuilder()
            .string(accountId)
            .jsObject(request, MApiSwapEstimateRequest::class.java)
            .build(),
        MApiSwapEstimateResponse::class.java
    )
}

suspend fun WalletCore.Swap.swapCexEstimate(
    accountId: String,
    request: MApiSwapEstimateRequest
) = run {
    WalletCore.requiredBridge.callApiAsync<MApiSwapCexEstimateResponse>(
        "swapEstimate",
        ArgumentsBuilder()
            .string(accountId)
            .jsObject(request, MApiSwapEstimateRequest::class.java)
            .build(),
        MApiSwapCexEstimateResponse::class.java
    )
}

suspend fun WalletCore.Swap.swapCexCreateTransaction(
    accountId: String,
    passcode: String,
    request: MApiSwapCexCreateTransactionRequest
) = run {
    val moshi = WalletCore.moshi
    val arg = moshi.adapter(MApiSwapCexCreateTransactionRequest::class.java).toJson(request)

    val quotedAccountId = JSONObject.quote(accountId)
    val quotedPasscode = JSONObject.quote(passcode)

    WalletCore.requiredBridge.callApiAsync<MApiSwapCexCreateTransactionResponse>(
        "swapCexCreateTransaction",
        "[$quotedAccountId,$quotedPasscode,$arg]",
        MApiSwapCexCreateTransactionResponse::class.java
    )
}

suspend fun WalletCore.Swap.swapBuildTransfer(
    accountId: String,
    passcode: String,
    request: MApiSwapBuildRequest
) = run {
    val moshi = WalletCore.moshi
    val arg = moshi.adapter(MApiSwapBuildRequest::class.java).toJson(request)

    val quotedAccountId = JSONObject.quote(accountId)
    val quotedPasscode = JSONObject.quote(passcode)

    WalletCore.requiredBridge.callApiAsync<MApiSwapBuildResponse>(
        "swapBuildTransfer",
        "[$quotedAccountId,$quotedPasscode,$arg]",
        MApiSwapBuildResponse::class.java
    )
}

suspend fun WalletCore.Swap.swapSubmit(
    chain: MBlockchain,
    accountId: String,
    passcode: String,
    transfers: List<MApiSwapTransfer>?,
    historyItem: MApiSwapHistoryItem,
    withDiesel: Boolean,
    transaction: String?
) = run {
    val moshi = WalletCore.moshi
    val argT = if (transfers != null) {
        moshi.adapter<List<MApiSwapTransfer>>(
            Types.newParameterizedType(
                List::class.java,
                MApiSwapTransfer::class.java
            )
        ).toJson(transfers)
    } else "null"
    val argH = moshi.adapter(MApiSwapHistoryItem::class.java)
        .toJson(historyItem)

    val quotedChain = JSONObject.quote(chain.name)
    val quotedAccountId = JSONObject.quote(accountId)
    val quotedPasscode = JSONObject.quote(passcode)
    val argTx = transaction?.let { JSONObject.quote(it) } ?: "null"

    WalletCore.requiredBridge.callApiAsync<MApiSubmitMultiTransferResult>(
        "swapSubmit",
        "[$quotedChain,$quotedAccountId,$quotedPasscode,$argT,$argH,$withDiesel,$argTx]",
        MApiSubmitMultiTransferResult::class.java
    )
}

suspend fun WalletCore.Swap.swapCexValidateAddress(params: MSwapCexValidateAddressParams) = run {
    WalletCore.requiredBridge.callApiAsync<MSwapCexValidateAddressResult>(
        "swapCexValidateAddress",
        ArgumentsBuilder()
            .jsObject(params, MSwapCexValidateAddressParams::class.java)
            .build(),
        MSwapCexValidateAddressResult::class.java
    )
}

suspend fun WalletCore.Transfer.swapCexSubmit(
    chain: MBlockchain,
    options: MApiSubmitTransferOptions,
    swapId: String
): ApiSubmitTransferResult = run {
    val moshi = WalletCore.moshi
    val arg = moshi.adapter(MApiSubmitTransferOptions::class.java).toJson(options)
    val args = "[\"${chain.name}\", $arg, ${JSONObject.quote(swapId)}]"

    WalletCore.requiredBridge.callApiAsync(
        "swapCexSubmit",
        args,
        ApiSubmitTransferResult::class.java,
    )
}
