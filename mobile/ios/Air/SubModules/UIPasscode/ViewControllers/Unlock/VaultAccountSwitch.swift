//
//  VaultAccountSwitch.swift
//  UIPasscode
//
//  Gates account switches to vault wallets behind passcode (session unlock).
//

import UIKit
import WalletCore
import WalletContext

@MainActor
public enum VaultAccountSwitch {

    /// Activate `accountId`, prompting for passcode when switching to a locked vault.
    public static func activate(
        accountId: String,
        on presenter: UIViewController? = nil,
        then: @escaping () -> Void = {}
    ) {
        let account = AccountStore.accountsById[accountId]
        if account?.isVault == true && !VaultUnlock.isUnlocked(accountId) {
            guard let vc = presenter ?? topViewController() else { return }
            UnlockVC.presentAuth(
                on: vc,
                title: lang("Unlock Vault"),
                subtitle: lang("Enter passcode to open this vault wallet"),
                onDone: { _ in
                    VaultUnlock.unlock(accountId)
                    Task { @MainActor in
                        do {
                            _ = try await AccountStore.activateAccount(accountId: accountId)
                            then()
                        } catch {
                            AppActions.showError(error: error)
                        }
                    }
                },
                cancellable: true
            )
            return
        }

        Task { @MainActor in
            do {
                _ = try await AccountStore.activateAccount(accountId: accountId)
                then()
            } catch {
                AppActions.showError(error: error)
            }
        }
    }
}
