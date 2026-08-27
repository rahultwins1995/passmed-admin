<template>
  <div class="loader">
    <span class="loader__dot"></span>
    <span class="loader__dot"></span>
    <span class="loader__dot"></span>
  </div>
</template>
<style>
:root {
  --bg: #0f1b2d;
  --fg: #ffffff;
  --accent: #6bdcff;
  --size: 12px;
  --gap: 10px;
  --speed: 0.6s;
}

.loader {
  margin: 10px 0px;
  display: flex;
  align-items: center;
  gap: var(--gap);
  justify-content: center;
}

.loader__dot {
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 rgba(107, 220, 255, 0.5);
  animation: bounce var(--speed) infinite ease-in-out;
}

.loader__dot:nth-child(2) { animation-delay: 0.12s; }
.loader__dot:nth-child(3) { animation-delay: 0.24s; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); box-shadow: 0 0 0 rgba(107, 220, 255, 0.4); }
  50% { transform: translateY(-10px); box-shadow: 0 8px 16px rgba(107, 220, 255, 0.25); }
}

@media (prefers-reduced-motion: reduce) {
  .loader__dot { animation: none; }
}

</style>