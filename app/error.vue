<template>
  <div class="error-page">
    <div class="error-code">404</div>

      <div class="icon-ring">
        <!-- Broken compass / map icon -->
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="#1ab8c8" stroke-width="1.8"></circle>
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="#1ab8c8" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M9.5 9.5L11 12l-1.5 2.5L14.5 14.5 13 12l1.5-2.5z" fill="#1ab8c8" opacity=".7"></path>
          <line x1="5" y1="5" x2="19" y2="19" stroke="#e05555" stroke-width="1.6" stroke-linecap="round"></line>
        </svg>
      </div>

      <div class="error-title">This page doesn't exist</div>

      <div class="btn-group">
         <NuxtLink to="/">Go Home</NuxtLink>
      </div>

  </div>
</template>
<style>
.error-page {
    background: var(--card-body);
    padding: 36px 36px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}
.error-code {
    font-family: 'DM Mono', monospace;
    font-size: 5.5rem;
    font-weight: 500;
    line-height: 1;
    color: #0e7b8a;
}
.error-code::after {
    content: '';
    display: block;
    margin: 12px auto 0;
    width: 48px;
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--teal), transparent);
}
.icon-ring {
    margin: 20px 0 16px;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e8f7f9, #c6ecf1);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 8px rgba(26,184,200,.08);
    animation: popIn .5s .35s cubic-bezier(.34,1.56,.64,1) both;
}
.icon-ring svg {
    width: 32px;
    height: 32px;
}
.error-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-dark);
    margin-bottom: 8px;
}

.btn-primary {
    background: linear-gradient(135deg, var(--teal) 0%, #12a0ae 100%);
    color: #fff;
    box-shadow: 0 4px 16px rgba(26,184,200,.35);
}
</style>