package app.twallet.air.uiswap.screens.swap.views.dexAggregatorDialog

import android.content.Context
import app.twallet.air.uicomponents.widgets.dialog.WDialog
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletcore.moshi.IApiToken
import app.twallet.air.walletcore.moshi.MApiSwapDexLabel
import app.twallet.air.walletcore.moshi.MApiSwapEstimateVariant

class DexAggregatorDialog {
    companion object {
        fun create(
            context: Context,
            fromToken: IApiToken,
            toToken: IApiToken,
            variants: List<MApiSwapEstimateVariant>,
            bestDex: MApiSwapDexLabel,
            selectedDex: MApiSwapDexLabel,
            onSelect: (MApiSwapDexLabel) -> Unit
        ): WDialog {
            return WDialog(
                DexAggregatorContentView(
                    context,
                    fromToken,
                    toToken,
                    variants,
                    bestDex,
                    selectedDex,
                    onSelect
                ),
                WDialog.Config(
                    title = LocaleController.getString("Built-in DEX Aggregator"),
                )
            )
        }
    }
}
