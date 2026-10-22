package com.example.quantumchess.ai

import com.example.quantumchess.engine.ChessEngine
import com.example.quantumchess.model.BoardPosition
import com.example.quantumchess.model.ChessMove
import com.example.quantumchess.model.ChessPiece
import com.example.quantumchess.model.PieceColor
import com.example.quantumchess.model.PieceType
import kotlin.math.abs
import kotlin.random.Random

class TacticalChessAI(private val chessEngine: ChessEngine) {

    fun chooseMove(color: PieceColor, board: Map<BoardPosition, ChessPiece>): ChessMove? {
        val legalMoves = chessEngine.getAllLegalMoves(color, board)
        if (legalMoves.isEmpty()) return null

        var bestScore = Float.NEGATIVE_INFINITY
        val bestCandidates = mutableListOf<ChessMove>()
        val oppColor = color.opposite()

        for (m in legalMoves) {
            val piece = board[m.from] ?: continue
            val target = board[m.to]
            var score = 0f

            // 1. Material gain on capture
            if (target != null) {
                score += target.type.value * 1.15f - piece.type.value * 0.08f
            }

            // 2. Center control bonus (squares d4, d5, e4, e5)
            val centerDist = abs(3.5f - m.to.row) + abs(3.5f - m.to.col)
            score += (7f - centerDist) * 8f

            // 3. Pawn advancement bonus
            if (piece.type == PieceType.PAWN) {
                val advance = if (color == PieceColor.WHITE) (6 - m.to.row) else (m.to.row - 1)
                score += advance * 12f
            }

            // 4. Simulate move to evaluate checks and hanging risk
            val simBoard = board.toMutableMap()
            simBoard.remove(m.from)
            simBoard[m.to] = piece

            if (chessEngine.isKingInCheck(oppColor, simBoard)) {
                score += 45f // Check bonus
            }

            // Check if destination is hanging to an immediate recapture
            for ((oppPos, oppPiece) in simBoard) {
                if (oppPiece.color == oppColor) {
                    val oppPseudo = chessEngine.getPseudoMoves(oppPos, oppPiece, simBoard)
                    if (oppPseudo.any { it.to == m.to }) {
                        score -= piece.type.value * 0.75f
                        break
                    }
                }
            }

            // Subtle jitter for opening variety
            score += (Random.nextFloat() - 0.5f) * 14f

            if (score > bestScore + 1f) {
                bestScore = score
                bestCandidates.clear()
                bestCandidates.add(m)
            } else if (abs(score - bestScore) <= 1f) {
                bestCandidates.add(m)
            }
        }

        return bestCandidates.randomOrNull() ?: legalMoves.first()
    }
}
