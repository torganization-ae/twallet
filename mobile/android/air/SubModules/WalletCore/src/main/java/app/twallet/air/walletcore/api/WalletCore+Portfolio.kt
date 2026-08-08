package app.twallet.air.walletcore.api

import app.twallet.air.walletbasecontext.models.MBaseCurrency
import app.twallet.air.walletbasecontext.utils.MHistoryTimePeriod
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.moshi.ApiPortfolioHistoryResponse
import app.twallet.air.walletcore.stores.PortfolioStore
import app.twallet.air.walletcore.stores.TokenStore
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

suspend fun WalletCore.recordPortfolioSnapshot(
    accountId: String,
    totalUsd: Double,
    bySlug: Map<String, Double> = emptyMap(),
) {
    val bySlugJson =
        JSONObject().apply {
            for ((slug, value) in bySlug) {
                put(slug, value)
            }
        }
    requiredBridge.callApiAsync<Any>(
        "recordPortfolioSnapshot",
        ArgumentsBuilder()
            .string(accountId)
            .number(totalUsd)
            .jsonObject(bySlugJson)
            .build(),
        Any::class.java,
    )
    PortfolioStore.removeAccount(accountId)
}

suspend fun WalletCore.ensurePortfolioSnapshotsSeeded(
    accountId: String,
    holdings: List<PortfolioBootstrapHolding>,
    period: MHistoryTimePeriod = MHistoryTimePeriod.YEAR,
) {
    if (accountId.isBlank() || holdings.isEmpty()) return

    val holdingsJson =
        JSONArray().apply {
            for (holding in holdings) {
                put(
                    JSONObject()
                        .put("slug", holding.slug)
                        .put("amount", holding.amount)
                        .put("priceUsd", holding.priceUsd)
                )
            }
        }
    runCatching {
        requiredBridge.callApiAsync<Any>(
            "ensurePortfolioSnapshotsSeeded",
            ArgumentsBuilder()
                .string(accountId)
                .jsonArray(holdingsJson)
                .string(period.value)
                .build(),
            Any::class.java,
        )
    }
    PortfolioStore.removeAccount(accountId)
}

data class PortfolioBootstrapHolding(
    val slug: String,
    val amount: Double,
    val priceUsd: Double,
)

suspend fun WalletCore.fetchPortfolioNetWorthHistory(
    accountId: String,
    wallets: List<String>,
    baseCurrency: MBaseCurrency,
    period: MHistoryTimePeriod,
    cacheOnly: Boolean = false,
    customFromDay: String? = null,
    customToDay: String? = null,
): ApiPortfolioHistoryResponse? =
    fetchPortfolioHistory(
        "fetchPortfolioNetWorthHistory",
        accountId,
        wallets,
        baseCurrency,
        period,
        cacheOnly,
        customFromDay,
        customToDay,
    )

suspend fun WalletCore.fetchPortfolioPnlCumulativeHistory(
    accountId: String,
    wallets: List<String>,
    baseCurrency: MBaseCurrency,
    period: MHistoryTimePeriod,
    cacheOnly: Boolean = false,
    customFromDay: String? = null,
    customToDay: String? = null,
): ApiPortfolioHistoryResponse? =
    fetchPortfolioHistory(
        "fetchPortfolioPnlCumulativeHistory",
        accountId,
        wallets,
        baseCurrency,
        period,
        cacheOnly,
        customFromDay,
        customToDay,
    )

suspend fun WalletCore.fetchPortfolioPnlHistory(
    accountId: String,
    wallets: List<String>,
    baseCurrency: MBaseCurrency,
    period: MHistoryTimePeriod,
    cacheOnly: Boolean = false,
    customFromDay: String? = null,
    customToDay: String? = null,
): ApiPortfolioHistoryResponse? =
    fetchPortfolioHistory(
        "fetchPortfolioPnlHistory",
        accountId,
        wallets,
        baseCurrency,
        period,
        cacheOnly,
        customFromDay,
        customToDay,
    )

