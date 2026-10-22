package com.example.quantumchess.quantum

import com.example.quantumchess.model.BoardPosition
import com.example.quantumchess.model.ChessPiece
import com.example.quantumchess.model.CombatResult
import com.example.quantumchess.model.PieceColor
import java.util.UUID

data class EntangledPair(
    val id: String,
    val pieceAId: String,
    val pieceBId: String,
    val labelA: String,
    val labelB: String,
    val posA: BoardPosition,
    val posB: BoardPosition,
    val coherenceA: Float,
    val coherenceB: Float
)

data class QuantumTelemetry(
    val activeCages: Int,
    val entangledPairsCount: Int,
    val isMultiHit: Boolean,
    val decoherenceRate: Float,
    val pairs: List<EntangledPair>
)

class QuantumPhysicsEngine {
    var hodgeCagesVisible: Boolean = true
    var multiHitDecoherence: Boolean = true
    var decoherenceRate: Float = 1.0f

    // Active EPR Bell-State entangled pairs: PairId -> (PieceIdA, PieceIdB)
    private val activeEntanglements = mutableListOf<EntangledPair>()

    // Flare timers for visual feedback when a Hodge Cage absorbs energy
    private val cageFlares = mutableMapOf<String, Float>() // PieceId -> Flare intensity

    fun setHodgeCages(visible: Boolean) {
        hodgeCagesVisible = visible
    }

    fun setMultiHit(enabled: Boolean) {
        multiHitDecoherence = enabled
    }

    fun triggerFlare(pieceId: String, intensity: Float = 1.0f) {
        cageFlares[pieceId] = intensity
    }

    fun getFlare(pieceId: String): Float = cageFlares[pieceId] ?: 0f

    fun updateFlares(dtSeconds: Float) {
        val keys = cageFlares.keys.toList()
        for (k in keys) {
            val curr = cageFlares[k] ?: 0f
            if (curr > 0f) {
                val next = (curr - dtSeconds * 2.2f).coerceAtLeast(0f)
                if (next == 0f) cageFlares.remove(k) else cageFlares[k] = next
            }
        }
    }

    /**
     * Resolves combat interaction between attacker and defender.
     * Ported from resolveCombatInteraction in src/quantumEngine.js:
     * - Multi-hit mode inflicts decoherence damage.
     * - Defender absorbs if coherence > 0.05.
     * - 38% decoherence transferred to entangled twin.
     * - 55% catastrophic backlash if shattered.
     */
    fun resolveCombat(
        attacker: ChessPiece,
        defender: ChessPiece,
        allPieces: Map<BoardPosition, ChessPiece>,
        strikePos: BoardPosition
    ): CombatResult {
        triggerFlare(defender.id, 1.0f)

        if (!multiHitDecoherence) {
            // Classic 1-hit capture
            defender.coherence = 0.0f
            var backlash = 0f
            if (defender.entangledWithId != null) {
                backlash = 0.45f
                applyBacklash(defender.entangledWithId!!, backlash, allPieces)
                breakEntanglementForPiece(defender.id)
            }
            return CombatResult(
                attacker = attacker,
                defender = defender,
                damageDealt = 1.0f,
                remainingCoherence = 0.0f,
                isShattered = true,
                entangledTransfer = 0f,
                entangledBacklash = backlash,
                strikePosition = strikePos
            )
        }

        // Quantum Decoherence Multi-Hit Calculation
        val damage = (attacker.attackScalar * decoherenceRate).coerceAtMost(1.0f)
        defender.coherence = (defender.coherence - damage).coerceAtLeast(0.0f)
        val isShattered = defender.coherence <= 0.05f

        var transferAmount = 0f
        if (defender.entangledWithId != null) {
            transferAmount = damage * 0.38f // 38% Spooky Action at a distance
            transmitEntanglementShock(defender.entangledWithId!!, transferAmount, allPieces)
        }

        // Auto-entangle two opposing pieces upon engaging in combat if neither is already entangled!
        if (!isShattered && defender.entangledWithId == null && attacker.entangledWithId == null) {
            createEntanglement(attacker, defender, strikePos, strikePos)
        }

        var backlash = 0f
        if (isShattered) {
            if (defender.entangledWithId != null) {
                backlash = 0.55f
                applyBacklash(defender.entangledWithId!!, backlash, allPieces)
                breakEntanglementForPiece(defender.id)
            }
        }

        return CombatResult(
            attacker = attacker,
            defender = defender,
            damageDealt = damage,
            remainingCoherence = defender.coherence,
            isShattered = isShattered,
            entangledTransfer = transferAmount,
            entangledBacklash = backlash,
            strikePosition = strikePos
        )
    }

