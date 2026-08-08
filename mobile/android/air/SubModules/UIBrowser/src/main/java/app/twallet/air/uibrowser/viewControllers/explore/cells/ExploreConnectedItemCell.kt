package app.twallet.air.uibrowser.viewControllers.explore.cells

import android.annotation.SuppressLint
import android.content.Context
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uicomponents.drawable.WRippleDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import app.twallet.air.uicomponents.image.Content
import app.twallet.air.uicomponents.image.WCustomImageView
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcore.moshi.ApiDapp

@SuppressLint("ViewConstructor")
class ExploreConnectedItemCell(
    context: Context,
    private val onDAppTap: (site: ApiDapp) -> Unit,
) : WCell(context, LayoutParams(WRAP_CONTENT, 36.dp)),
    WThemedView {
    private val ripple = WRippleDrawable.create(12f.dp)

    init {
        background = ripple
    }

    private val imageView =
        WCustomImageView(context).apply {
            defaultRounding = Content.Rounding.Radius(12f.dp)
        }

    private val titleLabel =
        WLabel(context).apply {
            setStyle(adaptiveFontSize(), WFont.Medium)
            maxLines = 1
        }

    override fun setupViews() {
        super.setupViews()

        layoutParams =
            (layoutParams as MarginLayoutParams).apply {
                marginStart = 12.dp
            }

        addView(imageView, LayoutParams(36.dp, 36.dp))
        addView(titleLabel, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        setConstraints {
            toStart(imageView)
            toCenterY(imageView)
            startToEnd(titleLabel, imageView, 8f)
            toCenterY(titleLabel)
            toEnd(titleLabel, 8f)
        }

        setOnClickListener {
            dApp?.let {
                onDAppTap(it)
            }
        }
    }

    private var dApp: ApiDapp? = null
    fun configure(dApp: ApiDapp) {
        this.dApp = dApp
        dApp.iconUrl?.let { iconUrl ->
            imageView.set(Content.ofUrl(iconUrl))
        } ?: run {
            imageView.clear()
        }
        titleLabel.text = dApp.name
        updateTheme()
    }

    override fun updateTheme() {
        ripple.backgroundColor = WColor.Background.color
        ripple.rippleColor = WColor.BackgroundRipple.color
        titleLabel.setTextColor(WColor.PrimaryText.color)
    }
}
