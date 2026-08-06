package app.twallet.air.uitonconnect.viewControllers.send.commonViews

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.text.TextUtils
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.appcompat.widget.AppCompatTextView
import androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.MATCH_CONSTRAINT
import androidx.core.text.buildSpannedString
import androidx.core.text.inSpans
import app.twallet.air.uicomponents.widgets.WLabel
import androidx.core.view.doOnLayout
import app.twallet.air.uicomponents.commonViews.SkeletonView
import app.twallet.air.uicomponents.commonViews.cells.SkeletonContainer
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.spans.WSpacingSpan
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.image.Content
import app.twallet.air.uicomponents.image.WCustomImageView
import app.twallet.air.uicomponents.widgets.WBaseView
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.fadeOut
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.utils.VerticalImageSpan
import app.twallet.air.walletcore.moshi.ApiDapp
import app.twallet.air.walletcore.moshi.ApiDappUrlTrustStatus
import kotlin.math.roundToInt

class ConnectRequestView(context: Context) : WView(context), WThemedView, SkeletonContainer {
    companion object {
        private const val SKELETON_RADIUS = 12f
        private const val IMAGE_SKELETON_RADIUS = 20f
    }

    private val imageView = WCustomImageView(context).apply {
        defaultRounding = Content.Rounding.Radius(20f.dp)
        defaultPlaceholder = Content.Placeholder.Color(WColor.Background)
    }

    private val imageSkeletonView = WBaseView(context).apply {
        visibility = GONE
    }

