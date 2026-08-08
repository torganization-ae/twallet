package app.twallet.air.walletcore.models

import org.json.JSONObject
import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import app.twallet.air.walletbasecontext.utils.doubleAbsRepresentation
import app.twallet.air.walletcore.BNB_SLUG
import app.twallet.air.walletcore.ETH_SLUG
import app.twallet.air.walletcore.HYPERLIQUID_SLUG
import app.twallet.air.walletcore.SOLANA_SLUG
import app.twallet.air.walletcore.TONCOIN_SLUG
import app.twallet.air.walletcore.TON_USDT_SLUG
import app.twallet.air.walletcore.TON_USDT_TESTNET_SLUG
import app.twallet.air.walletcore.TRON_SLUG
import app.twallet.air.walletcore.TRON_USDT_SLUG
import app.twallet.air.walletcore.TRON_USDT_TESTNET_SLUG
import app.twallet.air.walletcore.stores.TokenStore
import java.math.BigInteger

data class MTokenBalance(
    val token: String?,
    val amountValue: BigInteger,
    var toBaseCurrency: Double?,
    var toBaseCurrency24h: Double?,
    val toUsdBaseCurrency: Double?,
) {
    private val priorityOrder: Int get() = PRIORITY_ORDER.indexOf(token)

    fun compareByDisplayOrder(
        other: MTokenBalance,
        ignorePriorities: Boolean = false,
    ): Int {
        val thisValue = this.toBaseCurrency ?: this.toUsdBaseCurrency ?: 0.0
        val otherValue = other.toBaseCurrency ?: other.toUsdBaseCurrency ?: 0.0

        if (!ignorePriorities) {
            val thisOrder = this.priorityOrder
            val otherOrder = other.priorityOrder
            if (thisOrder != -1 && otherOrder != -1) {
                if (thisValue == otherValue) {
                    val orderCompare = thisOrder.compareTo(otherOrder)
                    return orderCompare
                }
            } else if (thisOrder != -1) {
                return -1
            } else if (otherOrder != -1) {
                return 1
            }
        }

        val valueCompare = otherValue.compareTo(thisValue)
        if (valueCompare != 0) {
            return valueCompare
        }

        val sameBalancePriorityCompare =
            other.priorityOrder.compareTo(this.priorityOrder)
        if (sameBalancePriorityCompare != 0) {
            return sameBalancePriorityCompare
        }

        val thisSlug = this.token ?: ""
        val otherSlug = other.token ?: ""
        val thisName = TokenStore.getToken(thisSlug)?.name ?: thisSlug
        val otherName = TokenStore.getToken(otherSlug)?.name ?: otherSlug
        val nameCompare = thisName.compareTo(otherName)
        if (nameCompare != 0) {
            return nameCompare
        }
        return thisSlug.compareTo(otherSlug)
    }

    companion object {
        private val GRAM_PRIORITY_ORDER = listOf(
            TONCOIN_SLUG,
            TON_USDT_SLUG,
            TON_USDT_TESTNET_SLUG,
        )

        private val MYTONWALLET_PRIORITY_ORDER = listOf(
            ETH_SLUG,
            SOLANA_SLUG,
            TONCOIN_SLUG,
            TRON_SLUG,
            BNB_SLUG,
            HYPERLIQUID_SLUG,
        )

        private val PRIORITY_ORDER: List<String>
            get() = if (ApplicationContextHolder.isGramApp) GRAM_PRIORITY_ORDER
            else MYTONWALLET_PRIORITY_ORDER

        // Factory method to create an instance from JSON
        fun fromJson(json: JSONObject): MTokenBalance {
            val token = json.optJSONObject("token")?.optString("slug")
            val amountValueString = json.optString("balance").substringAfter("bigint:", "")
            val amountValue = amountValueString.toBigIntegerOrNull() ?: BigInteger.ZERO
            return MTokenBalance(token, amountValue, null, null, null)
        }

        // Factory method to create an instance from separate parameters
        @JvmName("fromParametersNullable")
        fun fromParameters(token: MToken?, amount: BigInteger?): MTokenBalance? {
            if (token == null || amount == null)
                return null
            return fromParameters(token, amount)
        }

        fun fromParameters(token: MToken, amount: BigInteger): MTokenBalance {
            val toBaseCurrency =
                when {
                    amount == BigInteger.ZERO -> 0.0
                    else -> {
                        token.price?.let { amount.doubleAbsRepresentation(token.decimals) * it }
                            ?.let {
                                if (it.isFinite()) it else null
                            }
                    }
                }
            val priceYesterday =
                token.price?.let { price -> price / (1 + token.percentChange24hReal / 100) }?.let {
                    if (it.isFinite()) it else null
                }
            val toBaseCurrency24h =
                priceYesterday?.let { amount.doubleAbsRepresentation(token.decimals) * priceYesterday }
                    ?.let {
                        if (it.isFinite()) it else null
                    }
            val toUsdBaseCurrency =
                token.priceUsd.let { amount.doubleAbsRepresentation(token.decimals) * it }.let {
                    if (it.isFinite()) it else null
                }
            return MTokenBalance(
                token.slug,
                amount,
                toBaseCurrency,
                toBaseCurrency24h,
                toUsdBaseCurrency
            )
        }
    }
}
