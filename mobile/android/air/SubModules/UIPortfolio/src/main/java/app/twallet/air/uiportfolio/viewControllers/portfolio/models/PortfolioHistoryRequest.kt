package app.twallet.air.uiportfolio.viewControllers.portfolio.models

import app.twallet.air.walletbasecontext.models.MBaseCurrency
import app.twallet.air.walletbasecontext.utils.MHistoryTimePeriod

data class PortfolioHistoryRequest(
    val accountId: String,
    val wallets: List<String>,
    val baseCurrency: MBaseCurrency,
    val period: MHistoryTimePeriod,
)