package com.example.quantumchess.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutLinearInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.example.quantumchess.model.PieceType
import com.example.quantumchess.ui.theme.ElectricCyan
import com.example.quantumchess.ui.theme.GoldBright
import com.example.quantumchess.ui.theme.GothicRed
import com.example.quantumchess.ui.theme.QuantumViolet
import com.example.quantumchess.viewmodel.ShockwaveEffect

@Composable
fun CombatVfxOverlay(
    shockwave: ShockwaveEffect?,
    modifier: Modifier = Modifier
) {
    if (shockwave == null) return

    val shockColor = when (shockwave.pieceType) {
        PieceType.PAWN -> ElectricCyan
        PieceType.KNIGHT -> GoldBright
        PieceType.BISHOP -> QuantumViolet
        PieceType.ROOK -> GothicRed
        PieceType.QUEEN -> Color(0xFFF72585)
        PieceType.KING -> Color(0xFFFFD700)
    }

    val animProgress = remember(shockwave) { Animatable(0f) }

    LaunchedEffect(shockwave) {
        animProgress.snapTo(0f)
        animProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(550, easing = FastOutLinearInEasing)
        )
    }

    Canvas(modifier = modifier.fillMaxSize()) {
        val sqPx = size.width / 8f
        val centerX = (shockwave.pos.col + 0.5f) * sqPx
        val centerY = (shockwave.pos.row + 0.5f) * sqPx
        val p = animProgress.value

        val maxRadius = sqPx * if (shockwave.isCritical) 2.4f else 1.6f
        val curRadius = sqPx * 0.2f + maxRadius * p
        val alpha = (1f - p).coerceIn(0f, 1f)

        // Mach Shockwave Outer Ring
        drawCircle(
            color = shockColor.copy(alpha = alpha * 0.9f),
            radius = curRadius,
            center = Offset(centerX, centerY),
            style = Stroke(width = 4.dp.toPx() * (1f - p * 0.5f))
        )

        // Condensation Vapor Ring
        drawCircle(
            color = Color.White.copy(alpha = alpha * 0.65f),
            radius = curRadius * 0.7f,
            center = Offset(centerX, centerY),
            style = Stroke(width = 2.dp.toPx())
        )
    }
}
