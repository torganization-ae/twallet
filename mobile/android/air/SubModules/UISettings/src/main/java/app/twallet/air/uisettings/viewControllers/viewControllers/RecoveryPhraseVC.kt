package app.twallet.air.uisettings.viewControllers

import android.annotation.SuppressLint
import android.content.Context
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Toast
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.view.isGone
import app.twallet.air.uicomponents.R
import app.twallet.air.uicomponents.base.WNavigationBar
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uicomponents.base.showAlert
import app.twallet.air.uicomponents.commonViews.WordListView
import app.twallet.air.uicomponents.drawable.TabletEdgeFadeDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.ClipboardHelpers
import app.twallet.air.uicomponents.helpers.HapticType
import app.twallet.air.uicomponents.helpers.Haptics
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.spans.WTypefaceSpan
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.WAnimationView
import app.twallet.air.uicomponents.widgets.WButton
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WScrollView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.DEBUG_MODE
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.toProcessedSpannableStringBuilder
import app.twallet.air.walletcontext.WalletContextManager
import app.twallet.air.walletcontext.helpers.WordCheckMode
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcontext.utils.colorWithAlpha
import app.twallet.air.walletcore.helpers.PrivateKeyHelper
import app.twallet.air.walletcore.stores.EnvironmentStore
import java.lang.ref.WeakReference
import kotlin.random.Random

