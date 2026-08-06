package app.twallet.air.uicreatewallet.viewControllers.intro

import android.annotation.SuppressLint
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.content.Context
import android.graphics.Color
import android.text.Spannable
import android.text.SpannableString
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ClickableSpan
import android.text.style.ImageSpan
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.View.MeasureSpec
import android.view.View.TEXT_ALIGNMENT_CENTER
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.FrameLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.content.res.AppCompatResources
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.appcompat.widget.AppCompatImageView
import androidx.core.view.isGone
import androidx.core.view.isVisible
import androidx.core.view.updateLayoutParams
import app.twallet.air.uicomponents.AnimationConstants
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uicomponents.drawable.CheckboxDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WButton
import app.twallet.air.uicomponents.widgets.WSpeedingDiamondView
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WScrollView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.addRippleEffect
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.fadeOut
import app.twallet.air.uicomponents.widgets.particles.ParticleConfig
import app.twallet.air.uicomponents.widgets.particles.ParticleView
import app.twallet.air.uicomponents.widgets.pulseView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uicomponents.widgets.shakeView
import app.twallet.air.uicreatewallet.viewControllers.addAccountOptions.AddAccountOptionsVC
import app.twallet.air.uicreatewallet.viewControllers.backup.BackupVC
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeConfirmVC
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeViewState
import app.twallet.air.uisettings.viewControllers.appInfo.AppInfoVC
import app.twallet.air.uisettings.viewControllers.userResponsibility.UserResponsibilityVC
import app.twallet.air.walletbasecontext.R as BaseR
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import app.twallet.air.walletbasecontext.utils.requireDrawableCompat
import app.twallet.air.walletbasecontext.utils.toProcessedSpannableStringBuilder
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcontext.utils.VerticalImageSpan
import java.lang.ref.WeakReference
import kotlin.math.max
import kotlin.math.min

