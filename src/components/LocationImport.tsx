'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, Loader2, Check, AlertCircle, FileJson, X } from 'lucide-react'

interface ImportStats {
  totalPlaces: number
  totalDates: number
  dateRange: {
    start?: string
    end?: string
  }
}

interface LocationSummary {
  hasData: boolean
  totalDates: number
  totalPlaces: number
  dateRange: {
    start: string
    end: string
  } | null
}

export default function LocationImport() {
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<ImportStats | null>(null)
  const [summary, setSummary] = useState<LocationSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch current import status on mount
  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/location/import')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSummary(data)
    } catch (err) {
      console.error('Failed to fetch location summary:', err)
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
    setError('')
    setSuccess(null)
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setError('Please select files to import')
      return
    }

    setImporting(true)
    setError('')
    setSuccess(null)

    try {
      const formData = new FormData()
      for (const file of selectedFiles) {
        formData.append('files', file)
      }

      const res = await fetch('/api/location/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setSuccess(data.stats)
      setSelectedFiles([])
      fetchSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [selectedFiles])

  const formatDateRange = (dateRange: { start: string; end: string } | null) => {
    if (!dateRange) return 'No data'
    const start = new Date(dateRange.start).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const end = new Date(dateRange.end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${start} - ${end}`
  }

  return (
    <div className="space-y-4">
      {/* Current Status */}
      {loadingSummary ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading status...
        </div>
      ) : summary?.hasData ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <Check className="w-4 h-4" />
            Location data imported
          </div>
          <div className="mt-1 text-sm text-emerald-600">
            {summary.totalPlaces.toLocaleString()} places across {summary.totalDates.toLocaleString()} days
            <br />
            {formatDateRange(summary.dateRange)}
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-500">
          No location data imported yet
        </div>
      )}

      {/* File Selection */}
      <div className="border-2 border-dashed border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="location-file-input"
        />

        <label
          htmlFor="location-file-input"
          className="flex flex-col items-center gap-2 cursor-pointer"
        >
          <div className="p-2 bg-zinc-100 rounded-lg">
            <Upload className="w-5 h-5 text-zinc-600" />
          </div>
          <div className="text-center">
            <span className="text-sm font-medium text-zinc-700">
              Select Takeout files
            </span>
            <p className="text-xs text-zinc-500 mt-0.5">
              JSON files from Semantic Location History
            </p>
          </div>
        </label>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-zinc-700">
            Selected files ({selectedFiles.length})
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 text-sm bg-zinc-50 px-3 py-2 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileJson className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <span className="truncate text-zinc-700">{file.name}</span>
                  <span className="text-zinc-400 flex-shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Import {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4" />
            Import successful!
          </div>
          <div className="mt-1 text-emerald-600">
            Imported {success.totalPlaces.toLocaleString()} places across {success.totalDates.toLocaleString()} days
            {success.dateRange.start && success.dateRange.end && (
              <> ({formatDateRange({ start: success.dateRange.start, end: success.dateRange.end })})</>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-zinc-400 space-y-1">
        <p className="font-medium">How to export from Google:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Go to takeout.google.com</li>
          <li>Select only &quot;Location History&quot;</li>
          <li>Choose JSON format</li>
          <li>Download and extract the ZIP</li>
          <li>Upload files from Semantic Location History folder</li>
        </ol>
      </div>
    </div>
  )
}
