import { useId } from 'react'

// Label + input. Pakai multiline untuk textarea.
export default function Field({ label, multiline = false, ...props }) {
  const id = useId()
  const Control = multiline ? 'textarea' : 'input'
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Control id={id} rows={multiline ? 3 : undefined} {...props} />
    </div>
  )
}
