import { useEffect, useState } from 'react'

// Panggil fungsi API saat komponen mount / saat deps berubah, plus state loading/error.
// Contoh: const { data, loading, error, reload } = useFetch(() => listReports({ status }), [status])
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetcher()
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((error) => !cancelled && setState({ data: null, loading: false, error }))
    return () => {
      cancelled = true
    }
    // fetcher sengaja tidak dimasukkan: biasanya arrow function baru tiap render
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    setVersion((v) => v + 1)
  }

  return { ...state, reload }
}
