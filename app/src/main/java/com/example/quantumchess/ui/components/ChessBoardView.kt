package com.example.quantumchess.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.quantumchess.model.BoardPosition
import com.example.quantumchess.model.ChessPiece
import com.example.quantumchess.model.PieceColor
import com.example.quantumchess.model.PieceType
import com.example.quantumchess.ui.theme.BoardSquareDark
import com.example.quantumchess.ui.theme.BoardSquareLight
import com.example.quantumchess.ui.theme.ElectricCyan
import com.example.quantumchess.ui.theme.GoldBright
import com.example.quantumchess.ui.theme.GoldPrimary
import com.example.quantumchess.ui.theme.GothicRed
import com.example.quantumchess.ui.theme.QuantumViolet
import com.example.quantumchess.ui.theme.SanctumBorder
import com.example.quantumchess.ui.theme.SanctumSurface
import com.example.quantumchess.ui.theme.SquareCapture
import com.example.quantumchess.ui.theme.SquareLegalMove
import com.example.quantumchess.ui.theme.SquareSelected
import com.example.quantumchess.viewmodel.ChessUiState

@Composable
fun ChessBoardView(
    uiState: ChessUiState,
    onSquareClicked: (BoardPosition) -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "quantum_lattice")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.45f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .padding(10.dp)
            .aspectRatio(1.0f)
            .clip(RoundedCornerShape(12.dp))
            .background(SanctumSurface)
            .border(2.dp, SanctumBorder, RoundedCornerShape(12.dp))
            .testTag("chessboard_container"),
        contentAlignment = Alignment.Center
    ) {
        val boardSize = maxWidth
        val squareSize = boardSize / 8

        // 1. Board Squares & Coordinate Grid
        for (r in 0..7) {
            for (c in 0..7) {
                val pos = BoardPosition(r, c)
                val isLight = (r + c) % 2 == 0
                val squareColor = if (isLight) BoardSquareLight else BoardSquareDark
                val isSelected = uiState.selectedPos == pos
                val legalMove = uiState.legalMoves.firstOrNull { it.to == pos }
                val piece = uiState.board[pos]

                Box(
                    modifier = Modifier
                        .offset(x = squareSize * c, y = squareSize * r)
                        .size(squareSize)
                        .background(squareColor)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            onSquareClicked(pos)
                        }
                        .testTag("square_${r}_${c}")
                ) {
                    // Coordinate indicators
                    if (c == 0) {
                        Text(
                            text = (8 - r).toString(),
                            color = Color.White.copy(alpha = 0.28f),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .padding(2.dp)
                        )
                    }
                    if (r == 7) {
                        Text(
                            text = ('a' + c).toString(),
                            color = Color.White.copy(alpha = 0.28f),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(2.dp)
                        )
                    }

                    // Selection highlight
                    if (isSelected) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(SquareSelected.copy(alpha = 0.35f))
                                .border(2.dp, GoldBright, RoundedCornerShape(4.dp))
                        )
                    }

                    // Legal destination highlight
                    if (legalMove != null) {
                        if (legalMove.isCapture) {
                            // Red capture indicator ring
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(SquareCapture.copy(alpha = 0.30f))
                                    .border(2.5.dp, GothicRed, RoundedCornerShape(4.dp))
                            )
                        } else {
                            // Blue dot for open move
                            Box(
                                modifier = Modifier
                                    .size(squareSize * 0.35f)
                                    .clip(CircleShape)
                                    .background(SquareLegalMove)
                                    .align(Alignment.Center)
                            )
                        }
                    }

                    // Piece Rendering
                    if (piece != null) {
                        PieceItemView(
                            piece = piece,
                            hodgeCagesEnabled = uiState.hodgeCagesEnabled,
                            pulseAlpha = pulseAlpha,
                            modifier = Modifier.align(Alignment.Center)
                        )
                    }
                }
            }
        }

        // 2. Quantum Entanglement Laser Ribbons Canvas overlay
        Canvas(modifier = Modifier.fillMaxSize()) {
            val sqPx = size.width / 8f
            for (pair in uiState.telemetry.pairs) {
                val startX = (pair.posA.col + 0.5f) * sqPx
                val startY = (pair.posA.row + 0.5f) * sqPx
                val endX = (pair.posB.col + 0.5f) * sqPx
                val endY = (pair.posB.row + 0.5f) * sqPx

                // Undulating glow ribbon
                drawLine(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            ElectricCyan.copy(alpha = 0.85f * pulseAlpha),
                            QuantumViolet.copy(alpha = 0.85f * pulseAlpha)
                        ),
                        start = Offset(startX, startY),
                        end = Offset(endX, endY)
                    ),
                    start = Offset(startX, startY),
                    end = Offset(endX, endY),
                    strokeWidth = 4.5f,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(18f, 10f), pulseAlpha * 25f)
                )

                // Quantum entanglement connection nodes
                drawCircle(ElectricCyan, radius = 7f, center = Offset(startX, startY))
                drawCircle(QuantumViolet, radius = 7f, center = Offset(endX, endY))
            }
        }
    }
}

@Composable
private fun PieceItemView(
    piece: ChessPiece,
    hodgeCagesEnabled: Boolean,
    pulseAlpha: Float,
    modifier: Modifier = Modifier
) {
    val isWhite = piece.color == PieceColor.WHITE
    val cageColor = if (isWhite) ElectricCyan else QuantumViolet
    val coherenceColor = when {
        piece.coherence < 0.35f -> GothicRed
        piece.coherence < 0.65f -> GoldBright
        else -> cageColor
    }

    Box(
        modifier = modifier
            .fillMaxSize(0.85f),
        contentAlignment = Alignment.Center
    ) {
        // 1. Hodge Cage force field aura
        if (hodgeCagesEnabled) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val r = size.minDimension / 2f
                drawCircle(
                    color = cageColor.copy(alpha = 0.22f * pulseAlpha),
                    radius = r * 0.95f
                )
                drawCircle(
                    color = cageColor.copy(alpha = 0.65f * pulseAlpha),
                    radius = r * 0.90f,
                    style = Stroke(
                        width = 2.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 6f), 0f)
                    )
                )
                // Coherence circular ring
                drawArc(
                    color = coherenceColor,
                    startAngle = -90f,
                    sweepAngle = 360f * piece.coherence,
                    useCenter = false,
                    style = Stroke(width = 3.dp.toPx())
                )
            }
        }

        // 2. High-contrast Piece Glyph & Label
        val glyph = when (piece.type) {
            PieceType.PAWN -> if (isWhite) "♙" else "♟"
            PieceType.KNIGHT -> if (isWhite) "♘" else "♞"
            PieceType.BISHOP -> if (isWhite) "♗" else "♝"
            PieceType.ROOK -> if (isWhite) "♖" else "♜"
            PieceType.QUEEN -> if (isWhite) "♕" else "♛"
            PieceType.KING -> if (isWhite) "♔" else "♚"
        }

        Text(
            text = glyph,
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
            color = if (isWhite) Color(0xFFFBFBFE) else Color(0xFF10141C)
        )

        // 3. Entanglement atom indicator dot
        if (piece.entangledWithId != null) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(ElectricCyan)
                    .border(1.dp, Color.White, CircleShape)
                    .align(Alignment.TopEnd)
            )
        }
    }
}
