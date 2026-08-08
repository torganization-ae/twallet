import WalletContext

public enum ActivityDetailsContext {
    case normal
    case external
    case sendConfirmation
    case sendNftConfirmation
    case burnNftConfirmation
    case swapConfirmation
    
    public var isTransactionConfirmation: Bool {
        switch self {
        case .normal, .external: false
        case .sendConfirmation, .sendNftConfirmation, .burnNftConfirmation, .swapConfirmation: true
        }
    }
    
    public var displayTitle: String? {
        switch self {
        case .normal, .external: nil
        case .sendConfirmation, .sendNftConfirmation: lang("Sent!")
        case .burnNftConfirmation: lang("Burned")
        case .swapConfirmation: lang("Swap Placed")
        }
    }
}
