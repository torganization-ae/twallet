package app.twallet.air.airasframework

import android.animation.ValueAnimator
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.view.ViewGroup
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.imagepipeline.core.ImagePipelineConfig
import com.facebook.imagepipeline.decoder.ImageDecoderConfig
import app.twallet.air.uicomponents.helpers.FontManager
import app.twallet.air.uicomponents.image.svg.SvgDecoder
import app.twallet.air.uicomponents.image.svg.SvgImageFormat
import app.twallet.air.uicomponents.helpers.palette.ImagePaletteHelpers
import app.twallet.air.walletbasecontext.WBaseStorage
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletbasecontext.theme.ThemeManager
import app.twallet.air.walletbasecontext.theme.ThemeManager.setNftAccentColor
import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import app.twallet.air.walletcontext.cacheStorage.WCacheStorage
import app.twallet.air.walletcontext.sqlStorage.WSQLStorage
import app.twallet.air.walletcontext.globalStorage.IGlobalStorageProvider
import app.twallet.air.walletcontext.helpers.LaunchConfig
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.helpers.DevicePerformanceClassifier
import app.twallet.air.walletcontext.secureStorage.WSecureStorage
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.ActivityStore
import app.twallet.air.walletcore.stores.BalanceStore
import app.twallet.air.walletcore.stores.NftStore
import app.twallet.air.walletcore.stores.TokenStore
import java.util.Date

class AirAsFrameworkApplication {

    companion object {
        fun onCreate(
            applicationContext: Context,
            globalStorageProvider: IGlobalStorageProvider,
            bridgeHostView: ViewGroup
        ) {
            Logger.initialize(applicationContext)

            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "**** APP START **** ${Date()} " +
                    "version=${LaunchConfig.getVersionName(applicationContext)} " +
                    "build=${LaunchConfig.getBuildNumber(applicationContext)} " +
                    "device=${Build.MODEL} " +
                    "Android=${Build.VERSION.RELEASE}"
            )

            Logger.i(Logger.LogTag.AIR_APPLICATION, "onCreate: Initializing basic required objects")
            val start = System.currentTimeMillis()

            var t = System.currentTimeMillis()
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "ApplicationContextHolder.update: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            WSecureStorage.init(applicationContext)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "WSecureStorage.init: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            WCacheStorage.init(applicationContext)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "WCacheStorage.init: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            WSQLStorage.init(applicationContext)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "WSQLStorage.init: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            WGlobalStorage.init(globalStorageProvider)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "WGlobalStorage.init: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            WBaseStorage.init(applicationContext)
            WBaseStorage.setActiveLanguage(WGlobalStorage.getLangCode())
            WBaseStorage.setBaseCurrency(WGlobalStorage.getBaseCurrency())
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "WBaseStorage.init: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            FontManager.init(applicationContext)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "FontManager.init: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            initTheme(applicationContext)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "initTheme: ${System.currentTimeMillis() - t}ms"
            )

            val langCode = WGlobalStorage.getLangCode()
            LocaleController.init(applicationContext, langCode)

