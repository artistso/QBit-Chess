package com.example.quantumchess.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.quantumchess.model.PieceColor
import com.example.quantumchess.ui.theme.ElectricCyan
import com.example.quantumchess.ui.theme.GoldBright
import com.example.quantumchess.ui.theme.GoldPrimary
import com.example.quantumchess.ui.theme.GothicRed
import com.example.quantumchess.ui.theme.QuantumViolet
import com.example.quantumchess.ui.theme.SanctumBorder
import com.example.quantumchess.ui.theme.SanctumSurface
import com.example.quantumchess.viewmodel.ChessUiState
import com.example.quantumchess.viewmodel.GameMode

@Composable
fun TopHudBar(
    uiState: ChessUiState,
    onOpenQuantumLab: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Main Header Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Brand Pill
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(SanctumSurface)
                    .border(1.dp, SanctumBorder, RoundedCornerShape(999.dp))
                    .padding(horizontal = 14.dp, vertical = 6.dp)
                    .testTag("brand_pill")
            ) {
                Text(
                    text = "QUANTUM CHESS",
                    color = GoldBright,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    letterSpacing = 1.sp
                )
            }

            // Turn Indicator Pill
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(SanctumSurface)
                    .border(1.dp, SanctumBorder, RoundedCornerShape(999.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
                    .testTag("turn_indicator_pill"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val dotColor = if (uiState.currentTurn == PieceColor.WHITE) Color.White else Color(0xFF2B303C)
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(dotColor)
                        .border(1.dp, if (uiState.currentTurn == PieceColor.BLACK) GoldPrimary else Color.Transparent, CircleShape)
                )

                Text(
                    text = if (uiState.currentTurn == PieceColor.WHITE) "White" else "Black",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp
                )

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(GoldPrimary.copy(alpha = 0.18f))
                        .border(0.5.dp, GoldPrimary.copy(alpha = 0.4f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = if (uiState.gameMode == GameMode.SINGLE_PLAYER_VS_AI) {
                            if (uiState.currentTurn == PieceColor.WHITE) "Player" else "AI"
                        } else "2P",
                        color = GoldBright,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Quantum Lab Pill Button
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(SanctumSurface)
                    .border(1.dp, ElectricCyan.copy(alpha = 0.5f), RoundedCornerShape(999.dp))
                    .clickable { onOpenQuantumLab() }
                    .padding(horizontal = 12.dp, vertical = 6.dp)
                    .testTag("quantum_lab_button"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Science,
                    contentDescription = "Quantum Lab",
                    tint = ElectricCyan,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "Lab",
                    color = ElectricCyan,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
                if (uiState.telemetry.entangledPairsCount > 0) {
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(QuantumViolet)
                            .padding(horizontal = 5.dp, vertical = 1.dp)
                    ) {
                        Text(
                            text = "${uiState.telemetry.entangledPairsCount}",
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Check & Checkmate Notification Banner
        AnimatedVisibility(
            visible = uiState.isCheck || uiState.isCheckmate,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(GothicRed.copy(alpha = 0.22f))
                    .border(1.dp, GothicRed, RoundedCornerShape(8.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
                    .testTag("status_banner"),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Warning",
                        tint = GothicRed,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = if (uiState.isCheckmate) {
                            "CHECKMATE! ${uiState.winner?.name ?: ""} WINS!"
                        } else {
                            "CHECK! King is under attack!"
                        },
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }

        // Live Combat Narrative
        if (uiState.lastCombatNarrative != null) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0xFF0F1522).copy(alpha = 0.85f))
                    .border(0.5.dp, GoldPrimary.copy(alpha = 0.35f), RoundedCornerShape(6.dp))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = uiState.lastCombatNarrative,
                    color = GoldBright,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
