package com.example.quantumchess.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.quantumchess.ai.TacticalChessAI
import com.example.quantumchess.audio.QuantumAudioSynthesizer
import com.example.quantumchess.engine.ChessEngine
import com.example.quantumchess.model.BoardPosition
import com.example.quantumchess.model.ChessMove
import com.example.quantumchess.model.ChessPiece
import com.example.quantumchess.model.PieceColor
import com.example.quantumchess.model.PieceType
import com.example.quantumchess.quantum.QuantumPhysicsEngine
import com.example.quantumchess.quantum.QuantumTelemetry
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ShockwaveEffect(
    val pos: BoardPosition,
    val pieceType: PieceType,
    val isCritical: Boolean
)

enum class GameMode {
    SINGLE_PLAYER_VS_AI,
    PASS_AND_PLAY
}

data class ChessUiState(
    val board: Map<BoardPosition, ChessPiece> = emptyMap(),
    val currentTurn: PieceColor = PieceColor.WHITE,
    val selectedPos: BoardPosition? = null,
    val legalMoves: List<ChessMove> = emptyList(),
    val isCheck: Boolean = false,
    val isCheckmate: Boolean = false,
    val winner: PieceColor? = null,
    val gameMode: GameMode = GameMode.SINGLE_PLAYER_VS_AI,
    val capturedWhite: List<PieceType> = emptyList(),
    val capturedBlack: List<PieceType> = emptyList(),
    val moveHistory: List<String> = emptyList(),
    val hodgeCagesEnabled: Boolean = true,
    val multiHitDecoherence: Boolean = true,
    val soundEnabled: Boolean = true,
    val telemetry: QuantumTelemetry = QuantumTelemetry(0, 0, true, 1.0f, emptyList()),
    val activeShockwave: ShockwaveEffect? = null,
    val lastCombatNarrative: String? = null,
    val isAiThinking: Boolean = false
)

