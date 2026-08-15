package app.twallet.air.walletbasecontext.theme

import android.graphics.Color
import androidx.core.graphics.ColorUtils

object NftAccentColors {
    val light = listOf(
        "#31AFC7", "#35C759", "#FF9500", "#FF2C55",
        "#AF52DE", "#5856D7", "#73AAED", "#FFB07A",
        "#B76C78", "#9689D1", "#E572CC", "#6BA07A",
        "#338FCC", "#1FC863", "#929395", "#E4B102",
        "#000000"
    )

    val dark = listOf(
        "#3AB5CC", "#32D74B", "#FF9F0B", "#FF325A",
        "#BF5AF2", "#7977FF", "#73AAED", "#FFB07A",
        "#B76C78", "#9689D1", "#E572CC", "#6BA07A",
        "#338FCC", "#2CD36F", "#C3C5C6", "#DDBA00",
        "#FFFFFF"
    )

    const val ACCENT_RADIOACTIVE_INDEX = 13;
    const val ACCENT_SILVER_INDEX = 14;
    const val ACCENT_GOLD_INDEX = 15;
    const val ACCENT_BNW_INDEX = 16;

    val veryBrightColors = setOf(
        0xFFC3C5C6.toInt(), // Silver color in Dark theme = Light Gray
        0xFFFFFFFF.toInt()  // BNW color in Dark theme = White
    )
}

// Shifts a color in HSL: [saturate] and [lighten] are multipliers.
private fun shiftColor(color: Int, saturate: Float, lighten: Float): Int {
    val hsl = FloatArray(3)
    ColorUtils.colorToHSL(color, hsl)
    hsl[1] = (hsl[1] * saturate).coerceAtMost(0.92f)
    // Additive part keeps near-black colors from collapsing into a flat gradient.
    hsl[2] = (hsl[2] * lighten + if (lighten > 1f) 0.05f else 0f).coerceIn(0f, 0.88f)

    return ColorUtils.HSLToColor(hsl)
}

fun cardGradientColors(index: Int?): IntArray {
    val color = NftAccentColors.light.getOrNull(index ?: -1) ?: "#27B1FA"
    val baseColor = Color.parseColor(color)

    return intArrayOf(shiftColor(baseColor, 1.2f, 1.06f), shiftColor(baseColor, 1.3f, 0.78f))
}
