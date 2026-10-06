import { cases } from '@/build/data'

/** Placeholder until T11 (UI shell) lands. Proves the data loads in the browser. */
export function App() {
  const hasWebGpu = 'gpu' in navigator
  return (
    <main className="mx-auto max-w-xl p-4 font-sans">
      <h1 className="text-2xl font-bold">PC Airflow</h1>
      <p className="mt-2">Nothing to see yet. {cases.size} case loaded.</p>
      <p className="mt-2">WebGPU: {hasWebGpu ? 'available' : 'not available in this browser'}</p>
    </main>
  )
}
