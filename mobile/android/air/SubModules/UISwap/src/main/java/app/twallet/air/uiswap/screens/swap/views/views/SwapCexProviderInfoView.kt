package app.twallet.air.uiswap.screens.swap.views

import android.content.Context
import android.text.method.LinkMovementMethod
import android.util.AttributeSet
import android.util.TypedValue
import android.view.View
import android.widget.LinearLayout
import android.widget.LinearLayout.VERTICAL
import androidx.appcompat.widget.AppCompatTextView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.ExpandableFrameLayout
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uiinappbrowser.span.InAppBrowserUrlSpan
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.helpers.SpanHelpers

class SwapCexProviderInfoView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyle: Int = 0,
) : ExpandableFrameLayout(context, attrs, defStyle), WThemedView {

    private val linearLayout = LinearLayout(context).apply {
        setPaddingDp(20, 16, 20, 16)
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        orientation = VERTICAL
    }
    private val titleTextView = AppCompatTextView(context).apply {
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, adaptiveFontSize())
        typeface = WFont.Medium.typeface
    }
    private val infoTextView = AppCompatTextView(context).apply {
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 20f)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        typeface = WFont.Regular.typeface
        movementMethod = LinkMovementMethod.getInstance()
    }

    init {
        linearLayout.addView(titleTextView)
        linearLayout.addView(
            infoTextView,
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                topMargin = 4.dp
            })

        addView(linearLayout)

        updateTheme()
    }

    fun setProviderInfo(
        providerName: String?,
        termsOfUseUrl: String?,
        privacyPolicyUrl: String?,
        amlKycPolicyUrl: String?
    ) {
        titleTextView.text = LocaleController.getString(
            "Cross-chain exchange provided by %provider%"
        ).replace("%provider%", providerName ?: "")

        if (termsOfUseUrl != null && privacyPolicyUrl != null) {
            val replacements = mutableListOf(
                Pair(
                    "%terms%",
                    SpanHelpers.buildSpannable(
                        LocaleController.getString("\$swap_cex_terms_of_use"),
                        InAppBrowserUrlSpan(termsOfUseUrl, null)
                    )
                ),
                Pair(
                    "%policy%",
                    SpanHelpers.buildSpannable(
                        LocaleController.getString("\$swap_cex_privacy_policy"),
                        InAppBrowserUrlSpan(privacyPolicyUrl, null)
                    )
                )
            )
            val messageKey = if (amlKycPolicyUrl != null) {
                replacements.add(
                    Pair(
                        "%aml%",
                        SpanHelpers.buildSpannable(
                            LocaleController.getString("\$swap_cex_aml_kyc_policy"),
                            InAppBrowserUrlSpan(amlKycPolicyUrl, null)
                        )
                    )
                )
                "\$swap_cex_legal_message_with_aml"
            } else {
                "\$swap_cex_legal_message"
            }

            infoTextView.text = LocaleController.getSpannableStringWithKeyValues(messageKey, replacements)
            infoTextView.visibility = View.VISIBLE
        } else {
            infoTextView.text = null
            infoTextView.visibility = View.GONE
        }
    }

    override fun updateTheme() {
        titleTextView.setTextColor(WColor.PrimaryText.color)

        infoTextView.setTextColor(WColor.PrimaryText.color)
        infoTextView.setLinkTextColor(WColor.Tint.color)
        infoTextView.highlightColor = WColor.tintRippleColor
    }
}
