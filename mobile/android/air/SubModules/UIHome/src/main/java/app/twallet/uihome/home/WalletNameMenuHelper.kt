package app.twallet.uihome.home

import android.view.View
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.AccountDialogHelpers
import app.twallet.air.uicomponents.widgets.frameAsPath
import app.twallet.air.uicomponents.widgets.menu.WMenuPopup
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletcore.models.MAccount

object WalletNameMenuHelper {
    fun present(
        viewController: WViewController,
        anchor: View,
        account: MAccount,
        onManageWallets: () -> Unit,
    ) {
        WMenuPopup.present(
            anchor,
            listOf(
                WMenuPopup.Item(
                    icon = app.twallet.uihome.R.drawable.ic_pen,
                    title = LocaleController.getString("Rename"),
                    onTap = {
                        AccountDialogHelpers.presentRename(viewController, account)
                    }),
                WMenuPopup.Item(
                    icon = app.twallet.air.icons.R.drawable.ic_manage_30,
                    title = LocaleController.getString("Manage Wallets"),
                    onTap = {
                        onManageWallets()
                    }),
            ),
            popupWidth = 220.dp,
            yOffset = (-20).dp,
            positioning = WMenuPopup.Positioning.BELOW,
            centerHorizontally = true,
            windowBackgroundStyle = WMenuPopup.BackgroundStyle.Cutout(
                anchor.frameAsPath(
                    roundRadius = 16f.dp,
                    leftOffset = 8f.dp,
                    topOffset = (-16f).dp,
                    rightOffset = 8f.dp,
                    bottomOffset = (-20f).dp
                )
            ),
            backdropStyle = WMenuPopup.BackdropStyle.BlurDimmed,
        )
    }
}
