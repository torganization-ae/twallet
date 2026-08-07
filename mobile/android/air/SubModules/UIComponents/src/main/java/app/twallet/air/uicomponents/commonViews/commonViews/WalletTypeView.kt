package app.twallet.air.uicomponents.commonViews

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.view.Gravity
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.LinearLayout
import androidx.appcompat.widget.AppCompatImageView
import androidx.core.view.isGone
import androidx.core.view.isVisible
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WBlurryBackgroundView
import app.twallet.air.uicomponents.widgets.WFrameLayout
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.helpers.DevicePerformanceClassifier
import app.twallet.air.walletcontext.utils.colorWithAlpha
import app.twallet.air.walletcontext.utils.solidColorWithAlpha
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.stores.AccountStore
import kotlin.math.roundToInt

@SuppressLint("ViewConstructor")
open class WalletTypeView(
    context: Context,
    blurredBackground: Boolean = false
) : WFrameLayout(context) {

    private var eyeDrawable: Drawable? = null
    private var eyeImageView: AppCompatImageView? = null
    private var viewLabel: WLabel? = null
    private var viewTagView: LinearLayout? = null

    private var hardwareDrawable: Drawable? = null
    private var hardwareTagView: AppCompatImageView? = null

    private var vaultDrawable: Drawable? = null
    private var vaultLabel: WLabel? = null
    private var vaultTagView: LinearLayout? = null

    private val walletTypeBlurView: WBlurryBackgroundView? =
        if (DevicePerformanceClassifier.isHighClass && blurredBackground)
            WBlurryBackgroundView(
                context,
                fadeSide = null
            ).apply {
                setOverlayColor(WColor.Transparent)
            }
        else
            null

    init {
        walletTypeBlurView?.let {
            addView(it, LayoutParams(MATCH_PARENT, MATCH_PARENT))
        }
    }

    fun setupBlurWith(viewGroup: ViewGroup) {
        walletTypeBlurView?.setupWith(viewGroup)
    }

    fun resumeBlurring() {
        walletTypeBlurView?.resumeBlurring()
    }

    fun pauseBlurring() {
        walletTypeBlurView?.pauseBlurring()
    }

    private var account: MAccount? = null
    private var shownAccountId: String? = null
    private var shownIsTemporary: Boolean? = null
    private var shownIsVault: Boolean? = null
    fun configure(account: MAccount?) {
        if (shownAccountId == account?.accountId &&
            shownIsTemporary == account?.isTemporary &&
            shownIsVault == account?.isVault
        )
            return
        shownAccountId = account?.accountId
        shownIsTemporary = account?.isTemporary
        shownIsVault = account?.isVault

        this.account = account ?: run {
            isGone = true
            return
        }

        when {
            account.isViewOnly -> configureViewTagView(account)
            account.isHardware -> configureHardwareTagView()
            account.isVault -> configureVaultTagView()
            else -> {
                isGone = true
                setOnClickListener(null)
            }
        }
    }

    private var backgroundColor = WColor.White.color.colorWithAlpha(41)
    private var color = WColor.White.color.colorWithAlpha(41)
    fun setColor(backgroundColor: Int, newColor: Int) {
        if (this.backgroundColor == backgroundColor && this.color == newColor) {
            return
        }

        val isTemporaryAccount = account?.isTemporary == true
        this.backgroundColor = backgroundColor
        color = newColor
        val tintColor = if (isTemporaryAccount) newColor.solidColorWithAlpha(255) else newColor
        eyeDrawable?.setTint(tintColor)
        viewLabel?.setTextColor(tintColor)
        hardwareDrawable?.setTint(newColor)
        vaultDrawable?.setTint(tintColor)
        vaultLabel?.setTextColor(tintColor)
        if (viewTagView?.isVisible == true || vaultTagView?.isVisible == true) {
            if (isTemporaryAccount) {
                (walletTypeBlurView ?: this).setBackgroundColor(
                    color = Color.TRANSPARENT,
                    radius = 14f.dp,
                    clipToBounds = true,
                    strokeColor = backgroundColor,
                    strokeWidth = 1
                )
            } else {
                if (walletTypeBlurView == null)
                    setBackgroundColor(backgroundColor, 10f.dp)
                else
                    walletTypeBlurView.setBackgroundColor(
                        Color.TRANSPARENT,
                        10f.dp,
                        clipToBounds = true
                    )
                setOnClickListener(null)
            }
        }
    }

    private fun configureViewTagView(account: MAccount) {
        isGone = false
        hardwareTagView?.isGone = true
        vaultTagView?.isGone = true
        val tintColor = if (account.isTemporary) color.solidColorWithAlpha(255) else color
        if (viewTagView == null) {
            createViewTagView(account, tintColor)
        } else {
            viewTagView?.isGone = false
            applyViewTagVariant(account, tintColor)
        }
        walletTypeBlurView?.isVisible = true

        setupViewTagBackground(account)
    }

    private fun createViewTagView(account: MAccount, tintColor: Int) {
        eyeImageView = AppCompatImageView(context)

        viewLabel = WLabel(context).apply {
            text = LocaleController.getString("\$view_mode")
            setStyle(12f, WFont.Medium)
            setPaddingLocalized(2.dp, 0, 0, 0)
        }

        viewTagView = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(eyeImageView)
            addView(viewLabel)
        }

        addView(viewTagView, LayoutParams(LayoutParams.WRAP_CONTENT, 20.dp))
        applyViewTagVariant(account, tintColor)
    }

    private var appliedTemporaryVariant: Boolean? = null
    private fun applyViewTagVariant(account: MAccount, tintColor: Int) {
        if (appliedTemporaryVariant != account.isTemporary) {
            appliedTemporaryVariant = account.isTemporary
            val iconRes = if (account.isTemporary) {
                app.twallet.air.uicomponents.R.drawable.ic_wallet_eye_add
            } else {
                app.twallet.air.uicomponents.R.drawable.ic_wallet_eye
            }
            eyeDrawable = context.getDrawableCompat(iconRes)
            eyeImageView?.setImageDrawable(eyeDrawable)

            val hPadding = if (account.isTemporary) {
                7.5f.dp.roundToInt()
            } else {
                4.5f.dp.roundToInt()
            }
            viewTagView?.setPadding(hPadding, 0, hPadding, 0)
            viewTagView?.layoutParams = viewTagView?.layoutParams?.apply {
                height = if (account.isTemporary) 28.dp else 20.dp
            }
        }
        eyeDrawable?.setTint(tintColor)
        viewLabel?.setTextColor(tintColor)
    }

    private fun setupViewTagBackground(account: MAccount) {
        if (account.isTemporary) {
            (walletTypeBlurView ?: this).setBackgroundColor(
                color = Color.TRANSPARENT,
                radius = 14f.dp,
                clipToBounds = true,
                strokeColor = backgroundColor,
                strokeWidth = 1
            )
            setOnClickListener {
                AccountStore.saveTemporaryAccount(account)
            }
        } else {
            if (walletTypeBlurView == null)
                setBackgroundColor(backgroundColor, 10f.dp)
            else
                walletTypeBlurView.setBackgroundColor(
                    Color.TRANSPARENT,
                    10f.dp,
                    clipToBounds = true
                )
            setOnClickListener(null)
        }
    }

    private fun configureHardwareTagView() {
        isGone = false
        viewTagView?.isGone = true
        vaultTagView?.isGone = true
        if (hardwareTagView == null) {
            hardwareDrawable = context.getDrawableCompat(
                app.twallet.air.uicomponents.R.drawable.ic_wallet_ledger
            )?.apply {
                setTint(color)
            }
            hardwareTagView = AppCompatImageView(context).apply {
                setImageDrawable(hardwareDrawable)
            }
            addView(
                hardwareTagView,
                LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)
            )
        } else {
            hardwareTagView?.isGone = false
        }
        background = null
        walletTypeBlurView?.isVisible = false
        setOnClickListener(null)
    }

    private fun configureVaultTagView() {
        isGone = false
        viewTagView?.isGone = true
        hardwareTagView?.isGone = true
        if (vaultTagView == null) {
            vaultDrawable = context.getDrawableCompat(
                app.twallet.air.uicomponents.R.drawable.ic_wallet_lock
            )?.apply {
                setTint(color)
            }
            val vaultImageView = AppCompatImageView(context).apply {
                setImageDrawable(vaultDrawable)
            }
            vaultLabel = WLabel(context).apply {
                text = LocaleController.getString("Vault")
                setStyle(12f, WFont.Medium)
                setPaddingLocalized(2.dp, 0, 0, 0)
                setTextColor(color)
            }
            vaultTagView = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(4.5f.dp.roundToInt(), 0, 4.5f.dp.roundToInt(), 0)
                addView(vaultImageView)
                addView(vaultLabel)
            }
            addView(vaultTagView, LayoutParams(LayoutParams.WRAP_CONTENT, 20.dp))
        } else {
            vaultTagView?.isGone = false
            vaultDrawable?.setTint(color)
            vaultLabel?.setTextColor(color)
        }
        if (walletTypeBlurView == null)
            setBackgroundColor(backgroundColor, 10f.dp)
        else
            walletTypeBlurView.setBackgroundColor(
                Color.TRANSPARENT,
                10f.dp,
                clipToBounds = true
            )
        walletTypeBlurView?.isVisible = true
        setOnClickListener(null)
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec)

        walletTypeBlurView?.measure(
            MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
        )
    }
}
