package app.twallet.air.uisettings.viewControllers.networks

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.FrameLayout
import androidx.appcompat.widget.AppCompatImageView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat

enum class NetworkStatus {
    ACTIVE,
    INACTIVE,
    WARNING,
}

@SuppressLint("ViewConstructor")
class NetworkCell(
    context: Context
) : WCell(context, LayoutParams(MATCH_PARENT, 60.dp)),
    WThemedView {
    private val iconImageView: AppCompatImageView by lazy {
        val img = AppCompatImageView(context)
        img.id = generateViewId()
        img
    }

    private val statusDotView: View by lazy {
        View(context).apply {
            id = generateViewId()
        }
    }

    private val iconWrap: FrameLayout by lazy {
        FrameLayout(context).apply {
            id = generateViewId()
            addView(iconImageView, FrameLayout.LayoutParams(40.dp, 40.dp))
            addView(
                statusDotView,
                FrameLayout.LayoutParams(12.dp, 12.dp).apply {
                    gravity = Gravity.BOTTOM or Gravity.END
                }
            )
        }
    }

    private val titleLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(adaptiveFontSize(), WFont.Medium)
        lbl
    }

    private val subtitleLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(13f)
        lbl
    }

    private val moreButton: AppCompatImageView by lazy {
        AppCompatImageView(context).apply {
            id = generateViewId()
            setPadding(8.dp, 8.dp, 8.dp, 8.dp)
            setOnClickListener {
                onMenuClick?.invoke(this)
            }
        }
    }

    override fun setupViews() {
        super.setupViews()

        addView(iconWrap, LayoutParams(40.dp, 40.dp))
        addView(titleLabel)
        addView(subtitleLabel)
        addView(moreButton, LayoutParams(40.dp, 40.dp))
        setConstraints {
            toCenterY(iconWrap)
            toStart(iconWrap, 12f)
            toTop(titleLabel, 7.75f)
            toStart(titleLabel, 64f)
            endToStart(titleLabel, moreButton, 8f)
            toTop(subtitleLabel, 31.75f)
            toStart(subtitleLabel, 64f)
            endToStart(subtitleLabel, moreButton, 8f)
            toCenterY(moreButton)
            toEnd(moreButton, 4f)
        }

        setOnClickListener {
            onClick()
        }
    }

    override fun updateTheme() {
        // The block starts with the header cell, so network cells never round their top
        setBackgroundColor(
            WColor.Background.color,
            0f,
            if (isLast) ViewConstants.BLOCK_RADIUS.dp else 0f
        )
        addRippleEffect(WColor.SecondaryBackground.color)
        titleLabel.setTextColor(WColor.PrimaryText.color)
        subtitleLabel.setTextColor(WColor.SecondaryText.color)
        moreButton.setImageDrawable(
            context.getDrawableCompat(app.twallet.air.icons.R.drawable.ic_more)?.apply {
                setTint(WColor.SecondaryText.color)
            }
        )
        applyStatusDot()
    }

    private var isLast = false
    private var status: NetworkStatus = NetworkStatus.ACTIVE
    private lateinit var onClick: () -> Unit
    private var onMenuClick: ((View) -> Unit)? = null

    fun configure(
        icon: Int?,
        title: String,
        subtitle: String,
        status: NetworkStatus,
        isLast: Boolean,
        onClick: () -> Unit,
        onMenuClick: (View) -> Unit,
    ) {
        this.isLast = isLast
        this.status = status
        updateTheme()
        iconImageView.setImageDrawable(icon?.let { context.getDrawableCompat(it) })
        titleLabel.text = title
        subtitleLabel.text = subtitle
        this.onClick = onClick
        this.onMenuClick = onMenuClick
    }

    private fun applyStatusDot() {
        val color = when (status) {
            NetworkStatus.ACTIVE -> WColor.Green.color
            NetworkStatus.INACTIVE -> WColor.Red.color
            NetworkStatus.WARNING -> WColor.Orange.color
        }
        statusDotView.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color)
            setStroke(2.dp, WColor.Background.color)
        }
    }
}
