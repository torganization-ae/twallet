package app.twallet.air.uibrowser.viewControllers.exploreCategory.cells

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.text.TextUtils
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.MATCH_CONSTRAINT
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import app.twallet.air.uicomponents.image.Content
import app.twallet.air.uicomponents.image.WCustomImageView
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.addRippleEffect
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.utils.colorWithAlpha
import app.twallet.air.walletcore.models.MExploreSite

@SuppressLint("ViewConstructor")
class ExploreCategorySiteCell(
    context: Context,
    private val onSiteTap: (site: MExploreSite) -> Unit
) : WCell(context, LayoutParams(MATCH_PARENT, 80.dp)),
    WThemedView {
    private val img =
        WCustomImageView(context).apply {
            defaultRounding = Content.Rounding.Radius(12f.dp)
        }

    private val titleLabel =
        WLabel(context).apply {
            setStyle(15f, WFont.Medium)
            compoundDrawablePadding = 4.dp
            setSingleLine()
            ellipsize = TextUtils.TruncateAt.MARQUEE
            isHorizontalFadingEdgeEnabled = true
        }

    private val subtitleLabel =
        WLabel(context).apply {
            setStyle(12f, WFont.Medium)
            maxLines = 2
        }

    private val contentView =
        WView(context).apply {
            addView(titleLabel, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
            addView(subtitleLabel, LayoutParams(MATCH_CONSTRAINT, WRAP_CONTENT))
            setConstraints {
                toTop(titleLabel)
                toStart(titleLabel)
                toEnd(titleLabel)
                constrainedWidth(titleLabel.id, true)
                setHorizontalBias(titleLabel.id, 0f)
                toStart(subtitleLabel)
                topToBottom(subtitleLabel, titleLabel, 1f)
                toEnd(subtitleLabel)
            }
        }

    private val badgeLabel: WLabel by lazy {
        WLabel(context).apply {
            setStyle(12f, WFont.Medium)
            setPadding(4.dp, 4.dp, 6.dp, 0)
            text = site?.badgeText
        }
    }

    private val openButton =
        WLabel(context).apply {
            setStyle(adaptiveFontSize(), WFont.Medium)
            text = LocaleController.getString("Open")
            gravity = Gravity.CENTER
            setTextColor(WColor.Tint)
            isTinted = true
            setPadding(12.dp, 0, 12.dp, 0)
            setOnClickListener {
                site?.let {
                    onSiteTap(it)
                }
            }
        }

    override fun setupViews() {
        super.setupViews()

        clipChildren = false

        addView(img, LayoutParams(48.dp, 48.dp))
        addView(contentView, LayoutParams(MATCH_CONSTRAINT, WRAP_CONTENT))
        addView(openButton, LayoutParams(WRAP_CONTENT, 32.dp))

        if (site?.badgeText?.isNotBlank() == true) {
            addView(badgeLabel, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        }

        setConstraints {
            toStart(img, 20f)
            toCenterY(img)
            startToEnd(contentView, img, 10f)
            toTop(contentView, -2f)
            toBottom(contentView)
            endToStart(contentView, openButton, 8f)
            if (site?.badgeText?.isNotBlank() == true) {
                toTop(badgeLabel, -4f)
                toEnd(badgeLabel, -4f)
            }
            toCenterY(openButton)
            toEnd(openButton, 20f)
        }

        setOnClickListener {
            site?.let {
                onSiteTap(it)
            }
        }
        updateTheme()
    }

    private var site: MExploreSite? = null
    private var isFirst = false
    private var isLast = false
    fun configure(site: MExploreSite, isFirst: Boolean, isLast: Boolean) {
        this.site = site
        this.isFirst = isFirst
        this.isLast = isLast
        img.set(Content.ofUrl(site.iconUrl ?: ""))
        titleLabel.text = site.name
        titleLabel.isSelected = false
        Handler(Looper.getMainLooper()).postDelayed({
            titleLabel.isSelected = true
        }, 1000)
        subtitleLabel.text = site.description
        updateTheme()
    }

    override val isTinted = true
    override fun updateTheme() {
        setBackgroundColor(
            WColor.Background.color,
            if (isFirst) ViewConstants.TOOLBAR_RADIUS.dp else 0f,
            if (isLast) ViewConstants.BLOCK_RADIUS.dp else 0f
        )
        addRippleEffect(WColor.SecondaryBackground.color)
        titleLabel.setTextColor(WColor.PrimaryText.color)
        subtitleLabel.setTextColor(WColor.SecondaryText.color)
        if (site?.badgeText?.isNotBlank() == true) {
            badgeLabel.setBackgroundColor(WColor.Tint.color, 4f.dp, true)
            badgeLabel.setTextColor(WColor.TextOnTint.color)
            badgeLabel.setPaddingLocalized(
                4.dp,
                if (isFirst) 6.dp else 4.dp,
                if (isFirst) 14.dp else 6.dp,
                0
            )
        }
        openButton.setBackgroundColor(WColor.TrinaryBackground.color, 16f.dp)
        openButton.addRippleEffect(WColor.BackgroundRipple.color, 16f.dp)

        if (site?.isTelegram == true) {
            val telegramIcon =
                context.getDrawableCompat(
                    app.twallet.air.icons.R.drawable.ic_telegram
                )
            telegramIcon?.let { drawable ->
                drawable.setTint(WColor.PrimaryText.color.colorWithAlpha(50))
                drawable.setBounds(0, 0, drawable.intrinsicWidth, drawable.intrinsicHeight)
                titleLabel.setCompoundDrawablesRelativeWithIntrinsicBounds(
                    null, null, drawable, null
                )
            }
        } else {
            titleLabel.setCompoundDrawablesRelativeWithIntrinsicBounds(
                null, null, null, null
            )
        }
    }
}
