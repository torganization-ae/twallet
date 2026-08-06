package app.twallet.air.uicomponents.commonViews

import android.annotation.SuppressLint
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.view.setPadding
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.drawable.TabletEdgeFadeDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WBaseView
import app.twallet.air.uicomponents.widgets.WBlurryBackgroundView
import app.twallet.air.uicomponents.widgets.WButton
import app.twallet.air.uicomponents.widgets.WFrameLayout
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.helpers.DevicePerformanceClassifier

@SuppressLint("ViewConstructor", "ClickableViewAccessibility")
class ScreenRecordProtectionView(
    val viewController: WViewController,
    val proceedPressed: () -> Unit
) : WFrameLayout(viewController.context) {

    init {
        addBackgroundView()
        addContentView()
        setOnTouchListener { _, _ -> true }
        z = Float.MAX_VALUE
    }

    fun addBackgroundView() {
        if (DevicePerformanceClassifier.isHighClass) {
            addView(
                WBlurryBackgroundView(
                    context,
                    fadeSide = null,
                    overrideBlurRadius = 25f
                ).apply {
                    setupWith(viewController.view)
                },
                ConstraintLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
            )
        } else {
            addView(
                WBaseView(context).apply {
                    if (viewController.isSplitDetailPanel)
                        background =
                            TabletEdgeFadeDrawable(WColor.Background.color, dimWhenWide = false)
                    else
                        setBackground(WColor.Background)
                }
            )
        }
    }

    fun addContentView() {
        val contentView = WView(context).apply {
            setPadding(32.dp)
            val titleLabel = WLabel(context).apply {
                setStyle(17f, WFont.Medium)
                text = LocaleController.getString("Screen Recording Detected")
                setTextColor(WColor.PrimaryText)
                gravity = Gravity.CENTER
            }
            val descriptionLabel = WLabel(context).apply {
                setStyle(15f, WFont.Regular)
                text = LocaleController.getString("\$screen_recording_info")
                setTextColor(WColor.PrimaryText)
                gravity = Gravity.START
            }
            val proceedButton = WButton(context).apply {
                text = LocaleController.getString("I Understand, Proceed")
                type = WButton.Type.PRIMARY
                setOnClickListener {
                    proceedPressed()
                }
            }
            val goBackButton = WButton(context).apply {
                text = LocaleController.getString("Back")
                type = WButton.Type.SECONDARY
                setOnClickListener {
                    viewController.navigationController?.onBackPressed()
                }
            }
            addView(titleLabel)
            addView(descriptionLabel)
            addView(proceedButton, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            addView(goBackButton, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            setConstraints {
                toCenterX(titleLabel)
                toCenterX(descriptionLabel)
                toTop(titleLabel)
                topToBottom(descriptionLabel, titleLabel, 8f)
                topToBottom(proceedButton, descriptionLabel, 16f)
                topToBottom(goBackButton, proceedButton, 8f)
                toBottom(goBackButton)
            }
        }
        addView(contentView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply {
            gravity = Gravity.CENTER
        })
    }
}
