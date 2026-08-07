
import SwiftUI
import WalletCore
import WalletContext

let viewBadgeCornerRadius: CGFloat = 5
let viewBadgeVerticalPadding: CGFloat = 3

public struct AccountTypeBadge: View {
    
    var accountType: AccountType
    var isVault: Bool
    var increasedOpacity: Bool
    
    public init(_ accountType: AccountType, isVault: Bool = false, increasedOpacity: Bool = false) {
        self.accountType = accountType
        self.isVault = isVault
        self.increasedOpacity = increasedOpacity
    }

    public init(account: MAccount, increasedOpacity: Bool = false) {
        self.accountType = account.type
        self.isVault = account.isVault
        self.increasedOpacity = increasedOpacity
    }
    
    public var body: some View {
        HStack(spacing: 4) {
            if isVault {
                vault
            }
            switch accountType {
            case .mnemonic:
                if !isVault {
                    EmptyView()
                }
            case .hardware:
                hardware
            case .view:
                view
            }
        }
    }
    
    var hardware: some View {
        Image.airBundle("LedgerBadge")
            .opacity(increasedOpacity ? 1 : 0.75)
    }
    
    @ViewBuilder
    var view: some View {
        HStack(spacing: 2) {
            Image.airBundle("ViewBadge")
                .offset(y: 0.667)
            Text(lang("$view_mode"))
                .font(.system(size: 12, weight: .semibold))
        }
        .offset(y: -0.333)
        .opacity(increasedOpacity ? 1 : 0.75)
        .padding(.horizontal, 3)
        .frame(height: 18)
        .background {
            Rectangle()
                .opacity(0.12)
        }
        .clipShape(.rect(cornerRadius: viewBadgeCornerRadius))
        .padding(.vertical, -viewBadgeVerticalPadding)
    }

    @ViewBuilder
    var vault: some View {
        HStack(spacing: 2) {
            Image(systemName: "lock.fill")
                .font(.system(size: 9, weight: .semibold))
            Text(lang("Vault"))
                .font(.system(size: 12, weight: .semibold))
        }
        .offset(y: -0.333)
        .opacity(increasedOpacity ? 1 : 0.75)
        .padding(.horizontal, 4)
        .frame(height: 18)
        .background {
            Rectangle()
                .opacity(0.12)
        }
        .clipShape(.rect(cornerRadius: viewBadgeCornerRadius))
        .padding(.vertical, -viewBadgeVerticalPadding)
    }
}


#Preview {
    ZStack {
        HStack(spacing: 0) {
            Color.blue
            Color.blue.opacity(0.5)
        }
        
        VStack {
            AccountTypeBadge(.mnemonic)
            AccountTypeBadge(.mnemonic, isVault: true)
            AccountTypeBadge(.hardware)
            AccountTypeBadge(.view)
        }
        .foregroundStyle(.white)
        .scaleEffect(4)
        .padding()
    }
}
