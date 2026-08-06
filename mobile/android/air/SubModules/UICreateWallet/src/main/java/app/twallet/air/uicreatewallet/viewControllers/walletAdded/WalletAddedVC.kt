package app.twallet.air.uicreatewallet.viewControllers.walletAdded

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uicomponents.R
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uicomponents.commonViews.HeaderAndActionsView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.ConfettiView
import app.twallet.air.uicomponents.widgets.WButton
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.toProcessedSpannableStringBuilder
import app.twallet.uihome.tabletTabs.TabletTabsVC
import app.twallet.uihome.tabs.PhoneTabsVC

class WalletAddedVC(
    context: Context,
    isNew: Boolean,
    importedAccountsCount: Int = 1,
) : WViewController(context) {
    override val TAG = "WalletAdded"

    override val shouldDisplayTopBar = false

    val confettiView = ConfettiView(context).apply {
        id = View.generateViewId()
    }

    private val headerView: HeaderAndActionsView by lazy {
        val v = HeaderAndActionsView(
            context,
            HeaderAndActionsView.Media.Animation(
                animation = R.raw.animation_happy,
                repeat = true
            ),
            mediaSize = 160.dp,
            title = LocaleController.getString("All Set!"),
            subtitle = (
                (if (isNew)
                    LocaleController.getString("\$wallet_create_done")
                else
                    LocaleController.getPlural(importedAccountsCount, "\$wallet_import_done")) +
                    "\n\n" +
                    LocaleController.getString("\$wallet_done_description")
                ).toProcessedSpannableStringBuilder(),
            onStarted = {
                animationStarted()
            }
        )
        v.alpha = 0f
        v
    }

    private val openWalletButton = WButton(context, WButton.Type.PRIMARY).apply {
        text = LocaleController.getString("Open Wallet")
        setOnClickListener {
            val navigationController =
                WNavigationController(window!!, WNavigationController.PresentationConfig())
            navigationController.setRoot(
                if (window!!.isWideLayout) TabletTabsVC(context) else PhoneTabsVC(context)
            )
            window!!.replace(navigationController, true)
        }
        alpha = 0f
    }

    override fun setupViews() {
        super.setupViews()

        view.addView(confettiView)
        view.addView(headerView)
        view.addView(openWalletButton, ViewGroup.LayoutParams(0, WRAP_CONTENT))
        view.setConstraints {
            allEdges(confettiView)
            toTopPx(headerView, 80.dp + (navigationController?.getSystemBars()?.top ?: 0))
            toCenterX(headerView)
            constrainMaxWidth(headerView.id, WWindow.WIDE_LAYOUT_INNER_WIDTH_DP.dp)
            toBottomPx(
                openWalletButton,
                32.dp + (navigationController?.getSystemBars()?.bottom ?: 0)
            )
            toCenterX(openWalletButton, 32f)
            constrainMaxWidth(openWalletButton.id, WWindow.WIDE_LAYOUT_INNER_WIDTH_DP.dp)
        }
        view.post {
            confettiView.triggerConfetti()
        }

        updateTheme()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        view.setConstraints {
            toTopPx(headerView, 80.dp + (navigationController?.getSystemBars()?.top ?: 0))
            toBottomPx(
                openWalletButton,
                32.dp + (navigationController?.getSystemBars()?.bottom ?: 0)
            )
        }
    }

    override fun updateTheme() {
        super.updateTheme()

        view.setBackgroundColor(WColor.Background.color)
    }

    private fun animationStarted() {
        headerView.fadeIn()
        openWalletButton.fadeIn()
    }
}
