package app.twallet.air.uisettings.viewControllers.networks

import android.content.Context
import android.text.InputType
import android.util.TypedValue
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.LinearLayout
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.view.isGone
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.commonViews.cells.HeaderCell
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.WButton
import app.twallet.air.uicomponents.widgets.WEditText
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WScrollView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeConfirmVC
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeViewState.Default
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.helpers.BiometricHelpers
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.models.blockchain.SharedNetworksConfig
import app.twallet.air.walletcore.moshi.MNetworkRpcFieldConfig
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.AccountStore
import java.lang.ref.WeakReference

class NetworkDetailVC(
    context: Context,
    private val chain: String,
    private val chainTitle: String,
    private val initiallyHidden: Boolean = false,
) : WViewController(context) {
    override val TAG = "NetworkDetail"

    override val shouldDisplayBottomBar = true

    private var fieldBlocks: List<FieldBlock> = emptyList()
    private var isHidden = initiallyHidden

    private val visibilitySwitch =
        app.twallet.air.uicomponents.commonViews.cells.SwitchCell(
            context,
            LocaleController.getString("Show in wallet"),
            isChecked = !initiallyHidden,
            isFirst = true,
            isLast = true,
        ) { checked ->
            setVisibility(isHidden = !checked)
        }

    private val warningLabel =
        WLabel(context).apply {
            setStyle(13f)
            setPaddingLocalized(16.dp, 16.dp, 16.dp, 16.dp)
            text =
                LocaleController.getString(
                    "Custom endpoints that do not support indexer APIs may disable NFT and activity features for this network."
                )
        }

    private val contentContainer =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
        }

    private val scrollingContentView: WView by lazy {
        WView(context).apply {
            addView(contentContainer, ConstraintLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            setConstraints {
                toTop(contentContainer)
                toCenterX(contentContainer)
            }
        }
    }

    private val scrollView: WScrollView by lazy {
        WScrollView(WeakReference(this)).apply {
            addView(scrollingContentView, ConstraintLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        }
    }

    override fun setupViews() {
        super.setupViews()
        val title = MBlockchain.valueOfOrNull(chain)?.displayName ?: chainTitle
        setNavTitle(title)
        setupNavBar(true)

        view.addView(scrollView, ConstraintLayout.LayoutParams(MATCH_PARENT, 0))
        view.setConstraints {
            topToBottom(scrollView, navigationBar!!)
            toCenterX(scrollView)
            toBottom(scrollView)
        }

        updateTheme()
        reload()
    }

    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.SecondaryBackground.color)
        fieldBlocks.forEach { it.updateTheme() }
        warningLabel.setTextColor(WColor.SecondaryText.color)
        visibilitySwitch.updateTheme()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        contentContainer.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding + systemBarStartInset,
            0,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            navigationController?.bottomInset ?: 0
        )
    }

    private fun networkName(): String = AccountStore.activeAccount?.network?.value ?: "mainnet"

    private fun setVisibility(isHidden: Boolean) {
        WalletCore.call(
            ApiMethod.Networks.SetChainVisibility(chain, networkName(), isHidden)
        ) { _, err ->
            if (err != null) {
                visibilitySwitch.isChecked = !this.isHidden
                return@call
            }
            this.isHidden = isHidden
        }
    }

    private fun reload() {
        WalletCore.call(ApiMethod.Networks.GetRpcConfig(networkName())) { result, err ->
            if (err != null || result == null) return@call
            val item = result.firstOrNull { it.chain == chain } ?: return@call
            isHidden = item.isHidden == true
            visibilitySwitch.isChecked = !isHidden
            render(item.fields)
        }
    }

    private fun render(fields: List<MNetworkRpcFieldConfig>) {
        contentContainer.removeAllViews()
        contentContainer.addView(
            visibilitySwitch,
            LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                topMargin = 16.dp
            }
        )
        fieldBlocks = fields.map { FieldBlock(it) }
        fieldBlocks.forEach { block ->
            contentContainer.addView(
                block.root,
                LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
            )
        }
        contentContainer.addView(
            warningLabel,
            LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
        )
        updateTheme()
    }

    private fun save(block: FieldBlock, force: Boolean, password: String? = null) {
        val field = block.field
        val url =
            block.urlInput.text
                ?.toString()
                ?.trim()
                .orEmpty()
        val apiKey =
            if (block.showApiKey && block.isApiKeyUnlocked) {
                block.apiKeyInput.text?.toString()
            } else {
                null
            }

        block.saveButton.isLoading = true
        WalletCore.call(
            ApiMethod.Networks.SetRpcOverride(
                chain = chain,
                network = networkName(),
                field = field.field,
                url = url,
                apiKey = apiKey,
                force = force,
                password = password,
            )
        ) { result, err ->
            block.saveButton.isLoading = false
            if (err != null || result == null) {
                block.setStatus(
                    err?.message ?: LocaleController.getString("Endpoint is unreachable"),
                    WColor.Red.color
                )
                return@call
            }
            when (result.status) {
                "ok" -> {
                    block.setStatus(LocaleController.getString("Saved"), WColor.Green.color)
                    block.saveAnywayButton.isGone = true
                    reload()
                }

                "unexpected_response" -> {
                    block.setStatus(
                        result.details
                            ?: LocaleController.getString("Unexpected response from endpoint"),
                        WColor.Orange.color
                    )
                    block.saveAnywayButton.isGone = result.saved == true
                    if (result.saved == true) reload()
                }

                else -> {
                    block.setStatus(
                        result.details
                            ?: LocaleController.getString("Endpoint is unreachable"),
                        WColor.Red.color
                    )
                    block.saveAnywayButton.isGone = true
                }
            }
        }
    }

    private fun reset(block: FieldBlock) {
        block.resetButton.isLoading = true
        WalletCore.call(
            ApiMethod.Networks.ResetRpcOverride(chain, networkName(), block.field.field)
        ) { _, err ->
            block.resetButton.isLoading = false
            if (err != null) return@call
            reload()
        }
    }

    private fun requestApiKeyUnlock(block: FieldBlock) {
        val nav =
            navigationController?.tabBarController?.mainNavigationController
                ?: navigationController
        val passcodeConfirmVC =
            PasscodeConfirmVC(
                context,
                Default(
                    LocaleController.getString("Locked"),
                    LocaleController.getString(
                        if (WGlobalStorage.isBiometricActivated() &&
                            window != null &&
                            BiometricHelpers.canAuthenticate(window!!)
                        ) {
                            "Enter passcode or use fingerprint"
                        } else {
                            "Enter Passcode"
                        }
                    ),
                    LocaleController.getString("API Key")
                ),
                task = { passcode ->
                    nav?.pop()
                    WalletCore.call(
                        ApiMethod.Networks.UnlockRpcApiKey(chain, networkName(), passcode, block.field.field)
                    ) { result, err ->
                        if (err != null || result?.ok != true) {
                            block.setStatus(
                                err?.message ?: LocaleController.getString("Wrong password, please try again."),
                                WColor.Red.color
                            )
                            return@call
                        }
                        block.isApiKeyUnlocked = true
                        block.unlockedApiKey = result.apiKey.orEmpty()
                        block.refreshVisibility()
                    }
                }
            )
        nav?.push(passcodeConfirmVC)
    }

    private inner class FieldBlock(
        val field: MNetworkRpcFieldConfig
    ) {
        var isApiKeyUnlocked = false
        var unlockedApiKey = ""

        val showApiKey = SharedNetworksConfig.isApiKeyEligible(chain, field.field)

        private fun statusTextFor(field: MNetworkRpcFieldConfig): String =
            when {
                field.isDefault && field.field == "api" && field.defaultUrl.isNullOrEmpty() ->
                    LocaleController.getString("Enhanced API disabled")
                field.isDefault -> LocaleController.getString("Using default endpoint")
                else -> LocaleController.getString("Using custom endpoint")
            }

        private val headerCell =
            HeaderCell(context).apply {
                configure(
                    title =
                        if (field.field == "api") {
                            LocaleController.getString("API URL")
                        } else {
                            LocaleController.getString("RPC URL")
                        },
                    titleColor = WColor.Tint,
                    topRounding = HeaderCell.TopRounding.FIRST_ITEM
                )
            }

        private val statusLabel =
            WLabel(context).apply {
                setStyle(14f)
                setPaddingLocalized(16.dp, 4.dp, 16.dp, 12.dp)
                setText(statusTextFor(field))
            }

        private val enhancedHintLabel =
            WLabel(context).apply {
                setStyle(13f)
                setPaddingLocalized(16.dp, 0.dp, 16.dp, 8.dp)
                setText(
                    LocaleController.getString(
                        "Enhanced features (activities, NFTs, live updates) are disabled. Add an API URL (+key) to enable them."
                    )
                )
                visibility =
                    if (field.field == "api" && field.isDefault && field.defaultUrl.isNullOrEmpty()) {
                        android.view.View.VISIBLE
                    } else {
                        android.view.View.GONE
                    }
            }

        val urlInput =
            WEditText(context, null, false).apply {
                setSingleLine()
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                typeface = WFont.Regular.typeface
                setPaddingLocalized(16.dp, 14.dp, 16.dp, 14.dp)
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
                hint =
                    when {
                        field.field == "api" && field.defaultUrl.isNullOrEmpty() ->
                            "https://eth-mainnet.g.alchemy.io/v2/"
                        else -> field.defaultUrl
                    }
                setText(field.url)
            }

        val apiKeyInput =
            WEditText(context, null, false).apply {
                setSingleLine()
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                typeface = WFont.Regular.typeface
                setPaddingLocalized(16.dp, 14.dp, 16.dp, 14.dp)
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            }

        private val showApiKeyButton =
            WButton(context, WButton.Type.SECONDARY).apply {
                text = LocaleController.getString("Show API Key")
                setOnClickListener { requestApiKeyUnlock(this@FieldBlock) }
            }

        val saveButton =
            WButton(context, WButton.Type.PRIMARY).apply {
                text = LocaleController.getString("Save")
                setOnClickListener { save(this@FieldBlock, force = false) }
            }

        val saveAnywayButton =
            WButton(context, WButton.Type.SECONDARY).apply {
                text = LocaleController.getString("Save Anyway")
                isGone = true
                setOnClickListener { save(this@FieldBlock, force = true) }
            }

        val resetButton =
            WButton(context, WButton.Type.SECONDARY).apply {
                text = LocaleController.getString("Reset to Default")
                setOnClickListener { reset(this@FieldBlock) }
            }

        val root =
            LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                addView(
                    headerCell,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 16.dp
                    }
                )
                addView(statusLabel, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
                addView(enhancedHintLabel, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
                addView(
                    urlInput,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 8.dp
                    }
                )
                addView(
                    showApiKeyButton,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 8.dp
                    }
                )
                addView(
                    apiKeyInput,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 8.dp
                    }
                )
                addView(
                    saveButton,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 16.dp
                    }
                )
                addView(
                    saveAnywayButton,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 8.dp
                    }
                )
                addView(
                    resetButton,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 8.dp
                    }
                )
                refreshVisibility()
            }

        fun setStatus(text: String, color: Int) {
            statusLabel.text = text
            statusLabel.setTextColor(color)
        }

        fun refreshVisibility() {
            showApiKeyButton.isGone = !showApiKey || isApiKeyUnlocked
            apiKeyInput.isGone = !showApiKey || !isApiKeyUnlocked
            if (isApiKeyUnlocked) {
                apiKeyInput.setText(unlockedApiKey.ifEmpty { field.apiKey.orEmpty() })
            }
            resetButton.isGone = field.isDefault
            saveAnywayButton.isGone = true
        }

        fun updateTheme() {
            headerCell.updateTheme()
            statusLabel.setBackgroundColor(
                WColor.Background.color,
                0f,
                ViewConstants.BLOCK_RADIUS.dp
            )
            enhancedHintLabel.setTextColor(WColor.SecondaryText.color)
            urlInput.setBackgroundColor(WColor.Background.color, ViewConstants.BLOCK_RADIUS.dp)
            apiKeyInput.setBackgroundColor(WColor.Background.color, ViewConstants.BLOCK_RADIUS.dp)
            urlInput.setTextColor(WColor.PrimaryText.color)
            apiKeyInput.setTextColor(WColor.PrimaryText.color)
            statusLabel.setTextColor(WColor.SecondaryText.color)
        }
    }
}