    fun createEntanglement(
        pieceA: ChessPiece,
        pieceB: ChessPiece,
        posA: BoardPosition,
        posB: BoardPosition
    ): EntangledPair? {
        if (pieceA.color == pieceB.color) return null
        breakEntanglementForPiece(pieceA.id)
        breakEntanglementForPiece(pieceB.id)

        pieceA.entangledWithId = pieceB.id
        pieceB.entangledWithId = pieceA.id

        val pair = EntangledPair(
            id = "BellPair_${UUID.randomUUID().toString().take(6)}",
            pieceAId = pieceA.id,
            pieceBId = pieceB.id,
            labelA = "${if (pieceA.color == PieceColor.WHITE) "White" else "Black"} ${pieceA.type.name}",
            labelB = "${if (pieceB.color == PieceColor.WHITE) "White" else "Black"} ${pieceB.type.name}",
            posA = posA,
            posB = posB,
            coherenceA = pieceA.coherence,
            coherenceB = pieceB.coherence
        )
        activeEntanglements.add(pair)
        return pair
    }

    private fun transmitEntanglementShock(
        twinPieceId: String,
        amount: Float,
        allPieces: Map<BoardPosition, ChessPiece>
    ) {
        val twin = allPieces.values.firstOrNull { it.id == twinPieceId } ?: return
        twin.coherence = (twin.coherence - amount).coerceAtLeast(0.05f)
        triggerFlare(twin.id, 0.85f)
    }

    private fun applyBacklash(
        twinPieceId: String,
        amount: Float,
        allPieces: Map<BoardPosition, ChessPiece>
    ) {
        val twin = allPieces.values.firstOrNull { it.id == twinPieceId } ?: return
        twin.coherence = (twin.coherence - amount).coerceAtLeast(0.05f)
        triggerFlare(twin.id, 1.0f)
    }

    fun breakEntanglementForPiece(pieceId: String) {
        val pair = activeEntanglements.firstOrNull { it.pieceAId == pieceId || it.pieceBId == pieceId }
        if (pair != null) {
            activeEntanglements.remove(pair)
        }
    }

    fun clearAllEntanglements(allPieces: Collection<ChessPiece>) {
        for (p in allPieces) {
            p.entangledWithId = null
        }
        activeEntanglements.clear()
    }

    fun getEntangledPairs(): List<EntangledPair> = activeEntanglements.toList()

    fun updateTelemetry(allPieces: Map<BoardPosition, ChessPiece>): QuantumTelemetry {
        val updatedPairs = activeEntanglements.mapNotNull { pair ->
            val pA = allPieces.values.firstOrNull { it.id == pair.pieceAId }
            val pB = allPieces.values.firstOrNull { it.id == pair.pieceBId }
            if (pA != null && pB != null && pA.isAlive() && pB.isAlive()) {
                val posA = allPieces.entries.firstOrNull { it.value.id == pA.id }?.key ?: pair.posA
                val posB = allPieces.entries.firstOrNull { it.value.id == pB.id }?.key ?: pair.posB
                pair.copy(posA = posA, posB = posB, coherenceA = pA.coherence, coherenceB = pB.coherence)
            } else {
                null
            }
        }
        return QuantumTelemetry(
            activeCages = allPieces.values.count { it.isAlive() },
            entangledPairsCount = updatedPairs.size,
            isMultiHit = multiHitDecoherence,
            decoherenceRate = decoherenceRate,
            pairs = updatedPairs
        )
    }
}