class ChessViewModel(
    private val chessEngine: ChessEngine = ChessEngine(),
    private val quantumEngine: QuantumPhysicsEngine = QuantumPhysicsEngine(),
    private val audioSynth: QuantumAudioSynthesizer = QuantumAudioSynthesizer()
) : ViewModel() {

    private val tacticalAI = TacticalChessAI(chessEngine)
    private val boardHistory = mutableListOf<Map<BoardPosition, ChessPiece>>()
    private val turnHistory = mutableListOf<PieceColor>()

    private val _uiState = MutableStateFlow(ChessUiState())
    val uiState: StateFlow<ChessUiState> = _uiState.asStateFlow()

    init {
        resetGame()
    }

    fun resetGame() {
        val initialBoard = ChessEngine.createInitialBoard()
        quantumEngine.clearAllEntanglements(initialBoard.values)
        boardHistory.clear()
        turnHistory.clear()

        _uiState.value = ChessUiState(
            board = initialBoard,
            currentTurn = PieceColor.WHITE,
            selectedPos = null,
            legalMoves = emptyList(),
            isCheck = false,
            isCheckmate = false,
            winner = null,
            gameMode = _uiState.value.gameMode,
            capturedWhite = emptyList(),
            capturedBlack = emptyList(),
            moveHistory = emptyList(),
            hodgeCagesEnabled = quantumEngine.hodgeCagesVisible,
            multiHitDecoherence = quantumEngine.multiHitDecoherence,
            soundEnabled = !audioSynth.isMuted,
            telemetry = quantumEngine.updateTelemetry(initialBoard),
            activeShockwave = null,
            lastCombatNarrative = null,
            isAiThinking = false
        )
    }

    fun onSquareClicked(pos: BoardPosition) {
        val state = _uiState.value
        if (state.isCheckmate || state.isAiThinking) return

        val clickedPiece = state.board[pos]

        // 1. If currently have a piece selected, check if click is a legal move
        if (state.selectedPos != null) {
            val matchingMove = state.legalMoves.firstOrNull { it.to == pos }
            if (matchingMove != null) {
                executeMove(matchingMove)
                return
            }
        }

        // 2. Otherwise, select piece if it belongs to current turn player
        if (clickedPiece != null && clickedPiece.color == state.currentTurn) {
            val legals = chessEngine.getLegalMoves(pos, clickedPiece, state.board)
            _uiState.value = state.copy(
                selectedPos = pos,
                legalMoves = legals
            )
        } else {
            // Deselect
            _uiState.value = state.copy(
                selectedPos = null,
                legalMoves = emptyList()
            )
        }
    }

    fun executeMove(move: ChessMove) {
        val state = _uiState.value
        val movingPiece = state.board[move.from] ?: return
        val targetPiece = state.board[move.to]

        // Save history for undo
        boardHistory.add(state.board.mapValues { it.value.copyPiece() })
        turnHistory.add(state.currentTurn)

        val newBoard = state.board.toMutableMap()
        val newCapturedWhite = state.capturedWhite.toMutableList()
        val newCapturedBlack = state.capturedBlack.toMutableList()
        var narrative: String? = null

        // Trigger piece-specific sonic boom audio
        audioSynth.playSonicBoom(movingPiece.type, targetPiece != null)

        // Spawn visual shockwave effect
        triggerShockwave(move.to, movingPiece.type, targetPiece != null)

        if (targetPiece != null) {
            // Quantum Combat Resolution
            val combat = quantumEngine.resolveCombat(movingPiece, targetPiece, state.board, move.to)

            if (combat.isShattered) {
                audioSynth.playSonicBoom(targetPiece.type, true)
                newBoard.remove(move.to)
                if (targetPiece.color == PieceColor.WHITE) {
                    newCapturedWhite.add(targetPiece.type)
                } else {
                    newCapturedBlack.add(targetPiece.type)
                }
                // Moving piece advances into square
                newBoard.remove(move.from)
                movingPiece.hasMoved = true
                newBoard[move.to] = movingPiece
                narrative = "${movingPiece.type.name} shattered ${targetPiece.type.name}! (Damage: ${combat.damageDealt})"
            } else {
                // Target absorbed the blow with Hodge Cage flare!
                audioSynth.playHodgeAbsorbSound()
                targetPiece.coherence = combat.remainingCoherence
                newBoard[move.to] = targetPiece
                // Attacker stays on origin or advances depending on remaining defense
                narrative = "${targetPiece.type.name} deflected blow with Hodge Cage! Coherence: ${(combat.remainingCoherence * 100).toInt()}%"
                if (combat.entangledTransfer > 0) {
                    narrative += " [Entangled twin took ${(combat.entangledTransfer * 100).toInt()}% shock]"
                }
            }
        } else {
            // Peaceful move or Castling
            newBoard.remove(move.from)
            movingPiece.hasMoved = true
            newBoard[move.to] = movingPiece

            if (move.castleSide != null && move.rookFromCol != null && move.rookToCol != null) {
                val row = move.to.row
                val rook = newBoard.remove(BoardPosition(row, move.rookFromCol))
                if (rook != null) {
                    rook.hasMoved = true
                    newBoard[BoardPosition(row, move.rookToCol)] = rook
                }
            }
        }

        val nextTurn = state.currentTurn.opposite()
        val inCheck = chessEngine.isKingInCheck(nextTurn, newBoard)
        val opponentLegals = chessEngine.getAllLegalMoves(nextTurn, newBoard)
        val isMate = inCheck && opponentLegals.isEmpty()

        val moveNotation = "${movingPiece.type.symbol}${move.from.toNotation()}->${move.to.toNotation()}${if (move.isCapture) "x" else ""}"
        val newHistory = state.moveHistory + moveNotation

        _uiState.value = state.copy(
            board = newBoard,
            currentTurn = nextTurn,
            selectedPos = null,
            legalMoves = emptyList(),
            isCheck = inCheck,
            isCheckmate = isMate,
            winner = if (isMate) state.currentTurn else null,
            capturedWhite = newCapturedWhite,
            capturedBlack = newCapturedBlack,
            moveHistory = newHistory,
            lastCombatNarrative = narrative,
            telemetry = quantumEngine.updateTelemetry(newBoard)
        )

        // If Single Player Mode and it's Black's turn (AI), schedule AI Move
        if (!isMate && state.gameMode == GameMode.SINGLE_PLAYER_VS_AI && nextTurn == PieceColor.BLACK) {
            scheduleAiMove()
        }
    }

    fun triggerAiMove() {
        val state = _uiState.value
        if (state.isCheckmate || state.isAiThinking) return
        val chosen = tacticalAI.chooseMove(state.currentTurn, state.board) ?: return
        executeMove(chosen)
    }

    private fun scheduleAiMove() {
        _uiState.value = _uiState.value.copy(isAiThinking = true)
        viewModelScope.launch {
            delay(550) // Tactical thinking delay
            val current = _uiState.value
            if (!current.isCheckmate && current.currentTurn == PieceColor.BLACK) {
                val move = tacticalAI.chooseMove(PieceColor.BLACK, current.board)
                _uiState.value = _uiState.value.copy(isAiThinking = false)
                if (move != null) {
                    executeMove(move)
                }
            } else {
                _uiState.value = _uiState.value.copy(isAiThinking = false)
            }
        }
    }

    fun undoMove() {
        if (boardHistory.isEmpty()) return
        val prevBoard = boardHistory.removeAt(boardHistory.lastIndex)
        val prevTurn = turnHistory.removeAt(turnHistory.lastIndex)

        _uiState.value = _uiState.value.copy(
            board = prevBoard,
            currentTurn = prevTurn,
            selectedPos = null,
            legalMoves = emptyList(),
            isCheck = chessEngine.isKingInCheck(prevTurn, prevBoard),
            isCheckmate = false,
            winner = null,
            telemetry = quantumEngine.updateTelemetry(prevBoard)
        )
    }

    fun setGameMode(mode: GameMode) {
        _uiState.value = _uiState.value.copy(gameMode = mode)
    }

    fun toggleHodgeCages() {
        val next = !_uiState.value.hodgeCagesEnabled
        quantumEngine.setHodgeCages(next)
        _uiState.value = _uiState.value.copy(hodgeCagesEnabled = next)
    }

    fun toggleMultiHit() {
        val next = !_uiState.value.multiHitDecoherence
        quantumEngine.setMultiHit(next)
        _uiState.value = _uiState.value.copy(
            multiHitDecoherence = next,
            telemetry = quantumEngine.updateTelemetry(_uiState.value.board)
        )
    }

    fun toggleSound() {
        val next = !_uiState.value.soundEnabled
        audioSynth.isMuted = !next
        _uiState.value = _uiState.value.copy(soundEnabled = next)
    }

    fun entangleRandomPair() {
        val state = _uiState.value
        val whites = state.board.entries.filter { it.value.color == PieceColor.WHITE && it.value.isAlive() }
        val blacks = state.board.entries.filter { it.value.color == PieceColor.BLACK && it.value.isAlive() }
        if (whites.isNotEmpty() && blacks.isNotEmpty()) {
            val randomWhite = whites.random()
            val randomBlack = blacks.random()
            val pair = quantumEngine.createEntanglement(
                randomWhite.value,
                randomBlack.value,
                randomWhite.key,
                randomBlack.key
            )
            if (pair != null) {
                audioSynth.playEntanglementPulse()
                _uiState.value = state.copy(
                    telemetry = quantumEngine.updateTelemetry(state.board),
                    lastCombatNarrative = "Bell Pair established: ${pair.labelA} <-> ${pair.labelB}"
                )
            }
        }
    }

    fun clearAllEntanglements() {
        quantumEngine.clearAllEntanglements(_uiState.value.board.values)
        _uiState.value = _uiState.value.copy(
            telemetry = quantumEngine.updateTelemetry(_uiState.value.board),
            lastCombatNarrative = "All quantum entanglement links dissolved."
        )
    }

    fun testSonicBoom(pieceType: PieceType) {
        audioSynth.playSonicBoom(pieceType, false)
        val pos = BoardPosition(3, 3)
        triggerShockwave(pos, pieceType, true)
    }

    private fun triggerShockwave(pos: BoardPosition, pieceType: PieceType, critical: Boolean) {
        _uiState.value = _uiState.value.copy(
            activeShockwave = ShockwaveEffect(pos, pieceType, critical)
        )
        viewModelScope.launch {
            delay(600)
            if (_uiState.value.activeShockwave?.pos == pos) {
                _uiState.value = _uiState.value.copy(activeShockwave = null)
            }
        }
    }
}
