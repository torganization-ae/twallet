//
//  MAssetsAndActivityData.swift
//  WalletCore
//
//  Created by Sina on 7/5/24.
//

import OrderedCollections
import WalletContext

public struct MAssetsAndActivityData: Equatable, Sendable {
    public static var empty: Self { MAssetsAndActivityData(dictionary: nil) }

    /// These tokens will be visible even if they are no cost tokens! Because user checked them manually!
    // public private(set) var alwaysShownSlugs: Set<String>

    /// Hidden tokens won't be shown in Home-Page wallet tokens
    private var alwaysHiddenSlugs: Set<String>

    /// AddedTokens show tokens will be shown even if user don't have them!
    public private(set) var importedSlugs: Set<String>

    /// Pinned tokens are shown at the top of  screen. Most recently pinned token is in the end of this Set.
    private var pinnedSlugs: OrderedSet<String> { _pinnedSlugs ?? [] }
    private var _pinnedSlugs: OrderedSet<String>?

    init(dictionary: [String: Any]?) {
        if let dictionary {
            // alwaysShownSlugs = Set(dictionary["alwaysShownSlugs"] as? [String] ?? [])
            alwaysHiddenSlugs = Set(dictionary["alwaysHiddenSlugs"] as? [String] ?? [])
            importedSlugs = Set(dictionary["importedSlugs"] as? [String] ?? [])
            _pinnedSlugs = (dictionary["pinnedSlugs"] as? [String]).map { OrderedSet($0) }
        } else {
            // alwaysShownSlugs = []
            alwaysHiddenSlugs = []
            importedSlugs = []
            _pinnedSlugs = nil
        }
        dropLegacyStakingIdentities()
    }

    var toDictionary: [String: Any] {
        var dict = [
            // "alwaysShownSlugs": Array(alwaysShownSlugs),
            "alwaysHiddenSlugs": Array(alwaysHiddenSlugs),
            "importedSlugs": Array(importedSlugs),
        ]

        if let _pinnedSlugs {
            dict["pinnedSlugs"] = Array(_pinnedSlugs)
        }

        return dict
    }

    // MARK: Hide

    public mutating func saveTokenHidden(slug: String, isHidden: Bool) {
        if isHidden {
            alwaysHiddenSlugs.insert(slug)
            // alwaysShownSlugs.remove(slug)
        } else {
            alwaysHiddenSlugs.remove(slug)
            // alwaysShownSlugs.insert(slug)
        }
    }

    public func isTokenHidden(slug: String) -> Bool {
        alwaysHiddenSlugs.contains(slug)
    }

    // MARK: Pinning

    public mutating func saveTokenPinning(slug: String, isPinned: Bool) {
        if _pinnedSlugs == nil { _pinnedSlugs = [] }

        if isPinned {
            _pinnedSlugs?.append(slug)
        } else {
            _pinnedSlugs?.remove(slug)
        }
    }

    public enum PinningInfo {
        case pinned(index: Int)
        case notPinned
    }

    public var hasPinnedTokens: Bool {
        !pinnedSlugs.isEmpty
    }

    public func isTokenPinned(slug: String) -> PinningInfo {
        if let index = pinnedSlugs.firstIndex(of: slug) {
            return .pinned(index: index)
        } else {
            return .notPinned
        }
    }

    // MARK: Imported tokens

    public mutating func saveImportedToken(slug: String) {
        importedSlugs.insert(slug)
    }

    public mutating func removeImportedToken(slug: String) {
        importedSlugs.remove(slug)
    }

    /// Drops legacy dual-identity keys (`staking-<slug>`) from pinned/hidden sets.
    mutating func dropLegacyStakingIdentities() {
        alwaysHiddenSlugs = Set(alwaysHiddenSlugs.filter { !$0.hasPrefix("staking-") })
        if let pinned = _pinnedSlugs {
            _pinnedSlugs = OrderedSet(pinned.filter { !$0.hasPrefix("staking-") })
        }
    }
}
