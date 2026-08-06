package app.twallet.air.uicomponents.widgets.segmentedController

interface WSegmentedControllerItemVC {
    var segmentedController: WSegmentedController?
    var badge: String?

    fun onFullyVisible()
    fun onPartiallyVisible()
}
