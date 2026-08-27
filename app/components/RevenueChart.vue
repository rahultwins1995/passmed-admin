<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'

const canvasRef = ref<any>(null)
//  API data props
const props = defineProps({
  chartData: {
    type: Object,
    required: true
  }
})

const drawChart = async () => {
  await nextTick()

  const canvas = canvasRef.value;

  if (!canvas) return

  const ctx = canvas.getContext('2d')

  const { months = [], board = [], shelf = [] } = props.chartData

  const W = canvas.parentElement.clientWidth || 500
  const H = 140

  canvas.width = W * window.devicePixelRatio
  canvas.height = H * window.devicePixelRatio
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'

  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  ctx.clearRect(0, 0, W, H)

  const PAD_L = 42
  const PAD_R = 12
  const PAD_T = 8
  const PAD_B = 22

  const cW = W - PAD_L - PAD_R
  const cH = H - PAD_T - PAD_B

  const totals = board.map((b:any, i:number) => b + (shelf[i] || 0))
  const maxVal = Math.max(...totals, 10000)
  const niceMax = Math.ceil(maxVal / 10000) * 10000

  // GRID
  ctx.strokeStyle = 'rgba(148,163,184,0.08)'
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'

  for (let i = 0; i <= 4; i++) {
    const val = (niceMax * i) / 4
    const y = PAD_T + cH - (val / niceMax) * cH

    ctx.beginPath()
    ctx.moveTo(PAD_L, y)
    ctx.lineTo(W - PAD_R, y)
    ctx.stroke()

    ctx.fillText(`$${val / 1000}k`, PAD_L - 5, y + 3)
  }

  const groupW = cW / months.length
  const barW = Math.min(groupW * 0.4, 22)

  months.forEach((m:any, i:number) => {
    const x = PAD_L + i * groupW + (groupW - barW) / 2
    const base = PAD_T + cH

    const bh = (board[i] / niceMax) * cH
    const sh = (shelf[i] / niceMax) * cH

    // Only the TOP segment of each stack gets rounded corners; lower segments
    // are drawn flat so the pieces sit flush (no notch between board & shelf).
    const hasShelf = sh > 0.5

    // Board (teal) — lower segment: flat when a shelf stacks on top, rounded
    // only when the board itself is the top of the bar.
    const gBoard = ctx.createLinearGradient(0, base - bh, 0, base)
    gBoard.addColorStop(0, '#22d3ee')
    gBoard.addColorStop(1, 'rgba(6,182,212,0.6)')

    ctx.fillStyle = gBoard

    if (!hasShelf && ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(x, base - bh, barW, bh, [4, 4, 0, 0])
      ctx.fill()
    } else {
      ctx.fillRect(x, base - bh, barW, bh)
    }

    // Shelf (amber) — top segment: rounded top.
    if (hasShelf) {
      const gShelf = ctx.createLinearGradient(0, base - bh - sh, 0, base - bh)
      gShelf.addColorStop(0, '#fbbf24')
      gShelf.addColorStop(1, 'rgba(245,158,11,0.7)')

      ctx.fillStyle = gShelf
      if (ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(x, base - bh - sh, barW, sh, [4, 4, 0, 0])
        ctx.fill()
      } else {
        ctx.fillRect(x, base - bh - sh, barW, sh)
      }
    }

    // Month label
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'center'
    ctx.fillText(m, PAD_L + i * groupW + groupW / 2, H - 6)
  })
}

// init
onMounted(drawChart)

// redraw on data change
watch(() => props.chartData, drawChart, { deep: true })
</script>

<template>
    <canvas ref="canvasRef"></canvas>
</template>

<style scoped>
.wrapRevenuechart {
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.legend {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
  margin-right: 4px;
}

.teal {
  background: #06b6d4;
}

.amber {
  background: #f59e0b;
}
</style>