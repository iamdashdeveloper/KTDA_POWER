import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Card } from "@workspace/ui/components/card"
import { X, Plus, Upload, Trash2 } from "lucide-react"

type DataType =
  | "text"
  | "number"
  | "email"
  | "url"
  | "color"
  | "list"
  | "upload"
  | "boolean"

interface MetadataEntry {
  id: string
  key: string
  type: DataType
  value: string | number | boolean | string[] | any[]
}

interface JsonMetadataEditorProps {
  value?: Record<string, any>
  onChange: (value: Record<string, any>) => void
  title?: string
  fields?: {
    key: string
    label: string
    type: DataType
  }[]
}

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "color", label: "Color" },
  { value: "boolean", label: "Boolean" },
  { value: "list", label: "List" },
  { value: "upload", label: "File Upload" },
]

export function JsonMetadataEditor({
  value = {},
  onChange,
  title = "Metadata",
  fields,
}: JsonMetadataEditorProps) {
  const [entries, setEntries] = useState<MetadataEntry[]>(
    Object.entries(value).map(([key, val], index) => ({
      id: `${index}-${key}`,
      key,
      type: Array.isArray(val)
        ? "list"
        : typeof val === "boolean"
          ? "boolean"
          : "text",
      value: val,
    }))
  )

  const handleAddEntry = () => {
    setEntries([
      ...entries,
      {
        id: `${Date.now()}-${Math.random()}`,
        key: "",
        type: "text",
        value: "",
      },
    ])
  }

  const handleRemoveEntry = (id: string) => {
    const newEntries = entries.filter((e) => e.id !== id)
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const handleEntryChange = (
    id: string,
    field: keyof MetadataEntry,
    newValue: any
  ) => {
    const newEntries = entries.map((e) => {
      if (e.id === id) {
        return { ...e, [field]: newValue }
      }
      return e
    })
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const handleTypeChange = (id: string, newType: DataType) => {
    const newEntries = entries.map((e) => {
      if (e.id === id) {
        // Reset value based on new type
        let newValue: string | number | boolean | string[] | any[] = ""
        if (newType === "list") newValue = []
        else if (newType === "number") newValue = 0
        else if (newType === "boolean") newValue = false
        else if (newType === "upload") newValue = []
        return { ...e, type: newType, value: newValue }
      }
      return e
    })
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const handleListItemAdd = (id: string) => {
    const newEntries = entries.map((e) => {
      if (e.id === id) {
        const currentList = Array.isArray(e.value) ? e.value : []
        return { ...e, value: [...currentList, ""] }
      }
      return e
    })
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const handleListItemChange = (
    id: string,
    index: number,
    newValue: string
  ) => {
    const newEntries = entries.map((e) => {
      if (e.id === id && Array.isArray(e.value)) {
        const newList = [...e.value]
        newList[index] = newValue
        return { ...e, value: newList }
      }
      return e
    })
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const handleListItemRemove = (id: string, index: number) => {
    const newEntries = entries.map((e) => {
      if (e.id === id && Array.isArray(e.value)) {
        return { ...e, value: e.value.filter((_, i) => i !== index) }
      }
      return e
    })
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const handleFileUpload = (
    id: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (result && typeof result === "string") {
          const newEntries = entries.map((entry) => {
            if (entry.id === id) {
              const currentUrls = Array.isArray(entry.value) ? entry.value : []
              return { ...entry, value: [...currentUrls, result] }
            }
            return entry
          })
          setEntries(newEntries)
          updateParent(newEntries)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const updateParent = (entries: MetadataEntry[]) => {
    const result: Record<string, any> = {}
    entries.forEach(({ key, value }) => {
      if (key.trim()) {
        result[key] = value
      }
    })
    onChange(result)
  }

  // If structured fields provided, render them instead
  if (fields) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-semibold">{title}</h3>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-2 block text-sm font-medium">
                {field.label}
              </label>
              <Input
                type={field.type}
                value={String(value[field.key] || "")}
                onChange={(e) => {
                  onChange({
                    ...value,
                    [field.key]:
                      field.type === "number"
                        ? parseFloat(e.target.value)
                        : e.target.value,
                  })
                }}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  // Advanced flexible editor with table-like layout
  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddEntry}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No properties added yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 rounded-lg bg-muted p-3 text-sm font-medium">
            <div className="col-span-3">Key</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-6">Value</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Rows */}
          {entries.map((entry) => (
            <div key={entry.id} className="space-y-2 rounded-lg border p-3">
              <div className="grid grid-cols-12 gap-2">
                {/* Key Input */}
                <Input
                  placeholder="Property name (e.g., directors, images)"
                  value={entry.key}
                  onChange={(e) =>
                    handleEntryChange(entry.id, "key", e.target.value)
                  }
                  className="col-span-3"
                />

                {/* Type Select */}
                <Select
                  value={entry.type}
                  onValueChange={(v) =>
                    handleTypeChange(entry.id, v as DataType)
                  }
                >
                  <SelectTrigger className="col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value Input - varies by type */}
                <div className="col-span-6">
                  {entry.type === "text" && (
                    <Input
                      placeholder="Enter text"
                      value={String(entry.value)}
                      onChange={(e) =>
                        handleEntryChange(entry.id, "value", e.target.value)
                      }
                    />
                  )}

                  {entry.type === "number" && (
                    <Input
                      type="number"
                      placeholder="Enter number"
                      value={Number(entry.value)}
                      onChange={(e) =>
                        handleEntryChange(
                          entry.id,
                          "value",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  )}

                  {entry.type === "email" && (
                    <Input
                      type="email"
                      placeholder="Enter email"
                      value={String(entry.value)}
                      onChange={(e) =>
                        handleEntryChange(entry.id, "value", e.target.value)
                      }
                    />
                  )}

                  {entry.type === "url" && (
                    <Input
                      type="url"
                      placeholder="Enter URL"
                      value={String(entry.value)}
                      onChange={(e) =>
                        handleEntryChange(entry.id, "value", e.target.value)
                      }
                    />
                  )}

                  {entry.type === "color" && (
                    <Input
                      type="color"
                      value={String(entry.value || "#000000")}
                      onChange={(e) =>
                        handleEntryChange(entry.id, "value", e.target.value)
                      }
                      className="h-10"
                    />
                  )}

                  {entry.type === "boolean" && (
                    <Select
                      value={entry.value ? "true" : "false"}
                      onValueChange={(v) =>
                        handleEntryChange(entry.id, "value", v === "true")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveEntry(entry.id)}
                  className="col-span-1 text-red-500 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* List Editor */}
              {entry.type === "list" && (
                <div className="mt-3 ml-4 space-y-2 border-t pt-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    List Items
                  </p>
                  {Array.isArray(entry.value) && entry.value.length > 0 && (
                    <div className="space-y-2">
                      {entry.value.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Item ${index + 1}`}
                            value={item}
                            onChange={(e) =>
                              handleListItemChange(
                                entry.id,
                                index,
                                e.target.value
                              )
                            }
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleListItemRemove(entry.id, index)
                            }
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleListItemAdd(entry.id)}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              )}

              {/* File Upload Editor */}
              {entry.type === "upload" && (
                <div className="mt-3 ml-4 space-y-2 border-t pt-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Uploaded Files
                  </p>

                  {Array.isArray(entry.value) && entry.value.length > 0 && (
                    <div className="space-y-2">
                      {entry.value.map((url, index) => (
                        <div key={index} className="flex gap-2">
                          {url.startsWith("data:image") ? (
                            <img
                              src={url}
                              alt={`upload-${index}`}
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                              <span className="text-xs text-muted-foreground">
                                📄
                              </span>
                            </div>
                          )}
                          <div className="flex-1 truncate text-sm text-muted-foreground">
                            {url.substring(0, 50)}...
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleListItemRemove(entry.id, index)
                            }
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed p-3 text-sm transition-colors hover:bg-muted/50">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(entry.id, e)}
                      className="hidden"
                    />
                    <Upload className="h-4 w-4" />
                    Click to upload files
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
