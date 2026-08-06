package app.twallet.air.uicomponents.extensions

import app.twallet.air.walletcontext.utils.CoinUtils
import app.twallet.air.walletcore.moshi.IApiToken
import java.math.BigDecimal
import java.math.BigInteger

fun CoinUtils.toBigInteger(value: String?, token: IApiToken?): BigInteger? {
    return token?.let {
        fromDecimal(value, it.decimals)
    }
}

fun CoinUtils.toBigDecimal(value: String?, token: IApiToken?): BigDecimal? {
    return token?.let {
        fromDecimal(value, it.decimals)?.toBigDecimal(it.decimals)
    }
}
