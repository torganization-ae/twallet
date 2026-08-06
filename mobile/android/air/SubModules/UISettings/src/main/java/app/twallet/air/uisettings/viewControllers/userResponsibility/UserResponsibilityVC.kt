package app.twallet.air.uisettings.viewControllers.userResponsibility

import android.annotation.SuppressLint
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.content.Context
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.constraintlayout.widget.ConstraintLayout
import app.twallet.air.uicomponents.R
import app.twallet.air.walletbasecontext.R as BaseR
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WAnimationView
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WScrollView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uiinappbrowser.InAppBrowserVC
import app.twallet.air.uisettings.viewControllers.settings.cells.SettingsItemCell
import app.twallet.air.uisettings.viewControllers.settings.models.SettingsItem
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.toProcessedSpannableStringBuilder
import app.twallet.air.walletcore.models.InAppBrowserConfig
import java.lang.ref.WeakReference
import kotlin.math.max

class UserResponsibilityVC(context: Context) : WViewController(context) {
    override val TAG = "UserResponsibility"

    override val isContentWidthCapped = true

    override val shouldDisplayTopBar = false
    override val shouldDisplayBottomBar = navigationController?.tabBarController == null

    private val animationView = WAnimationView(context).apply {
        alpha = 0f
        play(
            R.raw.animation_snitch,
            true,
            onStart = {
                fadeIn()
            })
    }

    private val titleLabel = WLabel(context).apply {
        setStyle(28f, WFont.Medium)
        text = LocaleController.getString("Use Responsibly")
        gravity = Gravity.CENTER
    }

    @SuppressLint("SetTextI18n")
    private val descriptionLabel = WLabel(context).apply {
        setPaddingDp(24, 16, 24, 16)
        setStyle(adaptiveFontSize())
        text = ("${LocaleController.getString("\$auth_responsibly_description1")}\n" +
            "${LocaleController.getString("\$auth_responsibly_description2")}\n" +
            "${LocaleController.getString("\$auth_responsibly_description3")}\n" +
            LocaleController.getString("\$auth_responsibly_description4"))
            .trim()
            .replace("%app_name%", context.getString(BaseR.string.app_name))
            .toProcessedSpannableStringBuilder()
    }

    private val termsOfUseRow =
        SettingsItemCell(context, baseContentHeight = SettingsItemCell.SIMPLE_ROW_HEIGHT).apply {
            val title = LocaleController.getString("Terms of Use")
            configure(
                SettingsItem(
                    identifier = SettingsItem.Identifier.USE_RESPONSIBILITY,
                    icon = app.twallet.air.uisettings.R.drawable.ic_responsibility_terms,
                    title = title,
                    value = null,
                    hasTintColor = false
                ),
                subtitle = null,
                isFirst = true,
                isLast = false,
                isEnabled = true,
                onTap = {
                    openLink(context.getString(BaseR.string.app_terms_of_use_url), title)
                }
            )
        }

    private val privacyPolicyRow =
        SettingsItemCell(context, baseContentHeight = SettingsItemCell.SIMPLE_ROW_HEIGHT).apply {
            val title = LocaleController.getString("Privacy Policy")
            configure(
                SettingsItem(
                    identifier = SettingsItem.Identifier.NONE,
                    icon = app.twallet.air.uisettings.R.drawable.ic_responsibility_policy,
                    title = title,
                    value = null,
                    hasTintColor = false
                ),
                subtitle = null,
                isFirst = false,
                isLast = true,
                isEnabled = true,
                onTap = {
                    openLink(context.getString(BaseR.string.app_privacy_policy_url), title)
                }
            )
        }

    private val scrollingContentView: WView by lazy {
        val v = WView(context)
        v.layoutDirection = View.LAYOUT_DIRECTION_LTR
        v.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding,
            0,
            ViewConstants.HORIZONTAL_PADDINGS.dp,
            0
        )
        v.addView(animationView, ViewGroup.LayoutParams(90.dp, 90.dp))
        v.addView(titleLabel, ViewGroup.LayoutParams(0, WRAP_CONTENT))
        v.addView(descriptionLabel, ViewGroup.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        v.addView(termsOfUseRow, ViewGroup.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        v.addView(privacyPolicyRow, ViewGroup.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        v.setConstraints {
            toTopPx(
                animationView,
                (navigationController?.getSystemBars()?.top ?: 0) + 45.dp
            )
            toCenterX(animationView)
            topToBottom(titleLabel, animationView, 26f)
            toCenterX(titleLabel, 10f)
            topToBottom(descriptionLabel, titleLabel, 32f)
            topToBottom(termsOfUseRow, descriptionLabel, 16f)
            topToBottom(privacyPolicyRow, termsOfUseRow)
            toBottomPx(
                privacyPolicyRow,
                navigationController?.bottomInset ?: 0
            )
        }
        v
    }

    private val scrollView: WScrollView by lazy {
        val sv = WScrollView(WeakReference(this))
        sv.addView(scrollingContentView, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        sv
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle("")
        setupNavBar(true)

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
            setTopBlur(y > 0, animated = true)
        }
        updateTheme()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        scrollingContentView.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding + systemBarStartInset,
            0,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            0
        )
        scrollingContentView.setConstraints {
            toTopPx(
                animationView,
                (navigationController?.getSystemBars()?.top ?: 0) + 45.dp
            )
            toBottomPx(
                privacyPolicyRow,
                max(
                    (navigationController?.bottomInset ?: 0),
                    (navigationController?.imeInsetBottom ?: 0)
                )
            )
        }
    }

    override fun updateTheme() {
        view.setBackgroundColor(WColor.SecondaryBackground.color)
        titleLabel.setTextColor(WColor.PrimaryText.color)
        descriptionLabel.setBackgroundColor(
            WColor.Background.color,
            ViewConstants.BLOCK_RADIUS.dp
        )
        descriptionLabel.setTextColor(WColor.PrimaryText.color)
    }

    private fun openLink(link: String, title: String) {
        val nav = WNavigationController(window!!)
        nav.setRoot(
            InAppBrowserVC(
                context,
                null,
                InAppBrowserConfig(
                    link,
                    injectDappConnect = false,
                    injectDarkModeStyles = true,
                    title = title
                )
            )
        )
        window?.present(nav)
    }

}
