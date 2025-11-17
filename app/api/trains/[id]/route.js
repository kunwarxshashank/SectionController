import { NextResponse } from "next/server"
import { updateTrain, deleteTrain } from "@/lib/models/train"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { createAuditLog } from "@/lib/models/admin"

export async function PUT(request, { params }) {
  try {
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!token || !decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: trainId } = params
    const updateData = await request.json()

    const updated = await updateTrain(trainId, updateData)

    if (!updated) {
      return NextResponse.json({ error: "Train not found or update failed" }, { status: 404 })
    }

    // Create audit log
    await createAuditLog(decoded.adminId, "train_update", {
      trainId,
      action: "update",
      changes: updateData,
    })

    return NextResponse.json({ success: true, message: "Train updated successfully" })
  } catch (error) {
    console.error("Update train error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!token || !decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: trainId } = params

    const deleted = await deleteTrain(trainId)

    if (!deleted) {
      return NextResponse.json({ error: "Train not found or delete failed" }, { status: 404 })
    }

    // Create audit log
    await createAuditLog(decoded.adminId, "train_update", {
      trainId,
      action: "delete",
    })

    return NextResponse.json({ success: true, message: "Train deleted successfully" })
  } catch (error) {
    console.error("Delete train error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
