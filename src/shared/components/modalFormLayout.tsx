import { Children, Fragment, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';

type Props = { children?: ReactNode; className?: string; style?: CSSProperties; role?: string; type?: string };
type Element = ReactElement<Props>;
const classes = (node: Element) => node.props.className?.split(/\s+/) ?? [];
const hasClass = (node: ReactNode, name: string): node is Element => isValidElement<Props>(node) && classes(node).includes(name);
const summaryError = (node: ReactNode) => isValidElement<Props>(node)
  && !classes(node).some(name => ['field-error', 'mu-field-error'].includes(name))
  && (classes(node).some(name => ['form-error-banner', 'admin-form-error', 'auth-error-banner'].includes(name)) || node.props.role === 'alert');
const containsControl = (node: ReactNode): boolean => isValidElement<Props>(node)
  && ((['input', 'select', 'textarea', 'label', 'form'].includes(String(node.type)) && node.props.type !== 'submit' && node.props.type !== 'button')
    || Children.toArray(node.props.children).some(containsControl));
const isActions = (node: ReactNode): node is Element => isValidElement<Props>(node)
  && !classes(node).some(name => ['modal-body', 'admin-modal-body'].includes(name))
  && (classes(node).some(name => ['confirm-dialog-actions', 'confirm-actions', 'form-actions', 'modal-footer', 'admin-modal-footer', 'mu-modal-actions'].includes(name))
    || (['div', 'footer'].includes(String(node.type)) && !containsControl(node)
      && Children.toArray(node.props.children).some(child => isValidElement<Props>(child) && child.props.type === 'submit')));

/** Normalize legacy modal forms without changing their handlers, controls or values. */
function layoutForm(form: Element): Element | null {
  const children = Children.toArray(form.props.children);
  const bodyIndex = children.findIndex(node => hasClass(node, 'modal-body') || hasClass(node, 'admin-modal-body'));
  const last = children.at(-1);
  if (!isActions(last)) return null;
  const existingBody = bodyIndex >= 0 && isValidElement<Props>(children[bodyIndex]) ? children[bodyIndex] as Element : null;
  const bodyChildren = existingBody ? Children.toArray(existingBody.props.children) : children.slice(0, -1);
  const errors = bodyChildren.filter(summaryError).map(node => {
    const error = node as Element;
    return cloneElement(error, {
      className: [...new Set([...classes(error), 'form-error-banner'])].join(' '),
      role: 'alert',
      style: { ...error.props.style, margin: '0 0 12px' },
    });
  });
  const fields = bodyChildren.filter(node => !summaryError(node));
  const alreadySplit = Boolean(existingBody && (hasClass(last, 'modal-footer') || hasClass(last, 'admin-modal-footer')));
  const footer = alreadySplit
    ? cloneElement(last, { className: [...classes(last), 'modal-footer'].join(' ') }, <>{errors}{last.props.children}</>)
    : <div className="modal-footer" key="modal-form-footer">
        {errors}
        {cloneElement(last, { style: { ...last.props.style, margin: 0, paddingTop: 0, borderTop: undefined } })}
      </div>;
  const body = existingBody
    ? cloneElement(existingBody, { className: [...classes(existingBody), 'modal-body'].join(' ') }, fields)
    : <div className="modal-body" key="modal-form-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{fields}</div>;
  // Retain context/fieldset siblings in forms that already have an explicit body.
  const content = existingBody ? children.slice(0, -1).map((node, index) => index === bodyIndex ? body : node) : [body];
  return cloneElement(form, {
    className: classes(form).filter(name => name !== 'modal-body').join(' '),
    style: { ...form.props.style, gap: 0, padding: 0, maxHeight: undefined, overflowY: undefined },
  }, <>{content}{footer}</>);
}

export function normalizeModalForms(children: ReactNode): { content: ReactNode; hasForm: boolean } {
  let hasForm = false;
  const content = Children.map(children, node => {
    if (!isValidElement<Props>(node)) return node;
    if (node.type === 'form') {
      const form = layoutForm(node);
      if (form) hasForm = true;
      return form ?? node;
    }
    // React components own their internals; only traverse actual markup/fragments.
    if (typeof node.type !== 'string' && node.type !== Fragment) return node;
    const nested = normalizeModalForms(node.props.children);
    if (!nested.hasForm) return node;
    hasForm = true;
    return node.type === Fragment ? cloneElement(node, {}, nested.content)
      : cloneElement(node, { className: [...classes(node), 'modal-form-wrapper'].join(' ') }, nested.content);
  });
  return { content, hasForm };
}
