package app.twallet.air.walletcore.helpers

import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.utils.smartDecimalsCount
import app.twallet.air.walletbasecontext.utils.toString
import app.twallet.air.walletcore.moshi.explainedFee.MFee
import app.twallet.air.walletcore.moshi.explainedFee.MFeePrecision
import app.twallet.air.walletcore.moshi.explainedFee.MFeeTerms
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.stores.TokenStore
import java.math.BigInteger

class DappFeeHelpers {
    companion object {
        fun calculateDappTransferFee(
            operationChain: String,
            fullFee: BigInteger,
            received: BigInteger,
        ): String {
            val chain = MBlockchain.valueOfOrNull(operationChain) ?: return ""
            val nativeToken = TokenStore.getToken(chain.nativeSlug) ?: return ""
            if (received == BigInteger.ZERO) {
                return MFee(
                    precision = MFeePrecision.EXACT,
                    terms = MFeeTerms(
                        token = null,
                        native = fullFee,
                        stars = null
                    ),
                    nativeSum = fullFee
                ).toString(nativeToken, appendNonNative = true)
            }

            if (fullFee >= received) {
                val realFee = fullFee - received
                return MFee(
                    precision = MFeePrecision.APPROXIMATE,
                    terms = MFeeTerms(
                        native = realFee,
                        token = null,
                        stars = null
                    ),
                    nativeSum = realFee
                ).toString(nativeToken, appendNonNative = true)
            }

            val realReceived = received - fullFee
            return LocaleController.getFormattedString(
                "%1$@ will be returned", listOf(
                    realReceived.toString(
                        nativeToken.decimals,
                        nativeToken.symbol,
                        realReceived.smartDecimalsCount(nativeToken.decimals),
                        false
                    )
                )
            )
        }
    }
}
