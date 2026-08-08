
import WalletContext

/**
 * "Gas" is a fee in the native token.
 * "Diesel" is a fee in the transferred token in gasless mode.
 */
public struct ApiFetchEstimateDieselResult: Equatable, Codable, Sendable {
    
    public let status: DieselStatus?
    
    /// The amount of the diesel itself. It will be sent together with the actual transfer. None of this will return back
    /// as the excess. Undefined means that
    /// gasless transfer is not available, and the diesel shouldn't be shown as the fee; nevertheless, the status should
    /// be displayed by the UI.
    ///
    /// Measured in the transferred token and charged on top of the transferred amount.
    let amount: BigInt?
    
    /// The native token amount covered by the diesel. Guaranteed to be > 0.
    let nativeAmount: BigInt
    
    /// The remaining part of the fee (the first part is `nativeAmount`) that will be taken from the existing wallet
    /// balance. Guaranteed that this amount is available in the wallet. Measured in the native token.
    let remainingFee: BigInt
    
    /// An approximate fee that will be actually spent. The difference between `nativeAmount+remainingFee` and this
    /// number is called "excess" and will be returned back to the wallet. Measured in the native token.
    let realFee: BigInt
    public let transaction: String?
}

extension ApiFetchEstimateDieselResult {
    public var tokenAmount: BigInt? { amount }
}


public enum DieselStatus: String, Codable, Sendable {
    case notAvailable = "not-available"
    case pendingPrevious = "pending-previous"
    case available = "available"

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        switch raw {
        case Self.available.rawValue:
            self = .available
        case Self.pendingPrevious.rawValue:
            self = .pendingPrevious
        default:
            // Unknown or retired diesel statuses map to notAvailable
            self = .notAvailable
        }
    }
}

extension DieselStatus {
    public var errorString: String? {
        switch self {
        case .notAvailable, .available:
            return nil
        case .pendingPrevious:
            return lang("Awaiting Previous Fee")
        }
    }
}