@SuppressLint("ViewConstructor")
class IntroVC(
    context: Context,
    private val network: MBlockchainNetwork,
) : WViewController(context), IntroVM.Delegate {
    override val TAG = "Intro"

    private val introVM by lazy {
        IntroVM(this)
    }

    override val shouldDisplayTopBar = false

    private val isGramApp = ApplicationContextHolder.isGramApp

    // Normal particle configuration
    private val particleParams =
        if (isGramApp) ParticleConfig(
            particleCount = 35,
            centerShift = floatArrayOf(0f, -36f),
            distanceLimit = 0.45f,
            colorPair = ParticleConfig.Companion.PARTICLE_COLORS.PURPLE_GRADIENT,
            useStarShape = true
        ) else ParticleConfig(
            particleCount = 35,
            centerShift = floatArrayOf(0f, 32f),
            distanceLimit = 0.45f,
            color = ParticleConfig.Companion.PARTICLE_COLORS.TON
        )

    var particlesCleaner: (() -> Unit)? = null
    val tonParticlesView = ParticleView(context).apply {
        id = View.generateViewId()
        isGone = true
    }

    val diamondAnimationView: WSpeedingDiamondView? = if (isGramApp) {
        WSpeedingDiamondView(view.context).apply {
            id = View.generateViewId()
            bindParticleHost(tonParticlesView, centerShift = floatArrayOf(0f, -36f))
        }
    } else null

    val logoImageView = AppCompatImageView(view.context).apply {
        id = View.generateViewId()
        if (isGramApp) {
            isGone = true
        } else {
            setImageDrawable(
                AppCompatResources.getDrawable(
                    view.context,
                    app.twallet.air.uicomponents.R.drawable.img_logo
                )
            )
            setOnClickListener {
                pulseView(0.98f, AnimationConstants.VERY_VERY_QUICK_ANIMATION)
                tonParticlesView.addParticleSystem(
                    ParticleConfig.particleBurstParams(
                        ParticleConfig.Companion.PARTICLE_COLORS.TON
                    )
                )
            }
        }
    }

    val titleLabel = WLabel(view.context).apply {
        text = LocaleController.getString(context.getString(BaseR.string.app_locale_name_key))
        setStyle(32f, WFont.Balance)
        setTextColor(WColor.PrimaryText)
    }

    val subtitleLabel = WLabel(view.context).apply {
        text = LocaleController.getString("\$auth_intro")
            .replace("\n", " ")
            .toProcessedSpannableStringBuilder()
        gravity = Gravity.CENTER
        setStyle(17f, WFont.Regular)
        setTextColor(WColor.PrimaryText)
    }

    private val checkboxDrawable = CheckboxDrawable {
        termsView.invalidate()
    }
    private var termsAccepted = false

    val moreInfoButton: WLabel by lazy {
        val btn = WLabel(context)
        btn.textAlignment = TEXT_ALIGNMENT_CENTER
        btn.setStyle(adaptiveFontSize())
        btn.setPaddingDp(16, 8, 16, 8)
        btn.setOnClickListener {
            push(AppInfoVC(context))
        }
        btn
    }

    val termsView: WLabel by lazy {
        val btn = WLabel(context)
        btn.textAlignment = TEXT_ALIGNMENT_CENTER
        btn.setStyle(14f)
        btn.setPaddingDp(16, 1, 16, 8)
        btn
    }

    val createNewWalletButton: WButton by lazy {
        val btn = WButton(context, WButton.Type.PRIMARY)
        btn.text = LocaleController.getString("Create New Wallet")
        btn.setOnClickListener {
            view.lockView()
            createNewWalletButton.isLoading = true
            introVM.createWallet()
        }
        btn.isEnabled = termsAccepted
        btn
    }

    val importExistingWalletButton: WButton by lazy {
        val btn = WButton(context, WButton.Type.SECONDARY)
        btn.text = LocaleController.getString("Import Existing Wallet")
        btn.setOnClickListener {
            if (!termsAccepted) {
                termsView.shakeView(AnimationConstants.INSTANT_ANIMATION)
                return@setOnClickListener
            }
            val nav = WNavigationController(
                window!!,
                WNavigationController.PresentationConfig(
                    style = WNavigationController.PresentationStyle.BottomSheet
                )
            )
            nav.setRoot(AddAccountOptionsVC(context, network = network, isOnIntro = true))
            window?.present(nav)
        }
        btn
    }

    private val contentView = WView(context).apply {
        addView(tonParticlesView, FrameLayout.LayoutParams(0, WRAP_CONTENT))
        addView(logoImageView, FrameLayout.LayoutParams(124.dp, 124.dp))
        diamondAnimationView?.let { dv ->
            addView(dv, FrameLayout.LayoutParams(124.dp, 124.dp))
            alpha = 0f
            dv.start(onStart = { fadeIn(AnimationConstants.VERY_VERY_QUICK_ANIMATION) })
        }
        addView(titleLabel)
        addView(subtitleLabel, FrameLayout.LayoutParams(0, WRAP_CONTENT))
        addView(moreInfoButton)
        addView(termsView, FrameLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        addView(createNewWalletButton, FrameLayout.LayoutParams(0, WRAP_CONTENT))
        addView(importExistingWalletButton, FrameLayout.LayoutParams(0, WRAP_CONTENT))
    }

    private val scrollView = ScrollView(context).apply {
        id = View.generateViewId()
        addView(contentView, FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
    }

    private fun applyContentConstraints() {
        val screenHeight =
            (window?.windowView?.height ?: 0) -
                (navigationController?.getSystemBars()?.top ?: 0) -
                (navigationController?.getSystemBars()?.bottom ?: 0)
        val desiredHeight = 657.dp

        val logoTopMargin = if (screenHeight < desiredHeight) 40 else 80
        val titleTopMargin = if (screenHeight < desiredHeight) 20f else 30f
        val subtitleTopMargin = if (screenHeight < desiredHeight) 12f else 18f
        val moreInfoTopMargin = if (screenHeight < desiredHeight) 22f else 43f

        contentView.setConstraints {
            toTopPx(
                tonParticlesView,
                (navigationController?.getSystemBars()?.top
                    ?: 0) + (if (screenHeight < desiredHeight) -23 else 17).dp
            )
            toCenterX(tonParticlesView)
            toTopPx(
                logoImageView,
                (navigationController?.getSystemBars()?.top ?: 0) + logoTopMargin.dp
            )
            toCenterX(logoImageView)
            diamondAnimationView?.let {
                toTopPx(
                    it,
                    (navigationController?.getSystemBars()?.top ?: 0) + logoTopMargin.dp
                )
                toCenterX(it)
                topToBottom(titleLabel, it, titleTopMargin)
            } ?: run {
                topToBottom(titleLabel, logoImageView, titleTopMargin)
            }
            toCenterX(titleLabel, 32f)
            topToBottom(subtitleLabel, titleLabel, subtitleTopMargin)
            toCenterX(subtitleLabel, 20f)
            topToBottom(moreInfoButton, subtitleLabel, moreInfoTopMargin)
            toCenterX(moreInfoButton)

            toBottomPx(
                importExistingWalletButton,
                32.dp + (navigationController?.getSystemBars()?.bottom ?: 0)
            )
            toCenterX(importExistingWalletButton, 32f)
            bottomToTop(createNewWalletButton, importExistingWalletButton, 16f)
            toCenterX(createNewWalletButton, 32f)
            bottomToTop(termsView, createNewWalletButton, 20f)
            toCenterX(termsView, 32f)
        }

        val minRequiredHeight = 580.dp + (navigationController?.getSystemBars()?.top ?: 0) -
            (navigationController?.getSystemBars()?.bottom ?: 0)
        val targetHeight = max(minRequiredHeight, window?.windowView?.height ?: 0)
        contentView.minHeight = targetHeight
    }

    override fun setupViews() {
        super.setupViews()

        setTopBlur(visible = false, animated = false)

        view.addView(
            scrollView,
            ConstraintLayout.LayoutParams(0, 0).apply {
                matchConstraintMaxWidth = WWindow.WIDE_LAYOUT_INNER_WIDTH_DP.dp
            }
        )
        view.setConstraints {
            allEdges(scrollView)
        }

        applyContentConstraints()
        updateTheme()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        scrollView.setPaddingRelative(systemBarStartInset, 0, systemBarEndInset, 0)
        applyContentConstraints()
    }

    override val isTinted = true
    override fun updateTheme() {
        super.updateTheme()
        val backgroundColor = WColor.Background.color
        view.setBackgroundColor(backgroundColor)
        tonParticlesView.setParticleBackgroundColor(backgroundColor)
        moreInfoButton.addRippleEffect(WColor.BackgroundRipple.color, ViewConstants.BLOCK_RADIUS.dp)
        checkboxDrawable.checkedColor = WColor.Tint.color
        checkboxDrawable.uncheckedColor = WColor.SecondaryText.color
        termsView.addRippleEffect(WColor.BackgroundRipple.color, 16f.dp)
        updateMoreInfoLabel()
        updateTermsLabel()
    }

    override fun viewDidAppear() {
        super.viewDidAppear()

        if (particlesCleaner == null) {
            particlesCleaner = tonParticlesView.addParticleSystem(particleParams)
            tonParticlesView.isGone = false
        }
        if (contentView.alpha == 0f) {
            tonParticlesView.alpha = 0f
            tonParticlesView.fadeIn(AnimationConstants.VERY_VERY_QUICK_ANIMATION)
        } else {
            tonParticlesView.alpha = 1f
        }
    }

    override fun viewWillDisappear() {
        super.viewWillDisappear()
        tonParticlesView.fadeOut(AnimationConstants.VERY_VERY_QUICK_ANIMATION) {
            particlesCleaner?.invoke()
            particlesCleaner = null
            tonParticlesView.isGone = true
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        particlesCleaner?.invoke()
    }

    private fun updateMoreInfoLabel() {
        val attr = SpannableStringBuilder()
        val str = LocaleController.getSpannableStringWithKeyValues(
            "More about %app_name%",
            listOf(
                Pair("%app_name%", context.getString(BaseR.string.app_locale_name_key))
            )
        )
        attr.append(SpannableString("$str ").apply {
            setSpan(
                WFont.Regular,
                0,
                length,
                Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        })
        val drawable = context.requireDrawableCompat(
            app.twallet.air.walletcontext.R.drawable.ic_relate_right
        )
        drawable.mutate()
        drawable.setTint(WColor.SecondaryText.color)
        val width = 6.dp
        val height = 9.dp
        drawable.setBounds(0, 2, width, height)
        val imageSpan = VerticalImageSpan(drawable, LocaleController.isRTL)
        attr.append(" ", imageSpan, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        moreInfoButton.text = attr
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun updateTermsLabel() {
        val attr = SpannableStringBuilder()
        val termsString = LocaleController.getString("use the wallet responsibly")
        checkboxDrawable.setBounds(
            (-2).dp,
            1,
            checkboxDrawable.intrinsicWidth + 2.dp,
            checkboxDrawable.intrinsicHeight + 1
        )
        val imageSpan = ImageSpan(checkboxDrawable, ImageSpan.ALIGN_BOTTOM)
        attr.append(" ")
        attr.setSpan(imageSpan, 0, 1, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
        attr.append("  ")
        attr.append(
            LocaleController.getSpannableStringWithKeyValues(
                "I agree to %term%",
                listOf(
                    Pair("%term%", termsString)
                )
            )
        )
        val start = attr.indexOf(termsString)
        if (start >= 0) {
            val end = start + termsString.length
            val clickableSpan = object : ClickableSpan() {
                override fun onClick(widget: View) {
                    push(UserResponsibilityVC(context))
                }

                override fun updateDrawState(ds: android.text.TextPaint) {
                    super.updateDrawState(ds)
                    ds.isUnderlineText = false
                    ds.color = WColor.Tint.color
                }
            }
            attr.setSpan(
                clickableSpan,
                start,
                end,
                Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        }
        termsView.text = attr

        termsView.setOnClickListener {
            // This will be called only when not clicking on the terms link
            termsAccepted = !termsAccepted
            checkboxDrawable.setChecked(termsAccepted, animated = true)
            createNewWalletButton.isEnabled = termsAccepted
        }

        termsView.setOnTouchListener { v, event ->
            val widget = v as TextView
            val action = event.action

            if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_DOWN) {
                var x = event.x.toInt()
                var y = event.y.toInt()

                x -= widget.totalPaddingLeft
                y -= widget.totalPaddingTop

                x += widget.scrollX
                y += widget.scrollY

                val layout = widget.layout
                if (layout != null) {
                    val line = layout.getLineForVertical(y)
                    val off = layout.getOffsetForHorizontal(line, x.toFloat())

                    val clickableSpans = attr.getSpans(
                        off, off,
                        ClickableSpan::class.java
                    )

                    if (clickableSpans.isNotEmpty()) {
                        if (action == MotionEvent.ACTION_UP) {
                            clickableSpans[0].onClick(widget)
                        }
                        return@setOnTouchListener true
                    }
                }
            }
            false
        }
        termsView.highlightColor = Color.TRANSPARENT
    }

    override fun mnemonicGenerated(words: Array<String>) {
        createNewWalletButton.isLoading = false
        if (!WGlobalStorage.isPasscodeSet()) {
            push(BackupVC(context, network = network, words = words, true, null), onCompletion = {
                view.unlockView()
            })
        } else {
            // Won't happen unless we present IntroVC somewhere in the app, when some passcode protected accounts already exist.
            val passcodeConfirmVC = PasscodeConfirmVC(
                context,
                PasscodeViewState.Default(
                    LocaleController.getString("Enter Passcode"),
                    "",
                    LocaleController.getString("Create New Wallet"),
                    showNavigationSeparator = false,
                    startWithBiometrics = true
                ),
                task = { passcode ->
                    navigationController?.push(
                        BackupVC(context, network = network, words = words, false, passcode),
                        onCompletion = {
                            navigationController?.removePrevViewControllerOnly()
                        })
                }
            )
            push(passcodeConfirmVC, onCompletion = {
                view.unlockView()
            })
        }
    }
}
