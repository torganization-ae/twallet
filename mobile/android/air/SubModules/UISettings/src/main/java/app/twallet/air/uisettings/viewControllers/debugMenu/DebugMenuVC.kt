package app.twallet.air.uisettings.viewControllers.debugMenu

import android.content.Context
import android.os.Build
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.constraintlayout.widget.ConstraintLayout
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.commonViews.KeyValueRowView
import app.twallet.air.uicomponents.commonViews.cells.HeaderCell
import app.twallet.air.uicomponents.commonViews.cells.SwitchCell
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.ShakeDetector
import app.twallet.air.uicomponents.widgets.WBaseView
import app.twallet.air.uicomponents.widgets.WScrollView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uisettings.viewControllers.logs.LogsVC
import app.twallet.air.uisettings.viewControllers.permissions.PermissionsVC
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.WalletContextManager
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.helpers.DevicePerformanceClassifier
import app.twallet.air.walletcontext.helpers.LaunchConfig
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import java.lang.ref.WeakReference

class DebugMenuVC(context: Context) : WViewController(context) {
    override val TAG = "DebugMenu"

    override val shouldDisplayBottomBar = true

    // Section 1: Logs
    private val logsTitleLabel = HeaderCell(context).apply {
        configure("Logs", titleColor = WColor.Tint, HeaderCell.TopRounding.FIRST_ITEM)
    }

    private val viewLogsRow = KeyValueRowView(
        context,
        "View Logs on Device",
        "",
        KeyValueRowView.Mode.PRIMARY,
        isLast = false,
    ).apply {
        setOnClickListener {
            navigationController?.tabBarController?.mainNavigationController?.push(LogsVC(context))
                ?: navigationController?.push(LogsVC(context))
        }
    }

    private val shareLogRow = KeyValueRowView(
        context,
        "Share Log File",
        "",
        KeyValueRowView.Mode.PRIMARY,
        isLast = true,
    ).apply {
        setOnClickListener { Logger.shareLogFile(window!!) }
    }

    private val spacer1 = WBaseView(context)

    // Section 2: Testnet
    private val testnetTitleLabel = HeaderCell(context).apply {
        configure("Testnet", titleColor = WColor.Tint, HeaderCell.TopRounding.NORMAL)
    }

    private val addTestnetRow = KeyValueRowView(
        context,
        "Add Testnet Wallet",
        "",
        KeyValueRowView.Mode.PRIMARY,
        isLast = true,
    ).apply {
        setOnClickListener {
            val nav = WNavigationController(
                window!!,
                WNavigationController.PresentationConfig(
                    style = WNavigationController.PresentationStyle.BottomSheet,
                    aboveKeyboard = true
                )
            )
            nav.setRoot(
                WalletContextManager.delegate?.get()
                    ?.getAddAccountVC(MBlockchainNetwork.TESTNET) as WViewController
            )
            window?.present(nav)
        }
    }

    private val spacer2 = WBaseView(context)

    // Section 3: Settings
    private val settingsTitleLabel = HeaderCell(context).apply {
        configure("Settings", titleColor = WColor.Tint, HeaderCell.TopRounding.NORMAL)
    }

    private val permissionsRow = KeyValueRowView(
        context,
        "Permissions",
        "",
        KeyValueRowView.Mode.PRIMARY,
        isLast = false,
    ).apply {
        setOnClickListener {
            navigationController?.tabBarController?.mainNavigationController
                ?.push(PermissionsVC(context))
                ?: navigationController?.push(PermissionsVC(context))
        }
    }

    private val shakeToDebugRow = SwitchCell(
        context,
        "Shake to open Debug Menu",
        WGlobalStorage.getIsShakeToDebugEnabled(),
        isLast = true,
    ) { checked ->
        WGlobalStorage.setIsShakeToDebugEnabled(checked)
        if (checked) ShakeDetector.onAppResume() else ShakeDetector.onAppPause()
    }

    private val spacer3 = WBaseView(context)

    // Section 4: Info
    private val infoTitleLabel = HeaderCell(context).apply {
        configure("Info", titleColor = WColor.Tint, HeaderCell.TopRounding.NORMAL)
    }

    private val appVersionRow = KeyValueRowView(
        context,
        "App Version",
        "${LaunchConfig.getVersionName(context)} (${LaunchConfig.getBuildNumber(context)})",
        KeyValueRowView.Mode.PRIMARY,
        isLast = false,
    )

    private val deviceModelRow = KeyValueRowView(
        context,
        "Device Model",
        Build.MODEL,
        KeyValueRowView.Mode.PRIMARY,
        isLast = false,
    )

    private val androidVersionRow = KeyValueRowView(
        context,
        "Android Version",
        "${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
        KeyValueRowView.Mode.PRIMARY,
        isLast = false,
    )

    private val performanceClassRow = KeyValueRowView(
        context,
        "Performance Class",
        DevicePerformanceClassifier.performanceClass?.name?.take(1) ?: "Unknown",
        KeyValueRowView.Mode.PRIMARY,
        isLast = true,
    )

