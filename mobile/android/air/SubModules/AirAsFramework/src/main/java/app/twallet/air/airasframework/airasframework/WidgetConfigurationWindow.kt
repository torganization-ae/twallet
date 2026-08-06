package app.twallet.air.airasframework

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uiwidgets.configurations.WidgetsConfigurations
import app.twallet.air.uiwidgets.configurations.actionsWidget.ActionsWidgetConfigurationVC
import app.twallet.air.uiwidgets.configurations.priceWidget.PriceWidgetConfigurationVC
import app.twallet.air.walletbasecontext.WBaseStorage
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.helpers.AutoLockHelper
import app.twallet.air.walletcore.WalletCore

class WidgetConfigurationWindow : WWindow() {
    private var isBridgeUser = false
    override fun getKeyNavigationController(): WNavigationController {
        val navigationController = WNavigationController(this)
        val appWidgetManager = AppWidgetManager.getInstance(this)
        val appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        )
        val appWidgetInfo = appWidgetManager.getAppWidgetInfo(appWidgetId)
        val onResult = { ok: Boolean ->
            val result = Intent()
            result.putExtra("ok", ok)
            setResult(RESULT_OK, result)
            finish()
        }
        val configurationVC = when (appWidgetInfo?.provider?.className) {
            "app.twallet.air.widgets.actionsWidget.ActionsWidget" -> {
                ActionsWidgetConfigurationVC(this, appWidgetId, onResult)
            }

            "app.twallet.air.widgets.priceWidget.PriceWidget" -> {
                PriceWidgetConfigurationVC(this, appWidgetId, onResult)
            }

            else -> {
                setResult(RESULT_CANCELED)
                finish()
                return navigationController
            }
        }
        navigationController.setRoot(configurationVC)
        return navigationController
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        Logger.d(Logger.LogTag.AIR_APPLICATION, "onCreate: WidgetConfigurationWindow created")
        super.onCreate(savedInstanceState)

        if (!WGlobalStorage.isInitialized) {
            finish()
            return
        }

        // Update base storage data
        WBaseStorage.setActiveLanguage(WGlobalStorage.getLangCode())
        WBaseStorage.setBaseCurrency(WGlobalStorage.getBaseCurrency())
        WidgetsConfigurations.reloadWidgets(applicationContext)

        AirAsFrameworkApplication.initTheme(applicationContext)

        isBridgeUser = true
        WalletCore.incBridgeUsers()
        restartBridge(forcedRecreation = false)
    }

    fun restartBridge(forcedRecreation: Boolean) {
        WalletCore.setupBridge(
            applicationContext,
            windowView,
            forcedRecreation = forcedRecreation,
            isOnAirApp = false
        ) {
            setAppFocusedState()
        }
    }

    fun destroyBridge() {
        WalletCore.decBridgeUsers()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)

        AirAsFrameworkApplication.initTheme(applicationContext)
        updateTheme()
    }

    override fun onResume() {
        super.onResume()
        AutoLockHelper.appResumed()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isBridgeUser) {
            isBridgeUser = false
            destroyBridge()
        }
    }
}
