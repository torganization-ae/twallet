package app.twallet.air.uicomponents.widgets.menu

import android.annotation.SuppressLint
import android.content.Context
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.appcompat.widget.AppCompatImageView
import app.twallet.air.icons.R
import app.twallet.air.uicomponents.drawable.WRippleDrawable
import app.twallet.air.uicomponents.extensions.atMost
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.unspecified
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import app.twallet.air.uicomponents.widgets.WFrameLayout
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import kotlin.math.roundToInt

@SuppressLint("ViewConstructor")
class WMenuPopupViewItem(
    context: Context,
    val item: WMenuPopup.Item
) : WFrameLayout(context),
    WThemedView {
    private val ripple = WRippleDrawable.create(0f)

    init {
        background = ripple
    }

    private val hasSubtitle = !item.getSubTitle().isNullOrEmpty()

    private val label =
        WLabel(context).apply {
            setStyle(adaptiveFontSize(), if (hasSubtitle) WFont.Medium else WFont.Regular)
            setSingleLine()
            ellipsize = TextUtils.TruncateAt.END
            text = item.getTitle()
        }

    private val subtitleLabel =
        WLabel(context).apply {
            setStyle(12f)
            text = item.getSubTitle()
            applyFontOffsetFix = true
        }

    private val iconView = if (item.getIcon() != null) AppCompatImageView(context) else null
    private val separatorView = if (item.hasSeparator) View(context) else null
    private val arrowView = if (item.getSubItems() != null) AppCompatImageView(context) else null
    private val arrowReserve = if (arrowView != null) 30.dp + 8.dp else 16.dp

    private val textMargin: Int
        get() {
            return if (
                item.getIcon() != null ||
                item.getIsSubItem() ||
                item.config is WMenuPopup.Item.Config.SelectableItem
            ) {
                item.getTextMargin() ?: 58.dp
            } else {
                16.dp
            }
        }

    init {
        addView(
            label,
            LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply {
                if (hasSubtitle) {
                    gravity = if (LocaleController.isRTL) Gravity.RIGHT else Gravity.LEFT
                    topMargin = 9.dp
                } else {
                    gravity =
                        Gravity.CENTER_VERTICAL or
                        (if (LocaleController.isRTL) Gravity.RIGHT else Gravity.LEFT)
                    bottomMargin = if (item.hasSeparator) 3.5f.dp.roundToInt() else 0
                }
                if (LocaleController.isRTL) {
                    rightMargin = textMargin
                    if (arrowView != null) leftMargin = arrowReserve
                } else {
                    leftMargin = textMargin
                    if (arrowView != null) rightMargin = arrowReserve
                }
            }
        )
        addView(
            subtitleLabel,
            LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply {
                gravity = Gravity.BOTTOM or
                    if (LocaleController.isRTL) Gravity.RIGHT else Gravity.LEFT
                bottomMargin = if (item.hasSeparator) 15.dp else 8.dp
                if (LocaleController.isRTL) {
                    rightMargin = textMargin
                } else {
                    leftMargin = textMargin
                }
            }
        )
        item.getIcon()?.let {
            val iconSize = item.getIconSize() ?: if (hasSubtitle) 36.dp else 30.dp
            addView(
                iconView,
                LayoutParams(iconSize, iconSize).apply {
                    val startMargin =
                        item.getIconMargin() ?: if (hasSubtitle) {
                            10.dp
                        } else {
                            (16.dp - ((item.getIconSize() ?: 30.dp) - 30.dp) / 3f).roundToInt()
                        }
                    if (LocaleController.isRTL) {
                        rightMargin = startMargin
                    } else {
                        leftMargin = startMargin
                    }
                    gravity = Gravity.CENTER_VERTICAL or
                        (if (LocaleController.isRTL) Gravity.RIGHT else Gravity.LEFT)
                    bottomMargin = if (item.hasSeparator) 3.5f.dp.roundToInt() else 0
                }
            )
        }
        if (item.hasSeparator) {
            // Hairline (1dp), not a thick filled section bar.
            addView(
                separatorView,
                LayoutParams(LayoutParams.MATCH_PARENT, 1.dp).apply {
                    gravity = Gravity.BOTTOM
                    marginStart = 16.dp
                    marginEnd = 16.dp
                    bottomMargin = 3.5f.dp.roundToInt()
                }
            )
        }
        if (!item.getSubItems().isNullOrEmpty()) {
            addView(
                arrowView,
                LayoutParams(30.dp, 30.dp).apply {
                    gravity = Gravity.CENTER_VERTICAL or
                        if (LocaleController.isRTL) Gravity.LEFT else Gravity.RIGHT
                    if (LocaleController.isRTL) {
                        leftMargin = 8.dp
                    } else {
                        rightMargin = 8.dp
                    }
                    bottomMargin = if (item.hasSeparator) 3.5f.dp.roundToInt() else 0
                }
            )
        }
        if (item.config is WMenuPopup.Item.Config.Item) {
            item.config.trailingView?.let {
                addView(
                    it,
                    LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply {
                        gravity = Gravity.CENTER_VERTICAL or
                            if (LocaleController.isRTL) Gravity.LEFT else Gravity.RIGHT
                        if (LocaleController.isRTL) {
                            leftMargin = 12.dp
                        } else {
                            rightMargin = 12.dp
                        }
                        bottomMargin = if (item.hasSeparator) 3.5f.dp.roundToInt() else 0
                    }
                )
            }
        }
        updateTheme()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        label.maxWidth = w - textMargin - arrowReserve
        label.measure((w - textMargin - arrowReserve).atMost, 0.unspecified)
    }

    override fun updateTheme() {
        ripple.rippleColor = WColor.TrinaryBackground.color
        val icon = item.getIcon()
        if (icon != null) {
            val drawable =
                context.getDrawableCompat(icon)?.apply {
                    item.getIconTint()?.let {
                        setTint(it)
                    }
                }
            iconView?.setImageDrawable(drawable)
        }
        label.setTextColor(item.getTitleColor() ?: WColor.PrimaryText.color)
        subtitleLabel.setTextColor(WColor.SecondaryText.color)
        if (item.hasSeparator) {
            separatorView?.setBackgroundColor(WColor.PopupSeparator.color)
        }
        if (!item.getSubItems().isNullOrEmpty()) {
            val drawable =
                context.getDrawableCompat(R.drawable.ic_menu_arrow_right)?.apply {
                    setTint(WColor.PrimaryLightText.color)
                }
            arrowView?.setImageDrawable(drawable)
        }
    }
}
