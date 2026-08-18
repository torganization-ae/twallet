package app.twallet.air.walletbasecontext.models

import app.twallet.air.walletbasecontext.localization.LocaleController

enum class MBaseCurrency(val currencyCode: String) {
    USD("USD"),
    EUR("EUR"),
    RUB("RUB"),
    CNY("CNY"),
    BTC("BTC"),
    TON("TON");

    val sign: String
        get() = when (this) {
            USD -> "$"
            EUR -> "€"
            RUB -> "₽"
            CNY -> "¥"
            BTC -> "BTC"
            TON -> "GRAM"
        }

    val decimalsCount: Int
        get() = when (this) {
            BTC -> 6
            else -> 2
        }

    val currencySymbol: String
        get() = when (this) {
            USD -> "USD"
            EUR -> "EUR"
            RUB -> "RUB"
            CNY -> "CNY"
            BTC -> "BTC"
            TON -> "GRAM"
        }

    val currencyName: String
        get() = when (this) {
            USD -> LocaleController.getString("US Dollar")
            EUR -> LocaleController.getString("Euro")
            RUB -> LocaleController.getString("Russian Ruble")
            CNY -> LocaleController.getString("Chinese Yuan")
            BTC -> LocaleController.getString("Bitcoin")
            TON -> LocaleController.getString("Gram")
        }

    /** Used when `/currency-rates` has not arrived yet so the home card is not stuck on a skeleton. */
    val fallbackExchangeRate: Double
        get() = when (this) {
            USD -> 1.0
            EUR -> 1.0 / 1.1
            RUB -> 80.0
            CNY -> 7.2
            BTC -> 1.0 / 100_000.0
            TON -> 1.0 / 3.0
        }

    companion object {
        val forcedToRight = setOf(RUB, BTC, TON).map { it.sign }

        fun parse(value: String) = try {
            valueOf(value)
        } catch (_: Throwable) {
            USD
        }
    }
}
