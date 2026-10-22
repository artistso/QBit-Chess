package com.example.quantumchess

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.quantumchess.ui.components.ChessBoardView
import com.example.quantumchess.ui.components.CombatVfxOverlay
import com.example.quantumchess.ui.components.GameControlsBar
import com.example.quantumchess.ui.components.QuantumLabSheet
import com.example.quantumchess.ui.components.TopHudBar
import com.example.quantumchess.ui.theme.QuantumWizardChessTheme
import com.example.quantumchess.ui.theme.SanctumBackground
import com.example.quantumchess.viewmodel.ChessViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: ChessViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            QuantumWizardChessTheme {
                QuantumChessApp(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun QuantumChessApp(viewModel: ChessViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    var isQuantumLabOpen by remember { mutableStateOf(false) }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(SanctumBackground),
        containerColor = SanctumBackground
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.TopCenter
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .widthIn(max = 600.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Top HUD Bar with Brand, Turn indicator, and Lab toggle
                TopHudBar(
                    uiState = uiState,
                    onOpenQuantumLab = { isQuantumLabOpen = true }
                )

                // Chessboard with VFX overlay
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    ChessBoardView(
                        uiState = uiState,
                        onSquareClicked = { pos -> viewModel.onSquareClicked(pos) }
                    )
                    CombatVfxOverlay(shockwave = uiState.activeShockwave)
                }

                // Game Controls & Graveyards
                GameControlsBar(
                    uiState = uiState,
                    onAiMove = { viewModel.triggerAiMove() },
                    onUndo = { viewModel.undoMove() },
                    onReset = { viewModel.resetGame() },
                    onToggleMode = { mode -> viewModel.setGameMode(mode) }
                )
            }

            // Quantum Laboratory Modal Bottom Sheet
            if (isQuantumLabOpen) {
                QuantumLabSheet(
                    uiState = uiState,
                    onDismiss = { isQuantumLabOpen = false },
                    onToggleHodge = { viewModel.toggleHodgeCages() },
                    onToggleMultiHit = { viewModel.toggleMultiHit() },
                    onToggleSound = { viewModel.toggleSound() },
                    onTestSonicBoom = { pieceType -> viewModel.testSonicBoom(pieceType) },
                    onEntangleRandom = { viewModel.entangleRandomPair() },
                    onClearEntanglements = { viewModel.clearAllEntanglements() }
                )
            }
        }
    }
}