@SuppressLint("ViewConstructor")
open class RecoveryPhraseVC(
    context: Context,
    private val network: MBlockchainNetwork,
    private val words: Array<String>
) :
    WViewController(context) {
    override val TAG = "RecoveryPhrase"

    override val isContentWidthCapped = true

    override val protectFromScreenRecord = true
    override val shouldDisplayBottomBar = true
    override val ignoreSideGuttering = true

    private val wordsCount = words.size

    open val skipTitle = LocaleController.getString("Close")
    open val checkMode: WordCheckMode = WordCheckMode.Check

    private var skipAvailable =
        checkMode == WordCheckMode.Check || (DEBUG_MODE || EnvironmentStore.isBeta)
    private var isShowingPrivateKey =
        wordsCount == 1 && PrivateKeyHelper.isValidPrivateKeyHex(words.first())

    val animationView = WAnimationView(context)

    private val subtitleLabel = WLabel(context).apply {
        setStyle(17f, WFont.Regular)
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 26f)
        text =
            LocaleController.getString(if (isShowingPrivateKey) "\$private_key_description" else "\$mnemonic_list_description")
                .toProcessedSpannableStringBuilder()
        gravity = Gravity.CENTER
        setTextColor(WColor.PrimaryText)
    }

    private val warningLabel = WLabel(context).apply {
        setStyle(17f, WFont.Medium)
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 26f)
        text =
            LocaleController.getString("\$mnemonic_warning").trim()
                .toProcessedSpannableStringBuilder()
        gravity = Gravity.CENTER
        setPaddingDp(16, 12, 16, 12)
        setTextColor(WColor.Red)
    }

    private fun warningText(key: String?): SpannableStringBuilder {
        return SpannableStringBuilder().apply {
            key?.let {
                append(
                    LocaleController.getString(key)
                        .toProcessedSpannableStringBuilder()
                )
                append("\n\n")
            }
            val redWarningStart = length
            append(LocaleController.getString("Other apps will be able to read your secret words!"))
            setSpan(
                WTypefaceSpan(WFont.Medium.typeface, WColor.Red.color),
                redWarningStart,
                length,
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        }
    }

    private val copyToClipboardButton = WLabel(context).apply {
        setStyle(17f, WFont.Medium)
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 26f)
        text =
            LocaleController.getString("Copy to Clipboard")
        gravity = Gravity.CENTER
        setPadding(16.dp, 0, 16.dp, 0)
        setTextColor(WColor.Tint)
        isTinted = true
        setOnClickListener {
            showAlert(
                title = LocaleController.getString("Security Warning"),
                text = warningText(if (isShowingPrivateKey) null else "\$copy_mnemonic_warning"),
                button = LocaleController.getString("Copy Anyway"),
                buttonPressed = {
                    if (ClipboardHelpers.copyToClipboard(
                            context,
                            "Wallet Address",
                            words.joinToString(" ")
                        )
                    ) {
                        Haptics.play(context, HapticType.LIGHT_TAP)
                        Toast.makeText(
                            context,
                            LocaleController.getString("Secret phrase was copied to clipboard"),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                },
                primaryIsDanger = true,
                secondaryButton = LocaleController.getString(if (isShowingPrivateKey) "Cancel" else "See Words")
            )
        }
    }

    private val wordsView: WordListView by lazy {
        val wordsView = WordListView(context)
        wordsView.setupViews(words.toList())
        wordsView
    }

    val letsCheckButton: WButton by lazy {
        val btn = WButton(context, WButton.Type.PRIMARY)
        btn.text =
            LocaleController.getString("Let's Check!")
        btn.setOnClickListener {
            gotoWordCheck()
        }
        btn.isGone = isShowingPrivateKey
        btn
    }

    val skipButton: WButton by lazy {
        val btn = WButton(
            context,
            if (isShowingPrivateKey) WButton.Type.PRIMARY else WButton.Type.SECONDARY
        )
        btn.text = skipTitle
        btn.setOnClickListener {
            skipPressed()
        }
        btn.isGone = !skipAvailable
        btn
    }

    private val scrollingContentView: WView by lazy {
        val v = WView(context)
        v.layoutDirection = View.LAYOUT_DIRECTION_LTR
        v.addView(animationView, ConstraintLayout.LayoutParams(132.dp, 132.dp))
        v.addView(subtitleLabel, ConstraintLayout.LayoutParams(0, WRAP_CONTENT))
        v.addView(warningLabel, ConstraintLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        v.addView(copyToClipboardButton, ConstraintLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        v.addView(wordsView, ConstraintLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        v.addView(letsCheckButton, ConstraintLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        v.addView(skipButton, ConstraintLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        v.setConstraints {
            toTopPx(
                animationView,
                WNavigationBar.DEFAULT_HEIGHT.dp +
                    (navigationController?.getSystemBars()?.top ?: 0)
            )
            toCenterX(animationView)
            topToBottom(subtitleLabel, animationView, 37f)
            toCenterX(subtitleLabel, 44f)
            constrainedWidth(warningLabel.id, true)
            topToBottom(warningLabel, subtitleLabel, 23f)
            toCenterX(warningLabel, 24f)
            topToBottom(copyToClipboardButton, warningLabel, 34f)
            toCenterX(copyToClipboardButton, 48f)
            topToBottom(wordsView, copyToClipboardButton, 46f)
            toCenterX(wordsView, 45f)
            topToBottom(letsCheckButton, wordsView, 40f)
            toCenterX(letsCheckButton, 48f)
            if (skipAvailable) {
                topToBottom(skipButton, letsCheckButton, if (isShowingPrivateKey) 40f else 16f)
                toCenterX(skipButton, 48f)
                toBottom(skipButton)
            } else {
                toBottom(letsCheckButton)
            }
        }
        v
    }

    private val scrollView: WScrollView by lazy {
        val sv = WScrollView(WeakReference(this))
        sv.addView(scrollingContentView, ConstraintLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        sv
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle(
            LocaleController.getPluralOrFormat(
                if (isShowingPrivateKey) "Private Key" else "%1\$d Secret Words",
                wordsCount,
            ) + network.localizedIdentifier
        )
        setupNavBar(true)
        setTopBlur(visible = false, animated = false)

        scrollView.alpha = 0f
        view.addView(
            scrollView,
            ConstraintLayout.LayoutParams(0, 0).apply {
                matchConstraintMaxWidth = WWindow.WIDE_LAYOUT_INNER_WIDTH_DP.dp
            }
        )
        view.setConstraints {
            allEdges(scrollView)
        }

        scrollView.onScrollChange = { y ->
            if (y > 0) {
                topReversedCornerView?.resumeBlurring()
            } else {
                topReversedCornerView?.pauseBlurring(false)
            }
            setTopBlur(visible = y > 0, animated = true)
        }

        animationView.play(
            R.raw.animation_bill, true,
            onStart = {
                scrollView.fadeIn()
            })

        updateTheme()
    }

    override fun updateTheme() {
        super.updateTheme()
        if (isSplitDetailPanel)
            view.background =
                TabletEdgeFadeDrawable(WColor.Background.color, dimWhenWide = false)
        else
            view.setBackgroundColor(WColor.Background.color)
        warningLabel.setBackgroundColor(WColor.Red.color.colorWithAlpha(20), 16f.dp)
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        scrollingContentView.setPaddingLocalized(
            additionalTabletPadding + systemBarStartInset,
            0,
            systemBarEndInset,
            16.dp + (navigationController?.getSystemBars()?.bottom ?: 0)
        )
        scrollingContentView.setConstraints {
            toTopPx(
                animationView,
                WNavigationBar.DEFAULT_HEIGHT.dp +
                    (navigationController?.getSystemBars()?.top ?: 0)
            )
        }
    }

    private fun gotoWordCheck() {
        val numbers = (1..words.size).toList()
        val shuffledNumbers = numbers.shuffled(Random)
        val randomNumbers = shuffledNumbers.take(3)

        push(
            WalletContextManager.delegate?.get()?.getWordCheckVC(
                network,
                words,
                randomNumbers.sorted(),
                checkMode
            ) as WViewController
        )
    }

    open fun skipPressed() {
        pop()
    }

    override fun presentScreenRecordProtectionView() {
        view.post {
            showAlert(
                title = LocaleController.getString("Security Warning"),
                text = warningText("\$screenshot_mnemonic_warning"),
                button = LocaleController.getString("See Words"),
            )
        }
    }

}
