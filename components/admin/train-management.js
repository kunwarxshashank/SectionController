"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Train, AlertCircle } from "lucide-react"

export default function TrainManagement() {
  const [trains, setTrains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTrain, setEditingTrain] = useState(null)
  const [formData, setFormData] = useState({
    trainId: "",
    name: "",
    type: "local",
    priority: "normal",
    schedule: {
      origin: "",
      destination: "",
      plannedDeparture: "",
      plannedArrival: "",
    },
    route: [],
  })

  useEffect(() => {
    fetchTrains()
  }, [])

  const fetchTrains = async () => {
    try {
      const response = await fetch("/api/trains")
      if (response.ok) {
        const data = await response.json()
        setTrains(data.trains || [])
      } else {
        setError("Failed to fetch trains")
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    try {
      const url = editingTrain ? `/api/trains/${editingTrain.trainId}` : "/api/trains"
      const method = editingTrain ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchTrains()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to save train")
      }
    } catch (error) {
      setError("Network error")
    }
  }

  const handleDelete = async (trainId) => {
    if (!confirm("Are you sure you want to delete this train?")) return

    try {
      const response = await fetch(`/api/trains/${trainId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchTrains()
      } else {
        setError("Failed to delete train")
      }
    } catch (error) {
      setError("Network error")
    }
  }

  const resetForm = () => {
    setFormData({
      trainId: "",
      name: "",
      type: "local",
      priority: "normal",
      schedule: {
        origin: "",
        destination: "",
        plannedDeparture: "",
        plannedArrival: "",
      },
      route: [],
    })
    setEditingTrain(null)
  }

  const openEditDialog = (train) => {
    setEditingTrain(train)
    setFormData({
      trainId: train.trainId,
      name: train.name,
      type: train.type,
      priority: train.priority,
      schedule: train.schedule || {
        origin: "",
        destination: "",
        plannedDeparture: "",
        plannedArrival: "",
      },
      route: train.route || [],
    })
    setIsDialogOpen(true)
  }

  const getTypeColor = (type) => {
    switch (type) {
      case "express":
        return "bg-purple-100 text-purple-800"
      case "freight":
        return "bg-amber-100 text-amber-800"
      case "local":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "normal":
        return "bg-blue-100 text-blue-800"
      case "low":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Train className="h-5 w-5" />
              Train Management
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Train
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTrain ? "Edit Train" : "Add New Train"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trainId">Train ID</Label>
                      <Input
                        id="trainId"
                        value={formData.trainId}
                        onChange={(e) => setFormData({ ...formData, trainId: e.target.value })}
                        placeholder="T-401"
                        required
                        disabled={editingTrain}
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Train Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Express 401"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="express">Express</SelectItem>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="freight">Freight</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origin">Origin</Label>
                      <Input
                        id="origin"
                        value={formData.schedule.origin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            schedule: { ...formData.schedule, origin: e.target.value },
                          })
                        }
                        placeholder="New Delhi"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destination">Destination</Label>
                      <Input
                        id="destination"
                        value={formData.schedule.destination}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            schedule: { ...formData.schedule, destination: e.target.value },
                          })
                        }
                        placeholder="Terminal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="departure">Planned Departure</Label>
                      <Input
                        id="departure"
                        type="time"
                        value={formData.schedule.plannedDeparture}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            schedule: { ...formData.schedule, plannedDeparture: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="arrival">Planned Arrival</Label>
                      <Input
                        id="arrival"
                        type="time"
                        value={formData.schedule.plannedArrival}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            schedule: { ...formData.schedule, plannedArrival: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingTrain ? "Update" : "Create"} Train</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {trains.length === 0 ? (
              <div className="text-center py-8 text-grey-500">
                No trains configured. Add your first train to get started.
              </div>
            ) : (
              trains.map((train) => (
                <div key={train.trainId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold">{train.name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {train.trainId}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getTypeColor(train.type)}>{train.type}</Badge>
                      <Badge className={getPriorityColor(train.priority)}>{train.priority}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {train.schedule?.origin} → {train.schedule?.destination}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(train)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(train.trainId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