            t = System.currentTimeMillis()
            val imageDecoderConfig = ImageDecoderConfig.newBuilder()
                .addDecodingCapability(
                    SvgImageFormat.SVG,
                    SvgImageFormat.formatChecker,
                    SvgDecoder()
                )
                .build()
            Fresco.initialize(
                applicationContext,
                ImagePipelineConfig.newBuilder(applicationContext)
                    .setImageDecoderConfig(imageDecoderConfig)
                    .build()
            )
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "Fresco.initialize: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            ActivityStore.loadFromCache()
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "ActivityStore.loadFromCache: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            BalanceStore.loadFromCache()
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "BalanceStore.loadFromCache: ${System.currentTimeMillis() - t}ms"
            )

            t = System.currentTimeMillis()
            TokenStore.loadFromCache()
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "TokenStore.loadFromCache: ${System.currentTimeMillis() - t}ms"
            )

            NftStore.init(paletteExtractor = { nft, onResult ->
                ImagePaletteHelpers.extractPaletteFromNft(nft, onResult)
            })

            t = System.currentTimeMillis()
            ValueAnimator.setFrameDelay(8)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "ValueAnimator.setFrameDelay: ${System.currentTimeMillis() - t}ms"
            )

            /*t = System.currentTimeMillis()
            LauncherIconController.tryFixLauncherIconIfNeeded(applicationContext)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "LauncherIconController.tryFixLauncherIconIfNeeded: ${System.currentTimeMillis() - t}ms"
            )*/

            t = System.currentTimeMillis()
            DevicePerformanceClassifier.init(applicationContext)
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "DevicePerformanceClassifier.init: class=${DevicePerformanceClassifier.performanceClass?.code} time=${System.currentTimeMillis() - t}ms"
            )

            val end = System.currentTimeMillis()
            Logger.i(
                Logger.LogTag.AIR_APPLICATION,
                "onCreate: Total initialization time=${end - start}ms"
            )

            Logger.i(Logger.LogTag.AIR_APPLICATION, "onCreate: Setting up bridge")
            WalletCore.setupBridge(applicationContext, bridgeHostView, forcedRecreation = true) {
                Logger.i(Logger.LogTag.AIR_APPLICATION, "onCreate: Bridge ready")
            }
        }

        fun initTheme(applicationContext: Context) {
            val selectedTheme = WGlobalStorage.getActiveTheme()
            val roundedToolbarsActive = WGlobalStorage.getAreRoundedToolbarsActive()
            val sideGuttersActive = WGlobalStorage.getAreSideGuttersActive()
            val roundedCornersActive = WGlobalStorage.getAreRoundedCornersActive()
            when (selectedTheme) {
                ThemeManager.THEME_LIGHT -> {
                    ThemeManager.init(
                        theme = ThemeManager.THEME_LIGHT,
                        roundedToolbarsActive = roundedToolbarsActive,
                        sideGuttersActive = sideGuttersActive,
                        roundedCornersActive = roundedCornersActive
                    )
                }

                ThemeManager.THEME_DARK -> {
                    ThemeManager.init(
                        theme = ThemeManager.THEME_DARK,
                        roundedToolbarsActive = roundedToolbarsActive,
                        sideGuttersActive = sideGuttersActive,
                        roundedCornersActive = roundedCornersActive
                    )
                }

                ThemeManager.THEME_SYSTEM -> {
                    val nightModeFlags =
                        applicationContext.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
                    when (nightModeFlags) {
                        Configuration.UI_MODE_NIGHT_YES -> ThemeManager.init(
                            theme = ThemeManager.THEME_DARK,
                            roundedToolbarsActive = roundedToolbarsActive,
                            sideGuttersActive = sideGuttersActive,
                            roundedCornersActive = roundedCornersActive
                        )

                        Configuration.UI_MODE_NIGHT_NO -> ThemeManager.init(
                            theme = ThemeManager.THEME_LIGHT,
                            roundedToolbarsActive = roundedToolbarsActive,
                            sideGuttersActive = sideGuttersActive,
                            roundedCornersActive = roundedCornersActive
                        )

                        Configuration.UI_MODE_NIGHT_UNDEFINED -> ThemeManager.init(
                            theme = ThemeManager.THEME_LIGHT,
                            roundedToolbarsActive = roundedToolbarsActive,
                            sideGuttersActive = sideGuttersActive,
                            roundedCornersActive = roundedCornersActive
                        )
                    }
                }
            }
            val accountId = WalletCore.nextAccountId ?: AccountStore.activeAccountId
            ?: WGlobalStorage.getActiveAccountId()
            updateAccentColor(accountId)
        }

        fun updateAccentColor(accountId: String?) {
            accountId?.let {
                WGlobalStorage.getNftAccentColorIndex(accountId)?.let {
                    setNftAccentColor(it)
                    return
                }
            }
        }
    }
}
