package app.twallet.air.uicomponents.widgets

interface WThemedView {
    val isTinted: Boolean
        get() {
            return false
        }

    fun updateTheme()
}
