package com.example.quantumchess.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = GoldPrimary,
    onPrimary = SanctumBackground,
    secondary = ElectricCyan,
    onSecondary = SanctumBackground,
    tertiary = QuantumViolet,
    background = SanctumBackground,
    surface = SanctumSurface,
    surfaceVariant = SanctumSurfaceVariant,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    error = GothicRed
)

@Composable
fun QuantumWizardChessTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
