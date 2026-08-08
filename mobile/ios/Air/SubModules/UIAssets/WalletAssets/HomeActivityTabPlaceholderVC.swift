import UIKit
import UIComponents
import WalletContext

/// Zero-height pager page; the real activity feed stays on HomeVC's collection view.
@MainActor
public final class HomeActivityTabPlaceholderVC: WViewController, WSegmentedControllerContent {
    public var onScroll: ((CGFloat) -> Void)?
    public var scrollingView: UIScrollView? { nil }

    public override func loadView() {
        view = UIView()
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = false
    }

    public func scrollToTop(animated: Bool) {}

    public func calculateHeight(isHosted: Bool) -> CGFloat { 0 }
}
