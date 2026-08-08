import UIKit
import WalletContext
import WalletCoreTypes

public extension ApiChain {
    var image: UIImage {
        UIImage(named: "chain_\(rawValue)", in: AirBundle, compatibleWith: nil)
            ?? UIImage(named: "chain_\(FALLBACK_CHAIN.rawValue)", in: AirBundle, compatibleWith: nil)!
    }

    func isValidAddressOrDomain(_ addressOrDomain: String) -> Bool {
        guard isSupported else { return false }
        return config.addressRegex.matches(addressOrDomain)
            || isValidDomain(addressOrDomain)
            || (config.isDnsSupported && TmailHelpers.isBareTonAlias(addressOrDomain))
    }

    /// Explicit DNS / tmail forms only (not bare words). Bare aliases are accepted via `isValidAddressOrDomain`.
    func isValidDomain(_ domain: String) -> Bool {
        guard isSupported else { return false }
        return config.isDnsSupported
            && (DNSHelpers.isDnsDomain(domain) || TmailHelpers.isTmailAlias(domain))
    }
}
