import reactHooksStaticDeps from 'eslint-plugin-react-hooks-static-deps';

// `eslint-plugin-react-hooks-static-deps` calls ESLint <=8 legacy `context` APIs
// (getSource / getSourceCode / getScope) that were removed in ESLint 9's rule context.
// getSource/getSourceCode map directly onto `context.sourceCode`. getScope() used to
// implicitly return the scope of whichever node ESLint's traverser was currently visiting,
// so the wrapped visitor below tracks that node and forwards it to `sourceCode.getScope(node)`.
const originalRule = reactHooksStaticDeps.rules['exhaustive-deps'];

const exhaustiveDeps = {
  ...originalRule,
  create(context) {
    let currentNode;

    const proxiedContext = new Proxy(context, {
      get(target, prop, receiver) {
        switch (prop) {
          case 'getSource':
            return (node) => target.sourceCode.getText(node);
          case 'getSourceCode':
            return () => target.sourceCode;
          case 'getScope':
            return () => target.sourceCode.getScope(currentNode ?? target.sourceCode.ast);
          default:
            return Reflect.get(target, prop, receiver);
        }
      },
    });

    const visitors = originalRule.create(proxiedContext);
    const wrappedVisitors = {};
    for (const [selector, handler] of Object.entries(visitors)) {
      if (typeof handler !== 'function') {
        wrappedVisitors[selector] = handler;
        continue;
      }
      wrappedVisitors[selector] = (node, ...args) => {
        currentNode = node;
        return handler(node, ...args);
      };
    }
    return wrappedVisitors;
  },
};

export default {
  ...reactHooksStaticDeps,
  rules: {
    ...reactHooksStaticDeps.rules,
    'exhaustive-deps': exhaustiveDeps,
  },
};
