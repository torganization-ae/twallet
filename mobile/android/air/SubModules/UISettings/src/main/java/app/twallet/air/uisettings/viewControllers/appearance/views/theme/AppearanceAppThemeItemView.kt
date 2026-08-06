package app.twallet.air.uisettings.viewControllers.appearance.views.theme

import android.annotation.SuppressLint
import android.content.Context
import android.widget.ImageView
import androidx.core.view.setPadding
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WImageView
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uisettings.R
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletbasecontext.theme.ThemeManager
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.WalletContextManager
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage

@SuppressLint("ViewConstructor")
class AppearanceAppThemeItemView(
    context: Context,
    val identifier: String
) : WView(context), WThemedView {

    var isActive: Boolean = false

    private val imageView: WImageView by lazy {
        val imageView = WImageView(context)
        val image = when (identifier) {
            ThemeManager.THEME_SYSTEM -> {
                R.drawable.img_theme_system
            }

            ThemeManager.THEME_LIGHT -> {
                R.drawable.img_theme_light
            }

            ThemeManager.THEME_DARK -> {
                R.drawable.img_theme_dark
            }

            else -> {
                throw Error()
            }
        }
        imageView.setImageDrawable(context.getDrawableCompat(image))
        imageView.scaleType = ImageView.ScaleType.FIT_XY
        imageView
    }

    private val nameLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(14f, WFont.Medium)
        lbl.text = when (identifier) {
            ThemeManager.THEME_SYSTEM -> {
                LocaleController.getString("System")
            }

            ThemeManager.THEME_LIGHT -> {
                LocaleController.getString("Light")
            }

            ThemeManager.THEME_DARK -> {
                LocaleController.getString("Dark")
            }

            else -> {
                ""
            }
        }
        lbl
    }

    override fun setupViews() {
        super.setupViews()

        addView(imageView, LayoutParams(72.dp, 124.dp))
        addView(nameLabel)
        setConstraints {
            toTop(imageView)
            toCenterX(imageView)
            topToBottom(nameLabel, imageView, 12f)
            toCenterX(nameLabel)
            toBottom(nameLabel)
        }

        setOnClickListener {
            Logger.d(Logger.LogTag.SETTINGS, "themeChanged: theme=$identifier")
            WGlobalStorage.setActiveTheme(identifier)
            WalletContextManager.delegate?.get()?.themeChanged()
        }

        updateTheme()
    }

    override val isTinted = true
    override fun updateTheme() {
        val borderPadding = if (isActive) 3 else 1
        imageView.setBackgroundColor(
            (if (isActive) WColor.Tint else WColor.SecondaryBackground).color,
            13f.dp
        )
        imageView.setPadding(borderPadding)
        nameLabel.setTextColor((if (isActive) WColor.Tint else WColor.SecondaryText).color)
    }

}
