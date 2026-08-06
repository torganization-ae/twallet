package app.twallet.air.uiswap.screens.swap.views.dexAggregatorDialog

import android.annotation.SuppressLint
import android.content.Context
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.LinearLayout
import app.twallet.air.uicomponents.drawable.HighlightGradientBackgroundDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.Rate
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WButton
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.utils.CoinUtils
import app.twallet.air.walletbasecontext.utils.smartDecimalsCount
import app.twallet.air.walletbasecontext.utils.toProcessedSpannableStringBuilder
import app.twallet.air.walletcore.moshi.IApiToken
import app.twallet.air.walletcore.moshi.MApiSwapDexLabel
import app.twallet.air.walletcore.moshi.MApiSwapEstimateVariant

@SuppressLint("ViewConstructor")
class DexAggregatorContentView(
    context: Context,
    private val fromToken: IApiToken,
    private val toToken: IApiToken,
    private val variants: List<MApiSwapEstimateVariant>,
    private val bestDex: MApiSwapDexLabel,
    private var selectedDex: MApiSwapDexLabel,
    private val onSelect: (MApiSwapDexLabel) -> Unit
) : WView(context), WThemedView {

    private fun dexAggregatorView(label: MApiSwapDexLabel): DexAggregatorDexView {
        return DexAggregatorDexView(context, label).apply {
            isBest = bestDex == label
            isSelectedDex = selectedDex == label
            variants.find { it.dexLabel == label }?.let {
                val rate = Rate.build(
                    sendAmount = it.toAmount,
                    receiveAmount = it.fromAmount
                )
                fillValues(
                    "${
                        CoinUtils.toDecimalString(
                            it.toAmount,
                            decimals = 2.coerceAtLeast(it.toAmount.smartDecimalsCount()),
                            round = false
                        )
                    } ${toToken.symbol}",
                    rate.fmtReceive(
                        fromToken.symbol,
                        decimals = null,
                        round = false
                    ) + " ≈ " + rate.fmtSend(
                        toToken.symbol,
                        decimals = 5,
                        round = false
                    )
                )
            }
        }
    }

    private val dedustView = dexAggregatorView(MApiSwapDexLabel.DEDUST)
    private val stonfiView = dexAggregatorView(MApiSwapDexLabel.STON)

    private val dexView = LinearLayout(context).apply {
        id = generateViewId()
        orientation = LinearLayout.HORIZONTAL
        clipChildren = false
        clipToPadding = false
        setPadding(0, 4.dp, 0, 0)
        addView(dedustView, LinearLayout.LayoutParams(0, WRAP_CONTENT).apply {
            weight = 1f
        })
        addView(
            stonfiView,
            LinearLayout.LayoutParams(0, WRAP_CONTENT).apply {
                weight = 1f
                leftMargin = 12.dp
            }
        )
        dedustView.setOnClickListener {
            selectedDex = MApiSwapDexLabel.DEDUST
            dedustView.isSelectedDex = true
            stonfiView.isSelectedDex = false
            updateOkButton()
        }
        stonfiView.setOnClickListener {
            selectedDex = MApiSwapDexLabel.STON
            stonfiView.isSelectedDex = true
            dedustView.isSelectedDex = false
            updateOkButton()
        }
    }

    private val detailsLabel = WLabel(context).apply {
        text = LocaleController.getString("Got It")
        setStyle(13f, WFont.Regular)
    }

    private val okButton = WButton(context).apply {
        text = LocaleController.getString("Got It")
        setOnClickListener {
            onSelect(selectedDex)
        }
    }

    @SuppressLint("SetTextI18n")
    override fun setupViews() {
        super.setupViews()

        clipChildren = false
        clipToPadding = false
        setPadding(24.dp, 0, 24.dp, 0)
        addView(dexView, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        addView(detailsLabel, LayoutParams(0, WRAP_CONTENT))
        addView(okButton, LayoutParams(0, WRAP_CONTENT))

        setConstraints {
            toTop(dexView, 4f)
            toCenterX(dexView)
            topToBottom(detailsLabel, dexView, 24f)
            toCenterX(detailsLabel)
            topToBottom(okButton, detailsLabel, 32f)
            toBottom(okButton)
            toCenterX(okButton)
        }

        okButton.setOnClickListener {
            onSelect(selectedDex)
        }

        fillDetailsLabel()
        updateOkButton()

        updateTheme()
    }

    override fun updateTheme() {
        detailsLabel.setTextColor(WColor.SecondaryText.color)
    }

    @SuppressLint("SetTextI18n")
    private fun fillDetailsLabel() {
        val diff =
            variants.find { it.dexLabel == bestDex }!!.toAmount - variants.find { it.dexLabel != bestDex }!!.toAmount
        val diffString =
            "${
                CoinUtils.toDecimalString(
                    diff,
                    2.coerceAtLeast(diff.smartDecimalsCount()),
                    false
                )
            } ${toToken.symbol}"

        detailsLabel.text =
            (LocaleController.getString("\$swap_dex_chooser_rate_title") +
                "\n\n" +
                LocaleController.getSpannableStringWithKeyValues(
                    "You will receive %amount% **more**.",
                    listOf(Pair("%amount%", diffString))
                )
                ).toProcessedSpannableStringBuilder()
    }

    private fun updateOkButton() {
        if (selectedDex == bestDex) {
            detailsLabel.alpha = 1f
            okButton.background = HighlightGradientBackgroundDrawable(true, 25f.dp)
            okButton.text = LocaleController.getString("Use Best Rate")
        } else {
            detailsLabel.alpha = 0.5f
            okButton.setBackgroundColor(WColor.Tint.color, 25f.dp)
            okButton.text = LocaleController.getStringWithKeyValues(
                "Switch to %dex_name%",
                listOf(Pair("%dex_name%", selectedDex.displayName))
            )
        }
    }
}
