//
//  ReceiveCells.swift
//  UIReceive
//

import SwiftUI
import UIKit
import UIComponents
import WalletContext
import WalletCore

struct AddressCell: View {
    let address: String
    let chain: ApiChain

    var body: some View {
        HStack(spacing: 10) {
            Image(uiImage: chain.image)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 22, height: 22)

            Text(address.isEmpty ? "—" : address)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.air.primaryLabel)
                .lineLimit(1)
                .truncationMode(.middle)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button {
                copyAddress()
            } label: {
                Image.airBundle("HomeCopy")
                    .foregroundStyle(Color.air.secondaryLabel)
                    .frame(width: 28, height: 28)
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .disabled(address.isEmpty)

            Button {
                openExplorer()
            } label: {
                Image(systemName: "info.circle")
                    .font(.system(size: 17, weight: .regular))
                    .foregroundStyle(Color.air.secondaryLabel)
                    .frame(width: 28, height: 28)
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .disabled(address.isEmpty)
        }
        .frame(minHeight: 24)
        .contentShape(.rect)
        .onTapGesture {
            copyAddress()
        }
    }

    private func copyAddress() {
        guard !address.isEmpty else { return }
        UIPasteboard.general.string = address
        AppActions.showToast(icon: .animatedCopy, message: lang("%chain% Address Copied", arg1: chain.title))
        Haptics.play(.lightTap)
    }

    private func openExplorer() {
        guard !address.isEmpty else { return }
        let url = ExplorerHelper.addressUrl(chain: chain, address: address)
        AppActions.openInBrowser(url)
    }
}

struct ReceiveActionItemCell: View {
    let imageName: String
    let title: String

    var body: some View {
        HStack(spacing: 12) {
            Image.airBundle(imageName)
                .frame(width: 30, height: 30)
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.air.secondaryLabel)
        }
    }
}

extension AddressCell {
    static func makeRegistration(
        address: String,
        chain: ApiChain
    ) -> UICollectionView.CellRegistration<UICollectionViewListCell, Void> {
        UICollectionView.CellRegistration<UICollectionViewListCell, Void> { cell, _, _ in
            cell.contentConfiguration = UIHostingConfiguration {
                AddressCell(address: address, chain: chain)
            }
            .background {
                Color.air.groupedItem
            }
            .margins(.horizontal, 12)
            .margins(.vertical, 12)
        }
    }
}

extension ReceiveActionItemCell {
    static func makeRegistration() -> UICollectionView.CellRegistration<UICollectionViewListCell, ReceiveItem> {
        UICollectionView.CellRegistration<UICollectionViewListCell, ReceiveItem> { cell, _, item in
            guard case .depositLink = item else { return }
            let imageName = "MenuLinkToWallet26"
            let title = lang("Create Deposit Link")
            cell.configurationUpdateHandler = { cell, state in
                cell.contentConfiguration = UIHostingConfiguration {
                    ReceiveActionItemCell(imageName: imageName, title: title)
                }
                .background {
                    CellBackgroundHighlight(isHighlighted: state.isHighlighted)
                }
                .margins(.horizontal, 16)
                .margins(.vertical, 0)
                .minSize(height: S.sectionItemHeight)
            }
        }
    }
}

struct ViewWalletWarningFooter: View {
    var body: some View {
        let color = Color(UIColor.airBundle("WarningLabel"))

        Text(langMd("$view_only_wallet_receive_warning"))
            .frame(maxWidth: .infinity, alignment: .leading)
            .font(.system(size: 13))
            .foregroundStyle(color)
            .padding(.leading, 12)
            .padding(.trailing, 16)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
            .background(color.opacity(0.12))
            .overlay(alignment: .leading) {
                Rectangle()
                    .fill(color)
                    .frame(width: 4)
            }
            .clipShape(.rect(cornerRadius: 10))
    }
}

extension ViewWalletWarningFooter {
    static func makeFooterRegistration() -> UICollectionView.SupplementaryRegistration<UICollectionViewCell> {
        UICollectionView.SupplementaryRegistration<UICollectionViewCell>(
            elementKind: UICollectionView.elementKindSectionFooter
        ) { view, _, _ in
            view.contentConfiguration = UIHostingConfiguration {
                ViewWalletWarningFooter()
            }
            .margins(.horizontal, 0)
            .margins(.vertical, 16)
        }
    }
}

enum ReceiveItem: Hashable {
    case address
    case depositLink
}
