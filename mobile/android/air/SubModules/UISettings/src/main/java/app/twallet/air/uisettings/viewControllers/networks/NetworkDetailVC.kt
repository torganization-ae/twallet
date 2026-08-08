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
import app.twallet.air.walletcore.moshi.MNetworkRpcFieldConfig
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.AccountStore
import java.lang.ref.WeakReference

class NetworkDetailVC(
    context: Context,
    private val chain: String,
    private val chainTitle: String,
    private val initiallyHidden: Boolean = false,
    private val canDisableInitially: Boolean = true,
) : WViewController(context) {
    override val TAG = "NetworkDetail"

    override val shouldDisplayBottomBar = true

    private var fieldBlocks: List<FieldBlock> = emptyList()
    private var isHidden = initiallyHidden
    private var canDisable = canDisableInitially
    private var sessionPassword: String? = null
    private var pendingSaveCount = 0
    private var anySavedInBatch = false
    private var anyIssueInBatch = false

    private val lastNetworkHintLabel =
        WLabel(context).apply {
            setStyle(13f)
            setPaddingLocalized(16.dp, 8.dp, 16.dp, 0.dp)
            text = LocaleController.getString("At least one network must stay enabled.")
            visibility = if (!initiallyHidden && !canDisableInitially) {
                android.view.View.VISIBLE
            } else {
                android.view.View.GONE
            }
        }

    private val visibilitySwitch: app.twallet.air.uicomponents.commonViews.cells.SwitchCell by lazy {
        app.twallet.air.uicomponents.commonViews.cells.SwitchCell(
            context,
            LocaleController.getString("Show in wallet"),
            isChecked = !initiallyHidden,
            isFirst = true,
            isLast = true,
            onChange = { checked ->
                if (!checked && !canDisable) {
                    visibilitySwitch.isChecked = true
                } else {
                    setVisibility(isHidden = !checked)
                }
            },
        ).also {
            it.isEnabled = initiallyHidden || canDisableInitially
        }
    }

    private val saveButton =
        WButton(context, WButton.Type.PRIMARY).apply {
            text = LocaleController.getString("Save")
            setOnClickListener { saveAll(force = false) }
        }

    private val saveAnywayButton =
        WButton(context, WButton.Type.SECONDARY).apply {
            text = LocaleController.getString("Save Anyway")
            isGone = true
            setOnClickListener { saveAll(force = true) }
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
        lastNetworkHintLabel.setTextColor(WColor.SecondaryText.color)
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
        if (isHidden && !canDisable) {
            visibilitySwitch.isChecked = true
            return
        }
        WalletCore.call(
            ApiMethod.Networks.SetChainVisibility(chain, networkName(), isHidden)
        ) { result, err ->
            if (err != null || result?.ok != true) {
                visibilitySwitch.isChecked = !this.isHidden
                reload()
                return@call
            }
            this.isHidden = isHidden
            reload()
        }
    }

    private fun reload() {
        WalletCore.call(ApiMethod.Networks.GetRpcConfig(networkName())) { result, err ->
            if (err != null || result == null) return@call
            val item = result.firstOrNull { it.chain == chain } ?: return@call
            val visibleCount = result.count { it.isHidden != true }
            isHidden = item.isHidden == true
            canDisable = isHidden || visibleCount > 1
            visibilitySwitch.isChecked = !isHidden
            visibilitySwitch.isEnabled = isHidden || canDisable
            lastNetworkHintLabel.visibility =
                if (!isHidden && !canDisable) android.view.View.VISIBLE else android.view.View.GONE
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
        contentContainer.addView(
            lastNetworkHintLabel,
            LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
        )
        fieldBlocks = fields.map { FieldBlock(it) }
        fieldBlocks.forEach { block ->
            contentContainer.addView(
                block.root,
                LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
            )
        }
        contentContainer.addView(
            saveButton,
            LinearLayout.LayoutParams(MATCH_PARENT, 50.dp).apply {
                topMargin = 16.dp
            }
        )
        contentContainer.addView(
            saveAnywayButton,
            LinearLayout.LayoutParams(MATCH_PARENT, 50.dp).apply {
                topMargin = 8.dp
                bottomMargin = 16.dp
            }
        )
        saveAnywayButton.isGone = true
        updateTheme()
    }

    private fun fieldsNeedingPassword(): List<FieldBlock> =
        fieldBlocks.filter {
            it.isApiKeyUnlocked && !it.apiKeyInput.text.isNullOrEmpty()
        }

    private fun saveAll(force: Boolean) {
        val needingPassword = fieldsNeedingPassword()
        if (needingPassword.isNotEmpty() && sessionPassword == null) {
            requestApiKeyUnlock(needingPassword.first(), andSaveForce = force)
            return
        }

        if (fieldBlocks.isEmpty()) return

        saveButton.isLoading = true
        saveAnywayButton.isGone = true
        pendingSaveCount = fieldBlocks.size
        anySavedInBatch = false
        anyIssueInBatch = false
        fieldBlocks.forEach { block ->
            saveField(block, force = force, password = sessionPassword)
        }
    }

    private fun saveField(block: FieldBlock, force: Boolean, password: String? = null) {
        val field = block.field
        val url =
            block.urlInput.text
                ?.toString()
                ?.trim()
                .orEmpty()
        val apiKey =
            if (block.isApiKeyUnlocked) {
                block.apiKeyInput.text?.toString().orEmpty()
            } else {
                null
            }

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
            if (err != null || result == null) {
                anyIssueInBatch = true
                block.setStatus(
                    err?.message ?: LocaleController.getString("Endpoint is unreachable"),
                    WColor.Red.color
                )
            } else {
                when (result.status) {
                    "ok" -> {
                        block.setStatus(LocaleController.getString("Saved"), WColor.Green.color)
                        if (result.saved == true) anySavedInBatch = true
                    }

                    "unexpected_response" -> {
                        block.setStatus(
                            result.details
                                ?: LocaleController.getString("Unexpected response from endpoint"),
                            WColor.Orange.color
                        )
                        if (result.saved != true) {
                            anyIssueInBatch = true
                            saveAnywayButton.isGone = false
                        }
                        if (result.saved == true) anySavedInBatch = true
                    }

                    else -> {
                        anyIssueInBatch = true
                        block.setStatus(
                            result.details
                                ?: LocaleController.getString("Endpoint is unreachable"),
                            WColor.Red.color
                        )
                    }
                }
            }

            pendingSaveCount -= 1
            if (pendingSaveCount <= 0) {
                saveButton.isLoading = false
                if (anySavedInBatch && !anyIssueInBatch) {
                    reload()
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

    private fun requestApiKeyUnlock(block: FieldBlock, andSaveForce: Boolean? = null) {
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
                        sessionPassword = passcode
                        block.isApiKeyUnlocked = true
                        block.unlockedApiKey = result.apiKey.orEmpty()
                        block.refreshVisibility()
                        if (andSaveForce != null) {
                            saveAll(force = andSaveForce)
                        }
                    }
                }
            )
        nav?.push(passcodeConfirmVC)
    }

    private inner class FieldBlock(
        val field: MNetworkRpcFieldConfig
    ) {
        var isApiKeyUnlocked = field.hasApiKey != true
        var unlockedApiKey = ""

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

        private val apiKeyHeader =
            HeaderCell(context).apply {
                configure(
                    title = LocaleController.getString("API Key"),
                    titleColor = WColor.Tint,
                    topRounding = HeaderCell.TopRounding.ZERO
                )
            }

        private val statusLabel =
            WLabel(context).apply {
                setStyle(14f)
                setPaddingLocalized(16.dp, 4.dp, 16.dp, 12.dp)
                visibility = android.view.View.GONE
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
                setPaddingLocalized(16.dp, 14.dp, 48.dp, 14.dp)
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                hint = LocaleController.getString("Optional")
            }

        private val eyeButton =
            android.widget.ImageButton(context).apply {
                setImageResource(app.twallet.air.icons.R.drawable.ic_header_eye)
                background = null
                contentDescription = LocaleController.getString("Show API Key")
                setOnClickListener {
                    if (!isApiKeyUnlocked && field.hasApiKey == true) {
                        requestApiKeyUnlock(this@FieldBlock)
                    } else {
                        val hidden = apiKeyInput.inputType and InputType.TYPE_TEXT_VARIATION_PASSWORD != 0
                        apiKeyInput.inputType = if (hidden) {
                            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                        } else {
                            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                        }
                        apiKeyInput.setSelection(apiKeyInput.text?.length ?: 0)
                        setImageResource(
                            if (hidden) {
                                app.twallet.air.icons.R.drawable.ic_header_eye_hidden
                            } else {
                                app.twallet.air.icons.R.drawable.ic_header_eye
                            }
                        )
                    }
                }
            }

        private val apiKeyRow =
            android.widget.FrameLayout(context).apply {
                addView(apiKeyInput, android.widget.FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
                addView(
                    eyeButton,
                    android.widget.FrameLayout.LayoutParams(40.dp, 40.dp).apply {
                        gravity = android.view.Gravity.END or android.view.Gravity.CENTER_VERTICAL
                        marginEnd = 8.dp
                    }
                )
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
                addView(
                    urlInput,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 8.dp
                    }
                )
                addView(
                    apiKeyHeader,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 8.dp
                    }
                )
                addView(
                    apiKeyRow,
                    LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                        topMargin = 4.dp
                    }
                )
                addView(
                    resetButton,
                    LinearLayout.LayoutParams(MATCH_PARENT, 50.dp).apply {
                        topMargin = 8.dp
                    }
                )
                addView(statusLabel, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
                refreshVisibility()
            }

        fun setStatus(text: String, color: Int) {
            statusLabel.text = text
            statusLabel.setTextColor(color)
            statusLabel.visibility = android.view.View.VISIBLE
        }

        fun refreshVisibility() {
            val locked = field.hasApiKey == true && !isApiKeyUnlocked
            apiKeyInput.isEnabled = !locked
            apiKeyInput.isFocusable = !locked
            apiKeyInput.isFocusableInTouchMode = !locked
            if (locked) {
                apiKeyInput.setText("")
                apiKeyInput.hint = "••••••••"
            } else if (isApiKeyUnlocked) {
                apiKeyInput.hint = LocaleController.getString("Optional")
                apiKeyInput.setText(unlockedApiKey.ifEmpty { field.apiKey.orEmpty() })
            }
            resetButton.isGone = field.isDefault
        }

        fun updateTheme() {
            headerCell.updateTheme()
            apiKeyHeader.updateTheme()
            urlInput.setBackgroundColor(
                WColor.Background.color,
                ViewConstants.BLOCK_RADIUS.dp.toFloat(),
                WColor.Separator.color,
                1f.dp
            )
            apiKeyInput.setBackgroundColor(
                WColor.Background.color,
                ViewConstants.BLOCK_RADIUS.dp.toFloat(),
                WColor.Separator.color,
                1f.dp
            )
            urlInput.setTextColor(WColor.PrimaryText.color)
            apiKeyInput.setTextColor(WColor.PrimaryText.color)
            urlInput.setHintTextColor(WColor.SecondaryText.color)
            apiKeyInput.setHintTextColor(WColor.SecondaryText.color)
            eyeButton.setColorFilter(WColor.SecondaryText.color)
        }
    }
}
