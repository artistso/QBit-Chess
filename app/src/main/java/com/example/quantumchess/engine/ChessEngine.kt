package com.example.quantumchess.engine

import com.example.quantumchess.model.BoardPosition
import com.example.quantumchess.model.ChessMove
import com.example.quantumchess.model.ChessPiece
import com.example.quantumchess.model.PieceColor
import com.example.quantumchess.model.PieceType

class ChessEngine {

    companion object {
        fun createInitialBoard(): MutableMap<BoardPosition, ChessPiece> {
            val board = mutableMapOf<BoardPosition, ChessPiece>()

            fun place(r: Int, c: Int, type: PieceType, color: PieceColor, idSuffix: String) {
                val piece = ChessPiece(
                    id = "${color.name.lowercase()}_${type.name.lowercase()}_$idSuffix",
                    type = type,
                    color = color
                )
                board[BoardPosition(r, c)] = piece
            }

            // Black pieces (row 0 and 1)
            val backRank = listOf(
                PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
                PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK
            )
            for (c in 0..7) {
                place(0, c, backRank[c], PieceColor.BLACK, "back_$c")
                place(1, c, PieceType.PAWN, PieceColor.BLACK, "pawn_$c")
            }

            // White pieces (row 7 and 6)
            for (c in 0..7) {
                place(7, c, backRank[c], PieceColor.WHITE, "back_$c")
                place(6, c, PieceType.PAWN, PieceColor.WHITE, "pawn_$c")
            }

            return board
        }
    }

    fun getPseudoMoves(
        pos: BoardPosition,
        piece: ChessPiece,
        board: Map<BoardPosition, ChessPiece>
    ): List<ChessMove> {
        val moves = mutableListOf<ChessMove>()
        val r = pos.row
        val c = pos.col

        when (piece.type) {
            PieceType.PAWN -> {
                val dir = if (piece.color == PieceColor.WHITE) -1 else 1
                val startRow = if (piece.color == PieceColor.WHITE) 6 else 1

                // 1 step forward
                val f1 = BoardPosition(r + dir, c)
                if (f1.row in 0..7 && !board.containsKey(f1)) {
                    moves.add(ChessMove(from = pos, to = f1, isCapture = false))
                    // 2 steps forward from home rank
                    val f2 = BoardPosition(r + 2 * dir, c)
                    if (r == startRow && !board.containsKey(f2)) {
                        moves.add(ChessMove(from = pos, to = f2, isCapture = false))
                    }
                }

                // Diagonal captures
                for (dc in listOf(-1, 1)) {
                    val capPos = BoardPosition(r + dir, c + dc)
                    if (capPos.row in 0..7 && capPos.col in 0..7) {
                        val target = board[capPos]
                        if (target != null && target.color != piece.color) {
                            moves.add(ChessMove(from = pos, to = capPos, isCapture = true))
                        }
                    }
                }
            }

            PieceType.KNIGHT -> {
                val deltas = listOf(
                    -2 to -1, -2 to 1, -1 to -2, -1 to 2,
                    1 to -2, 1 to 2, 2 to -1, 2 to 1
                )
                for ((dr, dc) in deltas) {
                    val targetPos = BoardPosition(r + dr, c + dc)
                    if (targetPos.row in 0..7 && targetPos.col in 0..7) {
                        val target = board[targetPos]
                        if (target == null) {
                            moves.add(ChessMove(from = pos, to = targetPos, isCapture = false))
                        } else if (target.color != piece.color) {
                            moves.add(ChessMove(from = pos, to = targetPos, isCapture = true))
                        }
                    }
                }
            }

            PieceType.BISHOP -> {
                addRays(pos, piece, board, listOf(-1 to -1, -1 to 1, 1 to -1, 1 to 1), moves)
            }

            PieceType.ROOK -> {
                addRays(pos, piece, board, listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1), moves)
            }

            PieceType.QUEEN -> {
                addRays(
                    pos, piece, board,
                    listOf(-1 to -1, -1 to 1, 1 to -1, 1 to 1, -1 to 0, 1 to 0, 0 to -1, 0 to 1),
                    moves
                )
            }

            PieceType.KING -> {
                val deltas = listOf(
                    -1 to -1, -1 to 0, -1 to 1,
                    0 to -1,           0 to 1,
                    1 to -1,  1 to 0,  1 to 1
                )
                for ((dr, dc) in deltas) {
                    val targetPos = BoardPosition(r + dr, c + dc)
                    if (targetPos.row in 0..7 && targetPos.col in 0..7) {
                        val target = board[targetPos]
                        if (target == null) {
                            moves.add(ChessMove(from = pos, to = targetPos, isCapture = false))
                        } else if (target.color != piece.color) {
                            moves.add(ChessMove(from = pos, to = targetPos, isCapture = true))
                        }
                    }
                }
            }
        }

