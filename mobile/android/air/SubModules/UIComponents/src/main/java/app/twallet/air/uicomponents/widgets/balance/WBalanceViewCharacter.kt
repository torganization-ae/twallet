package app.twallet.air.uicomponents.widgets.balance

import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

data class WBalanceViewCharacter(
    val char: Char,
    val size: Float,
    val overrideColor: Int?,

    val isDecimalPart: Boolean,
    val isBaseCurrency: Boolean,
    val left: Float,
) {
    val isDecimalOrBaseCurrency: Boolean
        get() {
            return isDecimalPart || isBaseCurrency
        }

    val color: Int
        get() {
            return overrideColor
                ?: if (isDecimalOrBaseCurrency) WColor.Decimals.color else WColor.PrimaryText.color
        }
}
