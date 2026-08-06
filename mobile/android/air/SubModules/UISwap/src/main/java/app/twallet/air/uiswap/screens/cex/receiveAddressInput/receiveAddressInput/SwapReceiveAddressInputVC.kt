package app.twallet.air.uiswap.screens.cex.receiveAddressInput

import android.annotation.SuppressLint
import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.widget.doOnTextChanged
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import app.twallet.air.uicomponents.base.WViewControllerWithModelStore
import app.twallet.air.uicomponents.drawable.SeparatorBackgroundDrawable
import app.twallet.air.uicomponents.extensions.collectFlow
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WButton
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uiswap.screens.cex.receiveAddressInput.views.SwapHeaderView
import app.twallet.air.uiswap.screens.cex.receiveAddressInput.views.SwapInputView
import app.twallet.air.uiswap.screens.swap.models.SwapEstimateResponse
import app.twallet.air.uiswap.views.SwapConfirmView
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcore.JSWebViewBridge
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.api.swapCexValidateAddress
import app.twallet.air.walletcore.moshi.MSwapCexValidateAddressParams
import kotlin.math.max

@SuppressLint("ViewConstructor")
class SwapReceiveAddressInputVC(
    context: Context,
    private val estimate: SwapEstimateResponse,
    private val callback: (String) -> Unit
) : WViewControllerWithModelStore(context) {
    override val TAG = "SwapReceiveAddressInput"

    private val scrollView = ScrollView(context).apply {
        id = View.generateViewId()
        layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, 0)
        background = SeparatorBackgroundDrawable()
        overScrollMode = ScrollView.OVER_SCROLL_ALWAYS
        isVerticalScrollBarEnabled = false
        setPadding(ViewConstants.HORIZONTAL_PADDINGS.dp, 0, ViewConstants.HORIZONTAL_PADDINGS.dp, 0)
    }

    private val linearLayout = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        layoutParams = FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
    }

    private val confirmView = SwapConfirmView(context).apply {
        config(
            estimate.request.tokenToSend,
            estimate.request.tokenToReceive,
            estimate.fromAmount,
            estimate.toAmount
        )
    }

    private val gapView = View(context).apply {
        layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, ViewConstants.GAP.dp)
    }

    private val headerView = SwapHeaderView(context).apply {
        layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, 48.dp)
        text = LocaleController.getString("Receive to")
    }

    private val inputView = SwapInputView(context).apply {
        layoutParams = ConstraintLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
        editText.hint = LocaleController.getFormattedString(
            "Enter %1$@ address", listOf(
                estimate.request.tokenToReceive.symbol
                    ?: estimate.request.tokenToReceive.name
                    ?: ""
            )
        )
    }

    private val continueButton = WButton(context).apply {
        id = View.generateViewId()
        layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, 50.dp)
        isEnabled = false
        text = LocaleController.getString("Continue")
    }


    override fun setupViews() {
        super.setupViews()

        setNavTitle(LocaleController.getString("Swap"))
        setupNavBar(true)

        view.addView(scrollView)
        view.addView(continueButton)

        scrollView.addView(linearLayout)
        linearLayout.addView(confirmView)
        linearLayout.addView(gapView)
        linearLayout.addView(headerView)
        linearLayout.addView(inputView)

        view.setConstraints {
            toCenterX(scrollView)
            topToBottom(scrollView, navigationBar!!)
            bottomToTop(scrollView, continueButton, 20f)
            toCenterX(continueButton, 20f)
            toBottomPx(
                continueButton, 20.dp + max(
                    (navigationController?.getSystemBars()?.bottom ?: 0),
                    (navigationController?.imeInsetBottom ?: 0)
                )
            )
        }

        continueButton.setOnClickListener {
            addressFlow.value?.let {
                callback.invoke(it)
            }
        }

        inputView.editText.doOnTextChanged { text, _, _, _ ->
            addressFlow.value = text?.toString()
        }

        collectFlow(addressValidFlow) {
            continueButton.isLoading = it.isLoading
            if (!it.isLoading) {
                continueButton.isEnabled = it.isValid
            }
        }

        updateTheme()
    }

    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.SecondaryBackground.color)
        linearLayout.setBackgroundColor(
            WColor.Background.color,
            ViewConstants.TOOLBAR_RADIUS.dp,
            ViewConstants.BLOCK_RADIUS.dp
        )
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        scrollView.setPaddingRelative(
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarStartInset,
            0,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            0
        )
        view.setConstraints {
            toStartPx(continueButton, 20.dp + systemBarStartInset)
            toEndPx(continueButton, 20.dp + systemBarEndInset)
            toBottomPx(
                continueButton, 20.dp + max(
                    (navigationController?.getSystemBars()?.bottom ?: 0),
                    (navigationController?.imeInsetBottom ?: 0)
                )
            )
        }
    }


    /** Address validation **/

    private val addressFlow = MutableStateFlow<String?>(null)

    private data class Status(
        val isValid: Boolean,
        val isLoading: Boolean
    )

    @OptIn(ExperimentalCoroutinesApi::class)
    private val addressValidFlow = addressFlow.flatMapLatest { str ->
        flow {
            if (!str.isNullOrEmpty()) {
                emit(Status(isValid = false, isLoading = true))
                delay(250)
                emit(Status(isValid = isValid(str), isLoading = false))
            } else {
                emit(Status(isValid = false, isLoading = false))
            }
        }
    }.distinctUntilChanged()

    private suspend fun isValid(input: String?): Boolean {
        val address = input ?: return false

        return try {
            WalletCore.Swap.swapCexValidateAddress(
                MSwapCexValidateAddressParams(
                    slug = estimate.request.tokenToReceive.slug,
                    address = address
                )
            ).result
        } catch (_: JSWebViewBridge.ApiError) {
            false   // try repeat request ?
        }
    }
}
