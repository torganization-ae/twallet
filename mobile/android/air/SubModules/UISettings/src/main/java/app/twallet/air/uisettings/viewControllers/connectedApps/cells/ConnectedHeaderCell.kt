package app.twallet.air.uisettings.viewControllers.connectedApps.cells

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.text.TextUtils
import android.util.TypedValue
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.appcompat.widget.AppCompatImageView
import androidx.appcompat.widget.AppCompatTextView
import app.twallet.air.icons.R
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.drawable.WRippleDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.theme.colorStateList
import app.twallet.air.walletcore.moshi.ApiDapp

class ConnectedHeaderCell(context: Context) :
    WCell(context, LayoutParams(MATCH_PARENT, WRAP_CONTENT)), WThemedView {

    private val ripple = WRippleDrawable.create(0f).apply {
        rippleColor = WColor.BackgroundRipple.color
    }

    private val imageView = AppCompatImageView(context).apply {
        id = generateViewId()
        layoutParams = LayoutParams(24.dp, 24.dp)
        setImageResource(R.drawable.ic_hand_stop_24)
    }

    private val titleLabel = WLabel(context).apply {
        setStyle(adaptiveFontSize(), WFont.Medium)
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        includeFontPadding = false
        ellipsize = TextUtils.TruncateAt.END
        maxLines = 1
        useCustomEmoji = true
        text =
            LocaleController.getString("Logged in with My Wallet")
    }

    private val subtitleLabel = AppCompatTextView(context).apply {
        id = generateViewId()
        setTextSize(TypedValue.COMPLEX_UNIT_SP, adaptiveFontSize())
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        includeFontPadding = false
        ellipsize = TextUtils.TruncateAt.END
        typeface = WFont.Medium.typeface
        maxLines = 1
        text =
            LocaleController.getString("Disconnect All Apps")
    }

    val disconnectContainer = WView(context).apply {
        id = generateViewId()
        layoutParams = LayoutParams(0, WRAP_CONTENT)
        background = ripple
        setPadding(0, 0, 0, 1.dp)

        addView(imageView)
        addView(subtitleLabel, LayoutParams(0, WRAP_CONTENT))
        setConstraints {
            toCenterY(imageView, 16f)
            toStart(imageView, 20f)
            toCenterY(subtitleLabel, 16f)
            startToEnd(subtitleLabel, imageView, 24f)
            toEnd(subtitleLabel, 24f)
        }
    }

    init {
        addView(titleLabel, LayoutParams(0, WRAP_CONTENT))
        addView(disconnectContainer)
        setConstraints {
            toCenterX(titleLabel, 20f)
            toTop(titleLabel, 18f)
            toCenterX(disconnectContainer)
            topToBottom(disconnectContainer, titleLabel, 12f)
        }

        updateTheme()
    }

    override fun updateTheme() {
        ripple.rippleColor = WColor.BackgroundRipple.color
        setBackgroundColor(WColor.Background.color, ViewConstants.TOOLBAR_RADIUS.dp, 0f)
        titleLabel.setTextColor(WColor.Tint.color)
        subtitleLabel.setTextColor(WColor.Red.color)
        imageView.imageTintList = WColor.Red.colorStateList
    }

    fun configure(exploreSite: ApiDapp) {
        titleLabel.text = exploreSite.name
    }
}
