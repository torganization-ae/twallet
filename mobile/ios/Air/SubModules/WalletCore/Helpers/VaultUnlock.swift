//
//  VaultUnlock.swift
//  WalletCore
//
//  Session-scoped vault unlocks (cleared on logout / reset). Matches src/util/vaultUnlock.ts
//

import Foundation

public enum VaultUnlock {
    private static let lock = NSLock()
    private static var unlockedAccountIds = Set<String>()

    public static func isUnlocked(_ accountId: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return unlockedAccountIds.contains(accountId)
    }

    public static func unlock(_ accountId: String) {
        lock.lock()
        defer { lock.unlock() }
        unlockedAccountIds.insert(accountId)
    }

    public static func lockAll() {
        lock.lock()
        defer { lock.unlock() }
        unlockedAccountIds.removeAll()
    }
}
