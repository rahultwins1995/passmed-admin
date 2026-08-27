<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Preview of the email a rule would generate.
 * - If the rule points to a REAL notification template (numeric id), we fetch and
 *   show that template's actual subject + content (already merge-filled with demo data).
 * - Otherwise (Auto-generate) we show representative SAMPLE content per trigger.
 */
const props = defineProps<{
  modelValue: boolean
  rule: any | null
}>()
const emit = defineEmits(['update:modelValue'])
const { $api } = useNuxtApp()
const close = () => emit('update:modelValue', false)

// Real template (fetched when the rule's email_template is a numeric template id).
const realTpl = ref<any>(null)
const loadingTpl = ref(false)

const fetchRealTemplate = async (id: any) => {
  loadingTpl.value = true
  realTpl.value = null
  try {
    const res: any = await $api.get(`/notification-templates/details/${id}`)
    if (res?.data?.status === 'success') realTpl.value = res?.data?.data ?? null
  } catch { realTpl.value = null } finally { loadingTpl.value = false }
}

watch(() => props.modelValue, (open) => {
  realTpl.value = null
  if (open) {
    const tpl = props.rule?.email_template
    if (tpl && !isNaN(Number(tpl))) fetchRealTemplate(tpl)
  }
})

// Sample merge values
const sample: Record<string, string> = {
  first_name: 'Sarah',
  exam_name: 'ABA Basic',
  plan_name: '12 Months',
  expiry_date: '30 Jun 2026',
  cta_button: '[ Resume Studying → ]',
}

const fillMerge = (text: string) =>
  text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => sample[k] ?? `{{${k}}}`)

// Representative subject/body per email_template key; falls back to trigger-based copy.
const templateCopy = (tplKey: string, trigger: string) => {
  const byTemplate: Record<string, { subject: string; body: string }> = {
    welcome: {
      subject: 'Welcome to Passmed, {{first_name}}!',
      body: 'Hi {{first_name}},\n\nWelcome to Passmed! Your {{exam_name}} prep ({{plan_name}}) is ready to go.\n\n{{cta_button}}',
    },
    expiry_warn: {
      subject: 'Your {{exam_name}} access expires soon',
      body: 'Hi {{first_name}},\n\nYour {{exam_name}} access expires on {{expiry_date}}. Renew now to keep your progress and streak.\n\n{{cta_button}}',
    },
    renewal_confirm: {
      subject: 'Your {{exam_name}} subscription is renewed',
      body: 'Hi {{first_name}},\n\nThanks! Your {{exam_name}} subscription ({{plan_name}}) is renewed until {{expiry_date}}.\n\n{{cta_button}}',
    },
  }

  const byTrigger: Record<string, { subject: string; body: string }> = {
    'milestone-question-count': {
      subject: 'Milestone reached in {{exam_name}} 🎯',
      body: 'Great work {{first_name}}!\n\nYou\'ve hit a question milestone in {{exam_name}}. Keep the momentum going.\n\n{{cta_button}}',
    },
    'before-exam-days': {
      subject: 'Your {{exam_name}} exam is approaching',
      body: 'Hi {{first_name}},\n\nYour {{exam_name}} exam is coming up. Here\'s a quick plan to finish strong.\n\n{{cta_button}}',
    },
    'score-percent': {
      subject: 'Let\'s get your {{exam_name}} score back up',
      body: 'Hi {{first_name}},\n\nYour average score in {{exam_name}} dipped recently. A short focused session can turn it around.\n\n{{cta_button}}',
    },
    'user-inactivity-days': {
      subject: 'We miss you, {{first_name}}',
      body: 'Hi {{first_name}},\n\nIt\'s been a while! Jump back into {{exam_name}} — your progress is waiting.\n\n{{cta_button}}',
    },
    'study-streak-days': {
      subject: '🔥 You\'re on a study streak!',
      body: 'Way to go {{first_name}}!\n\nYou\'re on a study streak in {{exam_name}}. Don\'t break the chain.\n\n{{cta_button}}',
    },
  }

  if (tplKey && byTemplate[tplKey]) return byTemplate[tplKey]
  return byTrigger[trigger] || byTrigger['milestone-question-count']
}

const preview = computed(() => {
  // Real template content (HTML, already merge-filled by the backend).
  if (realTpl.value) {
    return {
      subject: realTpl.value.subject || '(no subject)',
      body: realTpl.value.content || '',
      isHtml: true,
      sample: false,
    }
  }
  // Fallback: representative sample content with sample merge values.
  const r = props.rule || {}
  const copy = templateCopy(r.email_template, r.type_trigger)
  return {
    subject: fillMerge(copy.subject),
    body: fillMerge(copy.body),
    isHtml: false,
    sample: true,
  }
})
</script>

<template>
  <div v-if="modelValue" class="overlay overlay-top open" @click.self="close">
    <div class="drawer" style="width: 520px; max-width: 96vw">
      <div class="drawer-header">
        <div class="headertitlewrap">
          <div class="titlewrap">Rule Preview</div>
          <div class="subtitlewrap">{{ rule?.name || 'Notification rule' }} · sample data</div>
        </div>
        <button class="drawer-close" type="button" @click="close">
          <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13">
            <line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="drawer-body">
        <div v-if="preview.sample" style="background:rgba(6,182,212,0.06);border:1.5px solid rgba(6,182,212,0.18);border-radius:8px;padding:9px 12px;font-size:0.74rem;color:var(--ink-mid);margin-bottom:14px">
          Preview with <strong>sample</strong> merge values — actual emails use each recipient's real data.
        </div>

        <div v-if="loadingTpl" style="font-size:0.82rem;color:var(--ink-dim);margin-bottom:14px">Loading template…</div>

        <!-- Email card -->
        <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <div style="background:var(--surface);padding:12px 14px;border-bottom:1px solid var(--border)">
            <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--ink-dim);font-weight:800">Subject</div>
            <div style="font-size:0.92rem;font-weight:700;color:var(--ink);margin-top:3px">{{ preview.subject }}</div>
          </div>
          <div v-if="preview.isHtml" style="padding:16px 14px;font-size:0.86rem;color:var(--ink);line-height:1.6" v-html="safeHtmlContent(preview.body)"></div>
          <div v-else style="padding:16px 14px;font-size:0.86rem;color:var(--ink);line-height:1.6;white-space:pre-line">{{ preview.body }}</div>
        </div>

        <div style="margin-top:14px;font-size:0.74rem;color:var(--ink-dim)">
          <div>Template: <strong>{{ rule?.email_template || 'auto-generate' }}</strong></div>
          <div>Trigger: <strong>{{ rule?.type_trigger || '-' }}</strong></div>
          <div>Audience: <strong>{{ rule?.audience || 'all' }}</strong></div>
        </div>

        <div style="display:flex;gap:8px;margin-top:18px">
          <button class="btn btn-outline" style="flex:1" type="button" @click="close">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>