private suspend fun WalletCore.fetchPortfolioHistory(
    methodName: String,
    accountId: String,
    wallets: List<String>,
    baseCurrency: MBaseCurrency,
    period: MHistoryTimePeriod,
    cacheOnly: Boolean,
    customFromDay: String? = null,
    customToDay: String? = null,
): ApiPortfolioHistoryResponse? {
    val hasCustomRange = !customFromDay.isNullOrBlank() && !customToDay.isNullOrBlank()
    if (!hasCustomRange) {
        PortfolioStore.get(methodName, accountId, baseCurrency, period)?.let { return it }
    }
    if (cacheOnly) return null

    val nowMs = System.currentTimeMillis()
    val currencyRate = TokenStore.currencyRates?.get(baseCurrency.currencyCode) ?: 1.0
    val fromIso: String
    val toIso: String
    val density: String
    if (hasCustomRange) {
        val customFrom = requireNotNull(customFromDay)
        val customTo = requireNotNull(customToDay)
        val fromDay = minOf(customFrom, customTo)
        val toDay = maxOf(customFrom, customTo)
        fromIso = "${fromDay}T00:00:00.000Z"
        toIso = "${toDay}T23:59:59.000Z"
        density = densityForCustomRange(fromDay, toDay)
    } else {
        fromIso = period.fromIsoString(nowMs)
        toIso = toIsoString(nowMs)
        density = period.toDensity()
    }
    val params =
        JSONObject().apply {
            put("from", fromIso)
            put("to", toIso)
            put("density", density)
            put("accountId", accountId)
            put("currencyRate", currencyRate)
        }
    val response: ApiPortfolioHistoryResponse =
        requiredBridge.callApiAsync(
            methodName,
            ArgumentsBuilder()
                .jsArray(wallets, String::class.java)
                .string(baseCurrency.currencyCode)
                .jsonObject(params)
                .build(),
            ApiPortfolioHistoryResponse::class.java
        )
    if (!hasCustomRange) {
        PortfolioStore.put(methodName, accountId, baseCurrency, period, response)
    }
    return response
}

private fun densityForCustomRange(fromDay: String, toDay: String): String {
    val format = isoDateFormat()
    val fromMs = format.parse("${fromDay}T00:00:00.000Z")?.time ?: return "1d"
    val toMs = format.parse("${toDay}T23:59:59.000Z")?.time ?: return "1d"
    val span = (toMs - fromMs).coerceAtLeast(0L)
    return when {
        span <= DAY_MS -> "5m"
        span <= 7 * DAY_MS -> "1h"
        span <= 30 * DAY_MS -> "4h"
        else -> "1d"
    }
}

private fun MHistoryTimePeriod.toDensity(): String =
    when (this) {
        MHistoryTimePeriod.DAY -> "5m"
        MHistoryTimePeriod.WEEK -> "1h"
        MHistoryTimePeriod.MONTH -> "4h"
        MHistoryTimePeriod.THREE_MONTHS,
        MHistoryTimePeriod.YEAR,
        MHistoryTimePeriod.ALL -> "1d"
    }

private fun MHistoryTimePeriod.durationMs(): Long? =
    when (this) {
        MHistoryTimePeriod.DAY -> DAY_MS
        MHistoryTimePeriod.WEEK -> 7 * DAY_MS
        MHistoryTimePeriod.MONTH -> 30 * DAY_MS
        MHistoryTimePeriod.THREE_MONTHS -> 90 * DAY_MS
        MHistoryTimePeriod.YEAR -> 365 * DAY_MS
        MHistoryTimePeriod.ALL -> null
    }

// `from` is the start of the UTC day of (now − period length); ALL is anchored at 2020-01-01.
private fun MHistoryTimePeriod.fromIsoString(nowMs: Long): String {
    val fromMs = durationMs()?.let { startOfUtcDay(nowMs - it) } ?: PORTFOLIO_ALL_START_EPOCH_MS
    return isoDateFormat().format(Date(fromMs))
}

// `to` is the end of the UTC day of now (23:59:59.000).
private fun toIsoString(nowMs: Long): String = isoDateFormat().format(Date(startOfUtcDay(nowMs) + DAY_MS - 1000L))

// The epoch is aligned to UTC midnight, so flooring by whole days yields start-of-day UTC.
private fun startOfUtcDay(ms: Long): Long = ms - (ms % DAY_MS)

private const val DAY_MS: Long = 24L * 60 * 60 * 1000
private const val PORTFOLIO_ALL_START_EPOCH_MS: Long = 1_577_836_800_000L // 2020-01-01 UTC

private val ISO_DATE_FORMAT: ThreadLocal<SimpleDateFormat> =
    object : ThreadLocal<SimpleDateFormat>() {
        override fun initialValue(): SimpleDateFormat =
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
    }

private fun isoDateFormat(): SimpleDateFormat = requireNotNull(ISO_DATE_FORMAT.get())
