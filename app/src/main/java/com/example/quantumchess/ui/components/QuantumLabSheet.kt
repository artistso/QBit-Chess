package com.example.quantumchess.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ElectricBolt
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.quantumchess.model.PieceType
import com.example.quantumchess.ui.theme.ElectricCyan
import com.example.quantumchess.ui.theme.GoldBright
import com.example.quantumchess.ui.theme.GoldPrimary
import com.example.quantumchess.ui.theme.GothicRed
import com.example.quantumchess.ui.theme.QuantumViolet
import com.example.quantumchess.ui.theme.SanctumBorder
import com.example.quantumchess.ui.theme.SanctumSurface
import com.example.quantumchess.ui.theme.SanctumSurfaceVariant
import com.example.quantumchess.ui.theme.TextMuted
import com.example.quantumchess.ui.theme.TextPrimary
import com.example.quantumchess.viewmodel.ChessUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuantumLabSheet(
    uiState: ChessUiState,
    onDismiss: () -> Unit,
    onToggleHodge: () -> Unit,
    onToggleMultiHit: () -> Unit,
    onToggleSound: () -> Unit,
    onTestSonicBoom: (PieceType) -> Unit,
    onEntangleRandom: () -> Unit,
    onClearEntanglements: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SanctumSurface,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .size(width = 44.dp, height = 4.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(GoldPrimary.copy(alpha = 0.45f))
            )
        },
        modifier = modifier.testTag("quantum_lab_sheet")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(ElectricCyan.copy(alpha = 0.15f))
                            .border(1.dp, ElectricCyan, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.ElectricBolt,
                            contentDescription = "Atom",
                            tint = ElectricCyan,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "QUANTUM LABORATORY",
                            color = GoldBright,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = "Hodge Cages, Entanglement & Sonic Booms",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                    }
                }

                IconButton(onClick = onDismiss, modifier = Modifier.testTag("close_lab_btn")) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close Lab",
                        tint = TextMuted
                    )
                }
            }

            HorizontalDivider(
                color = SanctumBorder,
                thickness = 1.dp,
                modifier = Modifier.padding(vertical = 12.dp)
            )

            // Section 1: Physics Engine Toggles
            Text(
                text = "PHYSICAL FORCES & COHERENCE",
                color = GoldPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                letterSpacing = 0.8.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Hodge Cage Force Field Toggle
            ToggleRow(
                title = "Hodge Cage Force Fields",
                description = "Electron lattice shells absorbing impact kinetic energy",
                checked = uiState.hodgeCagesEnabled,
                onCheckedChange = { onToggleHodge() },
                icon = Icons.Default.Shield,
                testTag = "toggle_hodge_cages"
            )

            // Multi-Hit Decoherence Toggle
            ToggleRow(
                title = "Decoherence Multi-Hit Mode",
                description = "Multiple strikes required to collapse piece quantum coherence",
                checked = uiState.multiHitDecoherence,
                onCheckedChange = { onToggleMultiHit() },
                icon = Icons.Default.GraphicEq,
                testTag = "toggle_multi_hit"
            )

            // Audio Synthesizer Toggle
            ToggleRow(
                title = "Quantum Audio Synthesizer",
                description = "Procedural supersonic Mach cones & piece-unique soundwaves",
                checked = uiState.soundEnabled,
                onCheckedChange = { onToggleSound() },
                icon = Icons.Default.VolumeUp,
                testTag = "toggle_sound"
            )

            HorizontalDivider(
                color = SanctumBorder,
                thickness = 1.dp,
                modifier = Modifier.padding(vertical = 12.dp)
            )

            // Section 2: Sonic Boom Acoustic Testing
            Text(
                text = "SUPERSONIC SONIC BOOM TEST BENCH",
                color = GoldPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                letterSpacing = 0.8.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Trigger piece-unique acoustic signatures and Mach pressure waves",
                color = TextMuted,
                fontSize = 11.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                PieceType.values().forEach { pieceType ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(SanctumSurfaceVariant)
                            .border(1.dp, SanctumBorder, RoundedCornerShape(8.dp))
                            .clickable { onTestSonicBoom(pieceType) }
                            .padding(vertical = 8.dp)
                            .testTag("test_boom_${pieceType.name.lowercase()}"),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = pieceType.symbol,
                                color = GoldBright,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Text(
                                text = pieceType.name.take(3),
                                color = TextPrimary,
                                fontSize = 10.sp
                            )
                        }
                    }
                }
            }

            HorizontalDivider(
                color = SanctumBorder,
                thickness = 1.dp,
                modifier = Modifier.padding(vertical = 12.dp)
            )

            // Section 3: Bell-State Quantum Entanglement
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "BELL-STATE QUANTUM ENTANGLEMENT",
                        color = GoldPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        letterSpacing = 0.8.sp
                    )
                    Text(
                        text = "Opposing pieces linked by spooky action at a distance",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onClearEntanglements,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = GothicRed),
                        modifier = Modifier.testTag("clear_entanglements_btn")
                    ) {
                        Icon(imageVector = Icons.Default.LinkOff, contentDescription = "Clear", modifier = Modifier.size(16.dp))
                    }
                    Button(
                        onClick = onEntangleRandom,
                        colors = ButtonDefaults.buttonColors(containerColor = QuantumViolet),
                        modifier = Modifier.testTag("entangle_random_btn")
                    ) {
                        Icon(imageVector = Icons.Default.Link, contentDescription = "Link", modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.size(4.dp))
                        Text("Entangle Pair", fontSize = 11.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Entangled Pairs Telemetry List
            if (uiState.telemetry.pairs.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(SanctumSurfaceVariant.copy(alpha = 0.5f))
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No active Bell pairs. Combat engagement or 'Entangle Pair' links twin pieces.",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(110.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(uiState.telemetry.pairs) { pair ->
                        EntangledPairRow(pair = pair)
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))
        }
    }
}

@Composable
private fun ToggleRow(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    testTag: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (checked) ElectricCyan else TextMuted,
                modifier = Modifier.size(20.dp)
            )
            Column {
                Text(text = title, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text(text = description, color = TextMuted, fontSize = 10.sp)
            }
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = GoldBright,
                checkedTrackColor = GoldPrimary.copy(alpha = 0.4f),
                uncheckedThumbColor = TextMuted,
                uncheckedTrackColor = SanctumSurfaceVariant
            ),
            modifier = Modifier.testTag(testTag)
        )
    }
}

@Composable
private fun EntangledPairRow(pair: com.example.quantumchess.quantum.EntangledPair) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(SanctumSurfaceVariant)
            .border(0.5.dp, SanctumBorder, RoundedCornerShape(6.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "${pair.labelA} ⟷ ${pair.labelB}",
                color = ElectricCyan,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                LinearProgressIndicator(
                    progress = { pair.coherenceA },
                    modifier = Modifier.weight(1f).height(4.dp),
                    color = ElectricCyan,
                    trackColor = Color.DarkGray
                )
                Text(text = "${(pair.coherenceA * 100).toInt()}%", color = TextMuted, fontSize = 9.sp)
                LinearProgressIndicator(
                    progress = { pair.coherenceB },
                    modifier = Modifier.weight(1f).height(4.dp),
                    color = QuantumViolet,
                    trackColor = Color.DarkGray
                )
                Text(text = "${(pair.coherenceB * 100).toInt()}%", color = TextMuted, fontSize = 9.sp)
            }
        }
    }
}
