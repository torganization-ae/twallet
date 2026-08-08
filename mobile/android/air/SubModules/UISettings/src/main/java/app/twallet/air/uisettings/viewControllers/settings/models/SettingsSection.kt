package app.twallet.air.uisettings.viewControllers.settings.models

data class SettingsSection(
    val section: Section,
    val title: String,
    var children: List<SettingsItem>
) {
    enum class Section {
        ACCOUNTS,
        PORTFOLIO,
        SETTINGS,
    }
}
