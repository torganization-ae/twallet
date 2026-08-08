//
//  HomeCard.swift
//  MyTonWalletAir
//
//  Created by nikstar on 19.11.2025.
//

import Foundation
import UIKit
import ContextMenuKit
import UIComponents
import WalletCore
import WalletContext
import SwiftUI
import Perception

struct HomeCardContent: View {
    
    var headerViewModel: HomeHeaderViewModel
    var accountContext: AccountContext
    var layout: HomeCardLayoutMetrics
    var minimumHomeCardFontScale: CGFloat = 1
    
    var progress: CGFloat { headerViewModel.collapseProgress }
    
    var body: some View {
        WithPerceptionTracking {
            VStack(spacing: 14) {
                _CenterContent(
                    accountContext: accountContext,
                    layout: layout,
                    minimumHomeCardFontScale: minimumHomeCardFontScale
                )
                    .scaleEffect(balanceScale)
                    .backportGeometryGroup()
                    .offset(y: -bottomPadding)
                    .id(accountContext.accountId)
                    .animation(.default, value: accountContext.balance)

                _AddressLine(accountContext: accountContext)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, layout.itemWidth * 0.05)
            .padding(.vertical, layout.itemHeight * 0.05)
            .opacity(headerViewModel.isCardHidden ? 0 : 1)
        }
    }
    
    var targetBottomPadding: CGFloat {
        -16 + (IOS_26_MODE_ENABLED ? -3 : -14)
    }

    var balanceScale: CGFloat { interpolate(from: 1, to: 17.0/40.0, progress: progress) }
    var bottomPadding: CGFloat { interpolate(from: 0, to: targetBottomPadding, progress: progress) }
}

private struct _CenterContent: View {
    
    let accountContext: AccountContext
    let layout: HomeCardLayoutMetrics
    let minimumHomeCardFontScale: CGFloat
    
    var body: some View {
        WithPerceptionTracking {
            _BalanceView(accountContext: accountContext, layout: layout, minimumHomeCardFontScale: minimumHomeCardFontScale)
                .padding(.leading, 1)
        }
    }
}

private struct _BalanceView: View {

    let accountContext: AccountContext
    let layout: HomeCardLayoutMetrics
    let minimumHomeCardFontScale: CGFloat

    var body: some View {
        WithPerceptionTracking {
            Button {
                AppActions.showPortfolio(accountContext: accountContext)
            } label: {
                _BalanceViewContent(
                    balance: accountContext.balance,
                    isCurrent: accountContext.isCurrent,
                    cardWidth: layout.itemWidth,
                    minimumHomeCardFontScale: minimumHomeCardFontScale
                )
            }
            .buttonStyle(.plain)
        }
    }
}

private struct _BalanceViewContent: View, Equatable {

    var balance: BaseCurrencyAmount?
    var isCurrent: Bool
    var cardWidth: CGFloat
    var minimumHomeCardFontScale: CGFloat
    
    var body: some View {
        CardBalanceView(
            balance: balance,
            isNumericTransitionEnabled: isCurrent,
            style: .homeCard(cardWidth: cardWidth, minimumScale: minimumHomeCardFontScale)
        )
        .backportGeometryGroup()
    }
    
}

private struct _AddressLine: View {

    let accountContext: AccountContext
    
    var body: some View {
        WithPerceptionTracking {
            let account = accountContext.account
            _AddressLineContent(
                accountId: account.id,
                isTemporary: account.isTemporary == true,
                addressLine: accountContext.addressLine,
                accountContext: accountContext
            )
        }
    }
}

private struct _AddressLineContent: View {

    var accountId: String
    var isTemporary: Bool
    var addressLine: MAccount.AddressLine
    var accountContext: AccountContext
    
    var body: some View {
        HStack(spacing: 8) {
            if isTemporary {
                AddViewButton(accountId: accountId, foregroundStyle: .white)
                    .padding(.vertical, -6)
            }
            AccountAddressLine(addressLine: addressLine, style: .homeCard)
                .padding(.vertical, 8)
                .padding(.trailing, 8)
                .contextMenuSource(
                    triggers: [.tap],
                    configuration: makeAddressesMenuConfig(accountContext: accountContext)
                )
                .padding(.trailing, -8)
                .backportGeometryGroup()
        }
        .animation(.smooth.delay(0.18), value: isTemporary)
    }
}
