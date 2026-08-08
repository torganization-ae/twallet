import SwiftUI
import UIKit
import WalletCore
import WalletContext
import Kingfisher

public struct WUIIconViewToken: UIViewRepresentable {
    
    public var token: ApiToken?
    public var showldShowChain: Bool
    public var size: CGFloat
    public var chainSize: CGFloat
    public var chainBorderWidth: CGFloat
    public var chainHorizontalOffset: CGFloat
    public var chainVerticalOffset: CGFloat
    
    public init(token: ApiToken? = nil, isWalletView: Bool = false, showldShowChain: Bool, size: CGFloat, chainSize: CGFloat,
                chainBorderWidth: CGFloat, chainHorizontalOffset: CGFloat, chainVerticalOffset: CGFloat) {
        _ = isWalletView
        self.token = token
        self.showldShowChain = showldShowChain
        self.size = size
        self.chainSize = chainSize
        self.chainBorderWidth = chainBorderWidth
        self.chainHorizontalOffset = chainHorizontalOffset
        self.chainVerticalOffset = chainVerticalOffset
    }
    
    public func makeUIView(context: Context) -> IconView {
        let uiView = IconView(size: size)
        NSLayoutConstraint.activate([
            uiView.heightAnchor.constraint(equalToConstant: size),
            uiView.widthAnchor.constraint(equalToConstant: size)
        ])
        uiView.setChainSize(chainSize, borderWidth: chainBorderWidth, horizontalOffset: chainHorizontalOffset, verticalOffset: chainVerticalOffset)
        uiView.config(with: token, shouldShowChain: showldShowChain)
        return uiView
    }
    
    public func updateUIView(_ uiView: UIViewType, context: Context) {
        uiView.setChainSize(chainSize, borderWidth: chainBorderWidth, horizontalOffset: chainHorizontalOffset, verticalOffset: chainVerticalOffset)
        uiView.config(with: token, shouldShowChain: showldShowChain)
    }
}
