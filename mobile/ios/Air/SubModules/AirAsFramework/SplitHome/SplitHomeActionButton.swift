import UIKit
import WalletCore
import WalletContext

enum SplitHomeActionItem: CaseIterable, Hashable, Sendable {
    case deposit
    case scan
    case send
    case swap

    var title: String {
        switch self {
        case .deposit: lang("Fund")
        case .scan: lang("Scan")
        case .send: lang("Send")
        case .swap: lang("Swap")
        }
    }

    var image: UIImage? {
        switch self {
        case .deposit: .airBundle("DepositIconLarge")
        case .scan: .airBundle("ScanIconLarge")
        case .send: .airBundle("SendIconLarge")
        case .swap: .airBundle("SwapIconLarge")
        }
    }

    @MainActor func perform(accountContext: AccountContext) {
        switch self {
        case .deposit: AppActions.showReceive(accountContext: accountContext, chain: nil)
        case .scan: AppActions.scanAndHandleQR(accountContext: accountContext)
        case .send: AppActions.showSend(accountContext: accountContext, prefilledValues: .init())
        case .swap: AppActions.showSwap(accountContext: accountContext, defaultSellingToken: nil, defaultBuyingToken: nil, defaultSellingAmount: nil, push: nil)
        }
    }

}