    private val scrollingContentView: WView by lazy {
        WView(context).apply {
            // Section 1: Logs
            addView(logsTitleLabel, ViewGroup.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            addView(viewLogsRow)
            addView(shareLogRow)
            addView(spacer1, ViewGroup.LayoutParams(MATCH_PARENT, ViewConstants.GAP.dp))
            // Section 2: Testnet
            addView(testnetTitleLabel, ViewGroup.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            addView(addTestnetRow)
            addView(spacer2, ViewGroup.LayoutParams(MATCH_PARENT, ViewConstants.GAP.dp))
            // Section 3: Settings
            addView(settingsTitleLabel, ViewGroup.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            addView(permissionsRow)
            addView(shakeToDebugRow, ConstraintLayout.LayoutParams(MATCH_PARENT, 50.dp))
            addView(spacer3, ViewGroup.LayoutParams(MATCH_PARENT, ViewConstants.GAP.dp))
            // Section 4: Info
            addView(infoTitleLabel, ViewGroup.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            addView(appVersionRow, ConstraintLayout.LayoutParams(MATCH_PARENT, 50.dp))
            addView(deviceModelRow, ConstraintLayout.LayoutParams(MATCH_PARENT, 50.dp))
            addView(androidVersionRow, ConstraintLayout.LayoutParams(MATCH_PARENT, 50.dp))
            addView(performanceClassRow, ConstraintLayout.LayoutParams(MATCH_PARENT, 50.dp))
            setConstraints {
                // Logs
                toTop(logsTitleLabel)
                topToBottom(viewLogsRow, logsTitleLabel)
                toCenterX(viewLogsRow)
                topToBottom(shareLogRow, viewLogsRow)
                toCenterX(shareLogRow)
                topToBottom(spacer1, shareLogRow)
                // Testnet
                topToBottom(testnetTitleLabel, spacer1)
                topToBottom(addTestnetRow, testnetTitleLabel)
                toCenterX(addTestnetRow)
                topToBottom(spacer2, addTestnetRow)
                // Settings
                topToBottom(settingsTitleLabel, spacer2)
                topToBottom(permissionsRow, settingsTitleLabel)
                toCenterX(permissionsRow)
                topToBottom(shakeToDebugRow, permissionsRow)
                toCenterX(shakeToDebugRow)
                topToBottom(spacer3, shakeToDebugRow)
                // Info
                topToBottom(infoTitleLabel, spacer3)
                topToBottom(appVersionRow, infoTitleLabel)
                topToBottom(deviceModelRow, appVersionRow)
                topToBottom(androidVersionRow, deviceModelRow)
                topToBottom(performanceClassRow, androidVersionRow)
                toBottomPx(performanceClassRow, navigationController?.bottomInset ?: 0)
            }
        }
    }

    private val scrollView: WScrollView by lazy {
        WScrollView(WeakReference(this)).apply {
            addView(scrollingContentView, ConstraintLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            onScrollStateChange = {
                updateBlurViews(this)
            }
            setOnScrollChangeListener { _, _, _, _, _ ->
                updateBlurViews(this)
            }
        }
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle("Debug Menu")
        setupNavBar(true)
        if (navigationController?.viewControllers?.size == 1) {
            navigationBar?.addCloseButton()
        }

        view.addView(scrollView, ConstraintLayout.LayoutParams(MATCH_PARENT, 0))
        view.setConstraints {
            topToBottom(scrollView, navigationBar!!)
            toCenterX(scrollView)
            toBottom(scrollView)
        }

        updateTheme()
    }

    override fun updateTheme() {
        super.updateTheme()

        view.setBackgroundColor(WColor.SecondaryBackground.color)
        logsTitleLabel.setBackgroundColor(
            WColor.Background.color,
            ViewConstants.TOOLBAR_RADIUS.dp,
            0f,
        )
        viewLogsRow.setBackgroundColor(WColor.Background.color)
        shareLogRow.setBackgroundColor(WColor.Background.color)
        testnetTitleLabel.setBackgroundColor(
            WColor.Background.color,
            ViewConstants.BLOCK_RADIUS.dp,
            0f,
        )
        addTestnetRow.setBackgroundColor(WColor.Background.color)
        settingsTitleLabel.setBackgroundColor(
            WColor.Background.color,
            ViewConstants.BLOCK_RADIUS.dp,
            0f,
        )
        shakeToDebugRow.setBackgroundColor(WColor.Background.color)
        permissionsRow.setBackgroundColor(WColor.Background.color)
        infoTitleLabel.setBackgroundColor(
            WColor.Background.color,
            ViewConstants.BLOCK_RADIUS.dp,
            0f,
        )
        appVersionRow.setBackgroundColor(WColor.Background.color)
        deviceModelRow.setBackgroundColor(WColor.Background.color)
        androidVersionRow.setBackgroundColor(WColor.Background.color)
        performanceClassRow.setBackgroundColor(WColor.Background.color)
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        scrollingContentView.setPaddingRelative(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding + systemBarStartInset,
            0,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            0
        )
    }
}
