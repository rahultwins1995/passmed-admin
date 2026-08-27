
<template>
  <div class="nofoundwrap error-page">
    <div class="errorcode">Permission denied</div>
       <div class="error-title">You do not have permission</div>
        <div class="btn-group">
            <NuxtLink to="/" class="hyerbt">Go Home</NuxtLink>
        </div>
  </div>
</template>
<style>
body:has(.nofoundwrap){
    background-color: #fff;
}

.error-page {
    background: var(--card-body);
    padding: 36px 36px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}
.errorcode {
    font-family: 'DM Mono', monospace;
    font-size: 30px;
    font-weight: bold;
    line-height: 1;
    color: #0e7b8a;
    margin-bottom: 12px;
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