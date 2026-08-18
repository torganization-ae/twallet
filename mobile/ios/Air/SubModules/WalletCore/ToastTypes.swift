import Foundation

public enum ToastStyle: Equatable {
    case standard, large
}

public enum ToastIcon: Equatable {
    case animatedCopy
    case symbolImage(String)
    case networkImage(URL)
}

public enum ToastTransition {
    case fadeIn
    case floatUp
}

public struct ToastConfig {
    public var style: ToastStyle
    public var icon: ToastIcon?
    public var message: String
    public var duration: Double
    public var transition: ToastTransition
    public var actionTitle: String?
    public var action: (() -> ())?
    public var isError: Bool
    public var pinToTop: Bool

    public init(style: ToastStyle? = nil, icon: ToastIcon? = nil, message: String, duration: Double? = nil,
                transition: ToastTransition? = nil, actionTitle: String? = nil, action: (() -> ())? = nil,
                isError: Bool = false, pinToTop: Bool? = nil) {
        self.style = style ?? .standard
        self.icon = icon
        self.message = message
        self.duration = duration ?? 1.5
        self.transition = transition ?? .fadeIn
        self.actionTitle = actionTitle
        self.action = action
        self.isError = isError
        self.pinToTop = pinToTop ?? isError
    }
}
