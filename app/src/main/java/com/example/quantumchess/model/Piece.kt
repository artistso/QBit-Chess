package com.example.quantumchess.model

enum class PieceColor {
    WHITE, BLACK;

    fun opposite(): PieceColor = if (this == WHITE) BLACK else WHITE
}

enum class PieceType(
    val symbol: String,
    val value: Int,
    val attackScalar: Float,
    val resistanceScalar: Float,
    val defaultHits: Int
) {
    PAWN("P", 100, 0.50f, 0.50f, 2),
    KNIGHT("N", 320, 0.42f, 0.34f, 3),
    BISHOP("B", 330, 0.42f, 0.34f, 3),
    ROOK("R", 500, 0.58f, 0.25f, 4),
    QUEEN("Q", 900, 0.75f, 0.25f, 4),
    KING("K", 20000, 0.60f, 0.20f, 5)
}

data class BoardPosition(val row: Int, val col: Int) {
    fun toNotation(): String {
        val file = ('a' + col).toString()
        val rank = (8 - row).toString()
        return "$file$rank"
    }
}

data class ChessPiece(
    val id: String,
    val type: PieceType,
    val color: PieceColor,
    var coherence: Float = 1.0f,
    var maxCoherence: Float = 1.0f,
    var hasMoved: Boolean = false,
    var entangledWithId: String? = null
) {
    val attackScalar: Float get() = type.attackScalar
    val resistanceScalar: Float get() = type.resistanceScalar

    fun isAlive(): Boolean = coherence > 0.05f

    fun copyPiece(): ChessPiece = copy(
        id = id,
        type = type,
        color = color,
        coherence = coherence,
        maxCoherence = maxCoherence,
        hasMoved = hasMoved,
        entangledWithId = entangledWithId
    )
}

data class ChessMove(
    val from: BoardPosition,
    val to: BoardPosition,
    val isCapture: Boolean = false,
    val castleSide: String? = null,
    val rookFromCol: Int? = null,
    val rookToCol: Int? = null
)

data class CombatResult(
    val attacker: ChessPiece,
    val defender: ChessPiece,
    val damageDealt: Float,
    val remainingCoherence: Float,
    val isShattered: Boolean,
    val entangledTransfer: Float,
    val entangledBacklash: Float,
    val strikePosition: BoardPosition
)
