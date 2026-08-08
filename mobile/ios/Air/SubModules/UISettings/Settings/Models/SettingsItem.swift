//
//  SettingsItem.swift
//  UISettings
//
//  Created by Sina on 6/26/24.
//

import Foundation
import UIKit
import WalletContext

struct SettingsItem: Equatable, Identifiable {
    
    enum Identifier: Equatable, Hashable {
        case editWalletName
        case account(accountId: String)
        case walletSettings
        case addAccount
        case notifications
        case appearance
        case assetsAndActivity
        case subwallets
        case connectedApps
        case language
        case networks
        case security
        case walletVersions
        case portfolio
    }
    
    let id: Identifier
    var icon: UIImage?
    var highlightIcon: Bool = true
    var title: String
    var subtitle: String? = nil
    var value: String? = nil
    var hasPrimaryColor: Bool
    var hasChild: Bool
    var isDangerous: Bool
}


extension SettingsItem.Identifier {
    var content: SettingsItem {
        switch self {
        case .editWalletName:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("EditWalletNameIcon").withRenderingMode(.alwaysTemplate),
                highlightIcon: false,
                title: lang("Edit Wallet Name"),
                hasPrimaryColor: true,
                hasChild: false,
                isDangerous: false
            )
        case .account:
            return SettingsItem(
                id: self,
                icon: nil,
                title: "",
                subtitle: "",
                hasPrimaryColor: false,
                hasChild: false,
                isDangerous: false
            )
        case .walletSettings:
            return SettingsItem(
                id: self,
                icon: UIImage(systemName: "ellipsis"),
                highlightIcon: false,
                title: lang("Show All Wallets"),
                hasPrimaryColor: true,
                hasChild: false,
                isDangerous: false
            )
        case .addAccount:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("AddAccountIcon").withRenderingMode(.alwaysTemplate),
                highlightIcon: false,
                title: lang("Add Wallet"),
                hasPrimaryColor: true,
                hasChild: false,
                isDangerous: false
            )
        case .notifications:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("NotificationsSettingsIcon"),
                title: lang("Sounds"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .appearance:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("AppearanceIcon"),
                title: lang("Appearance"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .assetsAndActivity:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("AssetsAndActivityIcon"),
                title: lang("Assets & Activity"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .subwallets:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("SubwalletsIcon"),
                title: lang("Subwallets"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .connectedApps:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("DappsIcon"),
                title: lang("Connected Sites"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .language:
            return SettingsItem(
                id: self,
                icon: .airBundle("LanguageIcon"),
                title: lang("Language"),
                value: Language.current.nativeName,
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .networks:
            return SettingsItem(
                id: self,
                icon: .airBundle("NetworksIcon"),
                title: lang("Networks"),
                subtitle: lang("RPC and API endpoints"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .security:
            return SettingsItem(
                id: self,
                icon: .airBundle("SecurityIcon"),
                title: lang("Security"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .walletVersions:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("WalletVersionsIcon"),
                title: lang("Wallet Versions"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        case .portfolio:
            return SettingsItem(
                id: self,
                icon: UIImage.airBundle("PortfolioIcon"),
                title: lang("Portfolio"),
                subtitle: lang("Performance, insights and P&L"),
                hasPrimaryColor: false,
                hasChild: true,
                isDangerous: false
            )
        }
    }
}
