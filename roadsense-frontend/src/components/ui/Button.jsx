// variant: primary | secondary | ghost
export default function Button({ variant = 'primary', icon: Icon, iconRight: IconRight, children, className = '', ...props }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} {...props}>
      {Icon && <Icon size={15} strokeWidth={2} />}
      {children}
      {IconRight && <IconRight size={15} strokeWidth={2} />}
    </button>
  )
}
