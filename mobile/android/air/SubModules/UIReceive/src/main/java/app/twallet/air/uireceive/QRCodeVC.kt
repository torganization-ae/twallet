package app.twallet.air.uireceive

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Shader
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.ImageView
import android.widget.Toast
import androidx.appcompat.widget.AppCompatImageView
import androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
import app.twallet.air.uicomponents.base.WNavigationBar
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.ClipboardHelpers
import app.twallet.air.uicomponents.helpers.HapticType
import app.twallet.air.uicomponents.helpers.Haptics
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WQRCodeView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.helpers.AddressHelpers
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.helpers.ExplorerHelpers
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.stores.AccountStore
import kotlin.math.max

@SuppressLint("ViewConstructor")
class QRCodeVC(
    context: Context,
    val chain: MBlockchain,
    private val onQrLoaded: (() -> Unit)?
) : WViewController(context) {
    override val TAG = "QRCode"

    override val displayedAccount =
        DisplayedAccount(AccountStore.activeAccountId, AccountStore.isPushedTemporary)

    override val shouldDisplayTopBar = false
    override val shouldDisplayBottomBar = false

    override var title: String?
        get() = chain.displayName
        set(_) {}

    val walletAddress: String
        get() = AccountStore.activeAccount?.addressByChain?.get(chain.name) ?: ""

    companion object {
        /** Transparent gradient band under the nav chrome (content height is computed separately). */
        const val HEIGHT = 360
        private const val ADDRESS_ROW_MIN_HEIGHT = 48
        private const val BOTTOM_PAD = 16
        private const val DESCRIPTION_TOP_EXTRA = 8
    }

    private val qrCodeSize = 200.dp
    internal val qrCodeView: WQRCodeView by lazy {
        val qrContent =
            if (chain == MBlockchain.ton) {
                AddressHelpers.walletInvoiceUrl(walletAddress)
            } else {
                walletAddress
            }
        WQRCodeView(
            context,
            qrContent,
            qrCodeSize,
            qrCodeSize,
            chain.qrIcon,
            44.dp,
            chain.qrGradientColors?.let {
                LinearGradient(
                    0f,
                    0f,
                    qrCodeSize.toFloat(),
                    qrCodeSize.toFloat(),
                    it,
                    null,
                    Shader.TileMode.CLAMP
                )
            }
        ).apply {
            setPadding(1, 1, 1, 1)
            generate {
                view.fadeIn()
                onQrLoaded?.invoke()
            }
        }
    }

    val ornamentView =
        AppCompatImageView(context).apply {
            id = View.generateViewId()
            alpha = 0.5f
        }

    init {
        view.alpha = 0f
    }

    internal val descriptionLabel =
        WLabel(context).apply {
            setStyle(15f, WFont.Regular)
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            alpha = 0.85f
            maxLines = 3
            text = LocaleController.getString("\$receive_description")
        }

    private val chainIconView =
        AppCompatImageView(context).apply {
            scaleType = ImageView.ScaleType.FIT_CENTER
            setImageResource(chain.icon)
        }

    private val addressLabel =
        WLabel(context).apply {
            setStyle(14f, WFont.Medium)
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.MIDDLE
            includeFontPadding = false
            text = walletAddress
        }

    private val copyButton =
        AppCompatImageView(context).apply {
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            contentDescription = LocaleController.getString("Copy Address")
            setOnClickListener { copyAddress() }
        }

    private val infoButton =
        AppCompatImageView(context).apply {
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            contentDescription = LocaleController.getString("View on Explorer")
            setOnClickListener { openExplorer() }
        }

    val addressView =
        WView(context).apply {
            setPadding(12.dp, 12.dp, 10.dp, 12.dp)
            minimumHeight = ADDRESS_ROW_MIN_HEIGHT.dp

            addView(chainIconView, LayoutParams(22.dp, 22.dp))
            addView(
                addressLabel,
                LayoutParams(LayoutParams.MATCH_CONSTRAINT, WRAP_CONTENT)
            )
            addView(copyButton, LayoutParams(28.dp, 28.dp))
            addView(infoButton, LayoutParams(28.dp, 28.dp))

            setConstraints {
                toStart(chainIconView)
                toTop(chainIconView)
                toBottom(chainIconView)
                startToEnd(addressLabel, chainIconView, 10f)
                endToStart(addressLabel, copyButton, 8f)
                toTop(addressLabel)
                toBottom(addressLabel)
                endToStart(copyButton, infoButton, 2f)
                toCenterY(copyButton)
                toEnd(infoButton)
                toCenterY(infoButton)
            }

            setOnClickListener { copyAddress() }
        }

    override fun setupViews() {
        super.setupViews()

        view.addView(
            ornamentView,
            LayoutParams(LayoutParams.MATCH_CONSTRAINT, LayoutParams.MATCH_CONSTRAINT)
        )
        view.addView(
            descriptionLabel,
            LayoutParams(LayoutParams.MATCH_CONSTRAINT, WRAP_CONTENT)
        )
        view.addView(
            qrCodeView,
            LayoutParams(qrCodeSize, qrCodeSize)
        )
        view.addView(
            addressView,
            LayoutParams(LayoutParams.MATCH_CONSTRAINT, WRAP_CONTENT)
        )

        applyContentConstraints()
        updateTheme()
    }

    override fun updateTheme() {
        super.updateTheme()

        view.setBackgroundColor(Color.TRANSPARENT)
        descriptionLabel.setTextColor(Color.WHITE)
        addressLabel.setTextColor(WColor.PrimaryText.color)
        addressView.setBackgroundColor(
            WColor.Background.color,
            ViewConstants.BLOCK_RADIUS.dp
        )

        copyButton.setImageDrawable(
            context.getDrawableCompat(app.twallet.air.icons.R.drawable.ic_copy_16)?.apply {
                setTint(WColor.SecondaryText.color)
            }
        )
        infoButton.setImageDrawable(
            context.getDrawableCompat(app.twallet.air.icons.R.drawable.ic_info_24)?.apply {
                setTint(WColor.SecondaryText.color)
            }
        )

        val ornamentRes = chain.receiveOrnamentImage
        if (ornamentRes != null) {
            ornamentView.setImageDrawable(context.getDrawableCompat(ornamentRes))
            ornamentView.scaleType = ImageView.ScaleType.CENTER_INSIDE
            ornamentView.visibility = View.VISIBLE
        } else {
            ornamentView.setImageDrawable(null)
            ornamentView.visibility = View.INVISIBLE
        }
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        applyContentConstraints()
    }

    private fun contentTopInset(): Int =
        (navigationController?.getSystemBars()?.top ?: 0) +
            WNavigationBar.DEFAULT_HEIGHT.dp +
            DESCRIPTION_TOP_EXTRA.dp

    private fun applyContentConstraints() {
        val horizontalPad = ViewConstants.HORIZONTAL_PADDINGS.dp
        view.setConstraints {
            toTopPx(descriptionLabel, contentTopInset())
            toCenterX(descriptionLabel, 24f)
            toCenterX(qrCodeView)
            centerYToCenterY(ornamentView, qrCodeView, 16f.dp)
            toCenterX(ornamentView)
            topToBottom(qrCodeView, descriptionLabel, 16f)
            topToBottom(addressView, qrCodeView, 20f)
            toStartPx(addressView, horizontalPad + systemBarStartInset)
            toEndPx(addressView, horizontalPad + systemBarEndInset)
        }
    }

    /** Minimum height that fits description + QR + address (used before first layout). */
    fun minExpectedHeight(): Int = estimatedContentHeight()

    fun getHeight(): Int {
        val laidOutBottom = (addressView.y + addressView.height).toInt()
        // Segment uses pilledTabs → clipChildren; undersized height hides the address row.
        return max(laidOutBottom + BOTTOM_PAD.dp, estimatedContentHeight())
    }

    fun getTransparentHeight(): Int = HEIGHT.dp

    private fun estimatedContentHeight(): Int {
        // description (~2 lines) + gaps + QR + address card + bottom pad
        val descriptionEstimate = 44.dp
        return contentTopInset() +
            descriptionEstimate +
            16.dp +
            qrCodeSize +
            20.dp +
            ADDRESS_ROW_MIN_HEIGHT.dp +
            BOTTOM_PAD.dp
    }

    private fun copyAddress() {
        if (walletAddress.isEmpty()) return
        if (!ClipboardHelpers.copyToClipboard(context, "Wallet Address", walletAddress)) {
            return
        }
        Haptics.play(addressView, HapticType.LIGHT_TAP)
        Toast
            .makeText(
                context,
                LocaleController
                    .getString("%chain% Address Copied")
                    .replace("%chain%", chain.displayName),
                Toast.LENGTH_SHORT
            ).show()
    }

    private fun openExplorer() {
        if (walletAddress.isEmpty()) return
        val network = AccountStore.activeAccount?.network ?: return
        val config =
            ExplorerHelpers.createAddressExplorerConfig(chain, network, walletAddress)
                ?: return
        WalletCore.notifyEvent(WalletEvent.OpenUrlWithConfig(config))
    }
}
