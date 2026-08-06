package app.twallet.air.uisettings.viewControllers.notificationSettings.cells

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.text.SpannableStringBuilder
import android.text.TextUtils
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.appcompat.widget.AppCompatImageView
import androidx.constraintlayout.widget.ConstraintSet
import androidx.core.view.isGone
import app.twallet.air.uicomponents.commonViews.WalletTypeView
import app.twallet.air.uicomponents.drawable.CheckboxDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.unspecified
import app.twallet.air.uicomponents.extensions.styleDots
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setAlpha
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.formatStartEndAddress
import app.twallet.air.walletcontext.utils.colorWithAlpha
import app.twallet.air.walletcore.models.MAccount

class NotificationSettingsAccountCell(
    context: Context,
) : WCell(context, LayoutParams(MATCH_PARENT, WRAP_CONTENT)), WThemedView {

    private var account: MAccount? = null
    private var isChecked: Boolean = false
    private var isLast: Boolean = false

    var onTap: ((item: MAccount, isChecked: Boolean) -> Unit)? = null

    private val checkboxDrawable = CheckboxDrawable {
        invalidate()
    }

    private val imageView = AppCompatImageView(context).apply {
        id = generateViewId()
        setImageDrawable(checkboxDrawable)
    }

    private val titleLabel: WLabel by lazy {
        WLabel(context).apply {
            setStyle(adaptiveFontSize(), WFont.Medium)
            setSingleLine()
            ellipsize = TextUtils.TruncateAt.END
            useCustomEmoji = true
        }
    }

    private val subtitleLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(14f)
        lbl
    }

    private val badgeLabel: WalletTypeView by lazy {
        WalletTypeView(context)
    }

    init {
        layoutParams.apply {
            height = 60.dp
        }
        addView(imageView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        addView(
            titleLabel,
            LayoutParams(WRAP_CONTENT, WRAP_CONTENT)
        )
        addView(
            badgeLabel,
            LayoutParams(WRAP_CONTENT, WRAP_CONTENT)
        )
        addView(subtitleLabel)
        setConstraints {
            toStart(imageView, 25f)
            toCenterY(imageView)

            // Title
            toTop(titleLabel, 4f)
            toStart(titleLabel, 68f)
            setHorizontalBias(titleLabel.id, 0f)
            constrainedWidth(titleLabel.id, true)

            // Badge
            centerYToCenterY(badgeLabel, titleLabel)
            startToEnd(badgeLabel, titleLabel, 4f)
            toEnd(badgeLabel, 20f)
            setHorizontalBias(badgeLabel.id, 0f)

            // Subtitle
            topToBottom(subtitleLabel, titleLabel)
            startToStart(subtitleLabel, titleLabel)
            toEnd(subtitleLabel, 20f)
            setHorizontalBias(subtitleLabel.id, 0f)
            constrainedWidth(subtitleLabel.id, true)

            createVerticalChain(
                ConstraintSet.PARENT_ID, ConstraintSet.TOP,
                ConstraintSet.PARENT_ID, ConstraintSet.BOTTOM,
                intArrayOf(titleLabel.id, subtitleLabel.id),
                null,
                ConstraintSet.CHAIN_PACKED
            )
        }

        setOnClickListener {
            isChecked = !isChecked
            checkboxDrawable.setChecked(isChecked, animated = true)
            account?.let {
                onTap?.invoke(it, isChecked)
            }
        }

        updateTheme()
    }

    fun configure(
        account: MAccount,
        isChecked: Boolean,
        isLocked: Boolean,
        isLast: Boolean,
        animated: Boolean
    ) {
        val alpha = if (isLocked) 0.4f else 1f
        imageView.setAlpha(alpha, animated)
        titleLabel.setAlpha(alpha, animated)
        subtitleLabel.setAlpha(alpha, animated)
        badgeLabel.setAlpha(alpha, animated)
        isEnabled = !isLocked

        this.account = account
        this.isChecked = isChecked
        this.isLast = isLast

        checkboxDrawable.setChecked(isChecked, animated = animated)
        titleLabel.text = account.name
        badgeLabel.configure(account)
        subtitleLabel.text = SpannableStringBuilder(
            account.tonAddress?.formatStartEndAddress()
        ).apply {
            styleDots()
        }
        subtitleLabel.isGone = subtitleLabel.text.isNullOrEmpty()

        setConstraints {
            val badgeWidth =
                if (badgeLabel.isGone)
                    0
                else {
                    badgeLabel.measure(0.unspecified, 0.unspecified)
                    badgeLabel.measuredWidth
                }
            toEndPx(titleLabel, 24.dp + badgeWidth)
        }

        updateTheme()
    }

    override fun updateTheme() {
        setBackgroundColor(
            WColor.Background.color,
            0f,
            if (isLast) ViewConstants.BLOCK_RADIUS.dp else 0f
        )
        addRippleEffect(WColor.SecondaryBackground.color)
        titleLabel.setTextColor(WColor.PrimaryText.color)
        subtitleLabel.setTextColor(WColor.SecondaryText.color)
        badgeLabel.setColor(
            WColor.SecondaryText.color.colorWithAlpha(41),
            WColor.SecondaryText.color
        )
        checkboxDrawable.checkedColor = WColor.Tint.color
        checkboxDrawable.uncheckedColor = WColor.SecondaryText.color
    }

}