        return moves
    }

    private fun addRays(
        pos: BoardPosition,
        piece: ChessPiece,
        board: Map<BoardPosition, ChessPiece>,
        directions: List<Pair<Int, Int>>,
        moves: MutableList<ChessMove>
    ) {
        for ((dr, dc) in directions) {
            var currR = pos.row + dr
            var currC = pos.col + dc
            while (currR in 0..7 && currC in 0..7) {
                val targetPos = BoardPosition(currR, currC)
                val target = board[targetPos]
                if (target == null) {
                    moves.add(ChessMove(from = pos, to = targetPos, isCapture = false))
                } else {
                    if (target.color != piece.color) {
                        moves.add(ChessMove(from = pos, to = targetPos, isCapture = true))
                    }
                    break
                }
                currR += dr
                currC += dc
            }
        }
    }

    fun isKingInCheck(color: PieceColor, board: Map<BoardPosition, ChessPiece>): Boolean {
        val kingEntry = board.entries.firstOrNull { it.value.type == PieceType.KING && it.value.color == color }
            ?: return false
        val kingPos = kingEntry.key
        val opponentColor = color.opposite()

        for ((pos, piece) in board) {
            if (piece.color == opponentColor) {
                val pseudo = getPseudoMoves(pos, piece, board)
                if (pseudo.any { it.to == kingPos }) {
                    return true
                }
            }
        }
        return false
    }

    fun getLegalMoves(
        pos: BoardPosition,
        piece: ChessPiece,
        board: Map<BoardPosition, ChessPiece>
    ): List<ChessMove> {
        val pseudo = getPseudoMoves(pos, piece, board)
        val legal = mutableListOf<ChessMove>()

        for (m in pseudo) {
            val simBoard = board.toMutableMap()
            simBoard.remove(m.from)
            simBoard[m.to] = piece
            if (!isKingInCheck(piece.color, simBoard)) {
                legal.add(m)
            }
        }

        // Castling
        if (piece.type == PieceType.KING && !piece.hasMoved && !isKingInCheck(piece.color, board)) {
            val homeRow = if (piece.color == PieceColor.WHITE) 7 else 0
            if (pos.row == homeRow && pos.col == 4) {
                // Kingside O-O (c: 4 -> 6, Rook at 7 -> 5)
                val kRook = board[BoardPosition(homeRow, 7)]
                if (kRook != null && kRook.type == PieceType.ROOK && !kRook.hasMoved &&
                    !board.containsKey(BoardPosition(homeRow, 5)) &&
                    !board.containsKey(BoardPosition(homeRow, 6))
                ) {
                    val sim1 = board.toMutableMap().apply { remove(pos); put(BoardPosition(homeRow, 5), piece) }
                    val sim2 = board.toMutableMap().apply { remove(pos); put(BoardPosition(homeRow, 6), piece) }
                    if (!isKingInCheck(piece.color, sim1) && !isKingInCheck(piece.color, sim2)) {
                        legal.add(
                            ChessMove(
                                from = pos,
                                to = BoardPosition(homeRow, 6),
                                isCapture = false,
                                castleSide = "k",
                                rookFromCol = 7,
                                rookToCol = 5
                            )
                        )
                    }
                }

                // Queenside O-O-O (c: 4 -> 2, Rook at 0 -> 3)
                val qRook = board[BoardPosition(homeRow, 0)]
                if (qRook != null && qRook.type == PieceType.ROOK && !qRook.hasMoved &&
                    !board.containsKey(BoardPosition(homeRow, 1)) &&
                    !board.containsKey(BoardPosition(homeRow, 2)) &&
                    !board.containsKey(BoardPosition(homeRow, 3))
                ) {
                    val sim1 = board.toMutableMap().apply { remove(pos); put(BoardPosition(homeRow, 3), piece) }
                    val sim2 = board.toMutableMap().apply { remove(pos); put(BoardPosition(homeRow, 2), piece) }
                    if (!isKingInCheck(piece.color, sim1) && !isKingInCheck(piece.color, sim2)) {
                        legal.add(
                            ChessMove(
                                from = pos,
                                to = BoardPosition(homeRow, 2),
                                isCapture = false,
                                castleSide = "q",
                                rookFromCol = 0,
                                rookToCol = 3
                            )
                        )
                    }
                }
            }
        }

        return legal
    }

    fun getAllLegalMoves(color: PieceColor, board: Map<BoardPosition, ChessPiece>): List<ChessMove> {
        val all = mutableListOf<ChessMove>()
        for ((pos, piece) in board) {
            if (piece.color == color) {
                all.addAll(getLegalMoves(pos, piece, board))
            }
        }
        return all
    }
}
