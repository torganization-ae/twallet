package app.twallet.air.uicomponents.commonViews.toast

import android.content.Context
import android.graphics.Color
import android.text.TextUtils
import android.view.Gravity
import android.view.ViewGroup
import android.widget.ImageView
import androidx.core.view.isVisible
import app.twallet.air.uicomponents.R
import app.twallet.air.uicomponents.drawable.WRippleDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.PillShadowView
import app.twallet.air.uicomponents.widgets.WBlurryBackgroundView
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage

class ToastView(context: Context) : WView(context), WThemedView {

    companion object {
        const val HEIGHT_DP = 56
        private const val CORNER_RADIUS_DP = HEIGHT_DP / 2f
        private const val ICON_SIZE_DP = 24
        private const val CLOSE_SIZE_DP = 28
    }

    private val iconView = ImageView(context).apply {
        id = generateViewId()
        scaleType = ImageView.ScaleType.CENTER_INSIDE
    }

    private val textLabel = WLabel(context).apply {
        setStyle(16f, WFont.Medium)
        setTextColor(WColor.PrimaryText)
        gravity = Gravity.CENTER_VERTICAL
        maxLines = 2
        ellipsize = TextUtils.TruncateAt.END
        useCustomEmoji = true
    }

    private val actionRipple = WRippleDrawable.create(16f.dp)

    private val actionLabel = WLabel(context).apply {
        setStyle(16f, WFont.Medium)
        setTextColor(WColor.Tint)
        gravity = Gravity.CENTER
        setPaddingDp(8)
        background = actionRipple
    }

    private val closeRipple = WRippleDrawable.create(14f.dp)

    private val closeButton = ImageView(context).apply {
        id = generateViewId()
        scaleType = ImageView.ScaleType.CENTER_INSIDE
        setPaddingDp(4)
        background = closeRipple
        contentDescription = "Close"
        isClickable = true
        isFocusable = true
    }

    private var blurView: WBlurryBackgroundView? = null
    private var blurRootView: ViewGroup? = null
    private var pillShadowView: PillShadowView? = null
    private var actionListener: (() -> Unit)? = null
    private var dismissListener: (() -> Unit)? = null
    private var isBlurPlaying = false

    init {
        isClickable = true
        isFocusable = true
        setOnClickListener {}

        addView(iconView, LayoutParams(ICON_SIZE_DP.dp, ICON_SIZE_DP.dp))
        addView(
            actionLabel,
            LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)
        )
        addView(closeButton, LayoutParams(CLOSE_SIZE_DP.dp, CLOSE_SIZE_DP.dp))
        addView(
            textLabel,
            LayoutParams(LayoutParams.MATCH_CONSTRAINT, LayoutParams.MATCH_CONSTRAINT)
        )

        setConstraints {
            toCenterY(iconView)
            toStart(iconView, 16f)

            toCenterY(closeButton)
            toEnd(closeButton, 10f)

            toCenterY(actionLabel)
            endToStart(actionLabel, closeButton, 2f)

            toCenterY(textLabel)
            startToEnd(textLabel, iconView, 16f)
            endToStart(textLabel, actionLabel)
        }

        actionLabel.setOnClickListener {
            actionListener?.invoke()
        }
        closeButton.setOnClickListener {
            dismissListener?.invoke()
        }

        updateTheme()
    }

    fun configure(
        toast: ToastManager.Toast,
        onAction: (() -> Unit)?,
        onDismiss: (() -> Unit)?,
    ) {
        with(iconView) {
            isVisible = toast.iconResId != null
            setImageDrawable(
                toast.iconResId?.let { context.getDrawableCompat(it)?.mutate() }
            )
        }
        textLabel.text = toast.text
        with(actionLabel) {
            isVisible = toast.actionTitle != null
            text = toast.actionTitle
        }
        actionListener = onAction
        dismissListener = onDismiss
        updateTheme()
    }

    fun attachBlurRoot(blurRootView: ViewGroup?) {
        if (this.blurRootView === blurRootView) {
            return
        }
        this.blurRootView = blurRootView
        updateTheme()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (pillShadowView == null) {
            pillShadowView = PillShadowView.attachTo(this, CORNER_RADIUS_DP.dp)
        }
        syncShadow()
        resumeBlurring()
    }

    override fun onDetachedFromWindow() {
        pauseBlurring()
        super.onDetachedFromWindow()
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        if (changed) {
            syncShadow()
        }
    }

    override fun updateTheme() {
        val isBlurEnabled = WGlobalStorage.isBlurEnabled() && blurRootView != null

        iconView.drawable?.setTint(WColor.PrimaryText.color)
        textLabel.updateTheme()
        actionLabel.updateTheme()
        actionRipple.rippleColor = WColor.TintRipple.color
        closeRipple.rippleColor = WColor.SecondaryText.color
        closeButton.setImageDrawable(
            context.getDrawableCompat(R.drawable.ic_close)?.mutate()?.also {
                it.setTint(WColor.SecondaryText.color)
            }
        )

        setBackgroundColor(
            if (isBlurEnabled) Color.TRANSPARENT else WColor.SearchFieldBackground.color,
            CORNER_RADIUS_DP.dp,
            clipToBounds = true
        )

        syncBlurView()
        blurView?.updateTheme()
    }

    fun pauseBlurring() {
        if (!isBlurPlaying) {
            return
        }
        isBlurPlaying = false
        blurView?.pauseBlurring()
    }

    fun resumeBlurring() {
        if (isBlurPlaying) {
            return
        }
        isBlurPlaying = true
        blurView?.resumeBlurring()
    }

    fun syncShadow() {
        pillShadowView?.sync()
    }

    private fun syncBlurView() {
        val blurRootView = blurRootView
        val isBlurEnabled = WGlobalStorage.isBlurEnabled() && blurRootView != null
        var blurView = this.blurView
        if (isBlurEnabled && blurView == null) {
            blurView = WBlurryBackgroundView(context, fadeSide = null).also {
                it.setupWith(blurRootView)
                it.setOverlayColor(WColor.SearchFieldBackground, 204)
            }
            addView(
                blurView,
                0,
                LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            )
            setConstraints {
                allEdges(blurView)
            }
            if (isBlurPlaying) {
                blurView.resumeBlurring()
            }
            this.blurView = blurView
        } else if (!isBlurEnabled && blurView != null) {
            removeView(blurView)
            this.blurView = null
        }
    }
}
