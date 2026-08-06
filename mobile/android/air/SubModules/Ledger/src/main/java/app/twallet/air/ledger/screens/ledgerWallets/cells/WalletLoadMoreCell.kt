package app.twallet.air.ledger.screens.ledgerWallets.cells

import android.content.Context
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.view.Gravity
import android.view.View
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.FrameLayout
import androidx.appcompat.widget.AppCompatImageView
import app.twallet.air.uicomponents.drawable.RoundProgressDrawable
import app.twallet.air.uicomponents.drawable.WRippleDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.fadeOut
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat

class LedgerLoadMoreCell(
    context: Context,
) : WCell(context), WThemedView {

    var onTap: (() -> Unit)? = null

    private val ripple =
        WRippleDrawable.create(0f, 0f, ViewConstants.BLOCK_RADIUS.dp, ViewConstants.BLOCK_RADIUS.dp)

    private val arrowImageView = AppCompatImageView(context).apply {
        id = generateViewId()
    }

    private val progressDrawable = RoundProgressDrawable(16f.dp, 0.5f.dp)
    private val progressView = object : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            progressDrawable.setBounds(6.dp, 6.dp, 22.dp, 22.dp)
            progressDrawable.draw(canvas)
        }

        override fun verifyDrawable(who: Drawable): Boolean {
            if (who == progressDrawable) return isLoading || alpha > 0f
            return super.verifyDrawable(who)
        }
    }.apply {
        id = generateViewId()
        alpha = 0f
        progressDrawable.callback = this
    }

    private val iconContainer = FrameLayout(context).apply {
        id = generateViewId()
        addView(
            arrowImageView,
            FrameLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT, Gravity.CENTER)
        )
        addView(
            progressView,
            FrameLayout.LayoutParams(28.dp, 28.dp, Gravity.CENTER)
        )
    }

    private val loadMoreLabel = WLabel(context).apply {
        setStyle(adaptiveFontSize())
        setTextColor(WColor.Tint)
        text = LocaleController.getString("Load 5 More Wallets")
    }

    private var isLoading: Boolean = false

    init {
        background = ripple
        layoutParams.apply {
            height = 50.dp
        }
        addView(iconContainer, LayoutParams(28.dp, 28.dp))
        addView(loadMoreLabel)
        setConstraints {
            toStart(iconContainer, 21f)
            toCenterY(iconContainer)
            toCenterY(loadMoreLabel)
            toStart(loadMoreLabel, 72f)
        }

        setOnClickListener {
            if (isLoading) return@setOnClickListener
            setLoading(true, animated = true)
            onTap?.invoke()
        }

        updateTheme()
    }

    override fun updateTheme() {
        ripple.backgroundColor = WColor.Background.color
        ripple.rippleColor = WColor.SecondaryBackground.color
        arrowImageView.setImageDrawable(
            context.getDrawableCompat(
                app.twallet.air.icons.R.drawable.ic_arrow_bottom_24
            )!!.apply {
                setTint(WColor.Tint.color)
            }
        )
        progressDrawable.color = WColor.Tint.color
        progressView.invalidate()
    }

    fun configure(isLoading: Boolean = false) {
        updateTheme()
        setLoading(isLoading, animated = false)
    }

    fun setLoading(loading: Boolean, animated: Boolean) {
        if (isLoading == loading) return
        isLoading = loading
        arrowImageView.animate().cancel()
        progressView.animate().cancel()
        if (!animated) {
            arrowImageView.alpha = if (loading) 0f else 1f
            progressView.alpha = if (loading) 1f else 0f
            if (loading) progressView.invalidate()
            return
        }
        if (loading) {
            arrowImageView.fadeOut()
            progressView.fadeIn()
            progressView.invalidate()
        } else {
            arrowImageView.fadeIn()
            progressView.fadeOut()
        }
    }

}
