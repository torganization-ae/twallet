package app.twallet.air.uiportfolio.viewControllers.portfolio.models

import app.twallet.air.walletbasecontext.models.MBaseCurrency
import app.twallet.air.walletbasecontext.utils.MHistoryTimePeriod

data class PortfolioHistoryRequest(
    val accountId: String,
    val wallets: List<String>,
    val baseCurrency: MBaseCurrency,
    val period: MHistoryTimePeriod,
    /** Inclusive UTC calendar days (`yyyy-MM-dd`); when set, overrides `period` window. */
    val customFromDay: String? = null,
    val customToDay: String? = null,
) {
    val hasCustomRange: Boolean
        get() = !customFromDay.isNullOrBlank() && !customToDay.isNullOrBlank()
}