import { AlertTriangle } from "lucide-react"

export default function ErrorMessage({ error }) {
  if (!error) return null

  return (
    <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  )
}
