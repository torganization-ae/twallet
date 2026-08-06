package app.twallet.air.uicomponents.commonViews.cells.activity

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.text.TextUtils
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.exactly
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.image.WNftImageView
import app.twallet.air.uicomponents.widgets.WFrameLayout
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ThemeManager
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.takeIfNotBlank
import app.twallet.air.walletcontext.utils.colorWithAlpha
import app.twallet.air.walletcore.moshi.ApiNft

class ActivitySingleTagView(context: Context) : WFrameLayout(context), WThemedView {

    val imageView = WNftImageView(context, 32.dp, 0)
    val titleLabel = WLabel(context).apply {
        setStyle(adaptiveFontSize(), WFont.Medium)
        setSingleLine()
        ellipsize = TextUtils.TruncateAt.END
        useCustomEmoji = true
    }
    val subtitleLabel = WLabel(context).apply {
        setStyle(13f, WFont.Medium)
        setSingleLine()
        ellipsize = TextUtils.TruncateAt.END
        useCustomEmoji = true
    }

    init {
        addView(imageView, LayoutParams(56.dp, 56.dp))
        addView(titleLabel, LayoutParams(WRAP_CONTENT, 24.dp).apply {
            marginStart = 66.dp
            marginEnd = 12.dp
            topMargin = 8.dp
            gravity = Gravity.TOP or Gravity.START
        })
        addView(subtitleLabel, LayoutParams(WRAP_CONTENT, 24.dp).apply {
            marginStart = 66.dp
            marginEnd = 12.dp
            topMargin = 28.dp
            gravity = Gravity.TOP or Gravity.START
        })
    }

    fun configure(nft: ApiNft) {
        imageView.setNftImage(nft.image)
        titleLabel.text = nft.name?.takeIfNotBlank() ?: LocaleController.getString("NFT")
        subtitleLabel.text = nft.collectionName
    }

    override fun updateTheme() {
        imageView.updateTheme()
        setBackgroundColor(
            WColor.TrinaryBackground.color,
            12f.dp,
            true
        )
        if (ThemeManager.isDark) {
            titleLabel.setTextColor(WColor.PrimaryText.color)
            subtitleLabel.setTextColor(WColor.PrimaryText.color.colorWithAlpha(179))
        } else {
            titleLabel.setTextColor(WColor.PrimaryDarkText.color)
            subtitleLabel.setTextColor(WColor.PrimaryDarkText.color)
        }
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(widthMeasureSpec, 56.dp.exactly)
    }

}
