package com.example.quantumchess.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
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
import com.example.quantumchess.ui.theme.SanctumBorder
import com.example.quantumchess.ui.theme.SanctumSurface
import com.example.quantumchess.ui.theme.TextMuted
import com.example.quantumchess.ui.theme.TextPrimary
import com.example.quantumchess.viewmodel.ChessUiState
import com.example.quantumchess.viewmodel.GameMode

@Composable
fun GameControlsBar(
    uiState: ChessUiState,
    onAiMove: () -> Unit,
    onUndo: () -> Unit,
    onReset: () -> Unit,
    onToggleMode: (GameMode) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Captured pieces row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // White pieces graveyard (captured by Black)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text("Black took:", color = TextMuted, fontSize = 11.sp)
                if (uiState.capturedWhite.isEmpty()) {
                    Text("—", color = TextMuted, fontSize = 11.sp)
                } else {
                    Text(
                        text = uiState.capturedWhite.joinToString("") { it.symbol },
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }

            // Black pieces graveyard (captured by White)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text("White took:", color = TextMuted, fontSize = 11.sp)
                if (uiState.capturedBlack.isEmpty()) {
                    Text("—", color = TextMuted, fontSize = 11.sp)
                } else {
                    Text(
                        text = uiState.capturedBlack.joinToString("") { it.symbol },
                        color = GoldBright,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }

        // Primary Action Controls
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // AI Move Trigger Button
            Button(
                onClick = onAiMove,
                enabled = !uiState.isCheckmate && !uiState.isAiThinking,
                colors = ButtonDefaults.buttonColors(
                    containerColor = GoldPrimary,
                    contentColor = Color.Black
                ),
                shape = RoundedCornerShape(999.dp),
                modifier = Modifier
                    .weight(1.2f)
                    .height(44.dp)
                    .testTag("ai_move_button")
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (uiState.isAiThinking) "Thinking..." else "AI Move",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }

            // Undo Button
            OutlinedButton(
                onClick = onUndo,
                enabled = uiState.moveHistory.isNotEmpty() && !uiState.isAiThinking,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, SanctumBorder),
                shape = RoundedCornerShape(999.dp),
                modifier = Modifier
                    .weight(0.9f)
                    .height(44.dp)
                    .testTag("undo_button")
            ) {
                Icon(
                    imageVector = Icons.Default.Undo,
                    contentDescription = "Undo",
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("Undo", fontSize = 12.sp)
            }

            // Game Mode Switcher
            OutlinedButton(
                onClick = {
                    val next = if (uiState.gameMode == GameMode.SINGLE_PLAYER_VS_AI) {
                        GameMode.PASS_AND_PLAY
                    } else {
                        GameMode.SINGLE_PLAYER_VS_AI
                    }
                    onToggleMode(next)
                },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = ElectricCyan),
                border = androidx.compose.foundation.BorderStroke(1.dp, ElectricCyan.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(999.dp),
                modifier = Modifier
                    .weight(0.9f)
                    .height(44.dp)
                    .testTag("toggle_game_mode_button")
            ) {
                Icon(
                    imageVector = if (uiState.gameMode == GameMode.SINGLE_PLAYER_VS_AI) Icons.Default.Person else Icons.Default.Group,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = if (uiState.gameMode == GameMode.SINGLE_PLAYER_VS_AI) "vs AI" else "2P",
                    fontSize = 12.sp
                )
            }

            // Reset Board Button
            OutlinedButton(
                onClick = onReset,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = TextMuted),
                border = androidx.compose.foundation.BorderStroke(1.dp, SanctumBorder),
                shape = RoundedCornerShape(999.dp),
                modifier = Modifier
                    .size(44.dp)
                    .testTag("reset_board_button")
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Reset",
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
