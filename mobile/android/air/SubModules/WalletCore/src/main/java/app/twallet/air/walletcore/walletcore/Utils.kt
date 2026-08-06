package app.twallet.air.walletcore

import app.twallet.air.walletbasecontext.utils.smartDecimalsCount
import app.twallet.air.walletbasecontext.utils.toString
import app.twallet.air.walletcore.moshi.IApiToken
import java.math.BigInteger

fun BigInteger.toAmountString(
    token: IApiToken
): String {
    return this.toString(
        currency = token.symbol ?: "",
        decimals = token.decimals,
        currencyDecimals = this.smartDecimalsCount(token.decimals),
        showPositiveSign = false,
        roundUp = false
    )
}
