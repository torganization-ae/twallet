package app.twallet.air.uipasscode.viewControllers.activateBiometric

import android.annotation.SuppressLint
import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.FrameLayout
import androidx.core.view.isGone
import app.twallet.air.uicomponents.AnimationConstants
import app.twallet.air.uicomponents.base.WNavigationBar
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uicomponents.commonViews.HeaderAndActionsView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WButton
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.fadeOut
import app.twallet.air.uicomponents.widgets.particles.ParticleConfig
import app.twallet.air.uicomponents.widgets.particles.ParticleView
import app.twallet.air.uicomponents.widgets.pulseView
import app.twallet.air.uipasscode.R
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.toProcessedSpannableStringBuilder
import app.twallet.air.walletcontext.helpers.BiometricHelpers
import app.twallet.air.walletcore.models.MBridgeError

@SuppressLint("ViewConstructor")
class ActivateBiometricVC(context: Context, onCompletion: (activated: Boolean) -> Unit) :
    WViewController(context) {
    override val TAG = "ActivateBiometric"

    override val shouldDisplayTopBar = false

    private val particleParams = ParticleConfig(
        particleCount = 35,
        centerShift = floatArrayOf(0f, 32f),
        distanceLimit = 0.45f,
        color = ParticleConfig.Companion.PARTICLE_COLORS.GREEN
    )

    var particlesCleaner: (() -> Unit)? = null
    val greenParticlesView = ParticleView(context).apply {
        id = View.generateViewId()
        isGone = true
    }

    private val headerView: HeaderAndActionsView by lazy {
        val v = HeaderAndActionsView(
            context,
            HeaderAndActionsView.Media.Image(
                image = R.drawable.ic_fingerprint,
                tintedImage = false,
                onClick = {
                    headerView.pulseView(0.98f, AnimationConstants.VERY_VERY_QUICK_ANIMATION)
                    greenParticlesView.addParticleSystem(
                        ParticleConfig.particleBurstParams(
                            ParticleConfig.Companion.PARTICLE_COLORS.GREEN
                        )
                    )
                }
            ),
            title = LocaleController.getString("Use Biometrics"),
            subtitle = LocaleController.getString("\$auth_biometric_info")
                .toProcessedSpannableStringBuilder(),
        )
        v
    }

    private val connectButton = WButton(context, WButton.Type.PRIMARY).apply {
        text = LocaleController.getString("Connect Biometrics")
        setOnClickListener {
            BiometricHelpers.authenticate(
                window!!,
                LocaleController.getString("Use Biometrics"),
                subtitle = null,
                description = null,
                cancel = null,
                onSuccess = {
                    isLoading = true
                    view.lockView()
                    onCompletion(true)
                },
                onCanceled = {}
            )
        }
    }

    private val skipButton = WButton(context, WButton.Type.SECONDARY).apply {
        text = LocaleController.getString("Not Now")
        setOnClickListener {
            isLoading = true
            view.lockView()
            onCompletion(false)
        }
    }

    override fun setupViews() {
        super.setupViews()

        setupNavBar(true)
        setTopBlur(visible = false, animated = false)

        view.addView(greenParticlesView, FrameLayout.LayoutParams(0, WRAP_CONTENT))
        view.addView(headerView)
        view.addView(connectButton, ViewGroup.LayoutParams(0, WRAP_CONTENT))
        view.addView(skipButton, ViewGroup.LayoutParams(0, WRAP_CONTENT))

        view.setConstraints {
            toTopPx(
                headerView,
                WNavigationBar.DEFAULT_HEIGHT.dp +
                    (navigationController?.getSystemBars()?.top ?: 0)
            )
            toCenterX(headerView)
            constrainMaxWidth(headerView.id, WWindow.WIDE_LAYOUT_INNER_WIDTH_DP.dp)
            topToTop(greenParticlesView, headerView, -59f)
            toCenterX(greenParticlesView)
            constrainMaxWidth(greenParticlesView.id, WWindow.WIDE_LAYOUT_INNER_WIDTH_DP.dp)
            toBottomPx(skipButton, 32.dp + (navigationController?.getSystemBars()?.bottom ?: 0))
            toCenterX(skipButton, 32f)
            constrainMaxWidth(skipButton.id, WWindow.WIDE_LAYOUT_INNER_WIDTH_DP.dp)
            bottomToTop(connectButton, skipButton, 16f)
            toCenterX(connectButton, 32f)
            constrainMaxWidth(connectButton.id, WWindow.WIDE_LAYOUT_INNER_WIDTH_DP.dp)
        }

        updateTheme()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        view.setConstraints {
            toTopPx(
                headerView,
                WNavigationBar.DEFAULT_HEIGHT.dp +
                    (navigationController?.getSystemBars()?.top ?: 0)
            )
            toBottomPx(skipButton, 32.dp + (navigationController?.getSystemBars()?.bottom ?: 0))
        }
    }

    override fun updateTheme() {
        super.updateTheme()

        val backgroundColor = WColor.Background.color
        view.setBackgroundColor(backgroundColor)
        greenParticlesView.setParticleBackgroundColor(backgroundColor)
    }

    override fun viewDidAppear() {
        super.viewDidAppear()

        if (particlesCleaner == null) {
            particlesCleaner = greenParticlesView.addParticleSystem(particleParams)
            greenParticlesView.isGone = false
        }
        greenParticlesView.fadeIn()
    }

    override fun viewWillDisappear() {
        super.viewWillDisappear()
        greenParticlesView.fadeOut()
    }

    override fun onDestroy() {
        super.onDestroy()
        particlesCleaner?.invoke()
    }

    override fun showError(error: MBridgeError?) {
        super.showError(error)
        connectButton.isLoading = false
        skipButton.isLoading = false
        view.unlockView()
    }
}
