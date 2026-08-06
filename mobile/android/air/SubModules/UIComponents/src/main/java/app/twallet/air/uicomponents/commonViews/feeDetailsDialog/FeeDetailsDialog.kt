package app.twallet.air.uicomponents.commonViews.feeDetailsDialog

import android.content.Context
import app.twallet.air.uicomponents.widgets.dialog.WDialog
import app.twallet.air.walletcore.moshi.explainedFee.IExplainedFee
import app.twallet.air.walletcore.moshi.IApiToken
import app.twallet.air.walletbasecontext.localization.LocaleController

class FeeDetailsDialog {
    companion object {
        fun create(
            context: Context,
            token: IApiToken,
            feeDetails: IExplainedFee,
            onClosePressed: () -> Unit
        ): WDialog {
            return WDialog(
                FeeDetailsContentView(context, token, feeDetails, onClosePressed),
                WDialog.Config(
                    title = LocaleController.getString("Blockchain Fee Details"),
                )
            )
        }
    }
}