    private val titleTextView = WLabel(context).apply {
        setStyle(22f, WFont.Medium)
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 28f)
        ellipsize = TextUtils.TruncateAt.END
        gravity = Gravity.CENTER
        maxLines = 1
        useCustomEmoji = true
    }

    private val titleSkeletonView = WBaseView(context).apply {
        visibility = GONE
    }

    private val linkTextView = AppCompatTextView(context).apply {
        id = generateViewId()
        setTextSize(TypedValue.COMPLEX_UNIT_SP, adaptiveFontSize())
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 22f)
        ellipsize = TextUtils.TruncateAt.END
        gravity = Gravity.CENTER
        typeface = WFont.Regular.typeface
        maxLines = 1
    }

    private val linkSkeletonView = WBaseView(context).apply {
        visibility = GONE
    }

    private val infoTextView = AppCompatTextView(context).apply {
        id = generateViewId()
        setTextSize(TypedValue.COMPLEX_UNIT_SP, adaptiveFontSize())
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 20f)
        ellipsize = TextUtils.TruncateAt.END
        gravity = Gravity.CENTER
        typeface = WFont.Regular.typeface
        maxWidth = 300.dp
        letterSpacing = -0.02f
    }

    private val skeletonView = SkeletonView(context)

    override fun setupViews() {
        setPaddingDp(20, 0, 20, 24)

        // Add skeleton views
        addView(imageSkeletonView, LayoutParams(80.dp, 80.dp))
        addView(titleSkeletonView, LayoutParams(180.dp, 28.dp))
        addView(linkSkeletonView, LayoutParams(120.dp, 24.dp))

        addView(imageView, LayoutParams(80.dp, 80.dp))
        addView(titleTextView, LayoutParams(MATCH_CONSTRAINT, WRAP_CONTENT))
        addView(linkTextView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        addView(infoTextView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))

        addView(skeletonView, LayoutParams(MATCH_CONSTRAINT, MATCH_CONSTRAINT))

        setConstraints {
            toCenterX(imageSkeletonView)
            toTop(imageSkeletonView)

            topToBottom(titleSkeletonView, imageSkeletonView, 23f)
            toCenterX(titleSkeletonView)

            topToBottom(linkSkeletonView, titleSkeletonView, 7f)
            toCenterX(linkSkeletonView)

            toCenterX(imageView)
            toTop(imageView)

            topToBottom(titleTextView, imageView, 21f)
            toStart(titleTextView)
            toEnd(titleTextView)

            topToBottom(linkTextView, titleTextView, 9f)
            toCenterX(linkTextView)

            topToBottom(infoTextView, linkTextView, 10f)
            toCenterX(infoTextView)

            allEdges(skeletonView)
        }

        updateTheme()
    }

    var onWarningClick: (() -> Unit)? = null

    fun configure(dApp: ApiDapp?) {
        infoTextView.text =
            LocaleController.getString("Connected apps can only see your wallet address and will not be able to move your assets without permission.")
        dApp?.let {
            if (isShowingSkeleton) {
                hideSkeleton()
            }
            titleTextView.text =
                LocaleController.getFormattedString("Connect to %1$@?", listOf(dApp.name ?: "dApp"))
            linkTextView.text = buildDappAddressLabel(dApp)
            linkTextView.movementMethod = LinkMovementMethod.getInstance()
            dApp.iconUrl?.let { iconUrl ->
                imageView.set(Content.ofUrl(iconUrl))
            } ?: run {
                imageView.clear()
            }
        } ?: run {
            showSkeleton()
        }
    }

    private fun buildDappAddressLabel(dApp: ApiDapp): CharSequence {
        return buildSpannedString {
            append(dApp.host ?: "")

            if (dApp.shouldShowurlTrustStatusWarning()) {
                context.getDrawableCompat(
                    if (dApp.resolvedUrlTrustStatus == ApiDappUrlTrustStatus.DANGEROUS)
                        app.twallet.air.walletcontext.R.drawable.ic_warning_red_14
                    else
                        app.twallet.air.walletcontext.R.drawable.ic_warning_14
                )?.let { drawable ->
                    val size = adaptiveFontSize().dp.roundToInt()
                    drawable.setBounds(0, 0, size, size)

                    inSpans(WSpacingSpan(4.dp)) { append(" ") }
                    inSpans(
                        VerticalImageSpan(
                            drawable,
                            verticalAlignment = VerticalImageSpan.VerticalAlignment.TOP_BOTTOM
                        ),
                        object : ClickableSpan() {
                            override fun onClick(widget: View) {
                                onWarningClick?.invoke()
                            }
                        }
                    ) { append(" ") }
                }
            }
        }
    }

    override fun updateTheme() {
        titleTextView.setTextColor(WColor.PrimaryText.color)
        linkTextView.setTextColor(WColor.Tint.color)
        infoTextView.setTextColor(WColor.PrimaryText.color)

        val skeletonColor = WColor.Background.color
        imageSkeletonView.setBackgroundColor(skeletonColor, IMAGE_SKELETON_RADIUS.dp)
        titleSkeletonView.setBackgroundColor(skeletonColor, SKELETON_RADIUS.dp)
        linkSkeletonView.setBackgroundColor(skeletonColor, SKELETON_RADIUS.dp)
    }

    var isShowingSkeleton = false
        private set

    fun showSkeleton() {
        if (isShowingSkeleton) return
        isShowingSkeleton = true

        imageView.visibility = INVISIBLE
        titleTextView.visibility = INVISIBLE
        linkTextView.visibility = INVISIBLE

        imageSkeletonView.visibility = VISIBLE
        titleSkeletonView.visibility = VISIBLE
        linkSkeletonView.visibility = VISIBLE

        val skeletonViews = listOf(imageSkeletonView, titleSkeletonView, linkSkeletonView)
        val radiusMap = hashMapOf(
            0 to IMAGE_SKELETON_RADIUS,
            1 to SKELETON_RADIUS,
            2 to SKELETON_RADIUS
        )
        skeletonView.doOnLayout {
            if (!isShowingSkeleton) return@doOnLayout
            skeletonView.applyMask(skeletonViews, radiusMap)
            skeletonView.startAnimating()
        }
    }

    private fun hideSkeleton() {
        if (!isShowingSkeleton) return
        isShowingSkeleton = false

        skeletonView.stopAnimating()

        titleSkeletonView.fadeOut(onCompletion = {
            titleSkeletonView.visibility = GONE
        })
        linkSkeletonView.fadeOut(onCompletion = {
            linkSkeletonView.visibility = GONE
        })

        imageView.visibility = VISIBLE
        titleTextView.visibility = VISIBLE
        linkTextView.visibility = VISIBLE
        imageView.alpha = 0f
        imageView.fadeIn()
        titleTextView.alpha = 0f
        titleTextView.fadeIn()
        linkTextView.alpha = 0f
        linkTextView.fadeIn()
    }

    override fun getChildViewMap(): HashMap<View, Float> {
        return hashMapOf(
            imageSkeletonView to IMAGE_SKELETON_RADIUS,
            titleSkeletonView to SKELETON_RADIUS,
            linkSkeletonView to SKELETON_RADIUS
        )
    }
}
