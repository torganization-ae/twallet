package app.twallet.air.uisettings.viewControllers.settings.cells

import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.view.Gravity
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.core.content.pm.PackageInfoCompat
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.MultiTapDetector
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.R as BaseR
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

@SuppressLint("ViewConstructor")
class SettingsVersionCell(
    private val window: WWindow,
    private val onDebugMenuRequested: () -> Unit
) : WCell(window), WThemedView {

    companion object {
        const val HEIGHT = 40
    }

    private val multiTapDetector = MultiTapDetector(
        requiredTaps = 5,
        timeoutMs = 1000L
    ) {
        presentDebugMenu()
    }

    private val lbl = WLabel(context).apply {
        setStyle(14f)
        gravity = Gravity.CENTER_VERTICAL
        setPadding(8.dp, 0, 8.dp, 0)
        text = try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val versionName = packageInfo.versionName ?: ""
            val versionCode = PackageInfoCompat.getLongVersionCode(packageInfo).toString()
            LocaleController.getFormattedString(
                "${context.getString(BaseR.string.app_locale_name_key)} v%1$@ (%2$@)",
                listOf(versionName, versionCode)
            )
        } catch (e: PackageManager.NameNotFoundException) {
            ""
        }
        setOnClickListener {
            multiTapDetector.registerTap()
        }
        setOnLongClickListener {
            presentDebugMenu()
            return@setOnLongClickListener true
        }
    }

    init {
        super.setupViews()

        layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, HEIGHT.dp)
        addView(lbl, LayoutParams(WRAP_CONTENT, HEIGHT.dp))
        setConstraints {
            allEdges(lbl)
        }

        updateTheme()
    }

    override fun updateTheme() {
        lbl.setTextColor(WColor.SecondaryText.color)
    }

    private fun presentDebugMenu() {
        onDebugMenuRequested()
    }
}
